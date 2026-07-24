import type { Page } from "har-format";
import { timingMetric } from "./format";
import type { PageTimingRow } from "./types";

export function extractPageTimings(pages: Page[]): PageTimingRow[] {
  return pages.map((page, index) => {
    const onLoadRaw = page.pageTimings?.onLoad;
    const onContentLoadRaw = page.pageTimings?.onContentLoad;

    return {
      pageId: page.id,
      startedDateTime: page.startedDateTime,
      title: page.title || "",
      onLoad: timingMetric(onLoadRaw),
      onContentLoad: timingMetric(onContentLoadRaw),
      evidence: [
        {
          path: `log.pages[${index}].id`,
          value: page.id,
        },
        {
          path: `log.pages[${index}].pageTimings.onLoad`,
          value: onLoadRaw ?? null,
          unit: "ms",
        },
        {
          path: `log.pages[${index}].pageTimings.onContentLoad`,
          value: onContentLoadRaw ?? null,
          unit: "ms",
        },
      ],
    };
  });
}
