import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The report page awaits a session lookup and a join before it renders a byte.
 * Without this fallback the router sits on the previous page for a second or
 * two and the click reads as if it never landed.
 *
 * Shaped to match the real page: `max-w-6xl px-1` (see `page.tsx`), and an
 * eyebrow + button cluster header rather than a page title — `ReportView` opens
 * with "Gathered resources" and the action row, and never renders a heading, so
 * a title-shaped skeleton would resolve into empty space.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-1 pb-24">
      <div className="mt-6">
        <div className="flex items-center justify-between pb-3">
          <Skeleton className="h-3 w-40" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-7 w-36 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
        </div>
        <Separator />

        <div className="mt-14 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
          </div>

          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-11/12" />
                <Skeleton className="h-5 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
