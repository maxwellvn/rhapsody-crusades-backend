import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { validate } from '@/lib/validator';
import * as Response from '@/lib/response';
import User from '@/models/User';
import PasswordReset from '@/models/PasswordReset';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validator = validate(body)
      .required('token', 'Reset token is required')
      .required('password', 'Password is required')
      .minLength('password', 6, 'Password must be at least 6 characters')
      .required('password_confirmation', 'Password confirmation is required')
      .confirmed('password', 'password_confirmation', 'Passwords do not match');

    if (validator.fails()) {
      return Response.validationError(validator.errors());
    }

    await connectDB();

    // Find valid reset token
    const resetRecord = await PasswordReset.findOne({
      token: body.token,
      expires_at: { $gt: new Date() },
    });

    if (!resetRecord) {
      return Response.error('Invalid or expired reset token', 400);
    }

    // Find user
    const user = await User.findOne({ email: resetRecord.email });
    if (!user) {
      return Response.error('User not found', 404);
    }

    // Hash new password
    const hashedPassword = await hashPassword(body.password);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    // Delete the used reset token
    await PasswordReset.deleteOne({ _id: resetRecord._id });

    return Response.success(
      {
        message: 'Password has been reset successfully',
      },
      'Password reset successful'
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return Response.serverError('Failed to reset password');
  }
}
