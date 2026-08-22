import { test, expect } from '@playwright/test';

test('unauthenticated root request redirects to login page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/.*login/);
  await expect(page.locator('body')).toBeVisible();
});
