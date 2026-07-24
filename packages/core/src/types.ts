import type { Entry, Har, Page } from "har-format";

/** Timing or size value: measurable number, or missing sentinel. */
export type MetricValue =
  | { kind: "ms" | "bytes"; value: number }
  | { kind: "missing"; reason: "minus_one" | "absent" };

export type Evidence = {
  path: string;
  value: number | string | null;
  unit?: "ms" | "bytes" | "count" | "ratio";
  entryUrl?: string;
};

export type ResourceType =
  | "html"
  | "media"
  | "image"
  | "font"
  | "script"
  | "css"
  | "other"
  | "unknown";

export type PageTimingRow = {
  pageId: string;
  startedDateTime: string;
  title: string;
  onLoad: MetricValue;
  onContentLoad: MetricValue;
  evidence: Evidence[];
};

export type SizedResource = {
  url: string;
  fileName: string;
  type: ResourceType;
  mimeType: string | null;
  transferSize: MetricValue;
  bodySize: MetricValue;
  contentSize: MetricValue;
  httpVersion: string;
  status: number;
  wait: MetricValue;
  receive: MetricValue;
  time: MetricValue;
  evidence: Evidence[];
};

export type DocumentMetrics = {
  url: string;
  fileName: string;
  transferSize: MetricValue;
  bodySize: MetricValue;
  contentSize: MetricValue;
  timings: {
    dns: MetricValue;
    connect: MetricValue;
    ssl: MetricValue;
    send: MetricValue;
    wait: MetricValue;
    receive: MetricValue;
    blocked: MetricValue;
  };
  evidence: Evidence[];
};

export type ProtocolBucket = {
  version: string;
  count: number;
  ratio: number;
};

export type ConcurrencyHostStat = {
  host: string;
  maxConcurrentReceive: number;
  entryCount: number;
  blockedRecordedCount: number;
  blockedSumMs: number | null;
};

export type Recommendation = {
  id: string;
  title: string;
  body: string;
  basedOn: Evidence[];
};

export type DataQualityNote = {
  code: string;
  message: string;
  evidence?: Evidence[];
};

export type CwvAppendix = {
  pageId: string;
  metrics: Array<{
    name: string;
    value: MetricValue;
    path: string;
    evidence: Evidence[];
  }>;
  hasMeasurement: boolean;
};

export type AnalysisModel = {
  fileName: string;
  analyzedAt: string;
  provenance: {
    creatorName: string | null;
    creatorVersion: string | null;
    browserName: string | null;
    browserVersion: string | null;
    pageCount: number;
    entryCountTotal: number;
    entryCountSelectedRun: number;
  };
  selectedPageId: string;
  pages: PageTimingRow[];
  document: DocumentMetrics | null;
  payload: {
    topByTransfer: SizedResource[];
    fonts: SizedResource[];
    fontTotalBytes: MetricValue;
    scriptsTop: SizedResource[];
    byTypeTop: Partial<Record<ResourceType, SizedResource[]>>;
  };
  protocol: ProtocolBucket[];
  concurrency: {
    hosts: ConcurrencyHostStat[];
    primaryHost: ConcurrencyHostStat | null;
  };
  bottlenecks: SizedResource[];
  recommendations: Recommendation[];
  dataQuality: DataQualityNote[];
  summaryBullets: string[];
  /** WebPageTest / Lighthouse underscore metrics for selected page. */
  cwv: CwvAppendix;
};

export type AnalyzeOptions = {
  pageId?: string;
  fileName?: string;
  topN?: number;
  /** Drop response.content.text before analysis to reduce memory. */
  stripContentText?: boolean;
};

export type ParsedHar = {
  har: Har;
  pages: Page[];
  entries: Entry[];
};
