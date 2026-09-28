import { test, expect } from '@playwright/test';

test.describe('AT HOP Fare Calculations', () => {
  test('Strictly applies $7.90 4-zone cap and $50 weekly cap', async ({ page }) => {
    // Navigate to production URL with standard commute parameters
    await page.goto('https://kiwi-commuter.vercel.app/?from=papakura&to=parnell&days=4&transitMode=MICROMOBILITY_TRANSIT');

    // Wait for the calculation engine to render the Transit card
    const transitCard = page.locator('[data-testid="at-hop-transit-summary"]');
    
    // Assert 1: The single fare must cap at $7.90 (not the $10.30 bug)
    const singleFare = transitCard.locator('[data-testid="single-fare-value"]');
    await expect(singleFare).toContainText('$7.90');

    // Assert 2: The weekly total for 4 days (4 * $15.80 = $63.20) must be capped at exactly $50
    const weeklyCost = transitCard.locator('[data-testid="weekly-transit-cost"]');
    await expect(weeklyCost).toContainText('$50.00');
  });
});