import { test, expect } from '@playwright/test';

test.describe('First-Run Setup Flow & Tab Shell Navigation (E2E-REGRESSION)', () => {
  test('successfully navigates 4-step setup modal with live autocomplete and mounts dashboard', async ({ page }) => {
    // 1. New user navigation (no search query parameters)
    await page.goto('/');
    const modal = page.locator('[data-testid="setup-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Welcome to Kiwi Commuter');
    await expect(modal).toContainText('Step 1 of 4');

    // Verify close 'X' button is NOT present on first-run onboarding
    await expect(modal.locator('[data-testid="setup-modal-close-btn"]')).toHaveCount(0);

    // Step 1: "Where do you travel?" with live Mapbox/AT autocomplete
    const fromInput = modal.locator('[data-testid="setup-from-input"]');
    await fromInput.click();
    await fromInput.pressSequentially('Mount Roskill', { delay: 30 });
    const fromDropdown = modal.locator('[data-testid="setup-from-input-dropdown"]');
    await expect(fromDropdown).toBeVisible({ timeout: 15000 });
    await modal.locator('[data-testid="setup-from-input-suggestion-0"]').click();
    await expect(fromDropdown).toHaveCount(0);

    const toInput = modal.locator('[data-testid="setup-to-input"]');
    await toInput.click();
    await toInput.pressSequentially('Parnell', { delay: 30 });
    const toDropdown = modal.locator('[data-testid="setup-to-input-dropdown"]');
    await expect(toDropdown).toBeVisible({ timeout: 15000 });
    await modal.locator('[data-testid="setup-to-input-suggestion-0"]').click();
    await expect(toDropdown).toHaveCount(0);

    // Proceed to Step 2
    await modal.locator('[data-testid="setup-next-btn"]').click();

    // Step 2: "How many days a week?"
    await expect(modal.locator('[data-testid="setup-step-2"]')).toBeVisible();
    await expect(modal).toContainText('Step 2 of 4');
    await modal.locator('[data-testid="setup-days-3"]').click();
    await modal.locator('[data-testid="setup-next-btn"]').click();

    // Step 3: "What do you drive?"
    await expect(modal.locator('[data-testid="setup-step-3"]')).toBeVisible();
    await expect(modal).toContainText('Step 3 of 4');
    await modal.locator('[data-testid="setup-drive-petrol"]').click();
    await modal.locator('[data-testid="setup-next-btn"]').click();

    // Step 4: "What's parking like at work?"
    await expect(modal.locator('[data-testid="setup-step-4"]')).toBeVisible();
    await expect(modal).toContainText('Step 4 of 4');
    await modal.locator('[data-testid="setup-parking-free"]').click();
    await modal.locator('[data-testid="setup-next-btn"]').click();

    // Assert modal dismisses
    await expect(modal).toHaveCount(0);

    // Assert Dashboard mounts correctly after setup (Task 2)
    const summaryTabBtn = page.locator('#tab-summary');
    const compareTabBtn = page.locator('#tab-compare');
    const advancedTabBtn = page.locator('#tab-advanced');

    await expect(summaryTabBtn).toBeVisible();
    await expect(compareTabBtn).toBeVisible();
    await expect(advancedTabBtn).toBeVisible();

    const summaryPanel = page.locator('#panel-summary');
    const comparePanel = page.locator('#panel-compare');
    const advancedPanel = page.locator('#panel-advanced');

    await expect(summaryPanel).toHaveCount(1);
    await expect(comparePanel).toHaveCount(1);
    await expect(advancedPanel).toHaveCount(1);

    // Summary tab is active by default
    await expect(summaryPanel).toBeVisible();
    await expect(summaryTabBtn).toHaveAttribute('aria-selected', 'true');
    await expect(summaryPanel).toContainText('Mount Roskill to Parnell');

    // Verify clicking "Change" next to trip line reopens SetupModal with Step 1 and visible close 'X' button (FIX-CHANGE-ROUTE)
    const changeBtn = summaryPanel.locator('[data-testid="summary-change-route-btn"]');
    await expect(changeBtn).toBeVisible();
    await changeBtn.click();

    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Step 1 of 4');
    await expect(modal.locator('[data-testid="setup-from-input"]')).toBeVisible();

    // Verify close button is now visible and functional
    const closeBtn = modal.locator('[data-testid="setup-modal-close-btn"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(modal).toHaveCount(0);
    await expect(summaryPanel).toBeVisible();
  });

  test('clicking Compare tab successfully reveals the CostBarChart (Task 3)', async ({ page }) => {
    // Navigate with query params to bypass setup modal
    await page.goto('/?from=mt-roskill&to=parnell&days=3');
    await expect(page.locator('[data-testid="setup-modal"]')).toHaveCount(0);

    const compareTabBtn = page.locator('#tab-compare');
    await expect(compareTabBtn).toBeVisible();

    // Click Compare tab
    await compareTabBtn.click();
    await expect(compareTabBtn).toHaveAttribute('aria-selected', 'true');

    const comparePanel = page.locator('#panel-compare');
    await expect(comparePanel).toBeVisible();

    // Verify CostBarChart is revealed
    const barChart = comparePanel.locator('[data-testid="cost-bar-chart"]');
    await expect(barChart).toBeVisible();

    // Verify the three comparative bars are rendered
    await expect(barChart).toContainText('Your car');
    await expect(barChart).toContainText('An electric car, if you bought one');
    await expect(barChart).toContainText('Bus and train');

    // Test Timeframe Switcher (Weekly -> Monthly -> Yearly)
    const monthlyBtn = comparePanel.locator('button:has-text("Monthly")');
    await monthlyBtn.click();
    await expect(monthlyBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(barChart).toContainText('a month');

    // Test "Include costs I'd pay anyway" toggle
    const toggleFixed = comparePanel.locator('#toggle-fixed-costs');
    await toggleFixed.click();
    await expect(toggleFixed).toHaveAttribute('aria-checked', 'true');
    await expect(barChart).toContainText('What your commute costs in total');
  });

  test('switches seamlessly across all three tabs (Summary, Compare, Advanced)', async ({ page }) => {
    await page.goto('/?from=albany&to=cbd&days=4');
    await expect(page.locator('[data-testid="setup-modal"]')).toHaveCount(0);

    const summaryPanel = page.locator('#panel-summary');
    const comparePanel = page.locator('#panel-compare');
    const advancedPanel = page.locator('#panel-advanced');

    // 1. Initial State: Summary
    await expect(summaryPanel).toBeVisible();
    await expect(comparePanel).toBeHidden();
    await expect(advancedPanel).toBeHidden();

    // 2. Switch to Compare
    await page.locator('#tab-compare').click();
    await expect(comparePanel).toBeVisible();
    await expect(summaryPanel).toBeHidden();
    await expect(advancedPanel).toBeHidden();

    // 3. Switch to Advanced
    await page.locator('#tab-advanced').click();
    await expect(advancedPanel).toBeVisible();
    await expect(comparePanel).toBeHidden();
    await expect(summaryPanel).toBeHidden();

    // 4. Return to Summary
    await page.locator('#tab-summary').click();
    await expect(summaryPanel).toBeVisible();
    await expect(advancedPanel).toBeHidden();
  });
});

test.describe('Mobile Viewport & Layout Regression (BUG-41)', () => {
  test.use({
    viewport: { width: 375, height: 667 },
  });

  test('renders mobile viewport (375px) without horizontal page overflow on Setup Modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="setup-modal"]');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test('renders mobile viewport (375px) without horizontal page overflow on Dashboard', async ({ page }) => {
    await page.goto('/?from=mt-roskill&to=parnell&days=3');
    await page.waitForSelector('main');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test('ensures no horizontal scrolling exists at 320px width on Setup Modal and Dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });

    // 1. Check Setup Modal at 320px
    await page.goto('/');
    await page.waitForSelector('[data-testid="setup-modal"]');
    let scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    let clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    // 2. Check Dashboard at 320px
    await page.goto('/?from=mt-roskill&to=parnell&days=3');
    await page.waitForSelector('main');
    scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});

test.describe('Advanced Tab & Custom Commute Form Interactivity', () => {
  test('expands "Use your own numbers." accordion and displays ZoneBadges & powertrain controls', async ({ page }) => {
    await page.goto('/?tab=advanced&from=albany&to=cbd&days=3');
    await page.waitForSelector('#panel-advanced');

    const advancedPanel = page.locator('#panel-advanced');
    await expect(advancedPanel).toBeVisible();

    // Expand the "Use your own numbers." accordion row
    const customNumbersRow = advancedPanel.locator('button:has-text("Use your own numbers.")');
    await customNumbersRow.click();

    // Verify ZoneBadges render dynamically inside CommuteForm
    const originBadge = advancedPanel.locator('[data-testid="origin-zone-badge"]');
    await expect(originBadge).toBeVisible();
    await expect(originBadge).toContainText('Z4'); // Albany is Zone 4
    await expect(originBadge).toContainText('Albany');

    const destBadge = advancedPanel.locator('[data-testid="destination-zone-badge"]');
    await expect(destBadge).toBeVisible();
    await expect(destBadge).toContainText('Z1'); // CBD is Zone 1
    await expect(destBadge).toContainText('Auckland CBD');

    // Verify powertrain button toggling inside CommuteForm
    const dieselButton = advancedPanel.locator('button[aria-label="Diesel"]').first();
    await expect(dieselButton).toBeVisible();
    await dieselButton.click();
    await expect(dieselButton).toHaveClass(/border-emerald-500/);

    const petrolButton = advancedPanel.locator('button[aria-label="Petrol 91"]').first();
    await expect(petrolButton).toBeVisible();
    await petrolButton.click();
    await expect(petrolButton).toHaveClass(/border-emerald-500/);
  });
});
