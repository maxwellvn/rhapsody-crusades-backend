import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string>;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

export function success<T>(data: T, message: string = 'Success', statusCode: number = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status: statusCode }
  );
}

export function created<T>(data: T, message: string = 'Created successfully'): NextResponse<ApiResponse<T>> {
  return success(data, message, 201);
}

export function error(message: string, statusCode: number = 400, errors?: Record<string, string>): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      message,
      errors,
    },
    { status: statusCode }
  );
}

export function unauthorized(message: string = 'Unauthorized'): NextResponse<ApiResponse> {
  return error(message, 401);
}

export function forbidden(message: string = 'Forbidden'): NextResponse<ApiResponse> {
  return error(message, 403);
}

export function notFound(message: string = 'Not found'): NextResponse<ApiResponse> {
  return error(message, 404);
}

export function validationError(errors: Record<string, string>): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      message: 'Validation failed',
      errors,
    },
    { status: 422 }
  );
}

export function serverError(message: string = 'Internal server error'): NextResponse<ApiResponse> {
  return error(message, 500);
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  perPage: number,
  message: string = 'Success'
): NextResponse {
  const totalPages = Math.ceil(total / perPage);

  return NextResponse.json(
    {
      success: true,
      message,
      data: data,
      pagination: {
        total,
        page,
        per_page: perPage,
        total_pages: totalPages,
      },
    },
    { status: 200 }
  );
}

// Helper to add new token header if refreshed
export function withNewToken(response: NextResponse<unknown>, newToken: string | null): NextResponse<unknown> {
  if (newToken) {
    response.headers.set('x-new-token', newToken);
  }
  return response;
}
