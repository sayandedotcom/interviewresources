/** Shared client helpers for the two SSE endpoints: /api/research and .../extend. */

export interface SseMessage {
  kind: "progress" | "report" | "error";
  [key: string]: unknown;
}

/** Reads an SSE body to completion, handing each `data:` payload to `onMessage`. */
export async function streamSse(
  body: ReadableStream<Uint8Array>,
  onMessage: (msg: SseMessage) => void
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    // The trailing chunk may be a partial event; hold it until more bytes land.
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk.replace(/^data: /, "").trim();
      if (!line) continue;
      onMessage(JSON.parse(line));
    }
  }
}

/** Turns the routes' error codes into something a person can act on. */
export function explainError(
  status: number,
  body: { error?: string; detail?: string; balance?: number; required?: number }
): string {
  switch (body.error) {
    case "unauthenticated":
      return "Please sign in before running a report.";
    case "insufficient_credits":
      return `Not enough credits: this needs at least ${body.required}, and you have ${body.balance}. Buy more credits to continue.`;
    case "not_found":
      return "That report no longer exists.";
    case "not_extendable":
      return body.detail ?? "Only a finished report can be extended.";
    default:
      return body.detail ?? body.error ?? `Request failed (${status}).`;
  }
}
