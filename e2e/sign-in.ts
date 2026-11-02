import { expect, type Page } from '@playwright/test';

export async function signIn(page: Page): Promise<void> {
  await page.getByLabel('Email').fill('usama@admin.com');
  await page.getByLabel('Password').fill('usamaptp1122@');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Tax plan' })).toBeVisible();
}
