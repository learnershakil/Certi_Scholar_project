import { NextRequest, NextResponse } from 'next/server';

const NODE_API_BASE_URL = process.env.NODE_API_BASE_URL || 'http://127.0.0.1:4000';
const NODE_API_HTTP_KEY =
  process.env.NODE_API_HTTP_KEY ||
  (process.env.NODE_ENV !== 'production'
    ? 'dev-secret-key-certischolar-bff-proxy-secure-token-2026'
    : undefined);

/**
 * Universal Next.js BFF proxy handler.
 * - Injects mandatory server-only x-http-key header before forwarding to Node.js API.
 * - Intercepts OTP verification to set secure HttpOnly session cookies.
 * - Forwards HttpOnly session cookie as Authorization: Bearer <token>.
 * - Provides native logout endpoint clearing the session.
 */
async function proxyRequest(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (!NODE_API_HTTP_KEY) {
    console.error('[BFF CRITICAL] NODE_API_HTTP_KEY is not configured in server environment.');
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVICE_GATEWAY_MISCONFIGURED',
          message: 'Internal Gateway Error: Server service key not configured.',
        },
      },
      { status: 500 }
    );
  }

  const { path } = await params;
  const joinedPath = path.join('/');
  const targetPath = `/api/${joinedPath}`;

  // Dedicated BFF logout endpoint
  if (joinedPath === 'v1/auth/logout' && request.method.toUpperCase() === 'POST') {
    const logoutRes = NextResponse.json({ success: true, message: 'Logged out successfully' });
    logoutRes.cookies.set('certischolar_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });
    return logoutRes;
  }

  const targetUrl = new URL(targetPath, NODE_API_BASE_URL);

  // Preserve query string
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  // Construct forwarded headers
  const forwardedHeaders = new Headers();
  request.headers.forEach((value, key) => {
    // Exclude hop-by-hop headers and strip client-provided x-http-key
    const lowerKey = key.toLowerCase();
    if (
      lowerKey !== 'host' &&
      lowerKey !== 'connection' &&
      lowerKey !== 'x-http-key'
    ) {
      forwardedHeaders.set(key, value);
    }
  });

  // Inject trusted server-only key
  forwardedHeaders.set('x-http-key', NODE_API_HTTP_KEY);

  // If HttpOnly session cookie exists and no Authorization header supplied, attach Bearer token
  const sessionToken = request.cookies.get('certischolar_session')?.value;
  if (sessionToken && !forwardedHeaders.has('authorization')) {
    forwardedHeaders.set('authorization', `Bearer ${sessionToken}`);
  }

  // Determine body
  const method = request.method.toUpperCase();
  let body: BodyInit | null = null;
  if (method !== 'GET' && method !== 'HEAD') {
    body = await request.arrayBuffer();
  }

  try {
    const apiResponse = await fetch(targetUrl.toString(), {
      method,
      headers: forwardedHeaders,
      body,
      // @ts-expect-error duplex is valid in Node/Next fetch
      duplex: 'half',
    });

    const responseData = await apiResponse.arrayBuffer();
    const responseHeaders = new Headers();

    apiResponse.headers.forEach((value, key) => {
      // Don't forward transfer-encoding
      if (key.toLowerCase() !== 'transfer-encoding') {
        responseHeaders.set(key, value);
      }
    });

    // Check if this was a successful OTP verify call: set HttpOnly cookie
    if (joinedPath === 'v1/auth/otp/verify' && apiResponse.ok) {
      try {
        const text = new TextDecoder().decode(responseData);
        const json = JSON.parse(text);
        if (json?.data?.token) {
          const cookieRes = NextResponse.json(json, {
            status: apiResponse.status,
            statusText: apiResponse.statusText,
          });
          cookieRes.cookies.set('certischolar_session', json.data.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60, // 7 days
          });
          return cookieRes;
        }
      } catch (_) {}
    }

    return new NextResponse(responseData, {
      status: apiResponse.status,
      statusText: apiResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'BFF Proxy Connection Failure';
    console.error(`[BFF PROXY ERROR] Failed to proxy to ${targetUrl}:`, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BFF_PROXY_ERROR',
          message: `Unable to connect to upstream CertiScholar Node API service: ${message}`,
        },
      },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;

