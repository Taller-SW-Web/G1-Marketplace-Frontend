import { notFound } from 'next/navigation';
import { sandboxEnabled } from '@/features/wishlist/server';
import { ConnectedFeedback } from '@/features/csat/ConnectedFeedback';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  if (!sandboxEnabled() || process.env.H4_CONNECTED_TEST !== 'true') notFound();
  const { orderId } = await params;
  return <div className="container"><h1>Evaluación conectada de prueba</h1><ConnectedFeedback orderId={orderId} /></div>;
}
