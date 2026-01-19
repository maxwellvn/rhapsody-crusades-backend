import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth, optionalAuth } from '@/lib/auth';
import * as Response from '@/lib/response';
import Event from '@/models/Event';
import Ticket from '@/models/Ticket';
import EventStaff from '@/models/EventStaff';

const EXTERNAL_CRUSADES_URL = process.env.EXTERNAL_CRUSADES_URL || 'https://rhapsodycrusades.org/data/crusades.json';

interface ExternalCrusade {
  id: number;
  title: string;
  description: string;
  date: string;
  time?: string;
  venue: string;
  address?: string;
  country?: string;
  city?: string;
  image?: string;
}

async function fetchExternalCrusade(eventId: number): Promise<ExternalCrusade | null> {
  try {
    const response = await fetch(EXTERNAL_CRUSADES_URL, {
      next: { revalidate: 300 },
    });
    if (response.ok) {
      const data = await response.json();
      const crusades = Array.isArray(data) ? data : (data.crusades || data.data || []);
      return crusades.find((c: ExternalCrusade) => c.id === eventId) || null;
    }
  } catch (error) {
    console.error('Failed to fetch external crusade:', error);
  }
  return null;
}

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const eventId = parseInt(id, 10);

    const auth = await optionalAuth(request);

    await connectDB();

    // Try local event first
    let event = await Event.findOne({ id: eventId });
    let eventData: Record<string, unknown> | null = null;

    if (event) {
      eventData = event.toJSON();
    } else {
      // Try external crusades
      const externalEvent = await fetchExternalCrusade(eventId);
      if (externalEvent) {
        eventData = {
          ...externalEvent,
          category: 'Crusade',
          featured: true,
          created_by: 'external',
          external: true,
        };
      }
    }

    if (!eventData) {
      return Response.notFound('Event not found');
    }

    // Get registration count
    const registrationCount = await Ticket.countDocuments({ event_id: eventId });

    // Check if user is registered
    let userRegistered = false;
    if (auth.user) {
      const ticket = await Ticket.findOne({
        event_id: eventId,
        user_id: auth.user._id.toHexString(),
      });
      userRegistered = !!ticket;
    }

    const response = Response.success(
      {
        ...eventData,
        registration_count: registrationCount,
        user_registered: userRegistered,
      },
      'Event retrieved successfully'
    );

    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Get event error:', error);
    return Response.serverError('Failed to get event');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const eventId = parseInt(id, 10);

    const auth = await verifyAuth(request);
    if (auth.error) {
      return Response.unauthorized(auth.error);
    }

    await connectDB();

    const event = await Event.findOne({ id: eventId });

    if (!event) {
      return Response.notFound('Event not found');
    }

    // Check if user is the creator
    if (event.created_by !== auth.user!._id.toHexString()) {
      return Response.forbidden('Only the event creator can delete this event');
    }

    // Delete related data
    await Promise.all([
      Ticket.deleteMany({ event_id: eventId }),
      EventStaff.deleteMany({ event_id: eventId }),
      Event.deleteOne({ id: eventId }),
    ]);

    const response = Response.success(null, 'Event deleted successfully');
    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Delete event error:', error);
    return Response.serverError('Failed to delete event');
  }
}
