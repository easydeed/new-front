import { test, expect } from '@playwright/test';

test('dashboard issues required network calls', async ({ page }) => {
  // This is a sample; adapt routes to your app paths.
  await page.addInitScript(() => localStorage.setItem('access_token', 'fake-jwt'));
  const profile = page.waitForResponse((res) => res.url().includes('/users/profile'));
  const summary = page.waitForResponse((res) => res.url().includes('/deeds/summary'));
  const deeds   = page.waitForResponse((res) => res.url().includes('/deeds'));
  await page.goto('/dashboard');
  await Promise.all([profile, summary, deeds]);
  expect(true).toBeTruthy();
});
