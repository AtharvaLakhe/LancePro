import { expect, test } from "@playwright/test";

test("core workflow stays usable", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Launch Site Rebuild" })).toBeVisible();
  await expect(page.getByText("Protected Value")).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.getByRole("button", { name: "Demo", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Walkthrough for Launch Site Rebuild/ })).toBeVisible();
  await expect(page.getByText("Live demo script")).toBeVisible();

  await page.getByRole("button", { name: "Scope", exact: true }).click();
  await page.getByTitle("Extract scope").click();
  await expect(page.getByText(/Revision language detected|Scope text scanned/)).toBeVisible();

  await page.getByRole("button", { name: "Requests", exact: true }).click();
  await page.getByPlaceholder("Paste a client request").fill(
    "Can you also add ecommerce checkout, subscriptions, and a customer dashboard before launch?",
  );
  await page.getByTitle("Analyze request").click();
  await expect(page.getByText("out of scope").first()).toBeVisible();
  await page.getByRole("button", { name: "Save to queue" }).click();
  await expect(page.getByText("ecommerce checkout")).toBeVisible();

  await page.getByRole("button", { name: "Evidence", exact: true }).click();
  await page.getByTitle("Add evidence").click();
  await expect(page.getByText("Approval note")).toBeVisible();
  await expect(page.locator("code").first()).toContainText(/[a-f0-9]{16}/);

  await page.getByRole("button", { name: "Reports", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByTitle("Export HTML").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("scope-report.html");

  await page.screenshot({
    path: testInfo.outputPath(`scope-guard-${testInfo.project.name}.png`),
    fullPage: true,
  });
});
