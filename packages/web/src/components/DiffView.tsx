import {
  formatBytes,
  formatMs,
  type HarDiffResult,
} from "@har-analyzer/core";
import { Card } from "./ui";

export function DiffView({
  diff,
  markdown,
}: {
  diff: HarDiffResult | null;
  markdown: string;
}) {
  if (!diff) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted)]">
          비교용 HAR(이후)을 추가로 올리면 onLoad / TTFB / 전송량 차이를 표시합니다.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-semibold">지표 Δ</h3>
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-1">지표</th>
              <th>이전</th>
              <th>이후</th>
              <th>Δ</th>
            </tr>
          </thead>
          <tbody>
            {diff.deltas.map((d) => {
              const fmt = (v: number | null) => {
                if (v === null) return "측정 안 됨";
                if (d.unit === "ms") return formatMs(v);
                if (d.unit === "bytes") return formatBytes(v);
                return String(v);
              };
              return (
                <tr key={d.metric} className="border-b border-stone-100">
                  <td className="py-1">{d.metric}</td>
                  <td>{fmt(d.before)}</td>
                  <td>{fmt(d.after)}</td>
                  <td>{fmt(d.delta)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <Card>
        <h3 className="font-semibold">리소스 변화</h3>
        <ul className="mt-2 max-h-64 space-y-1 overflow-auto text-sm">
          {diff.resources.length === 0 && <li>관측된 급변 리소스 없음</li>}
          {diff.resources.slice(0, 50).map((r) => (
            <li key={r.key}>
              <strong>{r.kind}</strong> {r.fileName}
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h3 className="mb-2 font-semibold">Diff 마크다운</h3>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">{markdown}</pre>
      </Card>
    </div>
  );
}
