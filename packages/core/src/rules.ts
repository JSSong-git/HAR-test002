import {
  formatBytes,
  formatMs,
  metricNumber,
} from "./format";
import type {
  AnalysisModel,
  ConcurrencyHostStat,
  DocumentMetrics,
  Evidence,
  ProtocolBucket,
  Recommendation,
  SizedResource,
} from "./types";

export type RuleResult = Recommendation | null;

export type Rule = {
  id: string;
  name: string;
  target: "document" | "payload" | "network" | "protocol";
  isApplicable: (ctx: RuleContext) => boolean;
  evaluate: (ctx: RuleContext) => RuleResult;
};

export type RuleContext = {
  document: DocumentMetrics | null;
  protocol: ProtocolBucket[];
  fonts: SizedResource[];
  fontTotalBytes: number | null;
  topAssets: SizedResource[];
  primaryHost: ConcurrencyHostStat | null;
};

const WAIT_THRESHOLD_MS = 1000;
const FONT_TOTAL_THRESHOLD = 500 * 1024;
const LARGE_ASSET_THRESHOLD = 300 * 1024;

export const defaultRules: Rule[] = [
  {
    id: "ttfb",
    name: "초기 서버 응답 속도 (TTFB) 개선",
    target: "document",
    isApplicable: (ctx) => {
      const wait = ctx.document
        ? metricNumber(ctx.document.timings.wait)
        : null;
      return wait !== null && wait >= WAIT_THRESHOLD_MS && !!ctx.document;
    },
    evaluate: (ctx) => {
      const wait = metricNumber(ctx.document!.timings.wait)!;
      return {
        id: "ttfb",
        title: "초기 서버 응답 속도 (TTFB) 개선",
        body: `초기 HTML 요청의 wait(서버 응답 대기)가 ${formatMs(wait)}로 기록되었습니다. HAR에 기록된 값은 서버 응답 대기 시간이므로, 해당 구간의 서버 측 처리 시간을 프로파일링하여 단축하는 조치가 필요합니다. (HAR만으로는 내부 처리 원인 종류를 특정할 수 없습니다.)`,
        basedOn: ctx.document!.evidence.filter((e) => e.path.includes("wait")),
      };
    },
  },
  {
    id: "protocol",
    name: "프로토콜 업그레이드 (HTTP/2 또는 HTTP/3) 검토",
    target: "protocol",
    isApplicable: (ctx) => {
      const http11 = ctx.protocol.find((p) =>
        p.version.toLowerCase().includes("http/1.1"),
      );
      return !!http11 && http11.ratio >= 0.5;
    },
    evaluate: (ctx) => {
      const http11 = ctx.protocol.find((p) =>
        p.version.toLowerCase().includes("http/1.1"),
      )!;
      const host = ctx.primaryHost;
      const concurrencyNote = host
        ? ` 선택 Run에서 호스트 ${host.host}의 관측 최대 동시 receive는 ${host.maxConcurrentReceive}건입니다.`
        : "";
      const basedOn: Evidence[] = [
        {
          path: "derived.protocol.http/1.1.ratio",
          value: http11.ratio,
          unit: "ratio",
        },
      ];
      if (host) {
        basedOn.push({
          path: `derived.concurrency[${host.host}].maxConcurrentReceive`,
          value: host.maxConcurrentReceive,
          unit: "count",
        });
      }
      return {
        id: "protocol",
        title: "프로토콜 업그레이드 (HTTP/2 또는 HTTP/3) 검토",
        body: `선택 Run 요청의 ${(http11.ratio * 100).toFixed(0)}%(${http11.count}건)가 ${http11.version}입니다.${concurrencyNote} HTTP/2 또는 HTTP/3의 멀티플렉싱을 도입하면 동일 연결에서 다중 스트림 전송이 가능해져, HTTP/1.1에서 관측되는 동시 전송 제약에 따른 대기를 줄일 수 있습니다.`,
        basedOn,
      };
    },
  },
  {
    id: "fonts",
    name: "폰트 파일 경량화 및 포맷 전환",
    target: "payload",
    isApplicable: (ctx) => {
      const hasWoff = ctx.fonts.some((f) =>
        f.fileName.toLowerCase().endsWith(".woff"),
      );
      return (
        (ctx.fontTotalBytes !== null &&
          ctx.fontTotalBytes >= FONT_TOTAL_THRESHOLD) ||
        hasWoff
      );
    },
    evaluate: (ctx) => {
      const hasWoff = ctx.fonts.some((f) =>
        f.fileName.toLowerCase().endsWith(".woff"),
      );
      const totalText =
        ctx.fontTotalBytes !== null
          ? formatBytes(ctx.fontTotalBytes)
          : "측정 불가";
      return {
        id: "fonts",
        title: "폰트 파일 경량화 및 포맷 전환",
        body: `선택 Run 기준 웹폰트 전송 총합은 ${totalText}(${ctx.fonts.length}개 URL)입니다.${hasWoff ? " .woff 파일이 포함되어 있습니다." : ""} 압축률이 높은 WOFF2로의 전환과 필요한 글자만 포함한 서브셋 빌드로 전송량을 줄이는 조치를 검토할 수 있습니다.`,
        basedOn: [
          {
            path: "derived.fonts.totalTransferBytes",
            value: ctx.fontTotalBytes,
            unit: "bytes",
          },
        ],
      };
    },
  },
  {
    id: "media",
    name: "미디어 및 이미지 에셋 최적화",
    target: "payload",
    isApplicable: (ctx) =>
      ctx.topAssets.some(
        (a) =>
          (a.type === "media" || a.type === "image") &&
          metricNumber(a.transferSize) !== null &&
          (metricNumber(a.transferSize) as number) >= LARGE_ASSET_THRESHOLD,
      ),
    evaluate: (ctx) => {
      const largeMedia = ctx.topAssets.filter(
        (a) =>
          (a.type === "media" || a.type === "image") &&
          metricNumber(a.transferSize) !== null &&
          (metricNumber(a.transferSize) as number) >= LARGE_ASSET_THRESHOLD,
      );
      const lines = largeMedia
        .slice(0, 3)
        .map((a) => {
          const size = metricNumber(a.transferSize);
          return `- ${a.fileName} (${a.type}): ${size !== null ? formatBytes(size) : "측정 불가"}`;
        })
        .join("\n");
      return {
        id: "media",
        title: "미디어 및 이미지 에셋 최적화",
        body: `선택 Run에서 전송 크기가 ${formatBytes(LARGE_ASSET_THRESHOLD)} 이상인 미디어/이미지:\n${lines}\n이미지의 경우 WebP/AVIF 등 최신 압축 포맷 변환, 비디오의 경우 최초 로딩 시점 지연 로드 또는 스트리밍 분할을 HAR 관측 용량을 기준으로 검토할 수 있습니다.`,
        basedOn: largeMedia.flatMap((a) => a.evidence.slice(0, 2)),
      };
    },
  },
];

