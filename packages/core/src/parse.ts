import type { Entry, Har, Page } from "har-format";
import type { ParsedHar } from "./types";

export class HarParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HarParseError";
  }
}

export function parseHarJson(raw: unknown): ParsedHar {
  if (!raw || typeof raw !== "object") {
    throw new HarParseError("HAR 루트가 객체가 아닙니다.");
  }

  const root = raw as Record<string, unknown>;
  if (!root.log || typeof root.log !== "object") {
    throw new HarParseError("HAR에 log 객체가 없습니다.");
  }

  const log = root.log as Record<string, unknown>;
  const pages = Array.isArray(log.pages) ? (log.pages as Page[]) : [];
  const entries = Array.isArray(log.entries) ? (log.entries as Entry[]) : [];

  if (pages.length === 0 && entries.length === 0) {
    throw new HarParseError("log.pages와 log.entries가 모두 비어 있습니다.");
  }

  return {
    har: raw as Har,
    pages,
    entries,
  };
}

export function parseHarText(text: string): ParsedHar {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new HarParseError("HAR JSON 파싱에 실패했습니다.");
  }
  return parseHarJson(json);
}
