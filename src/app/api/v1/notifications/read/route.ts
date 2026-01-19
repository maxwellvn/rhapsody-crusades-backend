import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { validate } from '@/lib/validator';
import * as Response from '@/lib/response';
import Notification from '@/models/Notification';

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return Response.unauthorized(auth.error);
    }

    const body = await request.json();

    // Validate input
    const validator = validate(body).required('notification_id', 'Notification ID is required');

    if (validator.fails()) {
      return Response.validationError(validator.errors());
    }

    await connectDB();

    const userId = auth.user!._id.toHexString();

    // Find notification
    const notification = await Notification.findById(body.notification_id);

    if (!notification) {
      return Response.notFound('Notification not found');
    }

    // Check if user can access this notification
    if (notification.user_id !== userId && notification.user_id !== 'all') {
      return Response.forbidden('You cannot mark this notification as read');
    }

    // Add user to read_by if not already there
    if (!notification.read_by.includes(userId)) {
      notification.read_by.push(userId);
      await notification.save();
    }

    const response = Response.success(null, 'Notification marked as read');
    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Mark notification read error:', error);
    return Response.serverError('Failed to mark notification as read');
  }
}
