import type { AnalysisModel } from "@har-analyzer/core";
import { formatMetric } from "@har-analyzer/core";
import { Card } from "./ui";

export function ReportView({ model }: { model: AnalysisModel }) {
  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-semibold">요약</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {model.summaryBullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3 className="font-semibold">파일 · 회차</h3>
        <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          <div>파일: {model.fileName}</div>
          <div>회차: {model.selectedPageId}</div>
          <div>
            도구: {[model.provenance.creatorName, model.provenance.creatorVersion]
              .filter(Boolean)
              .join(" ") || "기록 없음"}
          </div>
          <div>
            요청 수: {model.provenance.entryCountSelectedRun} / 전체{" "}
            {model.provenance.entryCountTotal}
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold">Core Web Vitals / WPT 확장</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          HAR에 `_` 접두사 필드가 있을 때만 수치를 표시합니다. 없으면 측정 안 됨.
        </p>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="py-1">지표</th>
              <th>값</th>
            </tr>
          </thead>
          <tbody>
            {model.cwv.metrics.map((m) => (
              <tr key={m.name} className="border-b border-[var(--border)]/60">
                <td className="py-1">{m.name}</td>
                <td>{formatMetric(m.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {model.document && (
        <Card>
          <h3 className="font-semibold">문서(TTFB) 타이밍</h3>
          <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            <div>URL: {model.document.url}</div>
            <div>wait: {formatMetric(model.document.timings.wait)}</div>
            <div>dns: {formatMetric(model.document.timings.dns)}</div>
            <div>receive: {formatMetric(model.document.timings.receive)}</div>
          </div>
        </Card>
      )}

      <Card>
        <h3 className="font-semibold">상위 전송 용량</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {model.payload.topByTransfer.slice(0, 8).map((r) => (
            <li key={r.url}>
              {r.fileName} — {formatMetric(r.transferSize)} ({r.type})
            </li>
          ))}
        </ul>
      </Card>

      {model.recommendations.length > 0 && (
        <Card>
          <h3 className="font-semibold">개선 제안 (관측 수치 기반)</h3>
          <div className="mt-2 space-y-3 text-sm">
            {model.recommendations.map((r) => (
              <div key={r.id}>
                <div className="font-medium">{r.title}</div>
                <p className="whitespace-pre-wrap text-[var(--muted)]">{r.body}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {model.dataQuality.length > 0 && (
        <Card>
          <h3 className="font-semibold">데이터 품질</h3>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {model.dataQuality.map((n) => (
              <li key={n.code}>{n.message}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
