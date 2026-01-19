import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { generateResetToken } from '@/lib/auth';
import { validate } from '@/lib/validator';
import * as Response from '@/lib/response';
import User from '@/models/User';
import PasswordReset from '@/models/PasswordReset';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validator = validate(body).required('email', 'Email is required').email('email', 'Invalid email format');

    if (validator.fails()) {
      return Response.validationError(validator.errors());
    }

    await connectDB();

    // Find user by email
    const user = await User.findOne({ email: body.email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      return Response.success(
        {
          message: 'If an account exists with this email, a reset link has been sent.',
        },
        'Password reset requested'
      );
    }

    // Delete any existing reset tokens for this email
    await PasswordReset.deleteMany({ email: body.email.toLowerCase() });

    // Generate reset token
    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token
    await PasswordReset.create({
      email: body.email.toLowerCase(),
      token,
      expires_at: expiresAt,
    });

    // In production, you would send an email here
    // For now, return the token (remove in production)
    return Response.success(
      {
        message: 'If an account exists with this email, a reset link has been sent.',
        // Remove this in production - only for testing
        reset_token: token,
      },
      'Password reset requested'
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return Response.serverError('Failed to process password reset request');
  }
}
