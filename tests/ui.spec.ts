import { test, expect } from '@playwright/test';

test.describe('Mobile Viewport & Tooltip UI Regression (BUG-41)', () => {
  test.use({
    viewport: { width: 375, height: 667 },
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the main layout to hydrate
    await page.waitForSelector('main');
  });

  test('renders mobile viewport (375px) without horizontal page overflow', async ({ page }) => {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // tolerate sub-pixel rounding
  });

  test('validates tooltip containment within 375px viewport (designed for BUG-41)', async ({ page }) => {
    // 1. Locate all tooltip triggers (info buttons and option badges)
    const infoButtons = page.locator('button[aria-label*="info" i], button[aria-label*="benchmark" i]');
    const count = await infoButtons.count();

    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const button = infoButtons.nth(i);
      if (await button.isVisible()) {
        // Scroll button into view and hover/focus
        await button.scrollIntoViewIfNeeded();
        await button.hover();
        await button.focus();

        // Check adjacent tooltip element
        const parent = button.locator('..');
        const tooltip = parent.locator('[role="tooltip"]');

        if (await tooltip.count() > 0) {
          const isVisible = await tooltip.first().isVisible().catch(() => false);
          if (isVisible) {
            const box = await tooltip.first().boundingBox();
            if (box) {
              const viewportWidth = 375;
              // Check for horizontal overflow (left edge < 0 or right edge > 375)
              const overflowsLeft = box.x < 0;
              const overflowsRight = box.x + box.width > viewportWidth;

              // Log details for diagnostic visibility in test reports
              if (overflowsLeft || overflowsRight) {
                console.warn(
                  `[BUG-41 Diagnostic] Tooltip #${i} overflow detected on 375px viewport: ` +
                  `x=${box.x.toFixed(1)}, width=${box.width.toFixed(1)}, right=${(box.x + box.width).toFixed(1)}px`
                );
              }

              // Assertion designed to catch tooltip overflow outside mobile viewport boundary
              expect(box.x).toBeGreaterThanOrEqual(-5); // allow minimal subpixel margin
              expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth + 5);
            }
          }
        }
      }
    }
  });

  test('validates Powertrain HEV tooltip containment on mobile viewport', async ({ page }) => {
    // Locate HEV button in the 2x3 grid
    const hevButton = page.locator('button[aria-label="Hybrid (Non-Plug-in)"]').first();
    if (await hevButton.count() > 0 && await hevButton.isVisible()) {
      await hevButton.scrollIntoViewIfNeeded();
      await hevButton.hover();

      const tooltip = page.locator('div[role="tooltip"]:has-text("Non-plug-in hybrid")');
      if (await tooltip.count() > 0 && await tooltip.isVisible()) {
        const box = await tooltip.boundingBox();
        if (box) {
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(375);
        }
      }
    }
  });
});
