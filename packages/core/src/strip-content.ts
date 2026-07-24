/**
 * Drop oversized response bodies to reduce memory before analyze/display.
 * Mutates a clone; timings and sizes are preserved.
 */
export function stripHarContentText(raw: unknown): unknown {
  const clone = structuredClone(raw) as {
    log?: {
      entries?: Array<{
        response?: {
          content?: { text?: string; encoding?: string; size?: number };
        };
      }>;
    };
  };
  const entries = clone.log?.entries;
  if (!entries) return clone;
  for (const entry of entries) {
    if (entry.response?.content && "text" in entry.response.content) {
      delete entry.response.content.text;
    }
  }
  return clone;
}
