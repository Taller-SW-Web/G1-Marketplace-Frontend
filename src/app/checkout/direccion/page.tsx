import { CheckoutFlow } from "../../../features/checkout/CheckoutFlow";

// V-010 route from the spec; the checkout keeps its single-page flow starting at the address step.
export default function CheckoutAddressPage() {
  return <CheckoutFlow />;
}
