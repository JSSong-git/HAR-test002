import { describe, expect, it } from "vitest";
import { sanitizeHarForNetworkViewer, scopeHarToPage } from "../lib/scope-har";

describe("scopeHarToPage + network-viewer sanitize", () => {
  it("stubs null response.content so network-viewer does not crash", () => {
    const har = {
      log: {
        version: "1.2",
        creator: { name: "t", version: "1" },
        pages: [
          {
            id: "p1",
            title: "t",
            startedDateTime: "2026-01-01T00:00:00.000Z",
            pageTimings: { onLoad: 1, onContentLoad: -1 },
          },
        ],
        entries: [
          {
            pageref: "p1",
            startedDateTime: "2026-01-01T00:00:00.000Z",
            time: 10,
            request: {
              method: "GET",
              url: "https://ex.com/",
              httpVersion: "HTTP/1.1",
              cookies: [],
              headers: [],
              queryString: [],
              headersSize: -1,
              bodySize: -1,
            },
            response: {
              status: 200,
              statusText: "OK",
              httpVersion: "HTTP/1.1",
              cookies: [],
              headers: [],
              content: null,
              redirectURL: "",
              headersSize: -1,
              bodySize: 0,
            },
            cache: {},
            timings: { send: 0, wait: 1, receive: 1 },
          },
        ],
      },
    };
    const scoped = scopeHarToPage(har, "p1");
    expect(scoped?.log.entries).toHaveLength(1);
    expect(scoped?.log.entries?.[0]?.response.content).toEqual({
      size: -1,
      mimeType: "x-unknown",
      text: "",
    });
  });

  it("sanitizeHarForNetworkViewer is idempotent for valid content", () => {
    const har = {
      log: {
        version: "1.2",
        creator: { name: "t", version: "1" },
        pages: [],
        entries: [
          {
            startedDateTime: "2026-01-01T00:00:00.000Z",
            time: 1,
            request: {
              method: "GET",
              url: "https://ex.com/a",
              httpVersion: "HTTP/1.1",
              cookies: [],
              headers: [],
              queryString: [],
              headersSize: -1,
              bodySize: -1,
            },
            response: {
              status: 200,
              statusText: "OK",
              httpVersion: "HTTP/1.1",
              cookies: [],
              headers: [],
              content: { size: 10, mimeType: "text/plain", text: "hi" },
              redirectURL: "",
              headersSize: -1,
              bodySize: 10,
            },
            cache: {},
            timings: { send: 0, wait: 0, receive: 1 },
          },
        ],
      },
    };
    const out = sanitizeHarForNetworkViewer(har as never);
    expect(out.log.entries?.[0]?.response.content?.text).toBe("hi");
  });
});
