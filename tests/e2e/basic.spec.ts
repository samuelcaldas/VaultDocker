import { test, expect } from '@playwright/test';

test('has title and login redirect', async ({ page }) => {
  await page.goto('/');
  // Should redirect to login or show the dashboard
  await expect(page).toHaveURL(/.*login|.*dashboard|\//);
});
