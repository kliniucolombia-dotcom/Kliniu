import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const PRODUCTS = [
  'dispensador-automatico-1000ml',
  'dispensador-toallas-ecotowel',
  'dispensador-crema-dental-kids',
];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

async function getState(label) {
  await page.waitForTimeout(400);
  const precio   = await page.locator('p.text-3xl').first().textContent().catch(() => '—');
  const tachados = await page.locator('p.line-through').allTextContents().catch(() => []);
  const badge    = await page.locator('div.bg-\\[\\#FFF3E8\\]').textContent().catch(() => '—');
  console.log(`  [${label}]`);
  console.log(`    Precio unitario : ${precio?.trim()}`);
  console.log(`    Precio tachado  : ${tachados.join(' | ') || '—'}`);
  console.log(`    Badge descuento : ${badge?.trim() || '—'}`);
}

for (const slug of PRODUCTS) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PRODUCTO: ${slug}`);
  console.log('='.repeat(60));

  await page.goto(`${BASE}/producto/${slug}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button:has-text("Unidad")', { timeout: 15000 });

  await page.locator('button:has-text("Unidad")').click();
  await getState('Unidad');
  await page.screenshot({ path: `/tmp/ss-${slug}-unidad.png` });

  await page.locator('button:has-text("× 12 und")').click();
  await getState('x12');
  await page.screenshot({ path: `/tmp/ss-${slug}-x12.png` });

  await page.locator('button:has-text("× 48 und")').click();
  await getState('x48');
  await page.screenshot({ path: `/tmp/ss-${slug}-x48.png` });

  await page.locator('button:has-text("× 100 und")').click();
  await getState('x100');
  await page.screenshot({ path: `/tmp/ss-${slug}-x100.png` });
}

await browser.close();
console.log('\nDone — screenshots en /tmp/ss-*.png');
