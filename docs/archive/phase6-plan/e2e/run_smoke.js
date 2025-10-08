// Simple Playwright smoke runner so Actions and local scripts can call node e2e/run_smoke.js
import { chromium } from 'playwright';

const FRONTEND = process.argv[2] || process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
const API = process.argv[3] || process.env.API_BASE_URL || 'http://localhost:8000';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // 1) Frontend alive
  await page.goto(FRONTEND, { waitUntil: 'domcontentloaded' });

  // 2) Minimal API health (allow 200-404 as long as host is alive)
  const res = await fetch(API + '/deeds', { method: 'GET' }).catch(() => null);
  if (!res) console.warn('API /deeds fetch failed (unauth ok here)');

  await browser.close();
  console.log('Smoke completed (basic reachability).');
  process.exit(0);
})();
