import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleHar = path.resolve(__dirname, "../../../fixtures/sample.har");

test("upload HAR and open network viewer tab", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "웹 로딩 속도 분석" })).toBeVisible();

  const inputs = page.locator('input[type="file"]');
  await inputs.first().setInputFiles(sampleHar);

  await expect(page.getByText("요약")).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "네트워크 뷰어" }).click();
  await expect(page.getByText("Sauce Labs Network Viewer")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("네트워크 뷰어 오류")).toHaveCount(0);
  await expect(page.locator(".network-viewer-host")).toBeVisible({
    timeout: 15_000,
  });
});
