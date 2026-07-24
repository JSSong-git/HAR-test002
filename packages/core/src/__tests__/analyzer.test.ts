import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeHar, parseHarText, renderReportMarkdown } from "../index";

const root = path.resolve(__dirname, "../../../../");
const harPath = path.join(root, "fixtures/sample.har");
const expectedPath = path.join(root, "fixtures/sample-expected.json");

describe("HAR analyzer golden sample", () => {
  const har = JSON.parse(fs.readFileSync(harPath, "utf8"));
  const expected = JSON.parse(fs.readFileSync(expectedPath, "utf8"));

  it("parses sample HAR", () => {
    const text = fs.readFileSync(harPath, "utf8");
    const parsed = parseHarText(text);
    expect(parsed.pages).toHaveLength(3);
    expect(parsed.entries).toHaveLength(234);
  });

  it("matches page timings and does not coerce -1 to 0", () => {
    const model = analyzeHar(har, { pageId: expected.pageId });
    expect(model.pages).toHaveLength(3);
    for (let i = 0; i < expected.pages.length; i++) {
      const page = model.pages[i]!;
      const exp = expected.pages[i]!;
      expect(page.pageId).toBe(exp.id);
      expect(page.onLoad).toEqual({ kind: "ms", value: exp.onLoad });
      expect(page.onContentLoad).toEqual({
        kind: "missing",
        reason: "minus_one",
      });
    }
  });

  it("scopes entries to selected run", () => {
    const model = analyzeHar(har, { pageId: expected.pageId });
    expect(model.provenance.entryCountSelectedRun).toBe(expected.runEntryCount);
    expect(model.provenance.entryCountTotal).toBe(234);
  });

  it("identifies document HTML (not visitcounter) and TTFB", () => {
    const model = analyzeHar(har, { pageId: expected.pageId });
    expect(model.document).not.toBeNull();
    expect(model.document!.url).toBe(expected.document.url);
    expect(model.document!.transferSize).toEqual({
      kind: "bytes",
      value: expected.document.transferSize,
    });
    expect(model.document!.timings.wait).toEqual({
      kind: "ms",
      value: expected.document.timings.wait,
    });
    expect(model.document!.timings.dns).toEqual({
      kind: "ms",
      value: expected.document.timings.dns,
    });
    expect(model.document!.timings.connect).toEqual({
      kind: "ms",
      value: expected.document.timings.connect,
    });
    expect(model.document!.timings.ssl).toEqual({
      kind: "ms",
      value: expected.document.timings.ssl,
    });
    expect(model.document!.timings.receive).toEqual({
      kind: "ms",
      value: expected.document.timings.receive,
    });
  });

  it("matches protocol distribution for the run", () => {
    const model = analyzeHar(har, { pageId: expected.pageId });
    expect(model.protocol).toEqual([
      { version: "http/1.1", count: 78, ratio: 1 },
    ]);
  });

  it("ranks top transfer assets without cross-run duplicates", () => {
    const model = analyzeHar(har, { pageId: expected.pageId });
    const top3 = model.payload.topByTransfer.slice(0, 3).map((r) => ({
      fileName: r.fileName,
      transferSize: r.transferSize.kind === "bytes" ? r.transferSize.value : null,
    }));
    expect(top3).toEqual(
      expected.topTransfer.map(
        (t: { fileName: string; transferSize: number }) => ({
          fileName: t.fileName,
          transferSize: t.transferSize,
        }),
      ),
    );
  });

  it("sums fonts once per URL", () => {
    const model = analyzeHar(har, { pageId: expected.pageId });
    expect(model.payload.fonts).toHaveLength(expected.fontCount);
    expect(model.payload.fontTotalBytes).toEqual({
      kind: "bytes",
      value: expected.fontTotalBytes,
    });
  });

  it("matches bottleneck wait/receive for key assets", () => {
    const model = analyzeHar(har, { pageId: expected.pageId });
    for (const [fileName, exp] of Object.entries(expected.bottlenecks) as [
      string,
      { time: number; wait: number; receive: number },
    ][]) {
      const row = model.bottlenecks.find((b) => b.fileName === fileName);
      expect(row, fileName).toBeTruthy();
      expect(row!.time).toEqual({ kind: "ms", value: exp.time });
      expect(row!.wait).toEqual({ kind: "ms", value: exp.wait });
      expect(row!.receive).toEqual({ kind: "ms", value: exp.receive });
    }
  });

  it("renders markdown with factual missing markers", () => {
    const model = analyzeHar(har, {
      pageId: expected.pageId,
      fileName: "sample.har",
    });
    const md = renderReportMarkdown(model);
    expect(md).toContain("측정 안 됨(-1)");
    expect(md).toContain("15,911 ms");
    expect(md).toContain("3,733 ms");
    expect(md).toContain("index.sobang");
    expect(md).not.toContain("DB 쿼리");
    expect(md).not.toContain("세션 검증");
  });

  it("does not throw on null content entries", () => {
    expect(() => analyzeHar(har, { pageId: expected.pageId })).not.toThrow();
  });
});
