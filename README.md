# Watch store

A mobile-first watch e-commerce site for India, built from the approved "Midnight & Brass" mockup (`docs/mockups/`) and the technical build spec. Next.js 16 (App Router) on Vercel, Postgres (Neon) via Prisma 7, Razorpay, Shiprocket, MSG91, Resend.

Every third-party service has a mock, so the site runs end to end with only a database. Anything in `[BRACKETS]` is a placeholder that stays visible until the owner replaces it in **/admin**.

## Quick start

```bash
pnpm install
cp .env.example .env.local          # set DATABASE_URL, DIRECT_URL, AUTH_SECRET, SEED_ADMIN_PHONE
pnpm prisma migrate deploy
pnpm db:seed                        # 9 sample watches, 4 accessories, settings, FAQs, policies, admin user
pnpm dev                            # http://localhost:3000
```

Sign in at `/login` with the `SEED_ADMIN_PHONE` number. Without MSG91 keys the OTP is printed in the server console (never in production). The admin panel is at `/admin`.

## Scripts

| Script                   | What it does                                                                     |
| ------------------------ | -------------------------------------------------------------------------------- |
| `pnpm dev`               | Dev server (Turbopack)                                                           |
| `pnpm build`             | `prisma generate && prisma migrate deploy && next build` (Vercel build command) |
| `pnpm build:app`         | Build without running migrations (CI, local)                                     |
| `pnpm lint`              | ESLint (flat config, `eslint-config-next`)                                       |
| `pnpm typecheck`         | Prisma client + Next route types + `tsc --noEmit`                                |
| `pnpm test`              | Vitest: pricing, GST, coupons, filters, CSV, returns, stock reservation (DB)     |
| `pnpm test:e2e`          | Playwright: browse → cart → checkout (UPI + COD) → confirmation, OTP login, admin |
| `pnpm db:migrate`        | Create a new migration in development                                            |
| `pnpm db:seed`           | Seed sample data (idempotent)                                                    |

`pnpm test` needs `DATABASE_URL` for the stock-reservation test; it is skipped otherwise. `pnpm test:e2e` builds nothing itself: run `pnpm build:app` first, it then starts `next start` on port 3100. Set `BASE_URL` to run only the `@smoke` tests against a deployed preview.

## Project layout

```
app/(store)/          storefront: home, watches, watch/[slug], cart, order, login, account, about, journal, help, policies, track-order, search
app/(checkout)/       minimal checkout layout
app/admin/            admin panel (ADMIN / STAFF)
app/api/              route handlers: cart, checkout, auth/otp, webhooks, cron, pincode, search, …
components/           ui, product, cart, checkout, account, layout, admin, shop, home
lib/                  db, auth, cart, catalog, orders, pricing, gst, coupons, notifications, settings, validation/
lib/integrations/     razorpay, shiprocket, msg91, resend, whatsapp, blob, pincode (each: interface + live + mock)
lib/pdf/              GST invoice and warranty card PDFs (@react-pdf/renderer)
emails/               React Email templates
prisma/               schema.prisma, migrations/, seed.ts
data/pincodes.json    PIN prefix → state; city via India Post API with fallback
proxy.ts              route guard for /account and /admin (Next 16 renamed middleware → proxy)
tests/unit, tests/integration, tests/e2e
docs/mockups/         exported artboards (desktop, 1440 px)
```

Design tokens live in `app/globals.css` under `@theme` (Tailwind v4 is CSS-first, so there is no `tailwind.config.ts`); each token is also a CSS variable such as `--color-ink`.

## Environment variables

All variables are listed with comments in [`.env.example`](.env.example). Real values go only in Vercel (Settings → Environment Variables) and your git-ignored `.env.local`. Only `NEXT_PUBLIC_*` values reach the browser.

Mocks are used when keys are missing:

| Missing keys                                   | Behaviour                                                                        |
| ---------------------------------------------- | -------------------------------------------------------------------------------- |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`      | Test-mode payment dialog. **Disabled in production**: prepaid checkout is refused |
| `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD`     | Every valid pincode serviceable in 4 days; `79xxxx` has no COD; fake AWB          |
| `MSG91_AUTH_KEY`                               | OTP and SMS logged to the server console (not in production)                     |
| `RESEND_API_KEY`                               | Emails logged to the console                                                     |
| `WHATSAPP_API_KEY`                             | WhatsApp messages logged                                                         |
| `BLOB_READ_WRITE_TOKEN`                        | Local `.uploads/` folder (local only; Vercel needs a Blob store)                  |
| `UPSTASH_REDIS_*`                              | Rate limits stored in Postgres; caches in memory                                 |

"Production" means `VERCEL_ENV=production` (or `APP_ENV=production` on other hosts).

## Deployment: GitHub → Vercel

Every production release is a commit on `main`; Vercel deploys from GitHub. Code is never uploaded to Vercel directly.

One-time setup (owner, in the browser):

1. Vercel → Add New → Project → import this repository. Framework preset: Next.js, root directory: repo root. `vercel.json` sets the install/build commands, the `bom1` (Mumbai) region and the cron jobs.
2. Vercel → Storage → create a **Neon Postgres** database and a **Blob** store and connect both to the project (sets `DATABASE_URL`, `DIRECT_URL` and `BLOB_READ_WRITE_TOKEN`). Enable Neon branching so Preview deployments get their own database branch.
3. Vercel → Settings → Environment Variables: add everything from `.env.example`. Live keys for Production; test/sandbox keys for Preview and Development.
4. Vercel → Settings → Domains: add the store domain and set DNS as Vercel instructs.
5. Point webhooks at the production domain: Razorpay → `https://<domain>/api/webhooks/razorpay` (events `payment.captured`, `payment.failed`, `refund.processed`), Shiprocket → `https://<domain>/api/webhooks/shiprocket` with `SHIPROCKET_WEBHOOK_TOKEN` as the `x-api-key`.
6. Seed once against production: `DATABASE_URL=… DIRECT_URL=… SEED_ADMIN_PHONE=… pnpm db:seed`.

