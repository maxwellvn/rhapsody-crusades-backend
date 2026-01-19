import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth, optionalAuth } from '@/lib/auth';
import * as Response from '@/lib/response';
import Ticket from '@/models/Ticket';
import Event from '@/models/Event';
import User from '@/models/User';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const verify = searchParams.get('verify') === 'true';

    await connectDB();

    // Find ticket by ID or QR code
    let ticket = await Ticket.findById(id);
    if (!ticket) {
      ticket = await Ticket.findOne({ qr_code: id });
    }

    if (!ticket) {
      return Response.notFound('Ticket not found');
    }

    // If verify mode, allow staff to see any ticket
    if (verify) {
      const auth = await verifyAuth(request);
      if (auth.error) {
        return Response.unauthorized(auth.error);
      }

      // Get event and holder details
      const event = await Event.findOne({ id: ticket.event_id });
      const holder = await User.findById(ticket.user_id).select('full_name email avatar church country');

      return Response.success(
        {
          ...ticket.toJSON(),
          event: event ? event.toJSON() : null,
          holder_name: holder?.full_name,
          holder: holder ? holder.toJSON() : null,
        },
        'Ticket retrieved successfully'
      );
    }

    // Normal mode - user can only see their own tickets
    const auth = await optionalAuth(request);
    if (auth.user && ticket.user_id !== auth.user._id.toHexString()) {
      return Response.forbidden('You can only view your own tickets');
    }

    // Get event details
    const event = await Event.findOne({ id: ticket.event_id });

    const response = Response.success(
      {
        ...ticket.toJSON(),
        event: event ? event.toJSON() : null,
      },
      'Ticket retrieved successfully'
    );

    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Get ticket error:', error);
    return Response.serverError('Failed to get ticket');
  }
}
