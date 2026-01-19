import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import * as Response from '@/lib/response';
import Event from '@/models/Event';
import EventStaff from '@/models/EventStaff';
import Ticket from '@/models/Ticket';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return Response.unauthorized(auth.error);
    }

    await connectDB();

    const userId = auth.user!._id.toHexString();

    // Get events where user is staff
    const staffRecords = await EventStaff.find({ user_id: userId });
    const eventIds = staffRecords.map((s) => s.event_id);

    // Get events
    const events = await Event.find({ id: { $in: eventIds } }).sort({ date: -1 });

    // Get registration and check-in counts for each event
    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const [registrationCount, checkedInCount] = await Promise.all([
          Ticket.countDocuments({ event_id: event.id }),
          Ticket.countDocuments({ event_id: event.id, status: 'used' }),
        ]);

        const staffRecord = staffRecords.find((s) => s.event_id === event.id);

        return {
          ...event.toJSON(),
          registration_count: registrationCount,
          checked_in_count: checkedInCount,
          staff_role: staffRecord?.role,
        };
      })
    );

    const response = Response.success(eventsWithCounts, 'Staff events retrieved successfully');
    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Get staff events error:', error);
    return Response.serverError('Failed to get staff events');
  }
}
