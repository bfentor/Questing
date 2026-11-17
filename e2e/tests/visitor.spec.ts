import { expect, test } from '@playwright/test';

import { DEMO, openEvent } from './helpers';

test('visitors see what Sidequest is, and upcoming events', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Every student event, in one place' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Upcoming', level: 1 })).toBeVisible();
  await expect(page.getByText('Board game night').first()).toBeVisible();
});

test('event pages work on their own and carry link preview tags', async ({ page, request }) => {
  await page.goto('/');
  await openEvent(page, 'Board game night');

  // Crawlers don't run JavaScript: the tags must be in the server-rendered HTML.
  const html = await (await request.get(page.url())).text();
  expect(html).toContain('<meta property="og:title" content="Board game night"');
});

test('password managers recognise the sign-in form', async ({ page }) => {
  await page.goto('/sign-in');
  const form = page.locator('form');
  const email = form.getByLabel('Email');
  const password = form.getByLabel('Password');

  // Email and password sit together in one <form>, as password managers expect.
  await expect(email).toHaveAttribute('type', 'email');
  await expect(password).toHaveAttribute('type', 'password');
  await expect(password).toHaveAttribute('autocomplete', 'current-password');
  // The browser's own history of typed emails stays out of the way.
  await expect(email).toHaveAttribute('autocomplete', 'off');

  // Enter submits the form, like the button does.
  await email.fill(DEMO.email);
  await password.fill(DEMO.password);
  await password.press('Enter');
  await expect(page).not.toHaveURL(/sign-in/);
});

test('sign-in and sign-up each have their own address', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'New here? Create an account' }).click();
  await expect(page).toHaveURL(/\/sign-up$/);
  await expect(page.getByText('Create your account')).toBeVisible();

  await page.getByRole('button', { name: 'Have an account? Sign in' }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByText('Welcome back')).toBeVisible();

  // Old links to the sign-up form still arrive there.
  await page.goto('/sign-in?mode=sign-up');
  await expect(page).toHaveURL(/\/sign-up$/);
});

test('every page has a way back to the home page', async ({ page }) => {
  // Opened straight from a link, so there is nothing to go back to.
  for (const path of ['/sign-in', '/sign-up', '/legal/terms']) {
    await page.goto(path);
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL(/\/$/);
  }
});
