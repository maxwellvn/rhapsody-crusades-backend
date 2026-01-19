import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import * as Response from '@/lib/response';
import Ticket from '@/models/Ticket';
import Testimony from '@/models/Testimony';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return Response.unauthorized(auth.error);
    }

    await connectDB();

    const userId = auth.user!._id.toHexString();

    // Get statistics
    const [totalRegistrations, eventsAttended, totalTestimonies, approvedTestimonies] = await Promise.all([
      Ticket.countDocuments({ user_id: userId }),
      Ticket.countDocuments({ user_id: userId, status: 'used' }),
      Testimony.countDocuments({ user_id: userId }),
      Testimony.countDocuments({ user_id: userId, status: 'approved' }),
    ]);

    const response = Response.success(
      {
        events_attended: eventsAttended,
        events_registered: totalRegistrations,
        total_registrations: totalRegistrations,
        testimonies: totalTestimonies,
        approved_testimonies: approvedTestimonies,
      },
      'Stats retrieved successfully'
    );

    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Get stats error:', error);
    return Response.serverError('Failed to get stats');
  }
}
