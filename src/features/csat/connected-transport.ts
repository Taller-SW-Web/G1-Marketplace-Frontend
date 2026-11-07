import type { FeedbackDraft, FeedbackResult } from './PostDeliveryFeedback';

export async function submitConnectedFeedback(orderId: string, draft: FeedbackDraft, signal: AbortSignal): Promise<FeedbackResult> {
  const response = await fetch(`/api/h3/csat/${encodeURIComponent(orderId)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft), signal,
  });
  if (response.status === 201) return 'submitted';
  const body = await response.json();
  if (response.status === 409 && body.code === 'CSAT_ALREADY_SUBMITTED') return 'duplicate';
  if ([403, 404, 409, 422].includes(response.status) && ['ORDER_FORBIDDEN', 'ORDER_NOT_AVAILABLE', 'PROMPT_NOT_ELIGIBLE', 'ORDER_NOT_DELIVERED'].includes(body.code)) return 'ineligible';
  throw new Error('Feedback not confirmed');
}
