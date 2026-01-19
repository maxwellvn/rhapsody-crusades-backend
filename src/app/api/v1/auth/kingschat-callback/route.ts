import { NextRequest, NextResponse } from 'next/server';

const APP_SCHEME = process.env.APP_SCHEME || 'rhapsodycrusades';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const accessToken = searchParams.get('accessToken');
  const refreshToken = searchParams.get('refreshToken');

  // Build deep link URL
  let deepLink = `${APP_SCHEME}://auth/callback`;
  const params = new URLSearchParams();

  if (accessToken) {
    params.append('accessToken', accessToken);
  }
  if (refreshToken) {
    params.append('refreshToken', refreshToken);
  }

  if (params.toString()) {
    deepLink += `?${params.toString()}`;
  }

  // Return HTML page with auto-redirect
  const html = `
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
    <h1>KingsChat Authentication Successful</h1>
    <p>Redirecting to the Rhapsody Crusades app...</p>
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

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
