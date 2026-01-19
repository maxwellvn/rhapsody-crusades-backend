import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { validate } from '@/lib/validator';
import * as Response from '@/lib/response';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return Response.unauthorized(auth.error);
    }

    const userResponse = auth.user!.toJSON();
    delete userResponse.password;

    const response = Response.success(userResponse, 'Profile retrieved successfully');
    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Get profile error:', error);
    return Response.serverError('Failed to get profile');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return Response.unauthorized(auth.error);
    }

    const body = await request.json();

    // Validate input
    const validator = validate(body)
      .optional('full_name')
      .optional('phone')
      .optional('country')
      .optional('zone')
      .optional('church')
      .optional('group')
      .optional('kingschat_username')
      .optional('avatar');

    if (body.phone) {
      validator.phone('phone', 'Invalid phone number');
    }

    if (validator.fails()) {
      return Response.validationError(validator.errors());
    }

    await connectDB();

    // Allowed fields to update
    const allowedFields = ['full_name', 'phone', 'country', 'zone', 'church', 'group', 'kingschat_username', 'avatar'];

    // Build update object
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Update user
    const user = await User.findByIdAndUpdate(auth.user!._id, { $set: updateData }, { new: true }).select('-password');

    if (!user) {
      return Response.notFound('User not found');
    }

    const response = Response.success(user.toJSON(), 'Profile updated successfully');
    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Update profile error:', error);
    return Response.serverError('Failed to update profile');
  }
}
