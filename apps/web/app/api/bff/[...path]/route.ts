import { NextRequest, NextResponse } from 'next/server';

const NODE_API_BASE_URL = process.env.NODE_API_BASE_URL || 'http://127.0.0.1:4000';
const NODE_API_HTTP_KEY = process.env.NODE_API_HTTP_KEY;

/**
 * Universal Next.js BFF proxy handler.
 * Adds mandatory server-only x-http-key header before forwarding to Node.js API.
 * Any client-supplied x-http-key is strictly discarded.
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
  const targetPath = `/api/${path.join('/')}`;
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
      responseHeaders.set(key, value);
    });

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

