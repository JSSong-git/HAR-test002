import { formatBytes, formatMs, metricNumber } from "./format";
import type { AnalysisModel, SizedResource } from "./types";

export type DiffDelta = {
  metric: string;
  before: number | null;
  after: number | null;
  delta: number | null;
  unit: "ms" | "bytes" | "count";
};

export type ResourceDiffItem = {
  key: string;
  url: string;
  fileName: string;
  kind: "added" | "removed" | "grew" | "shrunk" | "unchanged";
  beforeBytes: number | null;
  afterBytes: number | null;
  deltaBytes: number | null;
};

export type HarDiffResult = {
  beforeFile: string;
  afterFile: string;
  beforePageId: string;
  afterPageId: string;
  deltas: DiffDelta[];
  resources: ResourceDiffItem[];
};

function resourceKey(r: SizedResource): string {
  return `${r.status}|${r.url}`;
}

function onLoadMs(model: AnalysisModel): number | null {
  const row = model.pages.find((p) => p.pageId === model.selectedPageId);
  return row ? metricNumber(row.onLoad) : null;
}

function waitMs(model: AnalysisModel): number | null {
  return model.document ? metricNumber(model.document.timings.wait) : null;
}

function totalTransfer(model: AnalysisModel): number | null {
  let sum = 0;
  let any = false;
  for (const r of model.payload.topByTransfer) {
    const n = metricNumber(r.transferSize);
    if (n !== null) {
      sum += n;
      any = true;
    }
  }
  // Prefer sum of unique top list is incomplete; use font+top as proxy only when measurable.
  // Better: sum selected-run via provenance isn't stored — use topByTransfer max aggregate of byType.
  const pools = Object.values(model.payload.byTypeTop).flat();
  sum = 0;
  any = false;
  const seen = new Set<string>();
  for (const r of [...model.payload.topByTransfer, ...pools, ...model.payload.fonts]) {
    const k = resourceKey(r);
    if (seen.has(k)) continue;
    seen.add(k);
    const n = metricNumber(r.transferSize);
    if (n !== null) {
      sum += n;
      any = true;
    }
  }
  return any ? sum : null;
}

/**
 * Compare two AnalysisModels (typically two HARs or two runs).
 * Matching key: status|url; duplicate URLs matched in stable sort order by fileName.
 */
