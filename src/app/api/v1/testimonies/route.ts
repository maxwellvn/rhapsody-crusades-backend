import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth, optionalAuth } from '@/lib/auth';
import { validate } from '@/lib/validator';
import * as Response from '@/lib/response';
import Testimony from '@/models/Testimony';
import TestimonyCategory from '@/models/TestimonyCategory';
import Event from '@/models/Event';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('event_id');
    const categoryId = searchParams.get('category_id');
    const categorySlug = searchParams.get('category');
    const my = searchParams.get('my') === '1' || searchParams.get('my') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    const auth = await optionalAuth(request);

    await connectDB();

    // Build query
    const query: Record<string, unknown> = {};

    // If user is authenticated and requesting their own testimonies
    if (my && auth.user) {
      query.user_id = auth.user._id.toHexString();
    } else if (auth.user) {
      // Show approved testimonies + own testimonies
      query.$or = [{ status: 'approved' }, { user_id: auth.user._id.toHexString() }];
    } else {
      // Public: only approved
      query.status = 'approved';
    }

    if (eventId) {
      query.event_id = parseInt(eventId, 10);
    }

    if (categoryId) {
      query.category_id = parseInt(categoryId, 10);
    } else if (categorySlug) {
      const category = await TestimonyCategory.findOne({ slug: categorySlug });
      if (category) {
        query.category_id = category.id;
      }
    }

    // Get total count
    const total = await Testimony.countDocuments(query);

    // Get testimonies
    const testimonies = await Testimony.find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Enrich with user, event, and category data
    const enrichedTestimonies = await Promise.all(
      testimonies.map(async (testimony) => {
        const [user, event, category] = await Promise.all([
          User.findById(testimony.user_id).select('full_name'),
          testimony.event_id ? Event.findOne({ id: testimony.event_id }).select('title') : null,
          testimony.category_id ? TestimonyCategory.findOne({ id: testimony.category_id }) : null,
        ]);

        return {
          ...testimony.toJSON(),
          user_name: user?.full_name,
          event_title: event?.title,
          category: category ? category.toJSON() : null,
          likes_count: testimony.likes.length,
          user_has_liked: auth.user ? testimony.likes.includes(auth.user._id.toHexString()) : false,
        };
      })
    );

    const response = Response.paginated(enrichedTestimonies, total, page, limit, 'Testimonies retrieved successfully');
    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Get testimonies error:', error);
    return Response.serverError('Failed to get testimonies');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return Response.unauthorized(auth.error);
    }

    const body = await request.json();

    // Accept both 'content' (frontend) and 'text' (legacy) field names
    const testimonyText = body.content || body.text;

    // Validate input
    const validator = validate({ ...body, text: testimonyText })
      .required('title', 'Title is required')
      .required('text', 'Testimony text is required')
      .optional('event_id')
      .optional('category_id')
      .optional('image');

    if (validator.fails()) {
      return Response.validationError(validator.errors());
    }

    await connectDB();

    // Create testimony
    const testimony = await Testimony.create({
      user_id: auth.user!._id.toHexString(),
      title: body.title,
      text: testimonyText,
      event_id: body.event_id ? parseInt(body.event_id, 10) : undefined,
      category_id: body.category_id ? parseInt(body.category_id, 10) : undefined,
      image: body.image,
      status: 'pending',
      likes: [],
    });

    const response = Response.created(testimony.toJSON(), 'Testimony submitted successfully');
    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Create testimony error:', error);
    return Response.serverError('Failed to create testimony');
  }
}
