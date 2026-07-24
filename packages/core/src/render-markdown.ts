import {
  formatMetric,
  formatMs,
  formatMsShort,
  metricNumber,
} from "./format";
import { typeLabel } from "./classify";
import type { AnalysisModel } from "./types";

export function renderReportMarkdown(model: AnalysisModel): string {
  const lines: string[] = [];

  lines.push("# HAR 파일 기반 웹 성능 수치 분석 보고서");
  lines.push("");
  const creator = [model.provenance.creatorName, model.provenance.creatorVersion]
    .filter(Boolean)
    .join(" ");
  const browser = [model.provenance.browserName, model.provenance.browserVersion]
    .filter(Boolean)
    .join(" ");
  const url = model.document?.url ?? "(문서 URL 측정 불가)";
  lines.push(
    `본 보고서는 HAR 파일(\`${model.fileName}\`)에 기록된 수치만으로 작성되었습니다.` +
      (creator ? ` creator: ${creator}.` : "") +
      (browser ? ` browser: ${browser}.` : "") +
      ` 상세 분석 기준 Run: \`${model.selectedPageId}\`. 측정 대상 URL: ${url}.`,
  );
  lines.push("");

  lines.push("## 1. 페이지 로딩 핵심 지표 (Page Timings)");
  lines.push("");
  lines.push(`* **측정 대상 URL**: ${url}`);
  lines.push("* **Run별 로드 완료 시간**:");
  model.pages.forEach((page, i) => {
    lines.push(
      `  * Run ${i + 1} (${page.pageId}): ${formatMetric(page.onLoad)}`,
    );
  });
  const missingContent = model.pages.filter(
    (p) => p.onContentLoad.kind === "missing",
  );
  if (missingContent.length > 0) {
    lines.push(
      `* *특이사항*: ${missingContent.length}개 Run에서 onContentLoad가 ${formatMetric(missingContent[0]!.onContentLoad)}.`,
    );
  }
  lines.push("");

  lines.push("## 1b. Core Web Vitals / WPT 확장");
  lines.push("");
  if (model.cwv.hasMeasurement) {
    for (const m of model.cwv.metrics) {
      if (m.value.kind === "missing") continue;
      lines.push(`* **${m.name}**: ${formatMetric(m.value)} (\`${m.path}\`)`);
    }
  } else {
    lines.push(
      "* 이 HAR 회차에는 LCP/FCP/CLS 등 WPT·Chrome 확장 필드가 없음 (값 생성 없음).",
    );
  }
  lines.push("");

  lines.push("## 2. 개별 리소스 통계 및 데이터 전송량 (Payload Analysis)");
  lines.push("");
  lines.push(`* **상세 기준 Run**: ${model.selectedPageId}`);
  if (model.document) {
    lines.push(
      `* **초기 HTML 문서 (${model.document.fileName})**: ${formatMetric(model.document.transferSize)}`,
    );
  } else {
    lines.push("* **초기 HTML 문서**: 식별 불가");
  }
  lines.push("* **초과 크기 정적 리소스 (전송 크기 상위)**:");
  const media = model.payload.byTypeTop.media?.[0];
  const image = model.payload.byTypeTop.image?.[0];
  const script = model.payload.scriptsTop[0];
  let n = 1;
  if (media) {
    lines.push(
      `  ${n}. **미디어**: ${media.fileName} -> ${formatMetric(media.transferSize)}`,
    );
    n += 1;
  }
  if (image) {
    lines.push(
      `  ${n}. **이미지**: ${image.fileName} -> ${formatMetric(image.transferSize)}`,
    );
    n += 1;
  }
  if (model.payload.fonts.length > 0) {
    lines.push(`  ${n}. **웹폰트**:`);
    for (const f of model.payload.fonts) {
      lines.push(
        `     * ${f.fileName} (${formatMetric(f.transferSize)})`,
      );
    }
    lines.push(
      `     * *웹폰트 총합*: ${formatMetric(model.payload.fontTotalBytes)}`,
    );
    n += 1;
  }
  if (script) {
    lines.push(
      `  ${n}. **JavaScript**: ${script.fileName} -> ${formatMetric(script.transferSize)}`,
    );
  }
  lines.push("");

  lines.push("## 3. 네트워크 통신 방식 및 트래픽 병목 요인");
  lines.push("");
  lines.push("### 3.1 초기 TTFB (Time to First Byte)");
  lines.push("");
  if (model.document) {
    const d = model.document;
    lines.push(`* **대상**: 최초 HTML 요청 ${d.url}`);
    lines.push("* **세부 지연 수치**:");
    lines.push(`  * DNS 조회 (dns): ${formatMetric(d.timings.dns)}`);
    lines.push(`  * TCP 커넥션 (connect): ${formatMetric(d.timings.connect)}`);
    lines.push(`  * SSL/TLS 핸드셰이크 (ssl): ${formatMetric(d.timings.ssl)}`);
    lines.push(
      `  * **서버 응답 대기 시간 (wait)**: ${formatMetric(d.timings.wait)}`,
    );
    lines.push(
      `  * 콘텐츠 다운로드 (receive): ${formatMetric(d.timings.receive)}`,
    );
    const wait = metricNumber(d.timings.wait);
    if (wait !== null) {
      lines.push(
        `* **분석**: 연결 단계 이후 서버 첫 바이트 대기(wait)로 ${formatMs(wait)}가 기록되었습니다.`,
      );
    }
  } else {
    lines.push("* 초기 HTML 문서를 식별하지 못해 TTFB를 산출할 수 없습니다.");
  }
  lines.push("");

  lines.push("### 3.2 프로토콜 구성 및 다중 연결 대기");
  lines.push("");
  const protoText = model.protocol
    .map((p) => `${p.version} ${p.count}건(${(p.ratio * 100).toFixed(0)}%)`)
    .join(", ");
  lines.push(`* **통신 프로토콜 분포**: ${protoText || "측정 불가"}`);
  const host = model.concurrency.primaryHost;
  if (host) {
    lines.push(
      `* **관측 동시성**: 호스트 \`${host.host}\`에서 receive 구간 기준 최대 동시 전송 ${host.maxConcurrentReceive}건 (해당 호스트 요청 ${host.entryCount}건).`,
    );
    if (host.blockedRecordedCount > 0 && host.blockedSumMs !== null) {
      lines.push(
        `* **blocked 기록**: ${host.blockedRecordedCount}건, 합계 ${formatMsShort(host.blockedSumMs)}.`,
      );
    } else {
      lines.push(
        "* **blocked 기록**: 해당 호스트 entries에서 blocked>=0 값이 없어 큐잉 대기를 blocked 필드로 합산할 수 없습니다.",
      );
    }
    const http11 = model.protocol.find((p) =>
      p.version.toLowerCase().includes("http/1.1"),
    );
    if (http11 && http11.ratio >= 0.5) {
      lines.push(
        `* **참고**: HTTP/1.1이 다수(${(http11.ratio * 100).toFixed(0)}%)이며, 브라우저의 일반적 호스트당 동시 연결 한도(약 6)와 비교할 때 관측 최대 동시 receive는 ${host.maxConcurrentReceive}건입니다. 한도 자체는 HAR 필드가 아니라 관측값과의 비교 참고입니다.`,
      );
    }
  }
  lines.push("");

  lines.push("### 3.3 대용량 에셋의 다운로드 지연");
  lines.push("");
  if (model.bottlenecks.length === 0) {
    lines.push("* 해당 Run에서 병목 후보 에셋을 산출하지 못했습니다.");
  } else {
    for (const b of model.bottlenecks) {
      lines.push(
        `* ${b.fileName} (${typeLabel(b.type)}): 총 ${formatMetric(b.time)} (대기 ${formatMetric(b.wait)}, 전송 ${formatMetric(b.receive)})`,
      );
    }
  }
  lines.push("");

  lines.push("## 4. 실질적인 성능 최적화 방안");
  lines.push("");
  lines.push(
    "아래 항목은 HAR에 기록된 수치가 임계조건을 충족할 때만 출력되며, 파일에 없는 원인을 단정하지 않습니다.",
  );
  lines.push("");
  if (model.recommendations.length === 0) {
    lines.push("* 설정된 수치 조건에 해당하는 제언 항목이 없습니다.");
  } else {
    model.recommendations.forEach((rec, i) => {
      lines.push(`### 4.${i + 1} ${rec.title}`);
      lines.push("");
      lines.push(`* ${rec.body.replace(/\n/g, "\n* ")}`);
      lines.push("");
    });
  }

  lines.push("### 분석 요약");
  lines.push("");
  for (const bullet of model.summaryBullets) {
    lines.push(`* ${bullet}`);
  }
  if (model.document && metricNumber(model.document.timings.wait) !== null) {
    lines.push(
      `* 지연 구성 요소(사실): 초기 HTML wait ${formatMetric(model.document.timings.wait)}`,
    );
  }
  const fontTotal = formatMetric(model.payload.fontTotalBytes);
  lines.push(`* 지연 구성 요소(사실): 웹폰트 전송 총합 ${fontTotal}`);
  lines.push("");

  if (model.dataQuality.length > 0) {
    lines.push("## 부록. 데이터 품질 알림");
    lines.push("");
    for (const note of model.dataQuality) {
      lines.push(`* ${note.message}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