export function evaluateRules(
  ctx: RuleContext,
  rules: Rule[] = defaultRules,
): Recommendation[] {
  const out: Recommendation[] = [];
  for (const rule of rules) {
    if (!rule.isApplicable(ctx)) continue;
    const result = rule.evaluate(ctx);
    if (result) out.push(result);
  }
  return out;
}

/** @deprecated Use evaluateRules — kept for call-site compatibility. */
export function buildRecommendations(input: RuleContext): Recommendation[] {
  return evaluateRules(input);
}

export function buildSummaryBullets(
  model: Omit<AnalysisModel, "summaryBullets" | "recommendations"> & {
    recommendations?: Recommendation[];
  },
): string[] {
  const bullets: string[] = [];
  const loads = model.pages
    .map((p) => metricNumber(p.onLoad))
    .filter((v): v is number => v !== null);
  if (loads.length > 0) {
    const min = Math.min(...loads);
    const max = Math.max(...loads);
    bullets.push(
      `전체 로딩 시간(모든 회차): ${formatMsShort(min)} ~ ${formatMsShort(max)}`,
    );
  }

  const wait = model.document
    ? metricNumber(model.document.timings.wait)
    : null;
  if (wait !== null) {
    bullets.push(`첫 HTML 서버 응답 대기: ${formatMs(wait)}`);
  }

  if (model.protocol[0]) {
    const p = model.protocol[0];
    bullets.push(
      `주로 쓰인 통신 방식: ${p.version} ${(p.ratio * 100).toFixed(0)}% (${p.count}/${model.provenance.entryCountSelectedRun}개 요청)`,
    );
  }

  const top = model.payload.topByTransfer[0];
  if (top) {
    const size = metricNumber(top.transferSize);
    bullets.push(
      `가장 큰 파일: ${top.fileName} (${size !== null ? formatBytes(size) : "측정 안 됨"})`,
    );
  }

  const fontTotal = metricNumber(model.payload.fontTotalBytes);
  if (fontTotal !== null) {
    bullets.push(
      `글꼴 파일 합계: ${formatBytes(fontTotal)} (${model.payload.fonts.length}개)`,
    );
  }

  return bullets;
}

function formatMsShort(ms: number): string {
  return `${Math.round(ms).toLocaleString("en-US")} ms`;
}
