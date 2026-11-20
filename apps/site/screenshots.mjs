#!/usr/bin/env node
/**
 * Takes the app screenshot the frontpage shows (src/img/): the Upcoming tab, in each language,
 * light and dark.
 *
 * Needs the web app on http://localhost:3000 and the API with the demo and showcase data
 * (`manage.py seed_demo`, then `SAMPLE_DATA_ENABLED=true manage.py seed_showcase`), as for the
 * end-to-end tests in README. Then: `node apps/site/screenshots.mjs`.
 *
 * The demo events start at odd minutes (they're timed from when they were seeded). For tidy
 * times, move them to whole quarter hours in `manage.py shell` before taking the pictures.
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const WEB = process.env.WEB_URL ?? 'http://localhost:3000';
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'src', 'img');
const LOCALES = { en: 'en-GB', fi: 'fi-FI', sv: 'sv-FI' };
const PHONE = { width: 390, height: 780 };

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM || undefined });

// Sign in once, in English (the form's labels are what we look for).
const signIn = await browser.newContext({ viewport: PHONE, locale: 'en-GB' });
const page = await signIn.newPage();
await page.goto(`${WEB}/sign-in`);
await page.getByLabel('Email').fill('demo@sidequest.test');
await page.getByLabel('Password').fill('sidequest-demo');
await page.getByRole('button', { name: 'Sign in' }).last().click();
await page.waitForURL((url) => !url.pathname.includes('sign-in'));
const storageState = await signIn.storageState();
await signIn.close();

for (const [language, locale] of Object.entries(LOCALES)) {
  for (const colorScheme of ['light', 'dark']) {
    const context = await browser.newContext({
      viewport: PHONE,
      deviceScaleFactor: 2,
      locale,
      colorScheme,
      storageState,
    });
    const tab = await context.newPage();
    await tab.goto(`${WEB}/upcoming`);
    await tab.waitForLoadState('networkidle');
    // Pictures fade in.
    await tab.waitForTimeout(1500);
    const file = join(OUT, `upcoming-${language}-${colorScheme}.jpg`);
    await tab.screenshot({ path: file, type: 'jpeg', quality: 88 });
    console.log(file);
    await context.close();
  }
}
await browser.close();
