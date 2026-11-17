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
