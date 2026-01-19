import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import * as Response from '@/lib/response';
import Notification from '@/models/Notification';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    const auth = await verifyAuth(request);
    if (auth.error) {
      return Response.unauthorized(auth.error);
    }

    await connectDB();

    const userId = auth.user!._id.toHexString();

    // Get notifications for user or broadcast (user_id = 'all')
    const query = {
      $or: [{ user_id: userId }, { user_id: 'all' }],
    };

    // Get total count
    const total = await Notification.countDocuments(query);

    // Get notifications
    const notifications = await Notification.find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Count unread
    const unreadCount = await Notification.countDocuments({
      ...query,
      read_by: { $ne: userId },
    });

    // Transform notifications to include read status for this user
    const transformedNotifications = notifications.map((n) => ({
      ...n.toJSON(),
      read: n.read_by.includes(userId),
    }));

    const response = Response.success(
      {
        notifications: transformedNotifications,
        unread_count: unreadCount,
        pagination: {
          total,
          page,
          per_page: limit,
          total_pages: Math.ceil(total / limit),
        },
      },
      'Notifications retrieved successfully'
    );

    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Get notifications error:', error);
    return Response.serverError('Failed to get notifications');
  }
}
