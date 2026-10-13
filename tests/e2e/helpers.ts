import { expect, type Page } from '@playwright/test';

export async function dismissCookies(page: Page) {
  await page.addInitScript(() => localStorage.setItem('cookie-consent:v1', JSON.stringify({ analytics: false, marketing: false })));
}

export async function addDiverToCart(page: Page) {
  await page.goto('/watch/automatic-diver-40mm-blue');
  await expect(page.getByRole('heading', { level: 1, name: 'Automatic Diver' })).toBeVisible();
  const add = page.getByRole('button', { name: 'Add to cart' });
  await expect(add).toBeEnabled();
  const res = page.waitForResponse((r) => r.url().endsWith('/api/cart') && r.request().method() === 'POST');
  await add.click();
  expect((await res).ok()).toBeTruthy();
  await expect(page.getByRole('status').filter({ hasText: 'Added to cart' })).toBeVisible();
}

export async function fillCheckout(page: Page, phone: string) {
  await page.fill('#phone', phone);
  await page.fill('#email', 'e2e@example.com');
  await page.fill('#address-name', 'E2E Buyer');
  await page.fill('#address-pincode', '560001');
  await page.fill('#address-line1', '12 MG Road');
  await page.fill('#address-line2', 'Ashok Nagar');
  await expect(page.locator('#address-state')).toHaveValue('Karnataka');
}