export function diffAnalysisModels(
  before: AnalysisModel,
  after: AnalysisModel,
): HarDiffResult {
  const bOnLoad = onLoadMs(before);
  const aOnLoad = onLoadMs(after);
  const bWait = waitMs(before);
  const aWait = waitMs(after);
  const bTransfer = totalTransfer(before);
  const aTransfer = totalTransfer(after);

  const deltas: DiffDelta[] = [
    {
      metric: "onLoad",
      before: bOnLoad,
      after: aOnLoad,
      delta:
        bOnLoad !== null && aOnLoad !== null ? aOnLoad - bOnLoad : null,
      unit: "ms",
    },
    {
      metric: "document.wait (TTFB)",
      before: bWait,
      after: aWait,
      delta: bWait !== null && aWait !== null ? aWait - bWait : null,
      unit: "ms",
    },
    {
      metric: "observed transfer (unique URLs in report pools)",
      before: bTransfer,
      after: aTransfer,
      delta:
        bTransfer !== null && aTransfer !== null
          ? aTransfer - bTransfer
          : null,
      unit: "bytes",
    },
    {
      metric: "entryCountSelectedRun",
      before: before.provenance.entryCountSelectedRun,
      after: after.provenance.entryCountSelectedRun,
      delta:
        after.provenance.entryCountSelectedRun -
        before.provenance.entryCountSelectedRun,
      unit: "count",
    },
  ];

  const beforeMap = new Map<string, SizedResource[]>();
  for (const r of before.payload.topByTransfer) {
    const k = resourceKey(r);
    const list = beforeMap.get(k) ?? [];
    list.push(r);
    beforeMap.set(k, list);
  }
  const afterMap = new Map<string, SizedResource[]>();
  for (const r of after.payload.topByTransfer) {
    const k = resourceKey(r);
    const list = afterMap.get(k) ?? [];
    list.push(r);
    afterMap.set(k, list);
  }

  const keys = new Set([...beforeMap.keys(), ...afterMap.keys()]);
  const resources: ResourceDiffItem[] = [];
  for (const key of keys) {
    const bList = beforeMap.get(key) ?? [];
    const aList = afterMap.get(key) ?? [];
    const max = Math.max(bList.length, aList.length);
    for (let i = 0; i < max; i++) {
      const b = bList[i];
      const a = aList[i];
      const beforeBytes = b ? metricNumber(b.transferSize) : null;
      const afterBytes = a ? metricNumber(a.transferSize) : null;
      let kind: ResourceDiffItem["kind"] = "unchanged";
      if (!b && a) kind = "added";
      else if (b && !a) kind = "removed";
      else if (
        beforeBytes !== null &&
        afterBytes !== null &&
        afterBytes > beforeBytes * 1.2 &&
        afterBytes - beforeBytes >= 50 * 1024
      ) {
        kind = "grew";
      } else if (
        beforeBytes !== null &&
        afterBytes !== null &&
        afterBytes < beforeBytes * 0.8 &&
        beforeBytes - afterBytes >= 50 * 1024
      ) {
        kind = "shrunk";
      }
      resources.push({
        key: `${key}#${i}`,
        url: (a ?? b)!.url,
        fileName: (a ?? b)!.fileName,
        kind,
        beforeBytes,
        afterBytes,
        deltaBytes:
          beforeBytes !== null && afterBytes !== null
            ? afterBytes - beforeBytes
            : null,
      });
    }
  }

  return {
    beforeFile: before.fileName,
    afterFile: after.fileName,
    beforePageId: before.selectedPageId,
    afterPageId: after.selectedPageId,
    deltas,
    resources: resources.filter((r) => r.kind !== "unchanged"),
  };
}

export function renderDiffMarkdown(diff: HarDiffResult): string {
  const lines: string[] = [
    `# HAR 비교 보고서`,
    ``,
    `- 이전: \`${diff.beforeFile}\` (page \`${diff.beforePageId}\`)`,
    `- 이후: \`${diff.afterFile}\` (page \`${diff.afterPageId}\`)`,
    ``,
    `## 지표 변화`,
    ``,
    `| 지표 | 이전 | 이후 | Δ |`,
    `|---|---:|---:|---:|`,
  ];
  for (const d of diff.deltas) {
    const fmt = (v: number | null) => {
      if (v === null) return "측정 안 됨";
      if (d.unit === "ms") return formatMs(v);
      if (d.unit === "bytes") return formatBytes(v);
      return String(v);
    };
    const deltaText =
      d.delta === null
        ? "측정 안 됨"
        : d.unit === "ms"
          ? formatMs(d.delta)
          : d.unit === "bytes"
            ? formatBytes(d.delta)
            : String(d.delta);
    lines.push(
      `| ${d.metric} | ${fmt(d.before)} | ${fmt(d.after)} | ${deltaText} |`,
    );
  }
  lines.push(``, `## 리소스 변화 (상위 전송 풀 기준)`, ``);
  if (diff.resources.length === 0) {
    lines.push(`관측된 추가/삭제/급증·급감 리소스 없음.`);
  } else {
    for (const r of diff.resources.slice(0, 40)) {
      lines.push(
        `- **${r.kind}** \`${r.fileName}\` — 이전 ${r.beforeBytes !== null ? formatBytes(r.beforeBytes) : "측정 안 됨"} → 이후 ${r.afterBytes !== null ? formatBytes(r.afterBytes) : "측정 안 됨"}`,
      );
    }
  }
  lines.push(``);
  return lines.join("\n");
}
