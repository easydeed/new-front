import { test, expect } from '@playwright/test';

test('redirects unauthenticated users to /login', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('access_token'));
  await page.goto('/dashboard');
  await page.waitForTimeout(200);
  expect(page.url()).toContain('/login');
});
