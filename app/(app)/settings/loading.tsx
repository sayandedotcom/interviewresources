import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-16">
      <div className="mb-10 space-y-3 text-center">
        <Skeleton className="mx-auto h-3 w-20" />
        <Skeleton className="mx-auto h-8 w-32" />
        <Skeleton className="mx-auto h-4 w-48" />
      </div>

      <div className="space-y-6">
        <div className="bg-card border-border rounded-xl border p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="bg-tertiary/10 h-11 w-11 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </div>

        <div className="bg-card border-border rounded-xl border p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="bg-tertiary/10 h-11 w-11 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        </div>

        <div className="bg-card border-border rounded-xl border p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="bg-tertiary/10 h-11 w-11 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
        </div>

        <div className="border-destructive/20 bg-destructive/5 rounded-xl border p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="bg-destructive/10 h-11 w-11 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
