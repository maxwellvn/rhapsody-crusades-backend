import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth, optionalAuth } from '@/lib/auth';
import { validate } from '@/lib/validator';
import * as Response from '@/lib/response';
import Testimony from '@/models/Testimony';
import TestimonyCategory from '@/models/TestimonyCategory';
import Event from '@/models/Event';
import User from '@/models/User';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await optionalAuth(request);

    await connectDB();

    const testimony = await Testimony.findById(id);

    if (!testimony) {
      return Response.notFound('Testimony not found');
    }

    // Check access: approved or own
    const isOwn = auth.user && testimony.user_id === auth.user._id.toHexString();
    if (testimony.status !== 'approved' && !isOwn) {
      return Response.notFound('Testimony not found');
    }

    // Enrich with user, event, and category data
    const [user, event, category] = await Promise.all([
      User.findById(testimony.user_id).select('full_name'),
      testimony.event_id ? Event.findOne({ id: testimony.event_id }).select('title') : null,
      testimony.category_id ? TestimonyCategory.findOne({ id: testimony.category_id }) : null,
    ]);

    const response = Response.success(
      {
        ...testimony.toJSON(),
        user_name: user?.full_name,
        event_title: event?.title,
        category: category ? category.toJSON() : null,
        likes_count: testimony.likes.length,
        user_has_liked: auth.user ? testimony.likes.includes(auth.user._id.toHexString()) : false,
      },
      'Testimony retrieved successfully'
    );

    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Get testimony error:', error);
    return Response.serverError('Failed to get testimony');
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await verifyAuth(request);
    if (auth.error) {
      return Response.unauthorized(auth.error);
    }

    const body = await request.json();

    // Accept both 'content' (frontend) and 'text' (legacy) field names
    const testimonyText = body.content !== undefined ? body.content : body.text;

    // Validate input
    const validator = validate(body)
      .optional('title')
      .optional('text')
      .optional('content')
      .optional('event_id')
      .optional('category_id')
      .optional('image');

    if (validator.fails()) {
      return Response.validationError(validator.errors());
    }

    await connectDB();

    const testimony = await Testimony.findById(id);

    if (!testimony) {
      return Response.notFound('Testimony not found');
    }

    // Only author can update
    if (testimony.user_id !== auth.user!._id.toHexString()) {
      return Response.forbidden('You can only edit your own testimonies');
    }

    // Cannot edit approved testimonies
    if (testimony.status === 'approved') {
      return Response.error('Cannot edit approved testimonies', 400);
    }

    // Update allowed fields
    if (body.title !== undefined) testimony.title = body.title;
    if (testimonyText !== undefined) testimony.text = testimonyText;
    if (body.event_id !== undefined) testimony.event_id = body.event_id ? parseInt(body.event_id, 10) : undefined;
    if (body.category_id !== undefined) testimony.category_id = body.category_id ? parseInt(body.category_id, 10) : undefined;
    if (body.image !== undefined) testimony.image = body.image;

    await testimony.save();

    const response = Response.success(testimony.toJSON(), 'Testimony updated successfully');
    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Update testimony error:', error);
    return Response.serverError('Failed to update testimony');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Only author can delete
    if (testimony.user_id !== auth.user!._id.toHexString()) {
      return Response.forbidden('You can only delete your own testimonies');
    }

    await Testimony.deleteOne({ _id: id });

    const response = Response.success(null, 'Testimony deleted successfully');
    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Delete testimony error:', error);
    return Response.serverError('Failed to delete testimony');
  }
}
