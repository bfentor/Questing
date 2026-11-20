#!/usr/bin/env node
/**
 * Records a three-minute demo video of Questing: a guided tour of the web app with a visible
 * cursor and captions, as an MP4 at 1920×1080.
 *
 * Needs the showcase data (`SAMPLE_DATA_ENABLED=true manage.py seed_showcase --fresh` just
 * before, so the dates are fresh and nothing from an earlier take is left), the API with it,
 * the exported web app on WEB_URL (default http://localhost:3000), and ffmpeg. See README.md
 * next to this file.
 *
 *   node e2e/demo-video/record.mjs [output.mp4]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = process.env.WEB_URL ?? 'http://localhost:3000';
const OUTPUT = resolve(process.argv[2] ?? join(HERE, 'out', 'questing-demo.mp4'));
const FRAMES = join(dirname(OUTPUT), 'frames');
// The page is laid out at 1280×720 and recorded at 1.5×: 1920×1080, sharp text.
const VIEWPORT = { width: 1280, height: 720 };
const SCALE = 1.5;
// Lappeenranta's centre, where the showcase happens.
const HERE_IN_TOWN = { latitude: 61.0587, longitude: 28.1887 };
const LOGO = readFileSync(
  join(HERE, '..', '..', 'apps', 'app', 'assets', 'logo', 'logo.svg'),
  'utf8',
);

// --- What's drawn on top of the app: the cursor, captions and title cards ---

const OVERLAY = `(() => {
  if (window.__tour) return;
  window.__tour = true;
  const style = document.createElement('style');
  style.textContent = \`
    #tour-cursor { position: fixed; left: 0; top: 0; width: 26px; height: 26px; z-index: 2147483647;
      pointer-events: none; transform: translate(-100px, -100px); transition: none; }
    #tour-cursor svg { filter: drop-shadow(0 1px 2px rgb(0 0 0 / 35%)); }
    .tour-ripple { position: fixed; z-index: 2147483646; pointer-events: none; width: 36px; height: 36px;
      margin: -18px 0 0 -18px; border-radius: 50%; background: rgb(79 70 229 / 30%);
      animation: tour-ripple 0.5s ease-out forwards; }
    @keyframes tour-ripple { from { transform: scale(0.3); opacity: 1 } to { transform: scale(1.6); opacity: 0 } }
    #tour-caption { position: fixed; left: 50%; bottom: 28px; z-index: 2147483645; pointer-events: none;
      max-width: 860px; padding: 12px 22px; border-radius: 14px; background: rgb(15 23 42 / 86%);
      color: #fff; font: 500 20px/1.4 system-ui, sans-serif; text-align: center;
      transform: translate(-50%, 12px); opacity: 0; transition: opacity 0.35s ease, transform 0.35s ease; }
    #tour-caption.on { opacity: 1; transform: translate(-50%, 0); }
    #tour-card { position: fixed; inset: 0; z-index: 2147483644; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 18px; background: #f8fafc; color: #0f172a;
      font-family: system-ui, sans-serif; text-align: center; opacity: 0; pointer-events: none;
      transition: opacity 0.6s ease; }
    #tour-card.on { opacity: 1; }
    #tour-card.on ~ #tour-cursor { visibility: hidden; }
    #tour-card svg { width: 96px; height: 96px; }
    #tour-card h1 { margin: 0; font-size: 56px; letter-spacing: -0.03em; }
    #tour-card p { margin: 0; font-size: 24px; color: #526079; max-width: 760px; }
    #tour-card .small { font-size: 18px; }
  \`;
  const cursor = document.createElement('div');
  cursor.id = 'tour-cursor';
  cursor.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l15 11-6.5 1.2L9.8 21z" fill="#0f172a" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const caption = document.createElement('div');
  caption.id = 'tour-caption';
  const card = document.createElement('div');
  card.id = 'tour-card';
  const install = () => {
    document.head.appendChild(style);
    document.body.append(card, caption, cursor);
    const saved = sessionStorage.getItem('tour-caption');
    if (saved) { caption.textContent = saved; caption.classList.add('on'); }
    const at = sessionStorage.getItem('tour-cursor');
    if (at) cursor.style.transform = 'translate(' + at + ')';
  };
  if (document.body) install(); else document.addEventListener('DOMContentLoaded', install);
  addEventListener('mousemove', (e) => {
    cursor.style.transform = 'translate(' + (e.clientX - 3) + 'px,' + (e.clientY - 2) + 'px)';
    sessionStorage.setItem('tour-cursor', (e.clientX - 3) + 'px,' + (e.clientY - 2) + 'px');
  }, true);
  addEventListener('mousedown', (e) => {
    const ripple = document.createElement('div');
    ripple.className = 'tour-ripple';
    ripple.style.left = e.clientX + 'px';
    ripple.style.top = e.clientY + 'px';
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }, true);
  window.__caption = (text) => {
    if (!text) { caption.classList.remove('on'); sessionStorage.removeItem('tour-caption'); return; }
    caption.classList.remove('on');
    setTimeout(() => { caption.textContent = text; caption.classList.add('on'); }, caption.textContent ? 250 : 0);
    sessionStorage.setItem('tour-caption', text);
  };
  window.__card = (html) => {
    if (html) { card.innerHTML = html; card.classList.add('on'); } else card.classList.remove('on');
  };
})();`;

// --- Recording: Chrome's screencast, one JPEG per repaint, timed ---

async function startRecording(page) {
  rmSync(FRAMES, { recursive: true, force: true });
  mkdirSync(FRAMES, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = join(FRAMES, `${String(frames.length).padStart(6, '0')}.jpg`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ file, time: metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 92,
    maxWidth: VIEWPORT.width * SCALE,
    maxHeight: VIEWPORT.height * SCALE,
  });
  return async () => {
    const end = Date.now() / 1000;
    await cdp.send('Page.stopScreencast');
    return { frames, end };
  };
}

function encode({ frames, end }) {
  // Each frame lasts until the next one; the last until recording stopped.
  const list = frames
    .map((frame, index) => {
      const next = frames[index + 1]?.time ?? end;
      return `file '${frame.file}'\nduration ${Math.max(next - frame.time, 0.001).toFixed(4)}`;
    })
    .join('\n');
  const length = end - frames[0].time;
  const listFile = join(FRAMES, 'frames.txt');
  writeFileSync(listFile, `${list}\nfile '${frames.at(-1).file}'\n`);
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      listFile,
      '-vf',
      `fps=30,scale=${VIEWPORT.width * SCALE}:${VIEWPORT.height * SCALE}:flags=lanczos,` +
        `fade=t=in:st=0:d=0.6,fade=t=out:st=${(length - 1).toFixed(2)}:d=1,format=yuv420p`,
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '18',
      '-movflags',
      '+faststart',
      OUTPUT,
    ],
    { stdio: 'inherit' },
  );
}

// --- Moving around like a person ---

const wait = (ms) => new Promise((done) => setTimeout(done, ms));
let mouse = { x: 640, y: 360 };

async function moveTo(page, target, { dx = 0, dy = 0 } = {}) {
  const box = await target.boundingBox();
  if (!box) throw new Error(`Can't see ${target}`);
  const x = box.x + box.width / 2 + dx;
  const y = box.y + box.height / 2 + dy;
  const steps = Math.max(8, Math.round(Math.hypot(x - mouse.x, y - mouse.y) / 14));
  await page.mouse.move(x, y, { steps });
  mouse = { x, y };
}

/** Scrolls `target` to the middle of the screen, smoothly, unless it's well in view already. */
async function bringIntoView(target) {
  await target.waitFor({ state: 'visible' });
  const box = await target.boundingBox();
  // Clear of the edges, and of the caption at the bottom.
  if (box && box.y > 70 && box.y + box.height < VIEWPORT.height - 110) return;
  await target.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  await wait(700);
}

