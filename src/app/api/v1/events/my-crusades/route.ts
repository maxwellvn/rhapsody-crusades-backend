import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import * as Response from '@/lib/response';
import Event from '@/models/Event';
import Ticket from '@/models/Ticket';
import EventStaff from '@/models/EventStaff';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return Response.unauthorized(auth.error);
    }

    await connectDB();

    const userId = auth.user!._id.toHexString();

    // Get events created by user
    const events = await Event.find({ created_by: userId }).sort({ date: -1 });

    // Add registration and staff counts
    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const [registrationCount, staffCount] = await Promise.all([
          Ticket.countDocuments({ event_id: event.id }),
          EventStaff.countDocuments({ event_id: event.id }),
        ]);

        return {
          ...event.toJSON(),
          registration_count: registrationCount,
          staff_count: staffCount,
        };
      })
    );

    const response = Response.success(eventsWithCounts, 'My crusades retrieved successfully');
    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Get my crusades error:', error);
    return Response.serverError('Failed to get my crusades');
  }
}
