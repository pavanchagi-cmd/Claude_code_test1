import { expect, test } from '@playwright/test';
import { addDiverToCart, dismissCookies, fillCheckout } from './helpers';

test.beforeEach(async ({ page }) => dismissCookies(page));

test('home, shop filters and product page render @smoke', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Shop by style' })).toBeVisible();

  await page.goto('/watches/men');
  await expect(page.getByRole('heading', { level: 1, name: /Men.s watches/ })).toBeVisible();
  await page
    .getByRole('checkbox', { name: /^Automatic/ })
    .first()
    .check();
  await expect(page).toHaveURL(/movement=automatic/);
  await expect(page.getByRole('link', { name: 'Remove filter Automatic' })).toBeVisible();

  await page.goto('/watch/automatic-diver-40mm-blue');
  await expect(page.getByRole('heading', { name: 'Specifications' })).toBeVisible();
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.some((t) => t.includes('"@type":"Product"'))).toBeTruthy();
});

test('search autocomplete suggests products @smoke', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox').first().fill('diver');
  await expect(page.getByRole('option', { name: /Automatic Diver/ })).toBeVisible();
});

test('browse → cart → checkout → UPI payment (mock) → confirmation', async ({ page }) => {
  await addDiverToCart(page);
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();
  await page.fill('#coupon', 'WELCOME10');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('WELCOME10 applied')).toBeVisible();
  await page.getByRole('link', { name: 'Proceed to checkout' }).click();

  await fillCheckout(page, '9811111111');
  await page.getByRole('button', { name: /Pay .* securely/ }).click();
  await expect(page.getByTestId('mock-payment')).toBeVisible();
  await page.getByRole('button', { name: 'Simulate successful payment' }).click();

  await page.waitForURL(/\/order\/WS-\d{4}-\d{6}\/confirmed/);
  await expect(page.getByRole('heading', { name: 'Thank you, E2E' })).toBeVisible();
  await expect(page.getByText('Paid via UPI')).toBeVisible();
  const invoice = page.getByRole('link', { name: 'Download GST invoice' });
  const href = await invoice.getAttribute('href');
  const pdf = await page.request.get(href!);
  expect(pdf.headers()['content-type']).toBe('application/pdf');
});

test('cash on delivery order', async ({ page }) => {
  await addDiverToCart(page);
  await page.goto('/checkout');
  await fillCheckout(page, '9822222222');
  const cod = page.getByRole('radio', { name: /Cash on delivery/ });
  await expect(cod).toBeEnabled();
  await cod.check();
  await expect(page.getByText('COD fee')).toBeVisible();
  await page.getByRole('button', { name: 'Place order (pay on delivery)' }).click();
  await page.waitForURL(/\/confirmed/);
  await expect(page.getByText(/Pay on delivery via cash on delivery/)).toBeVisible();
});

test('closing the payment window releases the order', async ({ page }) => {
  await addDiverToCart(page);
  await page.goto('/checkout');
  await fillCheckout(page, '9833333333');
  await page.getByRole('button', { name: /Pay .* securely/ }).click();
  await page.getByRole('button', { name: 'Simulate failure / cancel' }).click();
  await expect(page.getByText('Payment was not completed')).toBeVisible();
});

test('mobile: nav drawer and filter bottom sheet @mobile', async ({ page }) => {
  await page.goto('/watches');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Filters/ }).click();
  await page
    .getByRole('dialog', { name: 'Filters' })
    .getByRole('checkbox', { name: /^Quartz/ })
    .check();
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/movement=quartz/);
});
