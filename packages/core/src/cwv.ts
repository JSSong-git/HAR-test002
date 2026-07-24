import type { Page } from "har-format";
import type { Evidence, MetricValue } from "./types";

export type CwvMetricName =
  | "LCP"
  | "FCP"
  | "CLS"
  | "TBT"
  | "TTI"
  | "renderStart";

export type CwvMetric = {
  name: CwvMetricName;
  value: MetricValue;
  path: string;
  evidence: Evidence[];
};

const FIELD_MAP: Array<{ key: string; name: CwvMetricName; unit: "ms" | "score" }> = [
  { key: "_LCP", name: "LCP", unit: "ms" },
  { key: "_FCP", name: "FCP", unit: "ms" },
  { key: "_CLS", name: "CLS", unit: "score" },
  { key: "_TBT", name: "TBT", unit: "ms" },
  { key: "_TTI", name: "TTI", unit: "ms" },
  { key: "_renderStart", name: "renderStart", unit: "ms" },
];

function toMetric(raw: unknown): MetricValue {
  if (typeof raw !== "number" || Number.isNaN(raw)) {
    return { kind: "missing", reason: "absent" };
  }
  if (raw < 0) {
    return { kind: "missing", reason: "minus_one" };
  }
  return { kind: "ms", value: raw };
}

/**
 * Extract WebPageTest / Lighthouse underscore custom fields from a page.
 * Missing fields stay "측정 안 됨" — never coerced to 0.
 */
export function extractCwvMetrics(page: Page | Record<string, unknown>): CwvMetric[] {
  const record = page as Record<string, unknown>;
  const out: CwvMetric[] = [];
  for (const { key, name } of FIELD_MAP) {
    const path = `log.pages[].${key}`;
    if (!(key in record) || record[key] === undefined || record[key] === null) {
      out.push({
        name,
        value: { kind: "missing", reason: "absent" },
        path,
        evidence: [{ path, value: null }],
      });
      continue;
    }
    const value = toMetric(record[key]);
    out.push({
      name,
      value,
      path,
      evidence: [
        {
          path,
          value: typeof record[key] === "number" ? (record[key] as number) : null,
          unit: value.kind === "ms" ? "ms" : undefined,
        },
      ],
    });
  }
  return out;
}

export function hasAnyCwvMeasurement(metrics: CwvMetric[]): boolean {
  return metrics.some((m) => m.value.kind !== "missing");
}
