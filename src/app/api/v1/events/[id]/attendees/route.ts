import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import * as Response from '@/lib/response';
import Event from '@/models/Event';
import EventStaff from '@/models/EventStaff';
import Ticket from '@/models/Ticket';
import User from '@/models/User';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const eventId = parseInt(id, 10);

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    const auth = await verifyAuth(request);
    if (auth.error) {
      return Response.unauthorized(auth.error);
    }

    await connectDB();

    const event = await Event.findOne({ id: eventId });

    if (!event) {
      return Response.notFound('Event not found');
    }

    const userId = auth.user!._id.toHexString();

    // Check if user is creator or staff
    const isCreator = event.created_by === userId;
    const isStaff = await EventStaff.findOne({ event_id: eventId, user_id: userId });

    if (!isCreator && !isStaff) {
      return Response.forbidden('Only event creator or staff can view attendees');
    }

    // Get total count
    const total = await Ticket.countDocuments({ event_id: eventId });

    // Get tickets with pagination
    const tickets = await Ticket.find({ event_id: eventId })
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Get user details for each ticket
    const attendees = await Promise.all(
      tickets.map(async (ticket) => {
        const user = await User.findById(ticket.user_id).select('full_name email avatar church country');
        return {
          ...ticket.toJSON(),
          user: user
            ? {
                id: user._id.toHexString(),
                full_name: user.full_name,
                email: user.email,
                avatar: user.avatar,
                church: user.church,
                country: user.country,
              }
            : null,
        };
      })
    );

    const response = Response.paginated(attendees, total, page, limit, 'Attendees retrieved successfully');
    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Get attendees error:', error);
    return Response.serverError('Failed to get attendees');
  }
}
