import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { signToken, getExpiresIn } from '@/lib/jwt';
import { validate } from '@/lib/validator';
import * as Response from '@/lib/response';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validator = validate(body)
      .required('email', 'Email is required')
      .email('email', 'Invalid email format')
      .required('password', 'Password is required');

    if (validator.fails()) {
      return Response.validationError(validator.errors());
    }

    await connectDB();

    // Find user by email (case-insensitive)
    const user = await User.findOne({ email: body.email.toLowerCase() });
    if (!user) {
      return Response.error('Invalid email or password', 401);
    }

    // Verify password
    const isValidPassword = await verifyPassword(body.password, user.password);
    if (!isValidPassword) {
      return Response.error('Invalid email or password', 401);
    }

    // Generate token
    const token = signToken({
      userId: user._id.toHexString(),
      email: user.email,
    });

    // Return user without password (toJSON transform already removes password via model config)
    const userResponse = user.toJSON();

    return Response.success(
      {
        user: userResponse,
        token,
        expires_in: getExpiresIn(),
      },
      'Login successful'
    );
  } catch (error) {
    console.error('Login error:', error);
    return Response.serverError('Failed to login');
  }
}
