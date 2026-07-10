/**
 * Browser-side file download plumbing, shared by the JSON and PDF exports.
 * Kept free of the PDF renderer so the component can import it eagerly while
 * jsPDF stays behind a dynamic import.
 */

/** Filename-safe form of the company name, e.g. "Acme Corp!" -> "acme-corp". */
export function reportSlug(company: string): string {
  return (
    company
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      // Strip the edge hyphens punctuation leaves behind, or "Acme Corp!" would
      // download as `scouting-report-acme-corp-.json` and "!!!" as `--.json`.
      .replace(/^-+|-+$/g, "") || "report"
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
