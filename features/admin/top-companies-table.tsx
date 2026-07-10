import type { TopCompany } from "@/lib/admin/queries";

export function TopCompaniesTable({ companies }: { companies: TopCompany[] }) {
  return (
    <div className="ring-foreground/10 overflow-x-auto rounded-xl ring-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left">
            <th className="px-4 py-2 font-medium">Company</th>
            <th className="px-4 py-2 text-right font-medium">Runs</th>
            <th className="px-4 py-2 text-right font-medium">Avg cost</th>
            <th className="px-4 py-2 text-right font-medium">Avg credits</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.companyName} className="border-b last:border-0">
              <td className="px-4 py-2">{c.companyName}</td>
              <td className="px-4 py-2 text-right tabular-nums">{c.runs}</td>
              <td className="px-4 py-2 text-right tabular-nums">${c.avgCostUsd.toFixed(3)}</td>
              <td className="px-4 py-2 text-right tabular-nums">
                {c.avgCreditsCharged.toFixed(1)}
              </td>
            </tr>
          ))}
          {companies.length === 0 && (
            <tr>
              <td colSpan={4} className="text-muted-foreground px-4 py-6 text-center">
                No runs yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
