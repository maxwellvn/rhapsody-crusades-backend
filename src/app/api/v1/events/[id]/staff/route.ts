import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { validate } from '@/lib/validator';
import * as Response from '@/lib/response';
import Event from '@/models/Event';
import EventStaff from '@/models/EventStaff';
import Ticket from '@/models/Ticket';
import User from '@/models/User';
import Notification from '@/models/Notification';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    const userId = auth.user!._id.toHexString();

    // Check if user is creator or staff
    const isCreator = event.created_by === userId;
    const isStaff = await EventStaff.findOne({ event_id: eventId, user_id: userId });

    if (!isCreator && !isStaff) {
      return Response.forbidden('Only event creator or staff can view staff list');
    }

    // Get staff with user details
    const staff = await EventStaff.find({ event_id: eventId });

    const staffWithUsers = await Promise.all(
      staff.map(async (s) => {
        const user = await User.findById(s.user_id).select('full_name email avatar church');
        return {
          ...s.toJSON(),
          user: user
            ? {
                id: user._id.toHexString(),
                full_name: user.full_name,
                email: user.email,
                avatar: user.avatar,
                church: user.church,
              }
            : null,
        };
      })
    );

    const response = Response.success(staffWithUsers, 'Staff retrieved successfully');
    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Get staff error:', error);
    return Response.serverError('Failed to get staff');
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const eventId = parseInt(id, 10);

    const auth = await verifyAuth(request);
    if (auth.error) {
      return Response.unauthorized(auth.error);
    }

    const body = await request.json();

    // Validate input
    const validator = validate(body).optional('user_id').optional('qr_code').optional('role');

    if (!body.user_id && !body.qr_code) {
      return Response.error('Either user_id or qr_code is required', 400);
    }

    if (body.role) {
      validator.in('role', ['checker', 'coordinator', 'usher', 'other'], 'Invalid role');
    }

    if (validator.fails()) {
      return Response.validationError(validator.errors());
    }

    await connectDB();

    const event = await Event.findOne({ id: eventId });

    if (!event) {
      return Response.notFound('Event not found');
    }

    const currentUserId = auth.user!._id.toHexString();

    // Only creator can add staff
    if (event.created_by !== currentUserId) {
      return Response.forbidden('Only the event creator can add staff');
    }

    // Find user by ID or QR code
    let staffUserId = body.user_id;

    if (!staffUserId && body.qr_code) {
      const ticket = await Ticket.findOne({ qr_code: body.qr_code });
      if (!ticket) {
        return Response.notFound('No user found with this QR code');
      }
      staffUserId = ticket.user_id;
    }

    // Validate user exists
    const staffUser = await User.findById(staffUserId);
    if (!staffUser) {
      return Response.notFound('User not found');
    }

    // Can't add yourself as staff
    if (staffUserId === currentUserId) {
      return Response.error('You cannot add yourself as staff', 400);
    }

    // Check if already staff
    const existingStaff = await EventStaff.findOne({
      event_id: eventId,
      user_id: staffUserId,
    });

    if (existingStaff) {
      return Response.error('User is already a staff member for this event', 400);
    }

    // Add staff
    const staff = await EventStaff.create({
      event_id: eventId,
      user_id: staffUserId,
      role: body.role || 'checker',
      added_by: currentUserId,
    });

    // Notify the added user
    await Notification.create({
      user_id: staffUserId,
      type: 'event',
      title: 'You have been added as staff!',
      message: `You have been added as ${body.role || 'checker'} for ${event.title}.`,
      data: { event_id: eventId },
    });

    const response = Response.created(
      {
        ...staff.toJSON(),
        user: {
          id: staffUser._id.toHexString(),
          full_name: staffUser.full_name,
          email: staffUser.email,
          avatar: staffUser.avatar,
          church: staffUser.church,
        },
      },
      'Staff added successfully'
    );

    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Add staff error:', error);
    return Response.serverError('Failed to add staff');
  }
}