async function click(page, target, options) {
  await bringIntoView(target);
  await moveTo(page, target, options);
  await wait(220);
  await page.mouse.down();
  await wait(70);
  await page.mouse.up();
  await wait(350);
}

async function type(target, text) {
  await target.pressSequentially(text, { delay: 55 });
}

async function scroll(page, pixels, { speed = 6 } = {}) {
  const step = Math.sign(pixels) * speed * 4;
  for (let done = 0; Math.abs(done) < Math.abs(pixels); done += step) {
    await page.mouse.wheel(0, step);
    await wait(16);
  }
}

let scene = '';
const caption = (page, text) => {
  scene = text;
  return page.evaluate((t) => window.__caption(t), text);
};
const card = (page, html) => page.evaluate((h) => window.__card(h), html);
const nav = (page, name) => page.getByRole('navigation').getByRole('link', { name, exact: true });

// --- The tour ---

async function tour(page) {
  // Opening card, over the home screen.
  await card(page, `${LOGO}<h1>Questing</h1><p>Find what's on near you, and who's going.</p>`);
  await wait(5500);
  await card(page, '');
  await wait(900);

  // Home.
  await caption(page, 'Your home: your next event, what’s on near you, and what’s coming up.');
  await moveTo(page, page.getByRole('heading', { name: 'Your next event' }));
  await wait(2200);
  await moveTo(page, page.getByRole('heading', { name: 'Near you' }), { dx: 120 });
  await scroll(page, 520);
  await wait(1500);
  await caption(
    page,
    'Events from clubs, associations, venues and student unions, all in one place.',
  );
  await scroll(page, 900);
  await wait(1800);
  const suggestions = page.getByText('Who to follow');
  await bringIntoView(suggestions);
  await caption(
    page,
    'Follow people and organizations: their posts, photos and events land in your feed.',
  );
  await wait(800);
  await click(
    page,
    await nearestBelow(
      page,
      suggestions,
      page.getByRole('button', { name: 'Follow', exact: true }),
    ),
  );
  await wait(1400);
  await scroll(page, 700);
  await wait(800);
  const photoPost = page.getByText('Frost on the fortress walls');
  await bringIntoView(photoPost);
  await wait(600);
  const like = await nearestBelow(page, photoPost, page.getByRole('button', { name: 'Like' }));
  await click(page, like);
  await wait(1600);

  // Posting.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await wait(1200);
  await caption(page, 'Share what you’re up to, with pictures, #hashtags and @mentions.');
  const quick = page.getByRole('textbox', { name: 'Quick post' });
  await click(page, quick);
  await type(quick, 'Who else is going to the Christmas concert on Thursday? #choir');
  await wait(500);
  await click(page, page.getByRole('button', { name: 'Post', exact: true }));
  await wait(2200);

  // Upcoming.
  await click(page, nav(page, 'Upcoming'));
  await caption(page, 'Upcoming: everything on in town, soonest first.');
  await wait(1600);
  await scroll(page, 500);
  await wait(800);
  await scroll(page, -500);
  await caption(page, 'Filter by day, price or category…');
  await click(page, page.getByRole('checkbox', { name: 'This week' }));
  await wait(900);
  await click(page, page.getByRole('checkbox', { name: 'Free' }));
  await wait(1600);
  await click(page, page.getByRole('checkbox', { name: 'Free' }));
  await click(page, page.getByRole('checkbox', { name: 'This week' }));
  await caption(page, '…or let Questing suggest events from your interests and what’s popular.');
  await click(page, page.getByRole('tab', { name: 'For you' }));
  await wait(1800);
  await click(page, page.getByRole('tab', { name: 'Trending' }));
  await wait(1800);

  // An event.
  const concert = page.getByRole('link', { name: /Christmas concert: Light in the Dark/ }).first();
  await click(page, concert);
  await caption(
    page,
    'Every event has the details, who’s going, and a place to ask the organizer.',
  );
  await wait(2600);
  const panel = page.getByRole('heading', { name: 'Christmas concert: Light in the Dark' }).last();
  await moveTo(page, panel);
  await wait(800);
  const friends = page.getByText(/others you follow are going/).last();
  await moveTo(page, friends);
  await wait(1500);
  await caption(page, 'See which friends are going, and add it to your calendar in one tap.');
  await click(page, page.getByRole('button', { name: 'Add to calendar' }).last());
  await wait(1800);
  // Escape would close the whole panel; a click beside the menu closes just the menu.
  await click(page, panel);
  await wait(500);
  await moveTo(page, friends, { dy: 80 });
  await scroll(page, 700);
  await wait(1200);
  await caption(page, 'Ask the organizer a question, right on the event.');
  const ask = page.getByPlaceholder('Ask the organizer or comment').last();
  await click(page, ask);
  await type(ask, 'Is there a cloakroom at the church?');
  await wait(400);
  await click(page, page.getByRole('button', { name: 'Send' }).last());
  await wait(2200);
  await click(page, page.getByRole('button', { name: 'Close' }).last());
  await wait(700);

  // Nearby.
  await click(page, nav(page, 'Nearby'));
  await caption(page, 'Nearby: what’s on around you, nearest first.');
  await wait(2400);
  await click(page, page.getByRole('radio', { name: '5 km', exact: true }));
  await wait(1200);
  await caption(page, 'On a map, too.');
  await click(page, page.getByRole('checkbox', { name: 'Show map' }));
  await wait(2500);
  await click(page, page.getByRole('button', { name: 'Zoom in' }).first());
  await wait(2200);
  await moveTo(page, page.getByRole('heading', { name: 'Nearby' }), { dx: 400, dy: 260 });
  await wait(1500);

  // Notifications.
  await click(page, nav(page, /^Notifications/));
  await caption(page, 'Reminders, changes, invitations and replies, so nothing slips by.');
  await wait(2200);
  await moveTo(page, page.getByRole('heading', { name: 'Notifications' }), { dx: 200, dy: 160 });
  await scroll(page, 500);
  await wait(1800);

  // My events, as a calendar.
  await click(page, nav(page, 'My events'));
  await caption(page, 'All your plans in one calendar.');
  await wait(1000);
  await click(page, page.getByRole('tab', { name: 'Calendar' }));
  await wait(4200);

  // Search.
  await click(page, nav(page, 'Upcoming'));
  await click(page, page.getByRole('button', { name: 'Search' }));
  await caption(page, 'Search events, people and organizations.');
  const search = page.getByRole('textbox', { name: 'Search' });
  await click(page, search);
  await type(search, 'climb');
  await wait(2200);
  await click(page, page.getByRole('link', { name: /^Saimaa Climbing/ }).first());
  await caption(page, 'Every person and organization has a profile with their events and posts.');
  await wait(2400);
  await click(page, page.getByRole('tab', { name: 'Events' }));
  await wait(2600);

  // For organizers.
  await click(page, nav(page, 'Organizations'));
  await caption(page, 'For organizers: run your club or venue together, with roles for your team.');
  await wait(2000);
  await page.goto(`${WEB}/profiles/outdoor_club/dashboard`);
  await caption(page, 'A dashboard shows views, sign-ups and new followers…');
  await wait(2800);
  await moveTo(page, page.getByText('Views', { exact: true }).first());
  await wait(1000);
  await scroll(page, 600);
  await wait(1200);
  await caption(page, '…and a list of your events to put on your own website.');
  await scroll(page, 900);
  await wait(2400);

  await page.goto(`${WEB}/events/new`);
  await caption(page, 'Publishing an event takes a minute.');
  await wait(1200);
  await click(page, page.getByRole('radio', { name: 'LUT Outdoor Club' }));
  const title = page.getByRole('textbox', { name: 'Title' });
  await click(page, title);
  await type(title, 'Candlelight snowshoe hike');
  await wait(400);
  await caption(page, 'Capacity with a waiting list, tickets, age limits, student-only events…');
  const capacity = page.getByRole('textbox', { name: 'Capacity' });
  await click(page, capacity);
  await type(capacity, '20');
  await click(page, page.getByRole('switch', { name: '18+ only' }));
  await wait(600);
  await caption(page, '…co-hosts, repeating events, and publishing now, later or as a draft.');
  await click(page, page.getByRole('tab', { name: 'Weekly' }));
  await wait(700);
  await click(page, page.getByRole('tab', { name: 'Schedule' }));
  await wait(1800);

  await page.goto(`${WEB}/profiles/outdoor_club/calendars`);
  await caption(page, 'Already keep a calendar? Link it, and Questing keeps your events in sync.');
  await moveTo(page, page.getByRole('heading', { name: 'Calendar sync' }), { dy: 120 });
  await wait(3600);

  // Languages and dark mode.
  await click(page, nav(page, 'Settings'));
  await caption(page, 'In Finnish, Swedish and English, light or dark.');
  await wait(800);
  await click(page, page.getByRole('radio', { name: 'Suomi' }));
  await wait(1200);
  await click(page, page.getByRole('radio', { name: 'Tumma' }));
  await wait(1200);
  await click(page, nav(page, 'Koti'));
  await wait(4000);

  // Closing card.
  await caption(page, '');
  await card(
    page,
    `${LOGO}<h1>Questing</h1><p>For anyone with a free evening, and everyone who organizes one.</p>` +
      `<p class="small">questing.fi · Free · On the web now, iPhone and Android coming soon</p>`,
  );
  await wait(7000);
}

