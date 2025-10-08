import { chromium } from 'playwright';

const FRONTEND = process.argv[2] || 'http://localhost:3000';

const pages = [
  '/create-deed/quitclaim',
  '/create-deed/interspousal-transfer',
  '/create-deed/warranty-deed',
  '/create-deed/tax-deed'
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  for (const p of pages) {
    await page.goto(FRONTEND + p, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1');
  }

  await browser.close();
  console.log('Doc types pages reachable.');
})();
