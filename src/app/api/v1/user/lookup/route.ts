import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import * as Response from '@/lib/response';
import Ticket from '@/models/Ticket';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return Response.unauthorized(auth.error);
    }

    const searchParams = request.nextUrl.searchParams;
    const qrCode = searchParams.get('qr_code') || searchParams.get('qr');

    if (!qrCode) {
      return Response.error('QR code is required', 400);
    }

    await connectDB();

    // Find ticket by QR code
    const ticket = await Ticket.findOne({ qr_code: qrCode });

    if (!ticket) {
      return Response.notFound('No user found with this QR code');
    }

    // Get user details
    const user = await User.findById(ticket.user_id).select('full_name email avatar church country');

    if (!user) {
      return Response.notFound('User not found');
    }

    const response = Response.success(
      {
        id: user._id.toHexString(),
        full_name: user.full_name,
        email: user.email,
        avatar: user.avatar,
        church: user.church,
        country: user.country,
      },
      'User found'
    );

    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('User lookup error:', error);
    return Response.serverError('Failed to lookup user');
  }
}
