import { expect, test } from '@playwright/test';
import { signIn } from './sign-in.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await signIn(page);
});

test('filing status fills the deduction, and LCD write-off follows AGI', async ({ page }) => {
  await page.getByLabel('Client name').fill('Dr. Saaquib Baksh');
  await expect(page.getByLabel('Standard / Other Deductions')).toHaveValue('16,100');

  await page.getByLabel('Filing status').click();
  await page.getByRole('option', { name: 'Married Filing Jointly' }).click();
  await expect(page.getByLabel('Standard / Other Deductions')).toHaveValue('32,200');
  await page.getByLabel('Filing status').click();
  await page.getByRole('option', { name: 'Heads of Households' }).click();
  await expect(page.getByLabel('Standard / Other Deductions')).toHaveValue('24,150');
  await page.getByLabel('Standard / Other Deductions').fill('20000');
  await expect(page.getByLabel('Standard / Other Deductions')).toHaveValue('20,000');
  await page.getByLabel('Filing status').click();
  await page.getByRole('option', { name: 'Single', exact: true }).click();
  await expect(page.getByLabel('Standard / Other Deductions')).toHaveValue('16,100');

  await page.getByLabel('AGI Number').fill('1000000');
  await expect(page.getByText('From AGI, for reference').first()).toBeVisible();
  await expect(page.getByText('$300,000').first()).toBeVisible();
  await expect(page.getByText('$60,000').first()).toBeVisible();
  await expect(page.getByLabel('Maximum Write off').first()).toHaveValue('');
  await page.getByLabel('Max Donation to LCD').first().fill('60000');
  await expect(page.getByLabel('Maximum Write off').first()).toHaveValue('300,000');
  await page.getByLabel('Max Donation to LCD').nth(1).fill('100000');
  await expect(page.getByLabel('Maximum Write off').nth(1)).toHaveValue('500,000');
  await expect(page.getByText('$45,043').first()).toBeVisible();
  await expect(page.getByText('$214,957').first()).toBeVisible();
  await page.getByLabel('Planning Fees').fill('1000');
  await expect(page.getByText('$44,043').first()).toBeVisible();
  await expect(page.getByText('NaN')).toHaveCount(0);
  await expect(page.getByText('Infinity')).toHaveCount(0);

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'How each result is calculated' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Planning rules' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Defaults' })).toHaveCount(0);
});
