import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import * as Response from '@/lib/response';
import Notification from '@/models/Notification';

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return Response.unauthorized(auth.error);
    }

    await connectDB();

    const userId = auth.user!._id.toHexString();

    // Mark all user's notifications as read
    await Notification.updateMany(
      {
        $or: [{ user_id: userId }, { user_id: 'all' }],
        read_by: { $ne: userId },
      },
      {
        $addToSet: { read_by: userId },
      }
    );

    const response = Response.success(null, 'All notifications marked as read');
    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return Response.serverError('Failed to mark all notifications as read');
  }
}