/** The match of `candidates` nearest below `anchor` on screen. */
async function nearestBelow(page, anchor, candidates) {
  const top = (await anchor.boundingBox()).y;
  let best;
  for (const candidate of await candidates.all()) {
    const box = await candidate.boundingBox();
    if (box && box.y > top && (!best || box.y < best.y)) best = { y: box.y, candidate };
  }
  if (!best) throw new Error('Nothing below that');
  return best.candidate;
}

// --- Run ---

const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM || undefined });
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: SCALE,
  locale: 'en-GB',
  timezoneId: 'Europe/Helsinki',
  colorScheme: 'light',
  geolocation: HERE_IN_TOWN,
  permissions: ['geolocation'],
});
await context.addInitScript(OVERLAY);
const page = await context.newPage();

// Signed in before recording starts.
await page.goto(`${WEB}/sign-in`);
await page.getByLabel('Email').fill('demo@sidequest.test');
await page.getByLabel('Password').fill('sidequest-demo');
await page.getByRole('button', { name: 'Sign in' }).last().click();
await page.waitForURL((url) => !url.pathname.includes('sign-in'));
await page.goto(`${WEB}/`);
await page.waitForLoadState('networkidle');
await card(page, `${LOGO}<h1>Questing</h1><p>Find what's on near you, and who's going.</p>`);
await page.mouse.move(mouse.x, mouse.y);
await wait(1000);

const stop = await startRecording(page);
const started = Date.now();
// Progress, and a warning when the screen stops updating (which would freeze the video there).
let lastCount = 0;
const progress = setInterval(() => {
  const count = readdirSync(FRAMES).length;
  const stalled = count === lastCount ? '  (no new frames)' : '';
  lastCount = count;
  console.log(
    `${((Date.now() - started) / 1000).toFixed(0).padStart(4)} s  ${count} frames  ${scene}${stalled}`,
  );
}, 5000);
try {
  await tour(page);
} finally {
  clearInterval(progress);
  const recording = await stop();
  console.log(
    `Recorded ${((Date.now() - started) / 1000).toFixed(1)} s, ${recording.frames.length} frames`,
  );
  await browser.close();
  if (recording.frames.length) {
    encode(recording);
    rmSync(FRAMES, { recursive: true, force: true });
    console.log(`Video: ${OUTPUT}`);
  }
}
