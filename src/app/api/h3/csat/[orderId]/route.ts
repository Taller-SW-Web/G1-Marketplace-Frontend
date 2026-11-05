import { NextRequest, NextResponse } from 'next/server';
import { marketplaceApiUrl } from '@/shared/server/marketplace-url';
import { errorResponse, mutationGuard, privateHeaders, sessionEntry } from '@/features/wishlist/server';
export async function POST(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const rejected = mutationGuard(request); if (rejected) return rejected;
  if (process.env.H4_CONNECTED_TEST !== 'true') return errorResponse('SANDBOX_DISABLED', 404);
  const session = sessionEntry(request);
  const token = session && process.env[`H3_SANDBOX_TOKEN_${session.identity}`];
  if (!token) return errorResponse('UNAUTHORIZED', 401);
  const { orderId } = await context.params;
  if (!/^PED-[0-9]{4}-[0-9]{5,}$/.test(orderId) || orderId.length > 100) return errorResponse('INVALID_REQUEST', 400);
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse('INVALID_REQUEST', 400); }
  try {
    const upstream = await fetch(new URL(`/api/v1/orders/${orderId}/csat`, marketplaceApiUrl()), {
      method: 'POST', cache: 'no-store', redirect: 'error',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]),
    });
    if (upstream.status === 201) return new NextResponse(null, { status: 201, headers: privateHeaders });
    const payload = await upstream.json();
    const allowed: Record<number, string[]> = { 400: ['INVALID_REQUEST'], 401: ['UNAUTHORIZED'],
      403: ['ORDER_FORBIDDEN'], 404: ['ORDER_NOT_AVAILABLE'], 409: ['CSAT_ALREADY_SUBMITTED', 'PROMPT_NOT_ELIGIBLE'],
      422: ['ORDER_NOT_DELIVERED'], 503: ['CSAT_UNAVAILABLE', 'SALES_UNAVAILABLE', 'AUTH_UNAVAILABLE'] };
    if (allowed[upstream.status]?.includes(payload?.code)) return errorResponse(payload.code, upstream.status);
  } catch { /* An uncertain result must not become UI confirmation. */ }
  return errorResponse('RESULT_UNCERTAIN', 502);
}
