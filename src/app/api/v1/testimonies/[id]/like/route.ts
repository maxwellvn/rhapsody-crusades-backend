import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import * as Response from '@/lib/response';
import Testimony from '@/models/Testimony';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await verifyAuth(request);
    if (auth.error) {
      return Response.unauthorized(auth.error);
    }

    await connectDB();

    const testimony = await Testimony.findById(id);

    if (!testimony) {
      return Response.notFound('Testimony not found');
    }

    const userId = auth.user!._id.toHexString();

    // Toggle like
    const likeIndex = testimony.likes.indexOf(userId);
    if (likeIndex === -1) {
      // Add like
      testimony.likes.push(userId);
    } else {
      // Remove like
      testimony.likes.splice(likeIndex, 1);
    }

    await testimony.save();

    const response = Response.success(
      {
        ...testimony.toJSON(),
        likes_count: testimony.likes.length,
        user_has_liked: testimony.likes.includes(userId),
      },
      likeIndex === -1 ? 'Testimony liked' : 'Testimony unliked'
    );

    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Toggle like error:', error);
    return Response.serverError('Failed to toggle like');
  }
}
