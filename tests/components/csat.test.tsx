import { act, renderHook, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PostDeliveryFeedback, usePostDeliveryFeedback, type FeedbackResult, type ReasonCatalog } from "../../src/features/csat/PostDeliveryFeedback";

const catalog: ReasonCatalog = { GOOD: [], REGULAR: [], BAD: [] };
it('hides the invitation without identity or eligibility', () => {
  const submit = vi.fn();
  const view = render(<PostDeliveryFeedback orderId="one" identity={null} eligible catalog={catalog} submit={submit} />);
  expect(screen.queryByText('Evaluar entrega')).toBeNull();
  view.rerender(<PostDeliveryFeedback orderId="one" identity="A" eligible={false} catalog={catalog} submit={submit} />);
  expect(screen.queryByText('Evaluar entrega')).toBeNull();
  expect(submit).not.toHaveBeenCalled();
});
it('clears incompatible reasons without deleting the comment', () => {
  const { result } = renderHook(() => usePostDeliveryFeedback(vi.fn()));
  act(() => { result.current.changeSentiment('GOOD'); result.current.setReasons(['FAST']); result.current.setComment('Mi experiencia'); });
  act(() => result.current.changeSentiment('BAD'));
  expect(result.current.reasons).toEqual([]); expect(result.current.comment).toBe('Mi experiencia');
});
it('retains the draft on a failed send and never retries automatically', async () => {
  const submit = vi.fn().mockRejectedValue(new Error('provider-private-detail'));
  const { result } = renderHook(() => usePostDeliveryFeedback(submit));
  act(() => { result.current.changeSentiment('REGULAR'); result.current.setComment('Conservar'); });
  await act(async () => { await result.current.send(); });
  expect(result.current.state).toBe('editing'); expect(result.current.comment).toBe('Conservar');
  expect(result.current.error).not.toContain('provider-private-detail'); expect(submit).toHaveBeenCalledTimes(1);
});
it.each(['submitted', 'duplicate', 'ineligible'] as const)('accepts the explicit result %s and clears private text', async outcome => {
  const { result } = renderHook(() => usePostDeliveryFeedback(async () => outcome));
  act(() => { result.current.changeSentiment('GOOD'); result.current.setComment('Privado'); });
  await act(async () => { await result.current.send(); });
  expect(result.current.state).toBe(outcome); expect(result.current.comment).toBe('');
});
it('blocks concurrent sends and ignores an aborted response after clearing', async () => {
  let finish!: (value: FeedbackResult) => void;
  const submit = vi.fn(() => new Promise<FeedbackResult>(resolve => { finish = resolve; }));
  const { result } = renderHook(() => usePostDeliveryFeedback(submit));
  act(() => result.current.changeSentiment('GOOD'));
  let first!: Promise<void>;
  act(() => { first = result.current.send(); void result.current.send(); });
  expect(submit).toHaveBeenCalledTimes(1);
  act(() => result.current.clear());
  await act(async () => { finish('submitted'); await first; });
  expect(result.current.state).toBe('editing'); expect(result.current.sentiment).toBeUndefined();
});
