import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CONFIDENCE_META,
  categoryCode,
  categoryLabel,
} from "@/lib/research/display";
import {
  INTERVIEW_CATEGORIES,
  type InterviewCategory,
  type Report,
} from "@/lib/research/types";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </span>
  );
}

export function ReportView({
  report,
  costUsd,
  creditsCharged,
  canExport,
  company,
  onReset,
}: {
  report: Report;
  costUsd: number | null;
  creditsCharged: number | null;
  canExport: boolean;
  company: string;
  onReset?: () => void;
}) {
  // Predefined categories in taxonomy order, then custom rounds as first seen. The model
  // can also return a round the user never asked for (surfaced by loop-format discovery).
  const present = report.questions.map((q) => q.category);
  const order = [
    ...INTERVIEW_CATEGORIES.filter((cat) => present.includes(cat)),
    ...present.filter(
      (cat, i) =>
        !INTERVIEW_CATEGORIES.includes(cat as InterviewCategory) &&
        present.indexOf(cat) === i,
    ),
  ];
  const grouped = order.map((cat) => ({
    cat,
    questions: report.questions.filter((q) => q.category === cat),
  }));

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between pb-3">
        <SectionLabel>Scouting report</SectionLabel>
        <div className="flex items-center gap-4">
          {creditsCharged != null && (
            <span
              className="font-mono text-[11px] text-muted-foreground"
              title={costUsd != null ? `Metered cost $${costUsd.toFixed(4)}` : undefined}
            >
              {creditsCharged} credits
            </span>
          )}
          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadReport(report, company)}
            >
              <Download className="mr-1 h-4 w-4" />
              Export
            </Button>
          )}
          {onReset && (
            <Button variant="outline" size="sm" onClick={onReset}>
              New report
            </Button>
          )}
        </div>
      </div>
      <Separator />

      <section className="mt-5">
        <h2 className="font-display text-lg font-semibold tracking-tight">The company</h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-foreground">
          {report.companySnapshot}
        </p>
      </section>

      {report.likelyLoopStructure && (
        <section className="mt-6">
          <SectionLabel>The loop</SectionLabel>
          <p className="mt-2 border-l-2 border-primary pl-3 text-[15px] leading-relaxed text-foreground">
            {report.likelyLoopStructure}
          </p>
        </section>
      )}

      {report.interviewerSummary && (
        <Card className="mt-6">
          <CardContent>
            <SectionLabel>The interviewer</SectionLabel>
            <p className="mt-1.5 text-[15px] leading-relaxed text-foreground">
              {report.interviewerSummary}
            </p>
          </CardContent>
        </Card>
      )}

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold tracking-tight">Predicted questions</h2>
        <div className="mt-3 space-y-6">
          {grouped.map(({ cat, questions }) => (
            <div key={cat}>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
                  {categoryCode(cat)}
                </span>
                <h3 className="font-display text-sm font-semibold uppercase tracking-wide">
                  {categoryLabel(cat)}
                </h3>
              </div>
              <ul className="mt-2 space-y-3">
                {questions.map((q, i) => (
                  <li key={i}>
                    <Card>
                    <CardContent>
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-display text-[15px] font-medium leading-snug text-foreground">
                          {q.question}
                        </p>
                        <span
                          className={`shrink-0 font-mono text-[13px] leading-none ${
                            q.confidence === "low" ? "text-muted-foreground" : "text-primary"
                          }`}
                          title={`Confidence: ${CONFIDENCE_META[q.confidence].label}`}
                        >
                          {CONFIDENCE_META[q.confidence].signal}
                        </span>
                      </div>
                      <p className="font-display mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                        {q.rationale}
                      </p>
                      <details className="mt-2">
                        <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
                          Prep note
                        </summary>
                        <p className="font-display mt-1.5 text-[13.5px] leading-relaxed text-foreground">
                          {q.prepNote}
                        </p>
                      </details>
                      {q.evidenceUrls.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {q.evidenceUrls.map((url, j) => (
                            <Badge key={j} variant="outline" render={<a href={url} target="_blank" rel="noopener noreferrer" />}>
                              <span className="font-mono text-[10px]">{hostOf(url)}</span>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {report.prepPlan.length > 0 && (
        <section className="mt-8">
          <Separator className="mb-5" />
          <h2 className="font-display text-lg font-semibold tracking-tight">Prep plan</h2>
          <ol className="mt-2 space-y-1.5">
            {report.prepPlan.map((step, i) => (
              <li key={i} className="flex gap-3 text-[15px] text-foreground">
                <span className="font-mono text-[13px] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-display">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

/** Pro-only export. Client-side download, no round trip. */
function downloadReport(report: Report, company: string) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const slug = company.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "report";

  const a = document.createElement("a");
  a.href = url;
  a.download = `scouting-report-${slug}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}
