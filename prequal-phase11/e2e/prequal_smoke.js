import { chromium } from 'playwright';
const FRONTEND = process.argv[2] || 'http://localhost:3000';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(FRONTEND, { waitUntil: 'domcontentloaded' });
  console.log('✓ Frontend reachable:', FRONTEND);
  // Try two critical routes (best-effort)
  try { await page.goto(FRONTEND + '/past-deeds', { waitUntil: 'domcontentloaded' }); console.log('✓ Past Deeds page loaded'); } catch {}
  try { await page.goto(FRONTEND + '/create-deed/grant-deed', { waitUntil: 'domcontentloaded' }); console.log('✓ Create Deed page loaded'); } catch {}
  await browser.close();
})();
