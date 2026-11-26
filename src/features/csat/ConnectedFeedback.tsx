'use client';
import { PostDeliveryFeedback } from './PostDeliveryFeedback';
import { submitConnectedFeedback } from './connected-transport';
import { useWishlist } from '@/features/wishlist/WishlistProvider';
export function ConnectedFeedback({ orderId }: { orderId: string }) {
  const { session } = useWishlist();
  return <PostDeliveryFeedback orderId={orderId} identity={session.identity} eligible
    catalog={{ GOOD: [], REGULAR: [], BAD: [] }}
    submit={(draft, signal) => submitConnectedFeedback(orderId, draft, signal)} />;
}
