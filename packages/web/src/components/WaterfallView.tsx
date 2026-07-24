import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { WaterfallRow } from "@har-analyzer/core";
import { formatBytes } from "@har-analyzer/core";
import { Card } from "./ui";

type Props = {
  rows: WaterfallRow[];
  loading?: boolean;
};

const TYPE_OPTIONS = ["all", "html", "script", "css", "image", "font", "media", "other"] as const;

export function WaterfallView({ rows, loading }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [type, setType] = useState<(typeof TYPE_OPTIONS)[number]>("all");
  const [statusClass, setStatusClass] = useState<"all" | "2xx" | "3xx" | "4xx" | "5xx">("all");
  const [thirdOnly, setThirdOnly] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (type !== "all" && r.type !== type) return false;
      if (thirdOnly && !r.isThirdParty) return false;
      if (statusClass !== "all") {
        const s = r.status;
        if (statusClass === "2xx" && (s < 200 || s > 299)) return false;
        if (statusClass === "3xx" && (s < 300 || s > 399)) return false;
        if (statusClass === "4xx" && (s < 400 || s > 499)) return false;
        if (statusClass === "5xx" && (s < 500 || s > 599)) return false;
      }
      if (q && !r.url.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [rows, type, statusClass, thirdOnly, q]);

  const maxEnd = Math.max(1, ...filtered.map((r) => r.startMs + r.durationMs));
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 12,
  });

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">요청 시간표 계산 중…</p>;
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <select
          className="rounded border border-[var(--border)] bg-white px-2 py-1"
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              타입: {t}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-[var(--border)] bg-white px-2 py-1"
          value={statusClass}
          onChange={(e) => setStatusClass(e.target.value as typeof statusClass)}
        >
          <option value="all">상태: all</option>
          <option value="2xx">2xx</option>
          <option value="3xx">3xx</option>
          <option value="4xx">4xx</option>
          <option value="5xx">5xx</option>
        </select>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={thirdOnly}
            onChange={(e) => setThirdOnly(e.target.checked)}
          />
          Third-party만
        </label>
        <input
          className="min-w-[12rem] flex-1 rounded border border-[var(--border)] px-2 py-1"
          placeholder="URL 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="text-[var(--muted)]">{filtered.length}건</span>
      </div>

      <div ref={parentRef} className="h-[28rem] overflow-auto rounded border border-[var(--border)] bg-white">
        <div
          style={{ height: virtualizer.getTotalSize(), position: "relative" }}
        >
          {virtualizer.getVirtualItems().map((item) => {
            const r = filtered[item.index]!;
            const left = (r.startMs / maxEnd) * 100;
            const width = Math.max(0.4, (r.durationMs / maxEnd) * 100);
            const waitW = r.durationMs > 0 ? (r.wait / r.durationMs) * 100 : 0;
            const recvW = r.durationMs > 0 ? (r.receive / r.durationMs) * 100 : 0;
            return (
              <div
                key={item.key}
                className="absolute left-0 flex w-full items-center gap-2 border-b border-stone-100 px-2 text-xs"
                style={{
                  height: item.size,
                  transform: `translateY(${item.start}px)`,
                }}
              >
                <div className="w-40 truncate" title={r.url}>
                  {r.fileName}
                  {r.possiblyRenderBlocking ? (
                    <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-800">
                      blocking?
                    </span>
                  ) : null}
                </div>
                <div className="w-10 text-[var(--muted)]">{r.status}</div>
                <div className="relative h-3 flex-1 rounded bg-stone-100">
                  <div
                    className="absolute top-0 flex h-full overflow-hidden rounded"
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <div className="h-full bg-teal-700/80" style={{ width: `${waitW}%` }} />
                    <div className="h-full bg-sky-500/80" style={{ width: `${recvW}%` }} />
                    <div className="h-full flex-1 bg-stone-400/70" />
                  </div>
                </div>
                <div className="w-20 text-right text-[var(--muted)]">
                  {Math.round(r.durationMs)}ms
                </div>
                <div className="w-20 text-right text-[var(--muted)]">
                  {r.transferBytes !== null ? formatBytes(r.transferBytes).split(" ")[0] : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-[var(--muted)]">
        막대: 청록=wait, 하늘=receive, 회색=기타 구간. 수치는 HAR timings 기준입니다.
      </p>
    </Card>
  );
}
