import { db } from "@/lib/db/index";
import { productEvents } from "@/lib/db/schema";

export type ProductEventName =
  | "sign_in"
  | "checkout_started"
  | "payment_succeeded"
  | "payment_refunded"
  | "research_completed"
  | "research_failed"
  | "report_extended"
  | "report_exported"
  | "report_shared";

/**
 * Product telemetry must never break the user action it describes. Events are
 * first-party database rows, contain no report payload, and are safe to call
 * from server routes and auth hooks.
 */
export async function recordProductEvent(
  name: ProductEventName,
  userId: string | null,
  properties: Record<string, unknown> = {}
): Promise<void> {
  try {
    await db.insert(productEvents).values({ name, userId, properties });
  } catch (error) {
    console.error(`product event failed: ${name}`, error);
  }
}
