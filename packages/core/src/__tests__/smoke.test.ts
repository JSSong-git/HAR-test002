import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  analyzeHar,
  buildWaterfallRows,
  HarParseError,
  parseHarText,
  renderReportMarkdown,
} from "../index";

const root = path.resolve(__dirname, "../../../../");
const harPath = path.join(root, "fixtures/sample.har");
const expectedPath = path.join(root, "fixtures/sample-expected.json");

describe("cross-run and edge-case smoke", () => {
  const har = JSON.parse(fs.readFileSync(harPath, "utf8"));
  const expected = JSON.parse(fs.readFileSync(expectedPath, "utf8"));

  it("analyzes all three runs without throw and keeps distinct scopes", () => {
    const models = expected.pages.map((p: { id: string }) =>
      analyzeHar(har, { pageId: p.id, fileName: "sample.har" }),
    );
    expect(models).toHaveLength(3);
    for (const model of models) {
      expect(model.provenance.entryCountSelectedRun).toBe(78);
      expect(model.document?.url).toBe(expected.document.url);
      expect(model.protocol[0]?.version).toBe("http/1.1");
      expect(model.payload.topByTransfer[0]?.fileName).toBe(
        "171773721201351.mp4",
      );
    }
    const waits = models.map((m) =>
      m.document?.timings.wait.kind === "ms"
        ? m.document.timings.wait.value
        : null,
    );
    expect(waits[0]).toBe(3733);
    expect(waits.every((w) => typeof w === "number" && w >= 0)).toBe(true);
  });

  it("markdown and model stay consistent for key figures", () => {
    const model = analyzeHar(har, {
      pageId: "page_1_0_1",
      fileName: "sample.har",
    });
    const md = renderReportMarkdown(model);
    expect(md).toContain("page_1_0_1");
    expect(md).toContain("15,911 ms");
    expect(md).toContain("81,875 Bytes");
    expect(md).toContain("3,733 ms");
    expect(md).toContain("171773721201351.mp4");
    expect(md).toContain("http/1.1");
    expect(model.summaryBullets.length).toBeGreaterThan(0);
    expect(model.recommendations.length).toBeGreaterThan(0);
  });

  it("rejects invalid JSON and empty HAR", () => {
    expect(() => parseHarText("{")).toThrow(HarParseError);
    expect(() =>
      analyzeHar({
        log: {
          version: "1.2",
          creator: { name: "x", version: "1" },
          pages: [],
          entries: [],
        },
      }),
    ).toThrow();
  });

  it("never coerces missing timings to zero across sample", () => {
    const model = analyzeHar(har, { pageId: "page_1_0_1" });
    for (const page of model.pages) {
      if (page.onContentLoad.kind === "missing") {
        expect(page.onContentLoad.reason).toBe("minus_one");
      }
    }
    expect(model.document?.timings.blocked).toEqual({
      kind: "missing",
      reason: "minus_one",
    });
  });

  it("builds virtualized waterfall rows without PerfCascade", () => {
    const rows = buildWaterfallRows(har, "page_1_0_1");
    expect(rows).toHaveLength(78);
    expect(rows[0]?.durationMs).toBeGreaterThanOrEqual(0);
  });
});
