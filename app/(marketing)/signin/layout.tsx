import { noIndexMetadata } from "@/lib/seo/metadata";

/**
 * Exists solely to carry metadata: signin/page.tsx is a client component, and
 * client components can't export `metadata`. The sign-in page is publicly
 * reachable but has no search value — indexing it would only split the brand
 * query with the landing page.
 */
export const metadata = noIndexMetadata;

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
