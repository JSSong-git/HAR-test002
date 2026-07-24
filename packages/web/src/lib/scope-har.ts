import type { Entry, Har, Page } from "har-format";

const EMPTY_TIMINGS = {
  blocked: -1,
  dns: -1,
  connect: -1,
  ssl: -1,
  send: 0,
  wait: 0,
  receive: 0,
};

/**
 * Harden HAR for Sauce Labs network-viewer, which assumes non-null
 * `response.content`, headers arrays, and timings (and crashes otherwise).
 * Display-only stubs — does not invent real transfer metrics.
 */
export function sanitizeHarForNetworkViewer(raw: Har): Har {
  const clone = structuredClone(raw) as Har;

  const pages = (clone.log.pages ?? []) as Page[];
  for (const page of pages) {
    if (!page.pageTimings) {
      (page as Page & { pageTimings: { onLoad: number; onContentLoad: number } }).pageTimings =
        {
          onLoad: -1,
          onContentLoad: -1,
        };
    }
  }

  const entries = (clone.log.entries ?? []) as Entry[];
  for (const entry of entries) {
    if (!entry.timings || typeof entry.timings !== "object") {
      entry.timings = { ...EMPTY_TIMINGS };
    }
    if (typeof entry.time !== "number" || Number.isNaN(entry.time)) {
      entry.time = 0;
    }
    if (!entry.startedDateTime) {
      entry.startedDateTime = new Date(0).toISOString();
    }

    if (!entry.request) {
      continue;
    }
    if (!Array.isArray(entry.request.headers)) {
      entry.request.headers = [];
    }
    if (!Array.isArray(entry.request.cookies)) {
      entry.request.cookies = [];
    }
    if (!Array.isArray(entry.request.queryString)) {
      entry.request.queryString = [];
    }

    if (!entry.response) {
      entry.response = {
        status: 0,
        statusText: "",
        httpVersion: "HTTP/1.1",
        cookies: [],
        headers: [],
        content: { size: -1, mimeType: "x-unknown", text: "" },
        redirectURL: "",
        headersSize: -1,
        bodySize: -1,
      };
      continue;
    }

    if (entry.response.content == null) {
      entry.response.content = {
        size: -1,
        mimeType: "x-unknown",
        text: "",
      };
    } else if (typeof entry.response.content.size !== "number") {
      entry.response.content.size = -1;
    }

    if (!Array.isArray(entry.response.headers)) {
      entry.response.headers = [];
    }
    if (!Array.isArray(entry.response.cookies)) {
      entry.response.cookies = [];
    }
  }

  // Drop entries without a request URL — network-viewer filters these poorly.
  clone.log.entries = entries.filter(
    (e) => e.request && typeof e.request.url === "string" && e.request.url.length > 0,
  );

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
