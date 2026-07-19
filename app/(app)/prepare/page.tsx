import { MAX_RUN_CREDITS, MIN_RUN_CREDITS, effortCredits, getBalance } from "@/lib/credits";
import { getCurrentUser } from "@/lib/session";

import { PrepareClient } from "@/features/research/prepare-client";

// The layout has already redirected anyone without a session, so the balance is
// always readable here. Fetching it server-side is what keeps the submit button
// from flashing "Buy credits" while a client `/api/me` roundtrip is in flight.
// Both reads are memoised, so the layout having already made them means this
// page costs no extra queries.
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) return null;

  const balance = await getBalance(user.id);

  return (
    <PrepareClient
      initialMe={{
        signedIn: true,
        user: { name: user.name, email: user.email, image: user.image },
        balance,
        maxRunCredits: MAX_RUN_CREDITS,
        minRunCredits: MIN_RUN_CREDITS,
        effortCredits: effortCredits(),
      }}
    />
  );
}
