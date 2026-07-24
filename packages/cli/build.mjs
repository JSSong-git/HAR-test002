import esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(__dirname, "dist"), { recursive: true });
const outfile = path.join(__dirname, "dist/cli.cjs");

await esbuild.build({
  entryPoints: [path.join(__dirname, "src/cli.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile,
  alias: {
    "@har-analyzer/core": path.join(__dirname, "../core/src/index.ts"),
  },
});

let body = fs.readFileSync(outfile, "utf8");
body = body.replace(/^(#!.*\r?\n)+/, "");
fs.writeFileSync(outfile, `#!/usr/bin/env node\n${body}`);
console.log("cli build -> dist/cli.cjs");
