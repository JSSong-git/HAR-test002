# HAR-test002 — 웹 로딩 속도 분석기

HAR-test001(v0.1.0 동결)의 후속 제품입니다. Fact-Only·브라우저 로컬 분석 원칙을 유지하면서 Web Worker, 가상화 워터폴, Diff, CLI, 마스킹 등을 단계적으로 제공합니다.

## 구조

```
packages/
  core/         @har-analyzer/core — 순수 TypeScript 분석 엔진
  web/          Vite + React 정적 SPA
  cli/          터미널 CLI · 성능 예산
  chrome-ext/   Chrome Extension MVP (DevTools 패널)
docs/           요구사항·로드맵
fixtures/       골든 HAR
```

## 문서

- [요구사항 정의서](docs/요구사항_정의서.md)
- [사용자 매뉴얼](docs/사용자_매뉴얼.md)
- [로드맵](docs/로드맵.md)
- [CI 성능 예산 예시](docs/CI_성능예산.md)

## 실행

```bash
pnpm install
pnpm --filter @har-analyzer/core test
pnpm --filter @har-analyzer/web dev
```

브라우저에서 http://localhost:5173 을 연 뒤 `fixtures/sample.har`를 업로드하세요.

## Phase 로드맵

| Phase | 버전 | 내용 |
|-------|------|------|
| 1 | v0.2.x | Vite SPA, Worker, 가상화 워터폴, 코어 패키지 |
| 2 | v0.3.x | Sanitizer, CWV, HTML/Print export, 워터폴 필터, Playwright |
| 3 | v1.0.x | Diff, CLI 예산, Chrome Extension MVP |

현재 저장소 `main`은 Phase 1–3 기능을 포함합니다 (태그 `v1.0.0`).

### CWV / WPT 확장 필드

WebPageTest·Chrome HAR은 `_LCP` 단축키뿐 아니라 `_chromeUserTiming.LargestContentfulPaint`, `_chromeUserTiming` 배열 등 여러 형태로 CWV를 남깁니다. 코어는 이들 경로를 모두 읽습니다. **필드가 없는 HAR**(예: 기본 `fixtures/sample.har`)에서는 값을 만들지 않고 「확장 필드 없음」으로 안내합니다.

## 원칙

- HAR은 서버로 전송하지 않습니다.
- `-1`/부재 값은 「측정 안 됨」이며 0으로 보정하지 않습니다.
- 점수/등급(health score)을 제공하지 않습니다.
