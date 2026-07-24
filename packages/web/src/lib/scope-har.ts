import type { Entry, Har } from "har-format";

/**
 * network-viewer crashes on `response.content === null`
 * (`Cannot read properties of null (reading 'size')`).
 * Stub missing content for display only — does not invent transfer metrics.
 */
export function sanitizeHarForNetworkViewer(raw: Har): Har {
  const clone = structuredClone(raw) as Har;
  const entries = (clone.log.entries ?? []) as Entry[];
  for (const entry of entries) {
    if (!entry.response) continue;
    if (entry.response.content == null) {
      entry.response.content = {
        size: -1,
        mimeType: "x-unknown",
        text: "",
      };
    }
    if (!Array.isArray(entry.response.headers)) {
      entry.response.headers = [];
    }
    if (!entry.request) continue;
    if (!Array.isArray(entry.request.headers)) {
      entry.request.headers = [];
    }
  }
  return clone;
}

/** Clone HAR and keep only the selected page + its entries for Network Viewer. */
export function scopeHarToPage(raw: unknown, pageId: string): Har | null {
  if (!raw || typeof raw !== "object") return null;
  const clone = structuredClone(raw) as Har;
  if (!clone.log) return null;

  const pages = clone.log.pages ?? [];
  const entries = (clone.log.entries ?? []) as Entry[];
  const selected = pages.find((p) => p.id === pageId) ?? pages[0];
  if (!selected) {
    return sanitizeHarForNetworkViewer(clone);
  }

  clone.log.pages = [selected];
  clone.log.entries = entries.filter(
    (e) => !e.pageref || e.pageref === selected.id,
  );
  return sanitizeHarForNetworkViewer(clone);
}
