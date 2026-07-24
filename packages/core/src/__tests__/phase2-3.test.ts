import { describe, expect, it } from "vitest";
import {
  checkPerformanceBudget,
  diffAnalysisModels,
  evaluateRules,
  sanitizeHarForExport,
  analyzeHar,
} from "../index";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../../../../");
const har = JSON.parse(
  fs.readFileSync(path.join(root, "fixtures/sample.har"), "utf8"),
);

describe("declarative rules", () => {
  it("produces same recommendation ids as golden sample expectations", () => {
    const model = analyzeHar(har, { pageId: "page_1_0_1" });
    const ids = model.recommendations.map((r) => r.id).sort();
    expect(ids).toEqual(["fonts", "media", "protocol", "ttfb"].sort());
  });

  it("evaluateRules returns empty when context empty", () => {
    expect(
      evaluateRules({
        document: null,
        protocol: [],
        fonts: [],
        fontTotalBytes: null,
        topAssets: [],
        primaryHost: null,
      }),
    ).toEqual([]);
  });
});

describe("sanitizer", () => {
  it("masks authorization and cookie headers", () => {
    const input = {
      log: {
        entries: [
          {
            request: {
              url: "https://ex.com/a?access_token=secret",
              headers: [
                { name: "Authorization", value: "Bearer abc" },
                { name: "Accept", value: "text/html" },
              ],
              cookies: [{ name: "JSESSIONID", value: "xyz" }],
              queryString: [{ name: "access_token", value: "secret" }],
            },
            response: {
              headers: [{ name: "Set-Cookie", value: "a=1" }],
            },
          },
        ],
      },
    };
    const out = sanitizeHarForExport(input) as typeof input;
    expect(out.log.entries[0]!.request.headers[0]!.value).toBe("***MASKED***");
    expect(out.log.entries[0]!.request.headers[1]!.value).toBe("text/html");
    expect(out.log.entries[0]!.request.cookies[0]!.value).toBe("***MASKED***");
    expect(out.log.entries[0]!.request.queryString[0]!.value).toBe(
      "***MASKED***",
    );
    expect(out.log.entries[0]!.response.headers[0]!.value).toBe("***MASKED***");
    expect(out.log.entries[0]!.request.url).toContain("***MASKED***");
  });
});

describe("diff + budget", () => {
  it("diff between same model has zero deltas", () => {
    const a = analyzeHar(har, { pageId: "page_1_0_1", fileName: "a.har" });
    const b = analyzeHar(har, { pageId: "page_1_0_1", fileName: "b.har" });
    const d = diffAnalysisModels(a, b);
    expect(d.deltas.find((x) => x.metric === "onLoad")?.delta).toBe(0);
  });

  it("budget fails when TTFB exceeds limit", () => {
    const model = analyzeHar(har, { pageId: "page_1_0_1" });
    const result = checkPerformanceBudget(model, { maxTtfbMs: 100 });
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.id === "max-ttfb")).toBe(true);
  });

  it("includes cwv appendix without coercing missing to 0", () => {
    const model = analyzeHar(har, { pageId: "page_1_0_1" });
    expect(model.cwv.metrics.length).toBeGreaterThan(0);
    for (const m of model.cwv.metrics) {
      if (m.value.kind === "missing") {
        expect(m.value).not.toEqual({ kind: "ms", value: 0 });
      }
    }
  });
});
