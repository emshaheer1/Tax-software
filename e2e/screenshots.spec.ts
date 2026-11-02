import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { signIn } from './sign-in.ts';

function pdfPageCount(pdf: Buffer): number {
  const text = pdf.toString('latin1');
  return text.match(/\/Type\s*\/Page[^s]/g)?.length ?? 0;
}

test('captures every screen and a one-page sample PDF', async ({ page }) => {
  test.setTimeout(90_000);
  mkdirSync('docs/screenshots', { recursive: true });

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await signIn(page);
  await page.evaluate(() => document.fonts.ready);

  await page.getByLabel('Client name').fill('Dr. Saaquib Baksh');
  await page.getByLabel('AGI Number').fill('1000000');
  await page.getByRole('button', { name: 'Add option' }).click();
  await page.getByLabel('Option name').nth(2).fill('Oil and gas');
  await page.getByLabel('Gas & Oil Deductions').nth(2).fill('50000');
  await expect(page.getByText('$300,000').first()).toBeVisible();
  await expect(page.getByText('$60,000').first()).toBeVisible();
  await expect(page.getByText('$100,000').first()).toBeVisible();
  await expect(page.getByRole('img', { name: /Tax saved compared/ })).toBeVisible();
  await page.getByRole('heading', { name: 'Tax plan' }).click();

  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: 'docs/screenshots/planner-1440.png', fullPage: true });
  await page.setViewportSize({ width: 820, height: 1200 });
  await page.screenshot({ path: 'docs/screenshots/planner-820.png', fullPage: true });

  await page.getByRole('button', { name: 'Save plan' }).click();
  await page.getByRole('link', { name: 'Saved plans' }).click();
  await expect(page.getByRole('heading', { name: 'Saved plans' })).toBeVisible();
  await expect(page.getByText('Dr. Saaquib Baksh')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Dr. Saaquib Baksh')).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: 'docs/screenshots/saved-1440.png', fullPage: true });
  await page.setViewportSize({ width: 820, height: 1200 });
  await page.screenshot({ path: 'docs/screenshots/saved-820.png', fullPage: true });

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: 'docs/screenshots/settings-1440.png', fullPage: true });
  await page.setViewportSize({ width: 820, height: 1200 });
  await page.screenshot({ path: 'docs/screenshots/settings-820.png', fullPage: true });

  await page.goto('/#/report');
  await expect(page.getByRole('heading', { name: 'Tax Planning Summary' })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: 'docs/screenshots/report-1440.png', fullPage: true });
  await page.setViewportSize({ width: 820, height: 1200 });
  await page.screenshot({ path: 'docs/screenshots/report-820.png', fullPage: true });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
  writeFileSync('docs/sample-tax-plan.pdf', pdf);
  expect(pdfPageCount(pdf)).toBe(1);
});
