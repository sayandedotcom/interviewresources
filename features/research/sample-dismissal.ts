/**
 * Whether this browser still wants the sample report in the sidebar.
 *
 * Only the flag is stored. The report itself is a bundled module
 * (`lib/research/sample-report.ts`), so there is nothing to persist beyond
 * "this user is done with it" — keeping the payload out of `localStorage`
 * avoids a parse on every load, a quota to worry about, and a stale copy that
 * would outlive a change to the report schema.
 *
 * Guarded like the form-draft helpers in `./form-schema.ts`: safe to call
 * during SSR, and wrapped in `try/catch` because private-browsing modes can
 * make any `localStorage` access throw.
 */
export const SAMPLE_DISMISSED_KEY = "sample-report-dismissed";

export function isSampleDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SAMPLE_DISMISSED_KEY) === "1";
  } catch {
    // Showing one extra row beats taking out the whole sidebar.
    return false;
  }
}

export function dismissSample(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAMPLE_DISMISSED_KEY, "1");
  } catch {
    // Nothing to do — the row reappears next visit, which beats throwing.
  }
}
