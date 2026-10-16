import { OrderConfirmationLookup } from "../../../../features/checkout/OrderConfirmationLookup";

type PageProps = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ operationId?: string | string[] }>;
};

export default async function OrderConfirmationPage({ params, searchParams }: PageProps) {
  const [{ orderId }, query] = await Promise.all([params, searchParams]);
  return (
    <OrderConfirmationLookup
      orderId={orderId}
      operationId={typeof query.operationId === "string" ? query.operationId : undefined}
    />
  );
}
