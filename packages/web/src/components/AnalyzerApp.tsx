import { useEffect, useMemo, useState } from "react";
import {
  diffAnalysisModels,
  renderDiffMarkdown,
  renderReportMarkdown,
  sanitizeHarForExport,
  type AnalysisModel,
  type HarDiffResult,
  type WaterfallRow,
} from "@har-analyzer/core";
import { analyzeInWorker, waterfallInWorker } from "@/lib/analyzer-client";
import { Alert, Card } from "./ui";
import { HarUploader } from "./HarUploader";
import { ReportView } from "./ReportView";
import { ReportExport } from "./ReportExport";
import { WaterfallView } from "./WaterfallView";
import { DiffView } from "./DiffView";

type Loaded = { fileName: string; text: string; json: unknown };

type Tab = "report" | "export" | "waterfall" | "diff";

export function AnalyzerApp() {
  const [primary, setPrimary] = useState<Loaded | null>(null);
  const [secondary, setSecondary] = useState<Loaded | null>(null);
  const [pageId, setPageId] = useState("");
  const [model, setModel] = useState<AnalysisModel | null>(null);
  const [modelB, setModelB] = useState<AnalysisModel | null>(null);
  const [rows, setRows] = useState<WaterfallRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("report");
  const [mask, setMask] = useState(true);
  const [stripBody, setStripBody] = useState(true);

  useEffect(() => {
    if (!primary) {
      setModel(null);
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const m = await analyzeInWorker(primary.text, {
          fileName: primary.fileName,
          pageId: pageId || undefined,
          stripContentText: stripBody,
        });
        if (cancelled) return;
        setModel(m);
        if (!pageId) setPageId(m.selectedPageId);
        const json = mask
          ? sanitizeHarForExport(primary.json)
          : primary.json;
        const wf = await waterfallInWorker(json, m.selectedPageId);
        if (!cancelled) setRows(wf);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "분석 실패");
          setModel(null);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [primary, pageId, stripBody, mask]);

  useEffect(() => {
    if (!secondary) {
      setModelB(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const m = await analyzeInWorker(secondary.text, {
          fileName: secondary.fileName,
          stripContentText: stripBody,
        });
        if (!cancelled) setModelB(m);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "비교 HAR 분석 실패");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [secondary, stripBody]);

  const markdown = useMemo(
    () => (model ? renderReportMarkdown(model) : ""),
    [model],
  );

  const diff: HarDiffResult | null = useMemo(() => {
    if (!model || !modelB) return null;
    return diffAnalysisModels(model, modelB);
  }, [model, modelB]);

  const diffMd = useMemo(
    () => (diff ? renderDiffMarkdown(diff) : ""),
    [diff],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-wide text-[var(--accent)]">
          HAR-TEST002
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          웹 로딩 속도 분석
        </h1>
        <p className="max-w-3xl text-sm text-[var(--muted)]">
          HAR에 적힌 숫자만으로 보고서를 만듭니다. 분석은 Web Worker에서
          수행되며, 파일은 서버로 전송되지 않습니다.
        </p>
      </header>

      <div className="no-print grid gap-4 lg:grid-cols-2">
        <HarUploader
          onFileLoaded={({ fileName, text }) => {
            setPrimary({ fileName, text, json: JSON.parse(text) });
            setPageId("");
          }}
          onError={setError}
          disabled={busy}
        />
        <HarUploader
          label="비교용 HAR (이후 / Diff)"
          onFileLoaded={({ fileName, text }) => {
            setSecondary({ fileName, text, json: JSON.parse(text) });
          }}
          onError={setError}
          disabled={busy}
        />
      </div>

      <Card className="no-print flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={mask}
            onChange={(e) => setMask(e.target.checked)}
          />
          민감 헤더/쿠키 마스킹 (표시·워터폴)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={stripBody}
            onChange={(e) => setStripBody(e.target.checked)}
          />
          응답 본문(content.text) 제외 분석
        </label>
        {busy && <span className="text-[var(--muted)]">분석 중…</span>}
      </Card>

      {error && <Alert title="분석 오류">{error}</Alert>}

      {model && (
        <>
          <Card className="no-print flex flex-wrap items-center gap-3">
            <label className="text-sm">
              회차{" "}
              <select
                className="ml-2 rounded border border-[var(--border)] bg-white px-2 py-1"
                value={model.selectedPageId}
                onChange={(e) => setPageId(e.target.value)}
              >
                {model.pages.map((p, i) => (
                  <option key={p.pageId} value={p.pageId}>
                    {i + 1}회차 — {p.pageId}
                  </option>
                ))}
              </select>
            </label>
          </Card>

          <div className="no-print flex flex-wrap gap-2">
            {(
              [
                ["report", "분석 결과"],
                ["export", "내보내기"],
                ["waterfall", "요청 시간표"],
                ["diff", "비교(Diff)"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`rounded-md px-3 py-2 text-sm ${
                  tab === id
                    ? "bg-[var(--accent)] text-white"
                    : "bg-white border border-[var(--border)]"
                }`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "report" && <ReportView model={model} />}
          {tab === "export" && (
            <ReportExport
              model={model}
              markdown={markdown}
              fileName={primary!.fileName}
            />
          )}
          {tab === "waterfall" && (
            <WaterfallView rows={rows} loading={busy} />
          )}
          {tab === "diff" && <DiffView diff={diff} markdown={diffMd} />}
        </>
      )}
    </div>
  );
}
