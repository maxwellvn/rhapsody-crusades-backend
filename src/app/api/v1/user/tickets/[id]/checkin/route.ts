import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import * as Response from '@/lib/response';
import Ticket from '@/models/Ticket';
import Event from '@/models/Event';
import EventStaff from '@/models/EventStaff';
import User from '@/models/User';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await verifyAuth(request);
    if (auth.error) {
      return Response.unauthorized(auth.error);
    }

    await connectDB();

    // Find ticket by ID or QR code
    let ticket = await Ticket.findById(id);
    if (!ticket) {
      ticket = await Ticket.findOne({ qr_code: id });
    }

    if (!ticket) {
      return Response.notFound('Ticket not found');
    }

    // Get event
    const event = await Event.findOne({ id: ticket.event_id });
    if (!event) {
      return Response.notFound('Event not found');
    }

    // Check if user is event creator or staff
    const userId = auth.user!._id.toHexString();
    const isCreator = event.created_by === userId;
    const isStaff = await EventStaff.findOne({
      event_id: event.id,
      user_id: userId,
    });

    if (!isCreator && !isStaff) {
      return Response.forbidden('Only event creator or staff can check in tickets');
    }

    // Check if already checked in
    if (ticket.status === 'used') {
      return Response.error('Ticket has already been used', 400);
    }

    // Check if ticket is cancelled
    if (ticket.status === 'cancelled') {
      return Response.error('Ticket has been cancelled', 400);
    }

    // Update ticket
    ticket.status = 'used';
    ticket.checked_in_at = new Date();
    ticket.checked_in_by = userId;
    await ticket.save();

    // Get holder name
    const holder = await User.findById(ticket.user_id).select('full_name');

    const response = Response.success(
      {
        ...ticket.toJSON(),
        holder_name: holder?.full_name,
      },
      'Check-in successful'
    );

    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Check-in error:', error);
    return Response.serverError('Failed to check in ticket');
  }
}
