import { analyzeHarText } from "@har-analyzer/core";

const harEl = document.getElementById("har");
const outEl = document.getElementById("out");
const runEl = document.getElementById("run");

runEl?.addEventListener("click", () => {
  try {
    const text = harEl?.value ?? "";
    const model = analyzeHarText(text, {
      fileName: "devtools.har",
      stripContentText: true,
    });
    if (outEl) outEl.textContent = model.summaryBullets.join("\n");
  } catch (e) {
    if (outEl) outEl.textContent = e instanceof Error ? e.message : String(e);
  }
});
