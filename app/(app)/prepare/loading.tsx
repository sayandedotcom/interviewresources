import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shaped to match `ResearchExperience` exactly — `max-w-6xl px-5`, and the same
 * `xl` two-column split with the estimate rail on the right. A narrower skeleton
 * loads fine and then jumps sideways the moment the real form arrives, which
 * reads as the page breaking rather than the page finishing.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-24">
      <div className="mt-6 xl:grid xl:grid-cols-[minmax(0,1fr)_14rem] xl:gap-5">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardContent className="space-y-4">
              <Skeleton className="h-3 w-20" />
              <div className="grid gap-5 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <Skeleton className="h-3 w-24" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-28" />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <Skeleton className="h-3 w-28" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-32" />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Effort: three equal cards from sm, matching EffortPicker's grid. */}
          <Card>
            <CardContent className="space-y-4">
              <Skeleton className="h-3 w-16" />
              <div className="grid gap-2 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-9 w-44 rounded-full" />
          </div>
        </div>

        {/* The estimate rail. Only present from xl, exactly like the real one. */}
        <aside className="hidden h-full w-full xl:block">
          <Card className="ring-border sticky top-6 rounded-2xl shadow-[var(--shadow-md)]">
            <CardContent className="space-y-3">
              <Skeleton className="h-3 w-20" />
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="size-20 rounded-full" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
