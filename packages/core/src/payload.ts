import type { Entry } from "har-format";
import { classifyEntry } from "./classify";
import { fileNameFromUrl, timingMetric } from "./format";
import { getSizeBreakdown, transferBytes } from "./size";
import type { SizedResource } from "./types";

export function toSizedResource(entry: Entry, indexHint?: number): SizedResource {
  const sizes = getSizeBreakdown(entry);
  const idx = indexHint ?? -1;
  const pathPrefix =
    idx >= 0 ? `log.entries[${idx}]` : `log.entries[pageref=${entry.pageref}]`;

  return {
    url: entry.request.url,
    fileName: fileNameFromUrl(entry.request.url),
    type: classifyEntry(entry),
    mimeType: entry.response?.content?.mimeType ?? null,
    transferSize: sizes.transferSize,
    bodySize: sizes.bodySize,
    contentSize: sizes.contentSize,
    httpVersion: entry.request.httpVersion || "unknown",
    status: entry.response?.status ?? 0,
    wait: timingMetric(entry.timings?.wait),
    receive: timingMetric(entry.timings?.receive),
    time: timingMetric(entry.time),
    evidence: [
      {
        path: `${pathPrefix}.request.url`,
        value: entry.request.url,
        entryUrl: entry.request.url,
      },
      {
        path: `${pathPrefix}.response.bodySize`,
        value: entry.response?.bodySize ?? null,
        unit: "bytes",
        entryUrl: entry.request.url,
      },
      {
        path: `${pathPrefix}.timings.wait`,
        value: entry.timings?.wait ?? null,
        unit: "ms",
        entryUrl: entry.request.url,
      },
      {
        path: `${pathPrefix}.timings.receive`,
        value: entry.timings?.receive ?? null,
        unit: "ms",
        entryUrl: entry.request.url,
      },
    ],
  };
}

/** Deduplicate by URL keeping the max transfer size entry. */
export function uniqueByUrlMaxTransfer(entries: Entry[]): Entry[] {
  const map = new Map<string, Entry>();
  for (const entry of entries) {
    const prev = map.get(entry.request.url);
    if (!prev) {
      map.set(entry.request.url, entry);
      continue;
    }
    const a = transferBytes(entry) ?? -1;
    const b = transferBytes(prev) ?? -1;
    if (a > b) map.set(entry.request.url, entry);
  }
  return [...map.values()];
}

export function sortByTransferDesc(entries: Entry[]): Entry[] {
  return entries.slice().sort((a, b) => {
    const sa = transferBytes(a) ?? -1;
    const sb = transferBytes(b) ?? -1;
    return sb - sa;
  });
}
