import { siteConfig } from "@/site";
import { jsPDF } from "jspdf";

import { CONFIDENCE_META, categoryCode, categoryLabel, groupByCategory } from "./display";
import type { ImportantLink, Report } from "./types";

/**
 * Renders a report as a print-ready PDF, entirely in the browser.
 *
 * This module pulls in jsPDF (~150 KB), so it is only ever reached through a
 * dynamic import from the download handler — a user who never exports a PDF
 * never pays for it.
 *
 * Layout is a single-column flow driven by a `y` cursor: every write goes
 * through `text()`, which wraps to the content width and starts a new page when
 * a line would cross the bottom margin. There is no measure-then-place pass, so
 * blocks that must stay together ask for headroom up front via `ensure()`.
 */

// A4 in points, the unit the document is created with.
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;
/** Baseline of the footer, and the floor every other write has to stay above. */
const FOOTER_Y = PAGE_H - 30;
const BOTTOM = FOOTER_Y - 16;

const INK: RGB = [24, 24, 27];
const MUTED: RGB = [113, 113, 122];
const RULE: RGB = [224, 224, 228];
/** A darkened form of the app's lime `--tertiary`, legible as ink on paper. */
const ACCENT: RGB = [86, 102, 0];

type RGB = [number, number, number];
type Style = "normal" | "bold" | "italic";

interface TextOpts {
  size?: number;
  style?: Style;
  color?: RGB;
  /** Left inset from the margin, for the hanging indent under a numbered item. */
  indent?: number;
  /** Multiplied by the font size to get the baseline-to-baseline distance. */
  leading?: number;
}

/**
 * The 14 standard PDF fonts encode WinAnsi, which has no glyph for the bullets
 * the UI uses for confidence, nor for the arrows and ellipses that LLM prose
 * tends to pick up. Left alone they render as mojibake, so fold them to ASCII.
 */
