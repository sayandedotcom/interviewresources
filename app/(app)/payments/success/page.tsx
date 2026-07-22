import { PaymentSuccess } from "@/features/payments/payment-success";

/** Reads one value out of Next's searchParams, which may hand back an array. */
function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Dodo redirects here with `payment_id` and `status`. Both are read on the
 * server and handed down, so the client component never has to reach for
 * `useSearchParams` and drag a Suspense boundary along with it.
 */
export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  return <PaymentSuccess status={one(params.status)} paymentId={one(params.payment_id)} />;
}
