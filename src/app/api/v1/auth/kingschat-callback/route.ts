import { NextRequest, NextResponse } from 'next/server';

const APP_SCHEME = process.env.APP_SCHEME || 'rhapsodycrusades';

function buildRedirectHtml(accessToken: string | null, refreshToken: string | null, error: string | null = null) {
  // Build deep link URL
  let deepLink = `${APP_SCHEME}://auth/callback`;
  const params = new URLSearchParams();

  if (error) {
    params.append('status', 'error');
    params.append('error', error);
  } else if (accessToken) {
    params.append('accessToken', accessToken);
    if (refreshToken) {
      params.append('refreshToken', refreshToken);
    }
  }

  if (params.toString()) {
    deepLink += `?${params.toString()}`;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirecting to Rhapsody Crusades App...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background-color: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 20px;
    }
    h1 {
      color: #333;
      font-size: 24px;
    }
    p {
      color: #666;
      margin: 20px 0;
    }
    a {
      display: inline-block;
      background-color: #007bff;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
    }
    a:hover {
      background-color: #0056b3;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${error ? 'Authentication Failed' : 'KingsChat Authentication Successful'}</h1>
    <p>${error ? error : 'Redirecting to the Rhapsody Crusades app...'}</p>
    <p>If you're not redirected automatically, tap the button below:</p>
    <a href="${deepLink}">Open App</a>
  </div>
  <script>
    // Try to redirect immediately
    window.location.href = "${deepLink}";
  </script>
</body>
</html>
  `;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const accessToken = searchParams.get('accessToken') || searchParams.get('access_token');
  const refreshToken = searchParams.get('refreshToken') || searchParams.get('refresh_token');
  const error = searchParams.get('error');

  const html = buildRedirectHtml(accessToken, refreshToken, error);

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

// Handle POST requests (KingsChat OAuth sends token via POST with post_redirect=true)
export async function POST(request: NextRequest) {
  try {
    // Try to parse as form data (application/x-www-form-urlencoded)
    const contentType = request.headers.get('content-type') || '';
    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let error: string | null = null;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      accessToken = formData.get('accessToken')?.toString() || formData.get('access_token')?.toString() || null;
      refreshToken = formData.get('refreshToken')?.toString() || formData.get('refresh_token')?.toString() || null;
      error = formData.get('error')?.toString() || null;
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      accessToken = body.accessToken || body.access_token || null;
      refreshToken = body.refreshToken || body.refresh_token || null;
      error = body.error || null;
    } else {
      // Try form data as fallback
      try {
        const formData = await request.formData();
        accessToken = formData.get('accessToken')?.toString() || formData.get('access_token')?.toString() || null;
        refreshToken = formData.get('refreshToken')?.toString() || formData.get('refresh_token')?.toString() || null;
        error = formData.get('error')?.toString() || null;
      } catch {
        // If form data parsing fails, return error
        error = 'Invalid request format';
      }
    }

    const html = buildRedirectHtml(accessToken, refreshToken, error);

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (err) {
    console.error('KingsChat callback error:', err);
    const html = buildRedirectHtml(null, null, 'Failed to process authentication');

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
}
