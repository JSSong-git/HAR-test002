import type { Entry } from "har-format";
import { bytesMetric } from "./format";
import type { MetricValue } from "./types";

export type SizeBreakdown = {
  transferSize: MetricValue;
  bodySize: MetricValue;
  contentSize: MetricValue;
};

export function getSizeBreakdown(entry: Entry): SizeBreakdown {
  const bodyRaw = entry.response?.bodySize;
  const contentRaw = entry.response?.content?.size;

  const bodySize = bytesMetric(
    bodyRaw === undefined || bodyRaw === null ? null : bodyRaw,
  );
  const contentSize = bytesMetric(
    contentRaw === undefined || contentRaw === null ? null : contentRaw,
  );

  let transferSize: MetricValue;
  if (bodyRaw !== undefined && bodyRaw !== null && bodyRaw >= 0) {
    transferSize = { kind: "bytes", value: bodyRaw };
  } else if (contentRaw !== undefined && contentRaw !== null && contentRaw >= 0) {
    transferSize = { kind: "bytes", value: contentRaw };
  } else if (bodyRaw === -1 || contentRaw === -1) {
    transferSize = { kind: "missing", reason: "minus_one" };
  } else {
    transferSize = { kind: "missing", reason: "absent" };
  }

  return { transferSize, bodySize, contentSize };
}

export function transferBytes(entry: Entry): number | null {
  const { transferSize } = getSizeBreakdown(entry);
  return transferSize.kind === "bytes" ? transferSize.value : null;
}
