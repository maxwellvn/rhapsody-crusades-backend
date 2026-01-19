import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import * as Response from '@/lib/response';
import TestimonyCategory from '@/models/TestimonyCategory';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get active categories sorted by order
    const categories = await TestimonyCategory.find({ active: true }).sort({ order: 1 });

    return Response.success(
      categories.map((c) => c.toJSON()),
      'Categories retrieved successfully'
    );
  } catch (error) {
    console.error('Get categories error:', error);
    return Response.serverError('Failed to get categories');
  }
}
