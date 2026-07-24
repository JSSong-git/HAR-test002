import type { Entry } from "har-format";

function mimeOf(entry: Entry): string {
  return entry.response?.content?.mimeType?.toLowerCase() ?? "";
}

function isHtml(entry: Entry): boolean {
  const mime = mimeOf(entry);
  return mime.includes("html") || mime.includes("xhtml");
}

function isLikelyAuxiliaryHtml(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("visitcounter") ||
    lower.includes("analytics") ||
    lower.includes("tracking") ||
    lower.includes("/beacon") ||
    lower.includes("gtm.js")
  );
}

/**
 * Identify the primary HTML document for a run.
 * Prefers earliest HTML 2xx whose URL is not an auxiliary/tracker request.
 */
export function findDocumentEntry(
  entries: Entry[],
  preferredUrlHint?: string,
): Entry | null {
  const htmlEntries = entries
    .filter((e) => isHtml(e))
    .slice()
    .sort(
      (a, b) =>
        new Date(a.startedDateTime).getTime() -
        new Date(b.startedDateTime).getTime(),
    );

  if (htmlEntries.length === 0) return null;

  if (preferredUrlHint) {
    const exact = htmlEntries.find((e) => e.request.url === preferredUrlHint);
    if (exact) return exact;
  }

  const primary = htmlEntries.find(
    (e) =>
      e.response.status >= 200 &&
      e.response.status < 400 &&
      !isLikelyAuxiliaryHtml(e.request.url),
  );

  return primary ?? htmlEntries[0] ?? null;
}

export function extractUrlHintFromPageTitle(title: string | undefined): string | undefined {
  if (!title) return undefined;
  const match = title.match(/https?:\/\/\S+/);
  return match?.[0]?.replace(/[),.]+$/, "");
}