**Cron jobs** (`vercel.json`, protected by `CRON_SECRET`): notification queue every minute, abandoned-cart and wishlist alerts hourly, stock-reservation cleanup every 5 minutes. Sub-daily crons need a Vercel Pro plan; on Hobby, change the schedules to daily or the deployment will be rejected.

Day to day: work on a feature branch, open a pull request (CI runs lint, typecheck, unit tests, build and Playwright; Vercel posts a preview URL and `e2e-preview.yml` runs the smoke tests against it), check the preview against the mockup, merge to `main` → production. Roll back with Vercel's "Promote to Production" on the previous deployment, then revert the commit on `main`.

Never run destructive commands (`prisma migrate reset`, dropping tables) against production.

## What is built

- **Storefront**: all 12 mockup pages plus shared header (announcement bar, mega-menus, debounced autocomplete, live cart count, mobile drawer below 1024 px) and footer; floating WhatsApp button (hidden on checkout); cookie banner gating Vercel Analytics, GA4 and Meta Pixel.
- **Catalogue**: URL-driven filters with per-option counts, sort, active chips, numbered pagination (24/page), mobile bottom-sheet filters, hover second image, "Only N left", guest wishlist (localStorage, merged on login), PDP with gallery + zoom, variants, pincode check, specs table from structured fields, reviews (verified buyers only) and Q&A, similar watches (±30 % price), recently viewed, Product/Breadcrumb JSON-LD, per-product Open Graph image, 301 redirects when a slug changes.
- **Cart & checkout**: DB-backed cart (cookie for guests, merged on login), stock-capped quantities, gift wrap + note, server-validated coupons, "Complete the look", guest checkout, pincode auto-fill, saved addresses, GSTIN validation (checksum), Razorpay Checkout with server-side HMAC verification and an idempotent webhook as source of truth, COD only when Shiprocket allows it and the total is within the limit, 15-minute stock reservations, server re-pricing, "Buy now".
- **Orders**: human-readable numbers (`WS-2026-000123`), status machine with an `OrderEvent` log, GST invoices numbered per financial year (`INV/2026-27/00001`) with CGST/SGST vs IGST, confirmation page with timeline, invoice download and once-only purchase tracking, track-order page, email/SMS/WhatsApp notifications through a job queue.
- **Accounts**: phone OTP (5-minute expiry, 5 attempts, 3 sends per number/IP per 10 minutes, hashed codes, Web OTP autofill), Google and email magic link via Auth.js with 30-day database sessions; orders with tracking, invoices and return/exchange requests; wishlist with price-drop and back-in-stock alerts; warranty registration with a digital warranty card PDF; addresses; profile; DPDP data export and account deletion.
- **Admin**: dashboard (today's orders and revenue, low stock, pending returns), products and variants with image upload (alt text required), reordering and CSV import; orders (status changes, Shiprocket shipment + label, COD received, Razorpay refunds), returns, coupons, reviews and Q&A moderation, journal, FAQ, policies, page content, Instagram grid, support tickets, site settings. `STAFF` cannot change settings or refund.
- **Platform**: security headers and CSP in `next.config.ts`, Zod validation on every route handler and server action, rate limits on OTP, contact, newsletter, pincode and search, Sentry (when `SENTRY_DSN` is set), sitemap and robots (previews are noindex), custom 404/500.

## Decisions to confirm with the owner

These need business input; the code uses safe placeholders until then.

- **Prices**: the mockup shows `₹ [PRICE]`. The seed uses clearly fake sample prices so cart, filters and payments can be tested. Replace every price in **/admin/products** before launch.
- **GST**: rates default to 18 % and HSN 9102 (watches). Shipping, gift wrap and COD fees are invoiced at 18 % under SAC 996812. Have your CA confirm rates, HSN/SAC codes and the invoice format, and set the seller state in Site settings (it decides CGST/SGST vs IGST).
- **COD limit and fee, free-shipping threshold, gift-wrap price, return window**: all unset (placeholders shown, COD off) until entered in **/admin/settings**.
- **Courier**: Shiprocket picks the courier; set the pickup location and pincode.
- **Legal text**: policy stubs and Grievance Officer details must be completed and reviewed by your lawyer.
- **SMS/WhatsApp templates**: DLT registration for every SMS template and Meta approval for WhatsApp templates (`order_confirmed`, `order_shipped`, `order_out_for_delivery`, `order_delivered`).
- **Coupon `WELCOME10`**: seeded from the mockup's example (10 %, max ₹2,500). Edit or disable it.
- **Demo serial `DEMO-SERIAL-0001`**: for testing "Verify your watch". Delete it before launch.

## Go-live checklist

- [ ] Every page matches its mockup artboard on desktop (1440 px) and mobile (390 px)
- [ ] Live Razorpay payment, refund and webhook tested with a real ₹1 order
- [ ] COD order placed, shipped and marked delivered through Shiprocket
- [ ] OTP SMS templates DLT-approved and delivering
- [ ] GST invoice format approved by the CA
- [ ] Policies and Grievance Officer details filled and reviewed by a lawyer
- [ ] All `[PLACEHOLDER]` values replaced with real content
- [ ] Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95, SEO = 100
- [ ] Sitemap submitted in Google Search Console; GA4 and Meta Pixel firing after consent
- [ ] Custom domain live on Vercel with HTTPS; webhooks pointed at the production domain
- [ ] Sentry receiving errors; database backups enabled on Neon
- [ ] Owner has added the first real products through the admin panel
