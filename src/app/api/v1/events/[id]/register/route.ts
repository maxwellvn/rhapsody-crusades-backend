import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth, generateQRCode } from '@/lib/auth';
import * as Response from '@/lib/response';
import Event from '@/models/Event';
import Ticket from '@/models/Ticket';
import Notification from '@/models/Notification';

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

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const eventId = parseInt(id, 10);

    const auth = await verifyAuth(request);
    if (auth.error) {
      return Response.unauthorized(auth.error);
    }

    await connectDB();

    // Try to find local event first
    let event = await Event.findOne({ id: eventId });
    let eventTitle = event?.title;
    let eventCapacity = event?.capacity;
    let eventCreatedBy = event?.created_by;
    let isExternal = false;

    // If not found locally, check external crusades
    if (!event) {
      const externalEvent = await fetchExternalCrusade(eventId);
      if (externalEvent) {
        eventTitle = externalEvent.title;
        eventCapacity = undefined; // External events don't have capacity limits in our system
        eventCreatedBy = 'external';
        isExternal = true;
      } else {
        return Response.notFound('Event not found');
      }
    }

    const userId = auth.user!._id.toHexString();

    // Check if already registered
    const existingTicket = await Ticket.findOne({
      event_id: eventId,
      user_id: userId,
    });

    if (existingTicket) {
      return Response.error('You are already registered for this event', 400);
    }

    // Check capacity (only for local events)
    if (eventCapacity) {
      const registrationCount = await Ticket.countDocuments({ event_id: eventId });
      if (registrationCount >= eventCapacity) {
        return Response.error('This event has reached its capacity', 400);
      }
    }

    // Generate QR code
    let qrCode = generateQRCode();
    // Ensure uniqueness
    while (await Ticket.findOne({ qr_code: qrCode })) {
      qrCode = generateQRCode();
    }

    // Create ticket
    const ticket = await Ticket.create({
      user_id: userId,
      event_id: eventId,
      qr_code: qrCode,
      registration_date: new Date().toISOString().split('T')[0],
      status: 'active',
    });

    // Notify user
    await Notification.create({
      user_id: userId,
      type: 'registration',
      title: 'Registration Confirmed!',
      message: `You have successfully registered for ${eventTitle}.`,
      data: { event_id: eventId, ticket_id: ticket._id.toHexString() },
    });

    // Notify event creator (only for local events with non-external creator)
    if (eventCreatedBy && eventCreatedBy !== userId && eventCreatedBy !== 'external') {
      await Notification.create({
        user_id: eventCreatedBy,
        type: 'registration',
        title: 'New Registration',
        message: `${auth.user!.full_name} has registered for ${eventTitle}.`,
        data: { event_id: eventId, user_id: userId },
      });
    }

    const ticketResponse = {
      ...ticket.toJSON(),
      event: isExternal
        ? { id: eventId, title: eventTitle, external: true }
        : event!.toJSON(),
    };

    const response = Response.created(ticketResponse, 'Registration successful');

    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Register for event error:', error);
    return Response.serverError('Failed to register for event');
  }
}
