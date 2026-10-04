import { test, expect } from '@playwright/test';

test.describe('Address Autocomplete E2E - Local /api/geocode delegation', () => {
  test('typing an address calls /api/geocode with 200 OK, does NOT call api.mapbox.com, and renders suggestions without error states', async ({ page }) => {
    const geocodeRequests: Array<{ url: string; status?: number }> = [];
    const mapboxRequests: string[] = [];

    // Track requests and responses
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('api.mapbox.com/search') || url.includes('api.mapbox.com/geocoding')) {
        mapboxRequests.push(url);
      }
    });

    page.on('response', (res) => {
      const url = res.url();
      if (url.includes('/api/geocode')) {
        geocodeRequests.push({ url, status: res.status() });
      }
    });

    // 1. Navigate to localhost:3000
    await page.goto('/');

    // Verify setup modal is visible on first run
    const modal = page.locator('[data-testid="setup-modal"]');
    await expect(modal).toBeVisible();

    const fromInput = modal.locator('[data-testid="setup-from-input"]');
    await expect(fromInput).toBeVisible();
    await expect(fromInput).toBeEnabled();

    // 2. Clear network logs before typing
    mapboxRequests.length = 0;
    geocodeRequests.length = 0;

    // 3. Type address and wait for /api/geocode response with 200 OK
    const [geocodeResponse] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/geocode') && res.status() === 200,
        { timeout: 15000 }
      ),
      fromInput.fill('Queen Street'),
    ]);

    // Assert /api/geocode was triggered and returned 200 OK
    expect(geocodeResponse).toBeDefined();
    expect(geocodeResponse.status()).toBe(200);
    expect(geocodeResponse.url()).toContain('/api/geocode?q=Queen%20Street');

    const json = await geocodeResponse.json();
    expect(json).toHaveProperty('address');
    expect(json).toHaveProperty('latitude');
    expect(json).toHaveProperty('longitude');

    // Assert that api.mapbox.com was NOT called during the autocomplete search
    expect(mapboxRequests).toEqual([]);

    // 4. Assert UI successfully renders the address suggestion dropdown
    const dropdown = modal.locator('[data-testid="setup-from-input-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 10000 });

    const firstSuggestion = modal.locator('[data-testid="setup-from-input-suggestion-0"]');
    await expect(firstSuggestion).toBeVisible();
    const suggestionText = await firstSuggestion.innerText();
    expect(suggestionText.trim().length).toBeGreaterThan(0);

    // 5. Assert NO error states or messages are visible in the DOM
    await expect(modal.locator('text=Live address search is currently down')).toHaveCount(0);
    await expect(modal.locator('text=down for maintenance')).toHaveCount(0);
    await expect(modal.locator('text=Internal server error')).toHaveCount(0);
    await expect(modal.locator('text=Error')).toHaveCount(0);
    await expect(fromInput).toBeEnabled();

    // 6. Select the suggestion to verify smooth interaction without error triggers
    await firstSuggestion.click();
    await expect(dropdown).toHaveCount(0);
    await expect(fromInput).toHaveValue(new RegExp('Queen Street', 'i'));
    await expect(fromInput).toBeEnabled();
    await expect(modal.locator('text=Live address search is currently down')).toHaveCount(0);
  });

  test('verifies destination input also delegates to /api/geocode and renders suggestions without error states', async ({ page }) => {
    const mapboxRequests: string[] = [];

    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('api.mapbox.com/search') || url.includes('api.mapbox.com/geocoding')) {
        mapboxRequests.push(url);
      }
    });

    await page.goto('/');

    const modal = page.locator('[data-testid="setup-modal"]');
    await expect(modal).toBeVisible();

    const toInput = modal.locator('[data-testid="setup-to-input"]');
    await expect(toInput).toBeVisible();
    await expect(toInput).toBeEnabled();

    mapboxRequests.length = 0;

    const [geocodeResponse] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/geocode') && res.status() === 200,
        { timeout: 15000 }
      ),
      toInput.fill('Ponsonby Road'),
    ]);

    expect(geocodeResponse.status()).toBe(200);
    expect(geocodeResponse.url()).toContain('/api/geocode?q=Ponsonby%20Road');
    expect(mapboxRequests).toEqual([]);

    const dropdown = modal.locator('[data-testid="setup-to-input-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 10000 });

    const firstSuggestion = modal.locator('[data-testid="setup-to-input-suggestion-0"]');
    await expect(firstSuggestion).toBeVisible();
    await expect(firstSuggestion).not.toBeEmpty();

    // Verify no error states
    await expect(modal.locator('text=Live address search is currently down')).toHaveCount(0);
    await expect(toInput).toBeEnabled();
  });

  test('empty geocode results ({ results: [] }) do NOT trigger maintenance warning banner', async ({ page }) => {
    await page.route('**/api/geocode*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [] }),
      });
    });

    await page.goto('/');
    const modal = page.locator('[data-testid="setup-modal"]');
    await expect(modal).toBeVisible();

    const fromInput = modal.locator('[data-testid="setup-from-input"]');
    await expect(fromInput).toBeVisible();
    await expect(fromInput).toBeEnabled();

    const [geocodeResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/geocode') && res.status() === 200),
      fromInput.fill('Nonexistent Place ZZ99'),
    ]);

    expect(geocodeResponse.status()).toBe(200);
    const data = await geocodeResponse.json();
    expect(data).toEqual({ results: [] });

    // Assert maintenance warning banner is NOT visible in the DOM
    await expect(modal.locator('text=Live address search is currently down')).toHaveCount(0);
    await expect(modal.locator('text=down for maintenance')).toHaveCount(0);

    // Assert input remains enabled
    await expect(fromInput).toBeEnabled();
  });

  test('HTTP 500 geocode error triggers maintenance warning banner, and subsequent input change resets error banner', async ({ page }) => {
    await page.route('**/api/geocode*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error during geocoding' }),
      });
    });

    await page.goto('/');
    const modal = page.locator('[data-testid="setup-modal"]');
    await expect(modal).toBeVisible();

    const fromInput = modal.locator('[data-testid="setup-from-input"]');
    await expect(fromInput).toBeVisible();
    await expect(fromInput).toBeEnabled();

    const [geocodeResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/geocode') && res.status() === 500),
      fromInput.fill('Failing Search Query'),
    ]);

    expect(geocodeResponse.status()).toBe(500);

    // Assert maintenance warning banner IS triggered and visible in the DOM
    const banner = modal.locator('text=Live address search is currently down for maintenance');
    await expect(banner).toBeVisible({ timeout: 5000 });

    // Typing a new character or clearing resets the sticky error banner immediately
    await fromInput.type(' more text');
    await expect(banner).toHaveCount(0);
  });

  test('typing new keystrokes aborts in-flight request and catches AbortError without UI errors', async ({ page }) => {
    await page.route('**/api/geocode*', async (route) => {
      // Simulate network delay so request remains in-flight when next keystroke happens
      await new Promise((resolve) => setTimeout(resolve, 300));
      try {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            address: 'Ponsonby Central, Auckland',
            latitude: -36.855,
            longitude: 174.745,
          }),
        });
      } catch {
        // Ignored if aborted
      }
    });

    await page.goto('/');
    const modal = page.locator('[data-testid="setup-modal"]');
    await expect(modal).toBeVisible();

    const fromInput = modal.locator('[data-testid="setup-from-input"]');
    await expect(fromInput).toBeVisible();

    // Start typing
    await fromInput.fill('Pon');
    // Wait for debounce to dispatch the request
    await page.waitForTimeout(320);

    // Immediately type more characters to abort the in-flight request
    await fromInput.type('sonby');

    // Final debounced request should finish with 200 OK
    const [finalResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/geocode') && res.status() === 200),
    ]);

    expect(finalResponse.status()).toBe(200);

    // Suggestions dropdown appears and no UI error is triggered
    const dropdown = modal.locator('[data-testid="setup-from-input-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('text=Live address search is currently down')).toHaveCount(0);
    await expect(fromInput).toBeEnabled();
  });
});
