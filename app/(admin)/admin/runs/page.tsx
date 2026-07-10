import { getRecentRuns } from "@/lib/admin/queries";

import { RunsTable } from "@/features/admin/runs-table";

export const dynamic = "force-dynamic";

export default async function AdminRunsPage() {
  const runs = await getRecentRuns(100);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-lg font-semibold">Recent runs</h1>
      <RunsTable runs={runs} />
    </div>
  );
}
