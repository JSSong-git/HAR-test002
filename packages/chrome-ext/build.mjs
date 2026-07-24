import esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "dist");
fs.mkdirSync(dist, { recursive: true });

for (const f of ["manifest.json", "devtools.html", "devtools.js", "panel.html"]) {
  fs.copyFileSync(path.join(__dirname, f), path.join(dist, f));
}

const coreEntry = path.join(__dirname, "../core/src/index.ts");

await esbuild.build({
  entryPoints: [path.join(__dirname, "panel.js")],
  bundle: true,
  outfile: path.join(dist, "panel.js"),
  format: "iife",
  platform: "browser",
  target: ["chrome120"],
  alias: {
    "@har-analyzer/core": coreEntry,
  },
});

console.log("chrome-ext build -> dist/");
