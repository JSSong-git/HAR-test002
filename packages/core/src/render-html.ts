import { formatMetric } from "./format";
import type { AnalysisModel } from "./types";
import { renderReportMarkdown } from "./render-markdown";

/** Self-contained HTML report (markdown body + print styles). */
export function renderReportHtml(model: AnalysisModel): string {
  const md = renderReportMarkdown(model);
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const measured = model.cwv.metrics.filter((m) => m.value.kind !== "missing");
  const cwvBlock = model.cwv.hasMeasurement
    ? `<table>
    <thead><tr><th>지표</th><th>값</th><th>경로</th></tr></thead>
    <tbody>${measured
      .map(
        (m) =>
          `<tr><td>${m.name}</td><td>${formatMetric(m.value)}</td><td><code>${m.path}</code></td></tr>`,
      )
      .join("")}</tbody>
  </table>`
    : `<p>이 HAR 회차에는 LCP/FCP/CLS 등 WPT·Chrome 확장 필드가 없습니다. 값을 생성하지 않습니다.</p>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>HAR 보고서 — ${model.fileName}</title>
<style>
  :root { color-scheme: light; font-family: "Pretendard", "Noto Sans KR", system-ui, sans-serif; }
  body { margin: 0; padding: 2rem; background: #f7f5f1; color: #1a1a1a; line-height: 1.5; }
  h1 { font-size: 1.5rem; }
  pre { white-space: pre-wrap; word-break: break-word; background: #fff; border: 1px solid #ddd; padding: 1rem; border-radius: 8px; }
  table { border-collapse: collapse; width: 100%; background: #fff; margin: 1rem 0; }
  th, td { border: 1px solid #ddd; padding: 0.4rem 0.6rem; text-align: left; font-size: 0.9rem; }
  .meta { color: #555; font-size: 0.9rem; margin-bottom: 1.5rem; }
  @media print {
    body { background: #fff; padding: 0; }
    pre, table { break-inside: avoid; }
  }
</style>
</head>
<body>
  <h1>웹 로딩 속도 분석 보고서</h1>
  <p class="meta">파일: ${model.fileName} · 회차: ${model.selectedPageId} · 생성: ${model.analyzedAt}</p>
  <h2>Core Web Vitals / WPT 확장 필드</h2>
  ${cwvBlock}
  <h2>마크다운 본문</h2>
  <pre>${escaped}</pre>
</body>
</html>`;
}
