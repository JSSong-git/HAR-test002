import { renderReportHtml } from "@har-analyzer/core";
import type { AnalysisModel } from "@har-analyzer/core";
import { Button, Card } from "./ui";

type Props = {
  model: AnalysisModel;
  markdown: string;
  fileName: string;
};

export function ReportExport({ model, markdown, fileName }: Props) {
  const base = fileName.replace(/\.har$/i, "") || "report";

  function download(name: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="space-y-3">
      <div className="no-print flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => void navigator.clipboard.writeText(markdown)}
        >
          마크다운 복사
        </Button>
        <Button
          type="button"
          onClick={() => download(`${base}.md`, markdown, "text/markdown")}
        >
          .md 다운로드
        </Button>
        <Button
          type="button"
          onClick={() =>
            download(`${base}.html`, renderReportHtml(model), "text/html")
          }
        >
          HTML 다운로드
        </Button>
        <Button type="button" onClick={() => window.print()}>
          인쇄 / PDF
        </Button>
      </div>
      <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg bg-stone-100 p-3 text-xs">
        {markdown}
      </pre>
    </Card>
  );
}