function sanitize(text: string): string {
  return text
    .replace(/[•●○▪·]/g, "-")
    .replace(/[→➔]/g, "->")
    .replace(/…/g, "...")
    .replace(/[\u00A0\u2007\u202F]/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
}

export async function buildReportPdf(report: Report, company: string): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const companyName = company.trim() || "the company";

  doc.setProperties({
    title: `Scouting report - ${companyName}`,
    subject: `Interview preparation for ${companyName}`,
    creator: siteConfig.name,
  });

  let y = MARGIN;

  /** Break to a new page unless `height` more points fit above the footer. */
  function ensure(height: number) {
    if (y + height > BOTTOM) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function text(body: string, opts: TextOpts = {}) {
    const { size = 9.5, style = "normal", color = INK, indent = 0, leading = 1.4 } = opts;

    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);

    const step = size * leading;
    // splitTextToSize measures with the font that is currently set, hence the order.
    for (const line of doc.splitTextToSize(sanitize(body), CONTENT_W - indent) as string[]) {
      ensure(step);
      doc.text(line, MARGIN + indent, y + size);
      y += step;
    }
  }

  /** Uppercase tracked label, the print equivalent of `<SectionLabel>`. */
  function eyebrow(label: string, color: RGB = MUTED) {
    ensure(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...color);
    doc.text(sanitize(label.toUpperCase()), MARGIN, y + 8, { charSpace: 1.2 });
    y += 16;
  }

  function heading(title: string) {
    ensure(46);
    y += 10;
    text(title, { size: 14, style: "bold", leading: 1.25 });
    y += 3;
    rule();
    y += 7;
  }

  function rule(color: RGB = RULE) {
    ensure(1);
    doc.setDrawColor(...color);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 1;
  }

  function link(label: string, url: string, indent = 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...ACCENT);
    // Long URLs would otherwise run off the page; the anchor stays clickable.
    const [line] = doc.splitTextToSize(sanitize(label), CONTENT_W - indent) as string[];
    ensure(11);
    doc.textWithLink(line, MARGIN + indent, y + 8, { url });
    y += 11;
  }

  // ---- Cover ------------------------------------------------------------

  eyebrow("Scouting report", ACCENT);
  text(companyName, { size: 26, style: "bold", leading: 1.15 });
  y += 4;
  text(
    `Generated ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })} - ${report.questions.length} predicted question${report.questions.length === 1 ? "" : "s"}`,
    { size: 9, color: MUTED }
  );
  y += 8;
  rule();

  // ---- The company ------------------------------------------------------

  // Null on a report that excluded the section; absent on one predating it.
  if (report.companySnapshot) {
    heading("The company");
    text(report.companySnapshot, { leading: 1.5 });
  }

  if (report.companyExplainer) {
    y += 10;
    eyebrow("In plain terms");
    text(report.companyExplainer, { style: "italic", leading: 1.5 });
  }

  if (report.likelyLoopStructure) {
    heading("The loop");
    text(report.likelyLoopStructure, { leading: 1.5 });
  }

  if (report.skillsRequired?.length) {
    heading("Skills required");
    for (const s of report.skillsRequired) {
      ensure(30);
      text(s.skill, { size: 10, style: "bold", leading: 1.3 });
      text(s.why, { size: 9, color: MUTED, leading: 1.45 });
      y += 6;
    }
  }

  if (report.interviewerSummary) {
    heading("The interviewer");
    text(report.interviewerSummary, { leading: 1.5 });
  }

  // ---- Predicted questions ----------------------------------------------

  heading("Predicted questions");

  let n = 0;
  for (const { cat, questions } of groupByCategory(report.questions)) {
    ensure(56);
    y += 6;
    eyebrow(`${categoryCode(cat)}  ${categoryLabel(cat)}`, ACCENT);

    for (const q of questions) {
      n += 1;
      // Keep the number, the question, and a first line of rationale together.
      ensure(58);
      text(`${n}. ${q.question}`, { size: 11, style: "bold", leading: 1.3 });
      y += 2;
      text(`Confidence: ${CONFIDENCE_META[q.confidence].label}`, { size: 8, color: MUTED });
      y += 4;
      text(q.rationale, { size: 9, color: MUTED, leading: 1.45 });
      y += 5;
      // Never strand the label at the foot of a page, away from what it labels.
      ensure(30);
      text("A strong answer covers", { size: 7.5, style: "bold", color: ACCENT });
      text(q.prepNote, { size: 9, leading: 1.45 });

      // evidenceUrls is typed as bare strings, so the model can hand back
      // something unlinkable. A dead annotation helps nobody — drop it.
      const evidence = q.evidenceUrls.filter(isHttpUrl);
      if (evidence.length > 0) {
        y += 4;
        for (const url of evidence) link(hostOf(url), url);
      }
      y += 14;
    }
  }

  // ---- Prep plan --------------------------------------------------------

  if (report.prepPlan.length > 0) {
    heading("Prep plan");
    report.prepPlan.forEach((step, i) => {
      ensure(24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(String(i + 1).padStart(2, "0"), MARGIN, y + 9);
      text(step, { indent: 24, leading: 1.45 });
      y += 6;
    });
  }

  // ---- Link sections ----------------------------------------------------

  function linkSection(title: string, items: ImportantLink[] | null | undefined) {
    if (!items || items.length === 0) return;
    heading(title);
    for (const item of items) {
      ensure(46);
      text(item.title, { size: 10, style: "bold", leading: 1.3 });
      y += 1;
      text(item.why, { size: 9, color: MUTED, leading: 1.45 });
      y += 2;
      // Unlike evidence, the url is the only locator here, so print it either way.
      if (isHttpUrl(item.url)) link(item.url, item.url);
      else text(item.url, { size: 8, color: MUTED });
      y += 10;
    }
  }

  linkSection("Interview experiences", report.interviewExperiences);
  linkSection("Worth reading", report.importantLinks);

  // ---- Footers ----------------------------------------------------------

  // Written last: the page count is only known once the flow above has ended.
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(sanitize(`Scouting report - ${companyName}`), MARGIN, FOOTER_Y);
    doc.text(`${page} / ${pages}`, PAGE_W - MARGIN, FOOTER_Y, { align: "right" });
  }

  return doc.output("blob");
}

/** A PDF link annotation is only worth emitting for a scheme a reader can open. */
function isHttpUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}
