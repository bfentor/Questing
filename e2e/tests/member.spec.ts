import { expect, test } from '@playwright/test';

import { openEvent, signIn } from './helpers';

test('RSVPs update right away and stick', async ({ page }) => {
  await signIn(page);
  await page.goto('/upcoming');
  await openEvent(page, 'Morning run by the lake');

  const interested = page.getByRole('button', { name: 'Interested', exact: true });
  const counts = page.getByText(/going · \d+ interested/).first();
  await expect(counts).toBeVisible();
  const before = Number((await counts.textContent())?.match(/(\d+) interested/)?.[1]);

  await interested.click();
  await expect(counts).toContainText(`${before + 1} interested`);
  await page.reload();
  await expect(page.getByText(/going · \d+ interested/).first()).toContainText(
    `${before + 1} interested`,
  );

  // Undo, so the test can run again.
  await page.getByRole('button', { name: 'Interested', exact: true }).click();
  await expect(page.getByText(/going · \d+ interested/).first()).toContainText(
    `${before} interested`,
  );
});

test('posts with hashtags and mentions', async ({ page }) => {
  const tag = `e2e${Date.now()}`;
  await signIn(page);
  await page.goto('/posts/new');
  await page.getByLabel("What's happening?").fill(`Sauna tonight with @sam #${tag}`);
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  // Back on the home page, whose feed has the new post.
  await expect(page).toHaveURL(/\/$/);

  await page
    .getByRole('link', { name: `#${tag}` })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`/hashtags/${tag}`));
  await expect(page.getByText(`Sauna tonight with`).last()).toBeVisible();
  await page.getByRole('link', { name: '@sam' }).last().click();
  await expect(page).toHaveURL(/profiles\/sam/);
});

test('posts a quick thought from the home page', async ({ page }) => {
  const thought = `Board games on Friday? ${Date.now()}`;
  await signIn(page);
  await page.goto('/');
  await page.getByLabel('Quick post').fill(thought);
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  // Still on the home page: the box is cleared and the post is in the feed below it.
  await expect(page.getByText('Posted', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Quick post')).toHaveValue('');
  await expect(page.getByText(thought)).toBeVisible();
});

test('Home and Upcoming have a New event button', async ({ page }) => {
  await signIn(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New post' })).toBeVisible();
  await page.getByRole('button', { name: 'New event' }).click();
  await expect(page).toHaveURL(/\/events\/new/);

  // The same button on Upcoming.
  await page.goto('/upcoming');
  await page.getByRole('button', { name: 'New event' }).click();
  await expect(page).toHaveURL(/\/events\/new/);
});

test('event cards show your answer at a glance', async ({ page }) => {
  const title = 'Morning run by the lake';
  await signIn(page);
  await page.goto('/upcoming');
  const card = page.getByRole('link').filter({ hasText: title }).first();
  await expect(card).toBeVisible();
  await expect(card).not.toContainText('Interested');

  // Answers on the event's page, then goes back to the list without reloading the app, so
  // its cache stays in step with the server.
  const toggleInterested = async (method: 'PUT' | 'DELETE') => {
    await openEvent(page, title);
    const saved = page.waitForResponse((response) => /\/attendance\/$/.test(response.url()));
    await page.getByRole('button', { name: 'Interested', exact: true }).click();
    const response = await saved;
    expect(response.request().method()).toBe(method);
    expect(response.ok()).toBe(true);
    await page.goBack();
  };

  await toggleInterested('PUT');
  await expect(card).toContainText('Interested');
  // Undo, so the test can run again.
  await toggleInterested('DELETE');
  await expect(card).not.toContainText('Interested');
});

test('gender is private until you show it on your profile', async ({ page }) => {
  const words = `Genderfluid ${Date.now() % 1000}`;
  await signIn(page);
  await page.goto('/edit-profile');
  await page.getByRole('radio', { name: 'Other' }).click();
  await page.getByLabel('In your own words (optional)').fill(words);
  const show = page.getByRole('switch', { name: 'Show my gender on my profile' });
  await expect(show).toHaveAttribute('aria-checked', 'false');
  await show.click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).not.toHaveURL(/edit-profile/);

  await page.goto('/profile');
  await expect(page.getByText(words)).toBeVisible();

  // Back to not set, so the test can run again.
  await page.goto('/edit-profile');
  await page.getByRole('radio', { name: 'Not set' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).not.toHaveURL(/edit-profile/);
});
