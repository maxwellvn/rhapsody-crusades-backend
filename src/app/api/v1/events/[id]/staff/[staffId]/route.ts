import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import * as Response from '@/lib/response';
import Event from '@/models/Event';
import EventStaff from '@/models/EventStaff';

interface RouteParams {
  params: Promise<{
    id: string;
    staffId: string;
  }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, staffId } = await params;
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

    // Only creator can remove staff
    if (event.created_by !== auth.user!._id.toHexString()) {
      return Response.forbidden('Only the event creator can remove staff');
    }

    // Find and delete staff
    const staff = await EventStaff.findByIdAndDelete(staffId);

    if (!staff) {
      return Response.notFound('Staff member not found');
    }

    const response = Response.success(null, 'Staff removed successfully');
    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Remove staff error:', error);
    return Response.serverError('Failed to remove staff');
  }
}
