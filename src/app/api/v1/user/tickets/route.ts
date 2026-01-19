import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import * as Response from '@/lib/response';
import Ticket from '@/models/Ticket';
import Event from '@/models/Event';

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

let externalCrusadesCache: ExternalCrusade[] | null = null;
let cacheTime = 0;

async function fetchExternalCrusades(): Promise<ExternalCrusade[]> {
  // Cache for 5 minutes
  if (externalCrusadesCache && Date.now() - cacheTime < 300000) {
    return externalCrusadesCache;
  }
  try {
    const response = await fetch(EXTERNAL_CRUSADES_URL);
    if (response.ok) {
      const data = await response.json();
      externalCrusadesCache = Array.isArray(data) ? data : (data.crusades || data.data || []);
      cacheTime = Date.now();
      return externalCrusadesCache;
    }
  } catch (error) {
    console.error('Failed to fetch external crusades:', error);
  }
  return externalCrusadesCache || [];
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return Response.unauthorized(auth.error);
    }

    await connectDB();

    // Get user's tickets
    const tickets = await Ticket.find({ user_id: auth.user!._id.toHexString() }).sort({ created_at: -1 });

    // Fetch external crusades once
    const externalCrusades = await fetchExternalCrusades();

    // Get event details for each ticket
    const ticketsWithEvents = await Promise.all(
      tickets.map(async (ticket) => {
        // Try local event first
        const event = await Event.findOne({ id: ticket.event_id });
        if (event) {
          return {
            ...ticket.toJSON(),
            event: event.toJSON(),
          };
        }
        // Check external crusades
        const externalEvent = externalCrusades.find((c) => c.id === ticket.event_id);
        if (externalEvent) {
          return {
            ...ticket.toJSON(),
            event: {
              ...externalEvent,
              category: 'Crusade',
              featured: true,
              created_by: 'external',
              external: true,
            },
          };
        }
        return {
          ...ticket.toJSON(),
          event: null,
        };
      })
    );

    const response = Response.success(ticketsWithEvents, 'Tickets retrieved successfully');
    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Get tickets error:', error);
    return Response.serverError('Failed to get tickets');
  }
}
