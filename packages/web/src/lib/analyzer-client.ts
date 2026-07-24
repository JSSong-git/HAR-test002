import * as Comlink from "comlink";
import type { AnalyzeWorkerApi } from "../workers/analyze.worker";

let proxy: Comlink.Remote<AnalyzeWorkerApi> | null = null;

function getWorker() {
  if (!proxy) {
    const worker = new Worker(
      new URL("../workers/analyze.worker.ts", import.meta.url),
      { type: "module" },
    );
    proxy = Comlink.wrap<AnalyzeWorkerApi>(worker);
  }
  return proxy;
}

export async function analyzeInWorker(
  text: string,
  options: Parameters<AnalyzeWorkerApi["analyze"]>[1],
) {
  return getWorker().analyze(text, options);
}

export async function waterfallInWorker(harJson: unknown, pageId: string) {
  return getWorker().waterfall(harJson, pageId);
}
