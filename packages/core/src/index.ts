import type { Entry } from "har-format";
import { classifyEntry } from "./classify";
import { concurrencyByHost } from "./concurrency";
import { extractCwvMetrics, hasAnyCwvMeasurement } from "./cwv";
import {
  extractUrlHintFromPageTitle,
  findDocumentEntry,
} from "./document";
import { formatMetric } from "./format";
import { extractPageTimings } from "./page-timings";
import { parseHarJson, parseHarText } from "./parse";
import {
  sortByTransferDesc,
  toSizedResource,
  uniqueByUrlMaxTransfer,
} from "./payload";
import { protocolDistribution } from "./protocol";
import {
  buildRecommendations,
  buildSummaryBullets,
} from "./recommendations";
import { entriesForPage, selectPage } from "./scope";
import { transferBytes } from "./size";
import { stripHarContentText } from "./strip-content";
import { buildDocumentMetrics } from "./ttfb";
import type {
  AnalysisModel,
  AnalyzeOptions,
  DataQualityNote,
  ResourceType,
  SizedResource,
} from "./types";

export { parseHarJson, parseHarText, HarParseError } from "./parse";
export { renderReportMarkdown } from "./render-markdown";
export { formatMetric, formatBytes, formatMs, metricNumber } from "./format";
export { typeLabel } from "./classify";
export {
  defaultRules,
  evaluateRules,
  type Rule,
  type RuleContext,
} from "./rules";
export { sanitizeHarForExport, maskTextSecrets } from "./sanitizer";
export { extractCwvMetrics, hasAnyCwvMeasurement } from "./cwv";
export {
  diffAnalysisModels,
  renderDiffMarkdown,
  type HarDiffResult,
  type DiffDelta,
  type ResourceDiffItem,
} from "./diff";
export { stripHarContentText } from "./strip-content";
export { buildWaterfallRows, type WaterfallRow } from "./waterfall-model";
export { checkPerformanceBudget, type BudgetOptions, type BudgetResult } from "./budget";
export { renderReportHtml } from "./render-html";
export type * from "./types";

function entryIndexInHar(all: Entry[], entry: Entry): number {
  return all.indexOf(entry);
}

export function analyzeHar(
  raw: unknown,
  options: AnalyzeOptions = {},
): AnalysisModel {
  const input = options.stripContentText ? stripHarContentText(raw) : raw;
  const { har, pages, entries } = parseHarJson(input);
  const topN = options.topN ?? 10;
  const selected = selectPage(pages, options.pageId);
  if (!selected) {
    throw new Error("분석할 page가 없습니다.");
  }

  const selectedPageId = selected.id;
  const runEntries = entriesForPage(entries, selectedPageId);
  const pageTimings = extractPageTimings(pages);

  const urlHint = extractUrlHintFromPageTitle(selected.title);
  const documentEntry = findDocumentEntry(runEntries, urlHint);
  const document = documentEntry
    ? buildDocumentMetrics(
        documentEntry,
        entryIndexInHar(entries, documentEntry),
      )
    : null;

  const unique = uniqueByUrlMaxTransfer(runEntries);
  const sorted = sortByTransferDesc(unique);
  const topByTransfer = sorted
    .slice(0, topN)
    .map((e) => toSizedResource(e, entryIndexInHar(entries, e)));

  const fontsEntries = unique.filter((e) => classifyEntry(e) === "font");
  const fonts = sortByTransferDesc(fontsEntries).map((e) =>
    toSizedResource(e, entryIndexInHar(entries, e)),
  );
  let fontTotal = 0;
  let fontMeasurable = false;
  for (const f of fontsEntries) {
    const bytes = transferBytes(f);
    if (bytes !== null) {
      fontTotal += bytes;
      fontMeasurable = true;
    }
  }

  const byTypeTop: Partial<Record<ResourceType, SizedResource[]>> = {};
  for (const type of [
    "media",
    "image",
    "font",
    "script",
    "css",
    "html",
    "other",
  ] as ResourceType[]) {
    const list = sortByTransferDesc(
      unique.filter((e) => classifyEntry(e) === type),
    )
      .slice(0, 5)
      .map((e) => toSizedResource(e, entryIndexInHar(entries, e)));
    if (list.length) byTypeTop[type] = list;
  }

  const scriptsTop = byTypeTop.script ?? [];

  const protocol = protocolDistribution(runEntries);
  const hosts = concurrencyByHost(runEntries);
  const primaryHost = hosts[0] ?? null;

  const bottleneckPool = sortByTransferDesc(
    unique.filter((e) => {
      const t = classifyEntry(e);
      return t === "font" || t === "image" || t === "media";
    }),
  ).slice(0, 5);
  const bottlenecks = bottleneckPool.map((e) =>
    toSizedResource(e, entryIndexInHar(entries, e)),
  );

  const dataQuality: DataQualityNote[] = [];
  const missingOnContent = pageTimings.filter(
    (p) => p.onContentLoad.kind === "missing",
  );
  if (missingOnContent.length > 0) {
    dataQuality.push({
      code: "onContentLoad_missing",
      message: `${missingOnContent.length}개 회차에서 본문 준비 시간(onContentLoad)이 ${formatMetric(missingOnContent[0]!.onContentLoad)}.`,
      evidence: missingOnContent.flatMap((p) => p.evidence),
    });
  }
  const nullContent = runEntries.filter((e) => !e.response?.content).length;
  if (nullContent > 0) {
    dataQuality.push({
      code: "null_content",
      message: `이 회차에서 응답 내용 정보가 비어 있는 요청 ${nullContent}개.`,
    });
  }
  const status206 = runEntries.filter((e) => e.response?.status === 206).length;
  if (status206 > 0) {
    dataQuality.push({
      code: "http_206",
      message: `이 회차에서 파일을 나눠 받은 요청(HTTP 206) ${status206}개.`,
    });
  }

  const cwvMetrics = extractCwvMetrics(selected);
  const cwv = {
    pageId: selectedPageId,
    metrics: cwvMetrics,
    hasMeasurement: hasAnyCwvMeasurement(cwvMetrics),
  };

  const partial: Omit<AnalysisModel, "summaryBullets" | "recommendations"> = {
    fileName: options.fileName ?? "unknown.har",
    analyzedAt: new Date().toISOString(),
    provenance: {
      creatorName: har.log.creator?.name ?? null,
      creatorVersion: har.log.creator?.version ?? null,
      browserName: har.log.browser?.name ?? null,
      browserVersion: har.log.browser?.version ?? null,
      pageCount: pages.length,
      entryCountTotal: entries.length,
      entryCountSelectedRun: runEntries.length,
    },
    selectedPageId,
    pages: pageTimings,
    document,
    payload: {
      topByTransfer,
      fonts,
      fontTotalBytes: fontMeasurable
        ? { kind: "bytes", value: fontTotal }
        : { kind: "missing", reason: "absent" },
      scriptsTop,
      byTypeTop,
    },
    protocol,
    concurrency: { hosts, primaryHost },
    bottlenecks,
    dataQuality,
    cwv,
  };

  const recommendations = buildRecommendations({
    document,
    protocol,
    fonts,
    fontTotalBytes: fontMeasurable ? fontTotal : null,
    topAssets: topByTransfer,
    primaryHost,
  });

  const summaryBullets = buildSummaryBullets({
    ...partial,
    recommendations,
  });

  return {
    ...partial,
    recommendations,
    summaryBullets,
  };
}

export function analyzeHarText(
  text: string,
  options: AnalyzeOptions = {},
): AnalysisModel {
  const { har } = parseHarText(text);
  return analyzeHar(har, options);
}
