import { OrderConfirmation } from "@/components/checkout/order-confirmation";

export const dynamic = "force-dynamic";

export default function CheckoutConfirmationPage({
  searchParams,
}: {
  searchParams: { order?: string };
}) {
  const orderId = searchParams.order;
  if (!orderId) {
    return <p className="text-sm text-red-600">Missing order id.</p>;
  }

  return <OrderConfirmation orderId={orderId} />;
}
