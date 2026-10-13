import { expect, test } from '@playwright/test';
import { addDiverToCart, dismissCookies } from './helpers';

test.beforeEach(async ({ page }) => dismissCookies(page));

test('OTP login merges the guest cart and wishlist', async ({ page }) => {
  // Guest: wishlist a watch and add one to the cart.
  await page.goto('/watch/steel-gmt-41mm-black');
  await page.getByRole('button', { name: 'Save Steel GMT to wishlist' }).first().click();
  await addDiverToCart(page);

  await page.goto('/login?next=/account/wishlist');
  await page.fill('#login-phone', '9844444444');
  await page.getByRole('button', { name: 'Send OTP' }).click();
  await page.fill('#login-otp', '000000');
  await expect(page.getByText(/Incorrect OTP/)).toBeVisible();
  await page.fill('#login-otp', '246810');
  await page.waitForURL(/\/account\/wishlist$/);
  await expect(page.getByRole('heading', { name: 'Steel GMT' })).toBeVisible();

  await page.goto('/cart');
  await expect(page.getByRole('link', { name: 'Automatic Diver' }).first()).toBeVisible();
});

test('account pages require sign-in', async ({ page }) => {
  await page.goto('/account/orders');
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
});
