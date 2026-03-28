import { test } from "@playwright/test";
import { mkdirSync } from "fs";
import { join } from "path";

const SCREENSHOT_DIR = join(__dirname, "..", "docs", "screenshots");
const VIEWPORT = { width: 1280, height: 800 };

test.beforeAll(() => {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test.describe("Application Screenshots", () => {
  test("home — project list and new project dialog", async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Capture the home page with projects list
    await page.screenshot({
      path: join(SCREENSHOT_DIR, "home.png"),
      fullPage: false,
    });
  });

  test("editor — canvas with toolbar and panels", async ({ page }) => {
    await page.setViewportSize(VIEWPORT);

    // Create a project via the home page
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Click "New Project" and create one
    const newProjectBtn = page.getByRole("button", { name: /new project/i });
    if (await newProjectBtn.isVisible()) {
      await newProjectBtn.click();
      await page.waitForTimeout(500);

      // Fill in project name if dialog is open
      const nameInput = page.locator('input[type="text"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill("Screenshot Fighter");
      }

      // Submit the form — click Create button
      const createBtn = page.getByRole("button", { name: /create/i });
      if (await createBtn.isVisible()) {
        await createBtn.click();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);
      }
    } else {
      // Fallback: navigate directly to editor with query params
      await page.goto("/editor/screenshot-demo?w=64&h=64&name=Screenshot%20Fighter");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    }

    // Capture the editor view
    await page.screenshot({
      path: join(SCREENSHOT_DIR, "editor.png"),
      fullPage: false,
    });
  });

  test("editor — timeline with frames", async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await page.goto("/editor/screenshot-timeline?w=64&h=64&name=Timeline%20Demo");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Try to add a few frames by clicking the add-frame button
    const addFrameBtn = page.getByRole("button", { name: /add frame|new frame|\+/i });
    for (let i = 0; i < 3; i++) {
      if (await addFrameBtn.isVisible()) {
        await addFrameBtn.click();
        await page.waitForTimeout(300);
      }
    }

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "timeline.png"),
      fullPage: false,
    });
  });

  test("editor — hitbox overlay", async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await page.goto("/editor/screenshot-hitbox?w=64&h=64&name=Hitbox%20Demo");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Select the hitbox tool if available
    const hitboxBtn = page.getByRole("button", { name: /hitbox/i });
    if (await hitboxBtn.isVisible()) {
      await hitboxBtn.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "hitboxes.png"),
      fullPage: false,
    });
  });

  test("editor — AI generation panel", async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await page.goto("/editor/screenshot-ai?w=64&h=64&name=AI%20Demo");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Try to open the AI generation panel
    const aiBtn = page.getByRole("button", { name: "AI Generate" });
    if (await aiBtn.isVisible()) {
      await aiBtn.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "ai-generation.png"),
      fullPage: false,
    });
  });

  test("editor — export dialog", async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await page.goto("/editor/screenshot-export?w=64&h=64&name=Export%20Demo");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Try to open the export dialog
    const exportBtn = page.getByRole("button", { name: /export/i });
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "export.png"),
      fullPage: false,
    });
  });

  test("wizard — character creation workflow", async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await page.goto("/wizard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "wizard.png"),
      fullPage: false,
    });
  });

  test("editor — fighter pack panel", async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await page.goto("/editor/screenshot-pack?w=64&h=64&name=Fighter%20Pack%20Demo");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Try to open the fighter pack panel
    const packBtn = page.getByRole("button", { name: /fighter|pack|batch/i });
    if (await packBtn.isVisible()) {
      await packBtn.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "fighter-pack.png"),
      fullPage: false,
    });
  });
});
