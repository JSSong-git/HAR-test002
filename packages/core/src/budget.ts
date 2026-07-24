import { metricNumber } from "./format";
import type { AnalysisModel } from "./types";

export type BudgetOptions = {
  maxTtfbMs?: number;
  maxOnLoadMs?: number;
  maxFontBytes?: number;
  maxTransferTopBytes?: number;
};

export type BudgetViolation = {
  id: string;
  message: string;
  actual: number | null;
  limit: number;
};

export type BudgetResult = {
  ok: boolean;
  violations: BudgetViolation[];
};

export function checkPerformanceBudget(
  model: AnalysisModel,
  options: BudgetOptions,
): BudgetResult {
  const violations: BudgetViolation[] = [];

  if (options.maxTtfbMs !== undefined && model.document) {
    const wait = metricNumber(model.document.timings.wait);
    if (wait !== null && wait > options.maxTtfbMs) {
      violations.push({
        id: "max-ttfb",
        message: `document.wait ${wait}ms > --max-ttfb ${options.maxTtfbMs}`,
        actual: wait,
        limit: options.maxTtfbMs,
      });
    }
  }

  if (options.maxOnLoadMs !== undefined) {
    const page = model.pages.find((p) => p.pageId === model.selectedPageId);
    const onLoad = page ? metricNumber(page.onLoad) : null;
    if (onLoad !== null && onLoad > options.maxOnLoadMs) {
      violations.push({
        id: "max-onload",
        message: `onLoad ${onLoad}ms > --max-onload ${options.maxOnLoadMs}`,
        actual: onLoad,
        limit: options.maxOnLoadMs,
      });
    }
  }

  if (options.maxFontBytes !== undefined) {
    const fonts = metricNumber(model.payload.fontTotalBytes);
    if (fonts !== null && fonts > options.maxFontBytes) {
      violations.push({
        id: "max-font-size",
        message: `font total ${fonts} bytes > --max-font-size ${options.maxFontBytes}`,
        actual: fonts,
        limit: options.maxFontBytes,
      });
    }
  }

  if (options.maxTransferTopBytes !== undefined) {
    const top = model.payload.topByTransfer[0];
    const size = top ? metricNumber(top.transferSize) : null;
    if (size !== null && size > options.maxTransferTopBytes) {
      violations.push({
        id: "max-top-transfer",
        message: `top transfer ${size} bytes > --max-top-transfer ${options.maxTransferTopBytes}`,
        actual: size,
        limit: options.maxTransferTopBytes,
      });
    }
  }

  return { ok: violations.length === 0, violations };
}
