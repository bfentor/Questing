#!/usr/bin/env node
/**
 * The frontpage while you work on it: `npm run site` (from the repository root).
 *
 * Builds it, serves dist/ on http://localhost:4321 (PORT to change), and rebuilds whenever
 * something in src/ or the app's logo or icons changes; open pages reload by themselves. A
 * build that fails (a missing translation, say) prints why and keeps the last good one.
 *
 * The buttons lead to the app on http://localhost:8081 (`npm run dev`); set APP_URL to send
 * them elsewhere, e.g. APP_URL=https://app.questing.fi npm run site.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, watch } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, 'dist');
const PORT = Number(process.env.PORT ?? 4321);
const APP_URL = (process.env.APP_URL ?? 'http://localhost:8081').replace(/\/$/, '');
const SITE_URL = `http://localhost:${PORT}`;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'text/xml; charset=utf-8',
};

// Tells open pages to reload after each build.
const RELOAD = `<script>new EventSource('/__reload').onmessage = () => location.reload();</script>`;
const listeners = new Set();

function build() {
  const started = Date.now();
  const result = spawnSync(process.execPath, [join(HERE, 'build.mjs')], {
    env: { ...process.env, SITE_URL, APP_URL },
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    console.error(`\n✗ Build failed, still serving the last one:\n${result.stderr.trim()}\n`);
    return;
  }
  console.log(`✓ Built in ${Date.now() - started} ms`);
  for (const response of listeners) response.write('data: reload\n\n');
}

// Serves dist/ the way nginx does in production (nginx.conf.template).
const server = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url, SITE_URL).pathname);
  if (path === '/__reload') {
    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    response.write('\n');
    listeners.add(response);
    request.on('close', () => listeners.delete(response));
    return;
  }
  let file = join(DIST, normalize(path));
  if (!file.startsWith(DIST)) {
    response.writeHead(400).end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!path.endsWith('/')) {
      response.writeHead(301, { Location: `${path}/` }).end();
      return;
    }
    file = join(file, 'index.html');
  }
  if (!existsSync(file)) {
    // Any other path is a page of the app.
    response.writeHead(302, { Location: APP_URL + path }).end();
    return;
  }
  const type = TYPES[extname(file)] ?? 'application/octet-stream';
  let body = readFileSync(file);
  if (type.startsWith('text/html')) body = body.toString().replace('</body>', `${RELOAD}</body>`);
  response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  response.end(body);
});

build();

// Rebuild on changes, a moment after the last one (editors often save in several steps).
let timer;
const rebuildSoon = () => {
  clearTimeout(timer);
  timer = setTimeout(build, 100);
};
for (const watched of [
  join(HERE, 'src'),
  join(HERE, '..', 'app', 'assets', 'logo'),
  join(HERE, '..', 'app', 'public', 'icons'),
]) {
  watch(watched, { recursive: true }, rebuildSoon);
}
watch(join(HERE, 'build.mjs'), rebuildSoon);

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} is in use. Stop what's on it, or pick another: PORT=4322 npm run site`,
    );
    process.exit(1);
  }
  throw error;
});
server.listen(PORT, () => {
  console.log(`Frontpage on ${SITE_URL} (buttons lead to ${APP_URL}). Ctrl+C stops it.`);
});
