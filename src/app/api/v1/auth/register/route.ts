import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { signToken, getExpiresIn } from '@/lib/jwt';
import { validate } from '@/lib/validator';
import * as Response from '@/lib/response';
import User from '@/models/User';
import Notification from '@/models/Notification';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validator = validate(body)
      .required('full_name', 'Full name is required')
      .minLength('full_name', 2, 'Full name must be at least 2 characters')
      .required('email', 'Email is required')
      .email('email', 'Invalid email format')
      .required('password', 'Password is required')
      .minLength('password', 6, 'Password must be at least 6 characters')
      .required('country', 'Country is required')
      .optional('phone')
      .optional('city')
      .optional('zone')
      .optional('church')
      .optional('group')
      .optional('kingschat_username');

    if (body.phone) {
      validator.phone('phone', 'Invalid phone number');
    }

    if (validator.fails()) {
      return Response.validationError(validator.errors());
    }

    await connectDB();

    // Check if email already exists
    const existingUser = await User.findOne({ email: body.email.toLowerCase() });
    if (existingUser) {
      return Response.error('Email already registered', 400);
    }

    // Hash password
    const hashedPassword = await hashPassword(body.password);

    // Create user
    const user = await User.create({
      email: body.email.toLowerCase(),
      password: hashedPassword,
      full_name: body.full_name,
      phone: body.phone,
      country: body.country,
      city: body.city,
      zone: body.zone,
      church: body.church,
      group: body.group,
      kingschat_username: body.kingschat_username,
    });

    // Create welcome notification
    await Notification.create({
      user_id: user._id.toHexString(),
      type: 'system',
      title: 'Welcome to Rhapsody Crusades!',
      message: 'Thank you for joining us. Explore upcoming crusades and register for events.',
    });

    // Generate token
    const token = signToken({
      userId: user._id.toHexString(),
      email: user.email,
    });

    // Return user without password (toJSON transform already removes password via model config)
    const userResponse = user.toJSON();

    return Response.created(
      {
        user: userResponse,
        token,
        expires_in: getExpiresIn(),
      },
      'Registration successful'
    );
  } catch (error) {
    console.error('Registration error:', error);
    return Response.serverError('Failed to register user');
  }
}
