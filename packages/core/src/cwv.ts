import type { Page } from "har-format";
import type { Evidence, MetricValue } from "./types";

export type CwvMetricName =
  | "LCP"
  | "FCP"
  | "CLS"
  | "TBT"
  | "TTI"
  | "renderStart"
  | "FP"
  | "SI";

export type CwvMetric = {
  name: CwvMetricName;
  value: MetricValue;
  path: string;
  evidence: Evidence[];
};

type MetricSpec = {
  name: CwvMetricName;
  /** Prefer score for CLS; ms for paint/blocking times. */
  valueKind: "ms" | "score";
  /** Direct keys on page (and page.pageTimings). */
  keys: string[];
  /** Matching names inside `_chromeUserTiming` array entries. */
  timingNames: string[];
};

/**
 * WPT / Chrome HAR extensions use several shapes:
 * - `_LCP` / `_FCP` (short)
 * - `_chromeUserTiming.LargestContentfulPaint` (flattened)
 * - `_chromeUserTiming: [{ name, time }]` (array)
 * - `_firstContentfulPaint`, `_PerformancePaintTiming.first-contentful-paint`
 */
const SPECS: MetricSpec[] = [
  {
    name: "LCP",
    valueKind: "ms",
    keys: [
      "_LCP",
      "_chromeUserTiming.LargestContentfulPaint",
      "_LargestContentfulPaint",
    ],
    timingNames: ["LargestContentfulPaint", "largestContentfulPaint"],
  },
  {
    name: "FCP",
    valueKind: "ms",
    keys: [
      "_FCP",
      "_chromeUserTiming.firstContentfulPaint",
      "_firstContentfulPaint",
      "_PerformancePaintTiming.first-contentful-paint",
    ],
    timingNames: ["firstContentfulPaint", "FirstContentfulPaint"],
  },
  {
    name: "FP",
    valueKind: "ms",
    keys: [
      "_FP",
      "_chromeUserTiming.firstPaint",
      "_firstPaint",
      "_PerformancePaintTiming.first-paint",
    ],
    timingNames: ["firstPaint", "FirstPaint"],
  },
  {
    name: "CLS",
    valueKind: "score",
    keys: [
      "_CLS",
      "_chromeUserTiming.CumulativeLayoutShift",
      "_CumulativeLayoutShift",
      "_chromeUserTiming.TotalLayoutShift",
    ],
    timingNames: ["CumulativeLayoutShift", "TotalLayoutShift"],
  },
  {
    name: "TBT",
    valueKind: "ms",
    keys: ["_TBT", "_TotalBlockingTime", "_totalBlockingTime"],
    timingNames: ["TotalBlockingTime", "totalBlockingTime"],
  },
  {
    name: "TTI",
    valueKind: "ms",
    keys: ["_TTI", "_LastInteractive", "_TimeToInteractive"],
    timingNames: ["TimeToInteractive", "TTI"],
  },
  {
    name: "renderStart",
    valueKind: "ms",
    keys: ["_renderStart", "_RenderStart", "_StartRender"],
    timingNames: ["renderStart", "RenderStart", "StartRender"],
  },
  {
    name: "SI",
    valueKind: "ms",
    keys: ["_SpeedIndex", "_SI", "_speedIndex"],
    timingNames: ["SpeedIndex"],
  },
];

function toMetric(raw: unknown, valueKind: "ms" | "score"): MetricValue {
  if (typeof raw !== "number" || Number.isNaN(raw)) {
    return { kind: "missing", reason: "absent" };
  }
  if (raw < 0) {
    return { kind: "missing", reason: "minus_one" };
  }
  return { kind: valueKind, value: raw };
}

function readChromeUserTimingMap(
  record: Record<string, unknown>,
): Map<string, { value: number; path: string }> {
  const map = new Map<string, { value: number; path: string }>();
  const arr = record._chromeUserTiming;
  if (!Array.isArray(arr)) return map;
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name : null;
    const time =
      typeof row.time === "number"
        ? row.time
        : typeof row.value === "number"
          ? row.value
          : null;
    if (!name || time === null || Number.isNaN(time)) continue;
    // Prefer first occurrence (earliest paint), do not overwrite
    if (!map.has(name)) {
      map.set(name, {
        value: time,
        path: `log.pages[]._chromeUserTiming[${i}].time (${name})`,
      });
    }
  }
  return map;
}

function lookupKey(
  record: Record<string, unknown>,
  key: string,
): { value: unknown; path: string } | null {
  if (key in record && record[key] !== undefined && record[key] !== null) {
    return { value: record[key], path: `log.pages[].${key}` };
  }
  const timings = record.pageTimings;
  if (timings && typeof timings === "object") {
    const t = timings as Record<string, unknown>;
    if (key in t && t[key] !== undefined && t[key] !== null) {
      return { value: t[key], path: `log.pages[].pageTimings.${key}` };
    }
  }
  return null;
}

/**
 * Extract WebPageTest / Chrome HAR underscore CWV-related fields from a page.
 * Missing fields stay "측정 안 됨" — never coerced to 0.
 */
export function extractCwvMetrics(
  page: Page | Record<string, unknown>,
): CwvMetric[] {
  const record = page as Record<string, unknown>;
  const timingMap = readChromeUserTimingMap(record);
  const out: CwvMetric[] = [];

  for (const spec of SPECS) {
    let found: { raw: unknown; path: string } | null = null;

    for (const key of spec.keys) {
      const hit = lookupKey(record, key);
      if (hit) {
        found = { raw: hit.value, path: hit.path };
        break;
      }
    }

    if (!found) {
      for (const timingName of spec.timingNames) {
        const hit = timingMap.get(timingName);
        if (hit) {
          found = { raw: hit.value, path: hit.path };
          break;
        }
      }
    }

    if (!found) {
      out.push({
        name: spec.name,
        value: { kind: "missing", reason: "absent" },
        path: `log.pages[].(${spec.keys[0]})`,
        evidence: [{ path: `log.pages[].(${spec.keys.join("|")})`, value: null }],
      });
      continue;
    }

    const value = toMetric(found.raw, spec.valueKind);
    out.push({
      name: spec.name,
      value,
      path: found.path,
      evidence: [
        {
          path: found.path,
          value: typeof found.raw === "number" ? found.raw : null,
          unit: spec.valueKind === "ms" ? "ms" : undefined,
        },
      ],
    });
  }

  return out;
}

export function hasAnyCwvMeasurement(metrics: CwvMetric[]): boolean {
  return metrics.some((m) => m.value.kind !== "missing");
}

/** Metrics that were actually present in the HAR (Fact-Only display list). */
export function measuredCwvMetrics(metrics: CwvMetric[]): CwvMetric[] {
  return metrics.filter((m) => m.value.kind !== "missing");
}
