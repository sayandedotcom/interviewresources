import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The report page awaits a session lookup and a join before it renders a byte.
 * Without this fallback the router sits on the previous page for a second or
 * two and the click reads as if it never landed.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-1 pb-24">
      <div className="mt-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-3 w-48" />
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
  );
}
