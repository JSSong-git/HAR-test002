import * as Comlink from "comlink";
import {
  analyzeHarText,
  buildWaterfallRows,
  type AnalysisModel,
  type AnalyzeOptions,
  type WaterfallRow,
} from "@har-analyzer/core";

export type AnalyzeWorkerApi = {
  analyze: (text: string, options?: AnalyzeOptions) => AnalysisModel;
  waterfall: (harJson: unknown, pageId: string) => WaterfallRow[];
};

const api: AnalyzeWorkerApi = {
  analyze(text, options) {
    return analyzeHarText(text, options);
  },
  waterfall(harJson, pageId) {
    return buildWaterfallRows(harJson, pageId);
  },
};

Comlink.expose(api);
