import type { Entry } from "har-format";
import type { ProtocolBucket } from "./types";

export function protocolDistribution(entries: Entry[]): ProtocolBucket[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const version = entry.request.httpVersion?.trim() || "unknown";
    counts.set(version, (counts.get(version) ?? 0) + 1);
  }
  const total = entries.length || 1;
  return [...counts.entries()]
    .map(([version, count]) => ({
      version,
      count,
      ratio: count / total,
    }))
    .sort((a, b) => b.count - a.count);
}
