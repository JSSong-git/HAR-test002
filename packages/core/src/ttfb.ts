import type { Entry } from "har-format";
import { fileNameFromUrl, timingMetric } from "./format";
import { getSizeBreakdown } from "./size";
import type { DocumentMetrics } from "./types";

export function buildDocumentMetrics(
  entry: Entry,
  entryIndex: number,
): DocumentMetrics {
  const sizes = getSizeBreakdown(entry);
  const t = entry.timings;

  return {
    url: entry.request.url,
    fileName: fileNameFromUrl(entry.request.url),
    transferSize: sizes.transferSize,
    bodySize: sizes.bodySize,
    contentSize: sizes.contentSize,
    timings: {
      dns: timingMetric(t?.dns),
      connect: timingMetric(t?.connect),
      ssl: timingMetric(t?.ssl),
      send: timingMetric(t?.send),
      wait: timingMetric(t?.wait),
      receive: timingMetric(t?.receive),
      blocked: timingMetric(t?.blocked),
    },
    evidence: [
      {
        path: `log.entries[${entryIndex}].request.url`,
        value: entry.request.url,
        entryUrl: entry.request.url,
      },
      {
        path: `log.entries[${entryIndex}].timings.wait`,
        value: t?.wait ?? null,
        unit: "ms",
        entryUrl: entry.request.url,
      },
      {
        path: `log.entries[${entryIndex}].response.bodySize`,
        value: entry.response?.bodySize ?? null,
        unit: "bytes",
        entryUrl: entry.request.url,
      },
    ],
  };
}
