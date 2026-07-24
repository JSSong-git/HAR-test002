import type { MetricValue } from "./types";

const KIB = 1024;
const MIB = 1024 * 1024;

export function timingMetric(value: number | undefined | null): MetricValue {
  if (value === undefined || value === null) {
    return { kind: "missing", reason: "absent" };
  }
  if (value === -1) {
    return { kind: "missing", reason: "minus_one" };
  }
  return { kind: "ms", value };
}

export function bytesMetric(value: number | undefined | null): MetricValue {
  if (value === undefined || value === null) {
    return { kind: "missing", reason: "absent" };
  }
  if (value < 0) {
    return { kind: "missing", reason: "minus_one" };
  }
  return { kind: "bytes", value };
}

export function formatMetric(metric: MetricValue): string {
  if (metric.kind === "missing") {
    return metric.reason === "minus_one"
      ? "측정 안 됨(-1)"
      : "측정 안 됨(값 없음)";
  }
  if (metric.kind === "ms") {
    return formatMs(metric.value);
  }
  if (metric.kind === "score") {
    const rounded = Math.round(metric.value * 1000) / 1000;
    return rounded.toLocaleString("en-US", {
      maximumFractionDigits: 3,
    });
  }
  return formatBytes(metric.value);
}

export function formatMs(ms: number): string {
  const seconds = ms / 1000;
  return `${formatInt(ms)} ms (${formatDecimal(seconds)}초)`;
}

export function formatMsShort(ms: number): string {
  return `${formatInt(ms)} ms`;
}

export function formatBytes(bytes: number): string {
  if (bytes >= MIB) {
    return `${formatInt(bytes)} Bytes (약 ${formatDecimal(bytes / MIB)} MiB)`;
  }
  if (bytes >= KIB) {
    return `${formatInt(bytes)} Bytes (약 ${formatDecimal(bytes / KIB)} KiB)`;
  }
  return `${formatInt(bytes)} Bytes`;
}

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function formatDecimal(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function metricNumber(metric: MetricValue): number | null {
  return metric.kind === "missing" ? null : metric.value;
}

export function fileNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop();
    return last && last.length > 0 ? decodeURIComponent(last) : u.hostname;
  } catch {
    const parts = url.split("?")[0]?.split("/") ?? [];
    return parts.filter(Boolean).pop() || url;
  }
}
