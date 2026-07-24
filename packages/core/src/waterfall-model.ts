import type { Entry, Har } from "har-format";
import { classifyEntry } from "./classify";
import { entriesForPage } from "./scope";
import { transferBytes } from "./size";
import type { ResourceType } from "./types";

export type WaterfallRow = {
  index: number;
  url: string;
  fileName: string;
  method: string;
  status: number;
  type: ResourceType;
  mimeType: string | null;
  httpVersion: string;
  startMs: number;
  durationMs: number;
  blocked: number;
  dns: number;
  connect: number;
  ssl: number;
  send: number;
  wait: number;
  receive: number;
  transferBytes: number | null;
  host: string;
  isThirdParty: boolean;
  /** Heuristic: CSS/JS early in document with high wait — badge only when observable. */
  possiblyRenderBlocking: boolean;
};

function timingOrZero(v: number | undefined): number {
  if (v === undefined || v < 0) return 0;
  return v;
}

function fileNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const base = u.pathname.split("/").filter(Boolean).pop();
    return base || u.hostname;
  } catch {
    return url.slice(0, 64);
  }
}

/**
 * Build virtualized waterfall rows for a selected page (Fact-Only timings).
 */
export function buildWaterfallRows(
  har: Har | unknown,
  pageId: string,
): WaterfallRow[] {
  const log = (har as Har).log;
  if (!log?.entries) return [];
  const pages = log.pages ?? [];
  const page = pages.find((p) => p.id === pageId) ?? pages[0];
  if (!page) return [];

  const pageStart = Date.parse(page.startedDateTime);
  const runEntries = entriesForPage(log.entries as Entry[], page.id);
  let firstPartyHost = "";
  try {
    firstPartyHost = new URL(page.title.includes("http") ? page.title : runEntries[0]?.request.url ?? "").hostname;
  } catch {
    firstPartyHost = "";
  }
  if (!firstPartyHost && runEntries[0]) {
    try {
      firstPartyHost = new URL(runEntries[0].request.url).hostname;
    } catch {
      /* ignore */
    }
  }

  return runEntries.map((entry, index) => {
    const startMs = Math.max(0, Date.parse(entry.startedDateTime) - pageStart);
    const t = entry.timings ?? {};
    const blocked = timingOrZero(t.blocked);
    const dns = timingOrZero(t.dns);
    const connect = timingOrZero(t.connect);
    const ssl = timingOrZero(t.ssl);
    const send = timingOrZero(t.send);
    const wait = timingOrZero(t.wait);
    const receive = timingOrZero(t.receive);
    const durationMs =
      typeof entry.time === "number" && entry.time >= 0
        ? entry.time
        : blocked + dns + connect + Math.max(0, ssl) + send + wait + receive;
    const type = classifyEntry(entry);
    let host = "";
    try {
      host = new URL(entry.request.url).hostname;
    } catch {
      host = "";
    }
    const mime = entry.response?.content?.mimeType ?? null;
    const possiblyRenderBlocking =
      index < 15 &&
      (type === "css" || type === "script") &&
      wait + receive > 50;

    return {
      index,
      url: entry.request.url,
      fileName: fileNameFromUrl(entry.request.url),
      method: entry.request.method,
      status: entry.response?.status ?? 0,
      type,
      mimeType: mime,
      httpVersion: entry.response?.httpVersion ?? entry.request.httpVersion ?? "",
      startMs,
      durationMs,
      blocked,
      dns,
      connect,
      ssl: Math.max(0, ssl),
      send,
      wait,
      receive,
      transferBytes: transferBytes(entry),
      host,
      isThirdParty: !!firstPartyHost && !!host && host !== firstPartyHost,
      possiblyRenderBlocking,
    };
  });
}
