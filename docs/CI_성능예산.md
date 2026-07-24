# CLI 성능 예산 예시 (GitHub Actions)

```yaml
name: HAR budget
on: [pull_request]
jobs:
  budget:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - run: pnpm install
      - run: pnpm --filter @har-analyzer/cli build
      - run: node packages/cli/dist/cli.cjs analyze ./fixtures/sample.har --max-ttfb 5000 --max-font-size 3000000
```

Exit code `1`이면 PR을 실패 처리합니다.
