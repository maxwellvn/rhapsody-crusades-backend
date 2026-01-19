import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import * as Response from '@/lib/response';
import TestimonyCategory from '@/models/TestimonyCategory';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    await connectDB();

    // Try to find by numeric ID first, then by slug
    let category = null;
    const numericId = parseInt(id, 10);

    if (!isNaN(numericId)) {
      category = await TestimonyCategory.findOne({ id: numericId });
    }

    if (!category) {
      category = await TestimonyCategory.findOne({ slug: id });
    }

    if (!category) {
      return Response.notFound('Category not found');
    }

    return Response.success(category.toJSON(), 'Category retrieved successfully');
  } catch (error) {
    console.error('Get category error:', error);
    return Response.serverError('Failed to get category');
  }
}
