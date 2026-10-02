import { test, expect } from '@playwright/test';

test.describe('AT HOP Fare Calculations (E2E-REGRESSION)', () => {
  test('Strictly applies $7.90 4-zone cap and $50 weekly cap with modal bypass', async ({ page }) => {
    // Navigate with standard commute parameters to bypass SetupModal (returning user)
    await page.goto('/?from=papakura&to=parnell&days=4&transitMode=MICROMOBILITY_TRANSIT');

    // 1. Verify SetupModal is bypassed because query parameters exist
    await expect(page.locator('[data-testid="setup-modal"]')).toHaveCount(0);

    // 2. Verify Tab Shell is mounted
    const compareTabBtn = page.locator('#tab-compare');
    await expect(compareTabBtn).toBeVisible();

    // 3. Navigate to Compare tab to verify the $50.00 weekly transit cap
    await compareTabBtn.click();
    const comparePanel = page.locator('#panel-compare');
    await expect(comparePanel).toBeVisible();

    // Assert 1: The weekly transit cost for 4 days (4 * $15.80 = $63.20) must be capped at exactly $50.00
    await expect(comparePanel).toContainText('$50.00');
    await expect(comparePanel).toContainText('Bus and train');
    await expect(comparePanel).toContainText('$50 a week rolling cap');

    // 4. Navigate to Advanced tab to verify single fare capping ($7.90) in trip breakdown
    const advancedTabBtn = page.locator('#tab-advanced');
    await advancedTabBtn.click();
    const advancedPanel = page.locator('#panel-advanced');
    await expect(advancedPanel).toBeVisible();

    // Expand "Your trip, step by step." row
    const tripStepsRow = advancedPanel.locator('button:has-text("Your trip, step by step.")');
    await tripStepsRow.click();

    // Assert 2: The single transit leg fare must cap at $7.90 (Auckland Transport 4+ zone cap)
    await expect(advancedPanel).toContainText('$7.90');
  });
});