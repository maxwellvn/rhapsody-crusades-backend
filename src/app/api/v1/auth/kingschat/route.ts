import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { signToken, getExpiresIn } from '@/lib/jwt';
import { validate } from '@/lib/validator';
import * as Response from '@/lib/response';
import User from '@/models/User';
import Notification from '@/models/Notification';

const KINGSCHAT_API_URL = process.env.KINGSCHAT_API_URL || 'https://connect.kingsch.at/api/profile';

interface KingsChatProfile {
  id: string;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar?: string;
  country?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Accept both access_token and accessToken for compatibility
    const accessToken = body.access_token || body.accessToken;

    // Validate input
    if (!accessToken) {
      return Response.validationError({ access_token: 'Access token is required' });
    }

    // Fetch user info from KingsChat
    const kingsResponse = await fetch(KINGSCHAT_API_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!kingsResponse.ok) {
      return Response.error('Failed to authenticate with KingsChat', 401);
    }

    const kingsProfile: KingsChatProfile = await kingsResponse.json();

    await connectDB();

    // Try to find existing user by KingsChat username or email
    let user = await User.findOne({
      $or: [
        { kingschat_username: kingsProfile.username },
        ...(kingsProfile.email ? [{ email: kingsProfile.email.toLowerCase() }] : []),
      ],
    });

    if (user) {
      // Update KingsChat username if not set
      if (!user.kingschat_username) {
        user.kingschat_username = kingsProfile.username;
        await user.save();
      }
    } else {
      // Create new user from KingsChat data
      const fullName =
        kingsProfile.display_name ||
        [kingsProfile.first_name, kingsProfile.last_name].filter(Boolean).join(' ') ||
        kingsProfile.username;

      // Generate a random password for KingsChat users
      const randomPassword = await hashPassword(Math.random().toString(36).substring(2, 15));

      user = await User.create({
        email: kingsProfile.email?.toLowerCase() || `${kingsProfile.username}@kingschat.user`,
        password: randomPassword,
        full_name: fullName,
        country: kingsProfile.country || 'Unknown',
        kingschat_username: kingsProfile.username,
        avatar: kingsProfile.avatar,
      });

      // Create welcome notification
      await Notification.create({
        user_id: user._id.toHexString(),
        type: 'system',
        title: 'Welcome to Rhapsody Crusades!',
        message: 'Thank you for joining us via KingsChat. Explore upcoming crusades and register for events.',
      });
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
      'KingsChat authentication successful'
    );
  } catch (error) {
    console.error('KingsChat auth error:', error);
    return Response.serverError('Failed to authenticate with KingsChat');
  }
}
