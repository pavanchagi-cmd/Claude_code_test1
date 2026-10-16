# Vercel deploy test

A minimal static site for checking that pushes to GitHub deploy to Vercel.

## Setup (one time)

1. In Vercel, click **Add New… → Project**, choose this repo and click **Deploy**.
   No build settings are needed: `vercel.json` serves the `public/` folder.
2. Push any commit. Vercel builds it and posts a deployment status on the commit.

## The test

`.github/workflows/vercel-deploy-test.yml` runs whenever Vercel reports a successful
deployment. It fetches the deployed page and `/health.json` and fails if either
doesn't contain the expected marker.

If your previews are behind Vercel Deployment Protection, the check gets a 401. To fix it,
create a "Protection Bypass for Automation" secret in Vercel (Settings → Deployment Protection),
then add it to this repo as the Actions secret `VERCEL_AUTOMATION_BYPASS_SECRET`.
