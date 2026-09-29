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

test.describe('Private Vehicle Baseline Decoupled UI (BUG-44)', () => {
  test('verifies Powertrain selector remains visible and functional when E-Bike tab is active', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main');

    // 1. Locate and click on the 🚲 E-Bike mode button
    const ebikeBtn = page.locator('button:has-text("E-Bike")').first();
    await expect(ebikeBtn).toBeVisible();
    await ebikeBtn.scrollIntoViewIfNeeded();
    await ebikeBtn.click({ force: true });

    // 2. Assert that E-Bike hardware parameters are displayed
    const ebikeParams = page.locator('text=E-Bike Hardware & Cost Parameters');
    await expect(ebikeParams).toBeVisible();

    // 3. Assert that Private Vehicle Baseline section remains mounted and visible (BUG-44)
    await expect(page.locator('text=Private Vehicle Baseline')).toBeVisible();

    // 4. Assert that Powertrain selector buttons remain visible and functional
    const dieselButton = page.locator('button[aria-label="Diesel"]').first();
    await expect(dieselButton).toBeVisible();
    await dieselButton.scrollIntoViewIfNeeded();

    // 5. Click Diesel powertrain while E-Bike is active to verify full functionality
    await dieselButton.click();
    await expect(dieselButton).toHaveClass(/border-emerald-500/);

    // 6. Click Petrol 91 button to verify switching works seamlessly
    const petrolButton = page.locator('button[aria-label="Petrol 91"]').first();
    await expect(petrolButton).toBeVisible();
    await petrolButton.click();
    await expect(petrolButton).toHaveClass(/border-emerald-500/);
  });
});

test.describe('Minimalist Zone Badges UI (US-42)', () => {
  test('asserts origin and destination <select> dropdowns are removed from DOM and zone badges render dynamically', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main');

    // 1. Assert that the legacy suburb transport hub <select> dropdowns are completely removed from DOM
    const originSelect = page.locator('select:has(option:has-text("Mount Roskill"))');
    await expect(originSelect).toHaveCount(0);

    const destSelect = page.locator('select:has(option:has-text("Auckland CBD"))');
    await expect(destSelect).toHaveCount(0);

    // Ensure no select in DOM contains Auckland suburb options
    const allSelects = page.locator('select');
    const selectTexts = await allSelects.allInnerTexts().catch(() => []);
    for (const text of selectTexts) {
      expect(text).not.toContain('Mount Roskill');
      expect(text).not.toContain('Auckland CBD');
    }

    // 2. Assert that read-only zone badges are mounted directly adjacent to coordinates
    const originBadge = page.locator('[data-testid="origin-zone-badge"]');
    await expect(originBadge).toBeVisible();
    await expect(originBadge).toContainText('Z1'); // Default Epsom is Zone 1
    await expect(originBadge).toContainText('Epsom');

    const destBadge = page.locator('[data-testid="destination-zone-badge"]');
    await expect(destBadge).toBeVisible();
    await expect(destBadge).toContainText('Z1'); // Default CBD is Zone 1
    await expect(destBadge).toContainText('Auckland CBD');

    // 3. Test dynamic update when parameters change via URL or address
    await page.goto('/?from=albany&to=cbd');
    await page.waitForSelector('main');
    await expect(originBadge).toContainText('Z4'); // Albany is Zone 4
    await expect(originBadge).toContainText('Albany');
  });

  test('validates mobile viewport (375px) has zero horizontal overflow with ZoneBadges', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForSelector('main');

    const originBadge = page.locator('[data-testid="origin-zone-badge"]');
    await expect(originBadge).toBeVisible();

    const destBadge = page.locator('[data-testid="destination-zone-badge"]');
    await expect(destBadge).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});


