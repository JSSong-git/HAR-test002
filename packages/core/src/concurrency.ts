import type { Entry } from "har-format";
import type { ConcurrencyHostStat } from "./types";

type Interval = { start: number; end: number };

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "unknown";
  }
}

/** Approximate receive window from startedDateTime + non-receive phases. */
function receiveInterval(entry: Entry): Interval | null {
  const start = Date.parse(entry.startedDateTime);
  if (Number.isNaN(start)) return null;

  const t = entry.timings;
  if (!t) return null;

  const phase = (v: number | undefined) =>
    v !== undefined && v !== null && v >= 0 ? v : 0;

  const beforeReceive =
    phase(t.blocked) +
    phase(t.dns) +
    phase(t.connect) +
    phase(t.send) +
    phase(t.wait);

  const receive = t.receive;
  if (receive === undefined || receive === null || receive < 0) return null;

  const receiveStart = start + beforeReceive;
  return { start: receiveStart, end: receiveStart + receive };
}

function maxOverlap(intervals: Interval[]): number {
  if (intervals.length === 0) return 0;
  const events: { t: number; d: number }[] = [];
  for (const i of intervals) {
    events.push({ t: i.start, d: 1 });
    events.push({ t: i.end, d: -1 });
  }
  events.sort((a, b) => (a.t === b.t ? a.d - b.d : a.t - b.t));
  let cur = 0;
  let max = 0;
  for (const e of events) {
    cur += e.d;
    if (cur > max) max = cur;
  }
  return max;
}

export function concurrencyByHost(entries: Entry[]): ConcurrencyHostStat[] {
  const byHost = new Map<string, Entry[]>();
  for (const entry of entries) {
    const host = hostOf(entry.request.url);
    const list = byHost.get(host) ?? [];
    list.push(entry);
    byHost.set(host, list);
  }

  const stats: ConcurrencyHostStat[] = [];
  for (const [host, list] of byHost) {
    const intervals = list
      .map(receiveInterval)
      .filter((x): x is Interval => x !== null);

    let blockedRecordedCount = 0;
    let blockedSum = 0;
    let hasBlocked = false;
    for (const entry of list) {
      const b = entry.timings?.blocked;
      if (b !== undefined && b !== null && b >= 0) {
        blockedRecordedCount += 1;
        blockedSum += b;
        hasBlocked = true;
      }
    }

    stats.push({
      host,
      maxConcurrentReceive: maxOverlap(intervals),
      entryCount: list.length,
      blockedRecordedCount,
      blockedSumMs: hasBlocked ? blockedSum : null,
    });
  }

  return stats.sort((a, b) => b.entryCount - a.entryCount);
}
