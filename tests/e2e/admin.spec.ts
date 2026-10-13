import path from 'node:path';
import { expect, test } from '@playwright/test';
import { dismissCookies } from './helpers';

const ADMIN_PHONE = process.env.SEED_ADMIN_PHONE ?? '9999999999';

test('owner adds a product with an image and publishes it', async ({ page }) => {
  await dismissCookies(page);
  await page.goto('/login?next=/admin');
  await page.fill('#login-phone', ADMIN_PHONE);
  await page.getByRole('button', { name: 'Send OTP' }).click();
  await page.fill('#login-otp', '246810');
  await page.waitForURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  const name = `E2E Field Watch ${Date.now()}`;
  await page.goto('/admin/products/new');
  await page.fill('#f-name', name);
  await page.getByRole('button', { name: 'Create product' }).click();
  await page.waitForURL(/\/admin\/products\/[^/]+\?saved=1/);

  const variants = page.locator('#variants');
  await variants.locator('#f-sku').fill(`E2E-${Date.now()}`);
  await variants.locator('#f-label').fill('Olive NATO');
  await variants.locator('#f-price').fill('12999');
  await variants.locator('#f-stock').fill('5');
  await variants.getByRole('button', { name: 'Add variant' }).click();
  await page.waitForURL(/saved=1#variants$/);

  const images = page.locator('#images');
  await images.locator('#img-file').setInputFiles(path.join(import.meta.dirname, 'fixtures', 'watch.png'));
  await images.locator('#f-alt').fill(`${name}, front view`);
  await images.getByRole('button', { name: 'Upload image' }).click();
  await page.waitForURL(/saved=1#images$/);
  await expect(page.getByRole('img', { name: `${name}, front view` }).first()).toBeVisible();

  await page.getByLabel('Live on the store').check();
  await page.getByRole('button', { name: 'Save product' }).click();
  await page.waitForURL(/saved=1$/);

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  await page.goto(`/watch/${slug}`);
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  await expect(page.getByText('₹12,999').first()).toBeVisible();
});
