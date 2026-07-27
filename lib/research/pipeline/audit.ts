import { z } from "zod";

import type { BudgetTracker } from "../budget";
import { ResearchStructuredOutputError, generateStructured } from "../gemini";
import { describeTargetProfile } from "../target";
import type { CompressedNote, PredictedQuestion, TargetProfile } from "../types";
import { mapChunked } from "./shared";

const AUDIT_BATCH_SIZE = 5;
const AUDIT_RECOVERY_BATCH_SIZE = 3;
const AUDIT_CONCURRENCY = 2;

function auditSchema(questionCount: number) {
  return z.object({
    decisions: z
      .array(
        z.object({
          id: z.number().int().min(0).max(199),
          keep: z.boolean(),
          question: z.string().max(1_400),
          confidence: z.enum(["high", "medium", "low"]),
          rationale: z.string().max(600),
          prepNote: z.string().max(1_200),
          evidenceUrls: z.array(z.string().max(500)).max(8),
          basis: z.enum(["evidence", "reconstructed", "inferred", "baseline"]),
        })
      )
      .length(questionCount),
  });
}

async function auditBatchOnce(
  targetProfile: TargetProfile,
  notes: CompressedNote[],
  questions: PredictedQuestion[],
  startId: number,
  budget: BudgetTracker
): Promise<PredictedQuestion[]> {
  const categories = new Set(questions.map((question) => question.category));
  const relevantNotes = notes.filter((note) => {
    const noteCategories = note.categories ?? [note.category];
    return (
      noteCategories.some((category) => categories.has(category)) ||
      note.profile?.firstHand ||
      note.profile?.proxyEvidence
    );
  });
  const evidence = (relevantNotes.length > 0 ? relevantNotes : notes).map((note) => ({
    url: note.sourceUrl,
    title: note.sourceTitle,
    categories: note.categories ?? [note.category],
    profile: note.profile,
    summary: note.summary.slice(0, 1400),
  }));
  const candidates = questions.map((question, index) => ({ id: startId + index, ...question }));

  const result = await generateStructured({
    model: "gemini-3.5-flash",
    stage: "synthesize_audit",
    schema: auditSchema(questions.length),
    budget,
    maxOutputTokens: 1_200 + questions.length * 1_200,
    thinkingLevel: "low",
    system: `You are the final evidence and technical-correctness auditor for an interview
preparation report. Review every numbered question against the dynamic target profile and the
source notes. Return exactly one decision for every id and do not add ids.
Keep the corrected question under 140 words, rationale under 60 words, and prep note under
120 words. Concise complete JSON matters more than prose.

For each question:
- Keep it only if it is self-contained, technically coherent, useful for the target, and distinct.
- Correct an inaccurate or underspecified technical prompt, success criterion, or prep note when
  the intended exercise can be repaired without inventing company evidence. Otherwise set keep=false.
- basis="evidence" requires a direct first-hand account at the target company whose note actually
  entails this self-contained prompt and whose profile says questionDetail="exact".
- basis="reconstructed" requires a direct account that supports the cited topic or partial prompt.
  The rationale must explicitly say the exact practice wording was reconstructed and must not imply
  that this wording was reported.
- basis="inferred" requires cited proxy evidence and must name the comparison signal. It cannot be
  high confidence.
- basis="baseline" is useful preparation derived from the target role, job description, product, or
  general technical material. It must have no evidence URLs, low confidence, and language that does
  not state or imply the company reported, asked, confirmed, or commonly uses it.
- A compilation, guide, aggregator, job page, or technical article cannot prove a reported question.
- Same-company evidence from a different role, level, experience range, or location is adjacent,
  not exact-target evidence. Do not silently copy target attributes into it.
- Keep only URLs present in the evidence notes. Prefer downgrading a supportable question over
  discarding it. Preserve the report's language unless a correction requires changing wording.`,
    prompt: `Target profile:
${describeTargetProfile(targetProfile)}

Evidence notes:
${JSON.stringify(evidence)}

Questions to audit:
${JSON.stringify(candidates)}`,
  });

  const decisions = new Map(result.decisions.map((decision) => [decision.id, decision]));
  const audited: PredictedQuestion[] = [];
  questions.forEach((original, index) => {
    const decision = decisions.get(startId + index);
    if (!decision) {
      audited.push(original);
      return;
    }
    if (!decision.keep) return;
    audited.push({
      category: original.category,
      question: decision.question,
      confidence: decision.confidence,
      rationale: decision.rationale,
      prepNote: decision.prepNote,
      evidenceUrls: decision.evidenceUrls,
      basis: decision.basis,
    });
  });
  return audited;
}

async function auditBatch(
  targetProfile: TargetProfile,
  notes: CompressedNote[],
  questions: PredictedQuestion[],
  startId: number,
  budget: BudgetTracker
): Promise<PredictedQuestion[]> {
  try {
    return await auditBatchOnce(targetProfile, notes, questions, startId, budget);
  } catch (error) {
    if (error instanceof ResearchStructuredOutputError && questions.length > 1) {
      const recoverySize =
        questions.length > AUDIT_RECOVERY_BATCH_SIZE ? AUDIT_RECOVERY_BATCH_SIZE : 1;
      if (process.env.NODE_ENV !== "test") {
        const sizes: number[] = [];
        for (let index = 0; index < questions.length; index += recoverySize) {
          sizes.push(Math.min(recoverySize, questions.length - index));
        }
        console.warn(
          `[research:pipeline] synthesize_audit batch of ${questions.length} malformed; ` +
            `retrying as ${sizes.join("+")}`
        );
      }
      const recovered: PredictedQuestion[] = [];
      for (let index = 0; index < questions.length; index += recoverySize) {
        recovered.push(
          ...(await auditBatch(
            targetProfile,
            notes,
            questions.slice(index, index + recoverySize),
            startId + index,
            budget
          ))
        );
      }
      return recovered;
    }
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[research:pipeline] question audit item retained after recovery failed",
        error instanceof Error ? error.message : String(error)
      );
    }
    return questions;
  }
}

export async function auditQuestionsStage(
  targetProfile: TargetProfile,
  notes: CompressedNote[],
  questions: PredictedQuestion[],
  budget: BudgetTracker
): Promise<PredictedQuestion[]> {
  if (questions.length === 0) return questions;

  const batches: Array<{ questions: PredictedQuestion[]; startId: number }> = [];
  for (let startId = 0; startId < questions.length; startId += AUDIT_BATCH_SIZE) {
    batches.push({
      questions: questions.slice(startId, startId + AUDIT_BATCH_SIZE),
      startId,
    });
  }
  const audited = await mapChunked(
    batches,
    AUDIT_CONCURRENCY,
    () => false,
    (batch) => auditBatch(targetProfile, notes, batch.questions, batch.startId, budget)
  );
  return audited.flat();
}
