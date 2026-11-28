import { CheckoutFlow } from "../../features/checkout/CheckoutFlow";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ origen?: string | string[] }> }) {
  const { origen } = await searchParams;
  const fromCart = origen === "carrito";
  return <CheckoutFlow key={fromCart ? "cart" : "direct"} fromCart={fromCart} />;
}
