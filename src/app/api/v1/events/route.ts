import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth, optionalAuth, generateQRCode } from '@/lib/auth';
import { validate } from '@/lib/validator';
import * as Response from '@/lib/response';
import Event from '@/models/Event';
import Ticket from '@/models/Ticket';
import User from '@/models/User';
import Notification from '@/models/Notification';

const EXTERNAL_CRUSADES_URL = process.env.EXTERNAL_CRUSADES_URL || 'https://rhapsodycrusades.org/data/crusades.json';

interface ExternalCrusade {
  id: number;
  title: string;
  description: string;
  date: string;
  time?: string;
  venue: string;
  address?: string;
  country?: string;
  city?: string;
  image?: string;
}

async function fetchExternalCrusades(): Promise<ExternalCrusade[]> {
  try {
    const response = await fetch(EXTERNAL_CRUSADES_URL, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });
    if (response.ok) {
      const data = await response.json();
      // Ensure we always return an array
      if (Array.isArray(data)) {
        return data;
      }
      // Handle case where data might be wrapped in an object
      if (data && Array.isArray(data.crusades)) {
        return data.crusades;
      }
      if (data && Array.isArray(data.data)) {
        return data.data;
      }
      console.warn('External crusades API returned non-array:', typeof data);
    }
  } catch (error) {
    console.error('Failed to fetch external crusades:', error);
  }
  return [];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const upcoming = searchParams.get('upcoming') === 'true';
    const featured = searchParams.get('featured') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    const auth = await optionalAuth(request);

    await connectDB();

    // Build query
    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { venue: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    const today = new Date().toISOString().split('T')[0];
    if (upcoming) {
      query.date = { $gte: today };
    }

    if (featured) {
      query.featured = true;
    }

    // Get local events
    let events = await Event.find(query)
      .sort({ date: upcoming ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Fetch external crusades and merge
    const externalCrusades = await fetchExternalCrusades();
    const externalEvents = externalCrusades
      .filter((c) => {
        if (search) {
          const searchLower = search.toLowerCase();
          return (
            c.title?.toLowerCase().includes(searchLower) ||
            c.venue?.toLowerCase().includes(searchLower) ||
            c.address?.toLowerCase().includes(searchLower)
          );
        }
        if (upcoming && c.date < today) return false;
        return true;
      })
      .map((c) => ({
        ...c,
        category: 'Crusade',
        featured: true,
        created_by: 'external',
        external: true,
      }));

    // Merge and dedupe by id
    const localEventIds = new Set(events.map((e) => e.id));
    const mergedEvents = [
      ...events.map((e) => e.toJSON()),
      ...externalEvents.filter((e) => !localEventIds.has(e.id)),
    ];

    // Sort: upcoming first (nearest date), then past (most recent)
    mergedEvents.sort((a, b) => {
      const aDate = a.date;
      const bDate = b.date;
      const aIsUpcoming = aDate >= today;
      const bIsUpcoming = bDate >= today;

      if (aIsUpcoming && !bIsUpcoming) return -1;
      if (!aIsUpcoming && bIsUpcoming) return 1;
      if (aIsUpcoming && bIsUpcoming) return aDate.localeCompare(bDate);
      return bDate.localeCompare(aDate);
    });

    // Add registration count and user registration status
    const eventsWithCounts = await Promise.all(
      mergedEvents.slice(0, limit).map(async (event) => {
        const registrationCount = await Ticket.countDocuments({ event_id: event.id });
        let userRegistered = false;

        if (auth.user) {
          const ticket = await Ticket.findOne({
            event_id: event.id,
            user_id: auth.user._id.toHexString(),
          });
          userRegistered = !!ticket;
        }

        return {
          ...event,
          registration_count: registrationCount,
          user_registered: userRegistered,
        };
      })
    );

    const response = Response.success(eventsWithCounts, 'Events retrieved successfully');
    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Get events error:', error);
    return Response.serverError('Failed to get events');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return Response.unauthorized(auth.error);
    }

    const body = await request.json();

    // Validate input
    const validator = validate(body)
      .required('title', 'Title is required')
      .required('description', 'Description is required')
      .required('date', 'Date is required')
      .required('venue', 'Venue is required')
      .optional('time')
      .optional('address')
      .optional('country')
      .optional('city')
      .optional('category')
      .optional('image')
      .optional('capacity');

    if (validator.fails()) {
      return Response.validationError(validator.errors());
    }

    await connectDB();

    // Generate new event ID (starting at 1000 to avoid conflicts with external)
    const lastEvent = await Event.findOne().sort({ id: -1 });
    const newId = lastEvent ? Math.max(lastEvent.id + 1, 1000) : 1000;

    // Create event
    const event = await Event.create({
      id: newId,
      title: body.title,
      description: body.description,
      date: body.date,
      time: body.time,
      venue: body.venue,
      address: body.address,
      country: body.country || auth.user!.country,
      city: body.city,
      category: body.category || 'Crusade',
      image: body.image,
      capacity: body.capacity,
      featured: false,
      created_by: auth.user!._id.toHexString(),
    });

    // Notify users in the same country/city
    const notifyQuery: Record<string, unknown> = {};
    if (body.country) {
      notifyQuery.country = body.country;
    }
    if (body.city) {
      notifyQuery.city = body.city;
    }

    if (Object.keys(notifyQuery).length > 0) {
      const usersToNotify = await User.find(notifyQuery).select('_id');
      const notifications = usersToNotify
        .filter((u) => u._id.toHexString() !== auth.user!._id.toHexString())
        .map((u) => ({
          user_id: u._id.toHexString(),
          type: 'event' as const,
          title: 'New Crusade Near You!',
          message: `${body.title} is happening in ${body.city || body.country}. Register now!`,
          data: { event_id: event.id },
        }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }

    const response = Response.created(event.toJSON(), 'Event created successfully');
    return Response.withNewToken(response, auth.newToken);
  } catch (error) {
    console.error('Create event error:', error);
    return Response.serverError('Failed to create event');
  }
}
