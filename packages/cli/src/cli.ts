#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  analyzeHarText,
  checkPerformanceBudget,
  renderReportMarkdown,
  type BudgetOptions,
} from "@har-analyzer/core";

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const cmd = args[0] ?? "help";
  const file = args.find((a, i) => i > 0 && !a.startsWith("--"));
  const getNum = (flag: string) => {
    const i = args.indexOf(flag);
    if (i < 0) return undefined;
    const v = Number(args[i + 1]);
    return Number.isFinite(v) ? v : undefined;
  };
  const pageId = (() => {
    const i = args.indexOf("--page");
    return i >= 0 ? args[i + 1] : undefined;
  })();
  return {
    cmd,
    file,
    pageId,
    budget: {
      maxTtfbMs: getNum("--max-ttfb"),
      maxOnLoadMs: getNum("--max-onload"),
      maxFontBytes: getNum("--max-font-size"),
      maxTransferTopBytes: getNum("--max-top-transfer"),
    } satisfies BudgetOptions,
    markdown: args.includes("--markdown"),
  };
}

function printHelp() {
  console.log(`har-analyzer — Fact-Only HAR CLI

Usage:
  har-analyzer analyze <file.har> [options]

Options:
  --page <id>              Select page/run id
  --max-ttfb <ms>          Fail if document.wait exceeds
  --max-onload <ms>        Fail if onLoad exceeds
  --max-font-size <bytes>  Fail if font total exceeds
  --max-top-transfer <bytes> Fail if largest asset exceeds
  --markdown               Print markdown report

Exit codes:
  0 success / budget ok
  1 analyze or budget failure
`);
}

async function main() {
  const { cmd, file, pageId, budget, markdown } = parseArgs(process.argv);
  if (cmd === "help" || cmd === "--help" || cmd === "-h") {
    printHelp();
    process.exit(0);
  }
  if (cmd !== "analyze" || !file) {
    printHelp();
    process.exit(1);
  }

  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    process.exit(1);
  }

  try {
    const text = fs.readFileSync(abs, "utf8");
    const model = analyzeHarText(text, {
      fileName: path.basename(abs),
      pageId,
      stripContentText: true,
    });

    if (markdown) {
      process.stdout.write(renderReportMarkdown(model));
    } else {
      console.log(
        JSON.stringify(
          {
            fileName: model.fileName,
            selectedPageId: model.selectedPageId,
            summaryBullets: model.summaryBullets,
            recommendations: model.recommendations.map((r) => r.id),
          },
          null,
          2,
        ),
      );
    }

    const hasBudget = Object.values(budget).some((v) => v !== undefined);
    if (hasBudget) {
      const result = checkPerformanceBudget(model, budget);
      if (!result.ok) {
        console.error("Performance budget failed:");
        for (const v of result.violations) console.error(` - ${v.message}`);
        process.exit(1);
      }
      console.error("Performance budget OK");
    }
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

void main();
