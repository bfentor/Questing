#!/usr/bin/env node
/**
 * Builds Questing's frontpage into dist/: one page per language from src/page.html and
 * src/locales/*.json (English at /, Finnish at /fi/, Swedish at /sv/), with the app's logo and
 * icons (which scripts/make-icons draws).
 *
 * `node build.mjs --check` only checks that every language has every string the page uses,
 * and nothing it doesn't. The build fails the same way, so a missing translation never ships.
 *
 * SITE_URL is where the frontpage lives (for canonical links), APP_URL where the app does.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, 'src');
const DIST = join(HERE, 'dist');
const APP = join(HERE, '..', 'app');

const SITE_URL = (process.env.SITE_URL ?? 'https://questing.fi').replace(/\/$/, '');
const APP_URL = (process.env.APP_URL ?? 'https://app.questing.fi').replace(/\/$/, '');

/** Each language and where its page lives. English is the default. */
const LANGUAGES = { en: '/', fi: '/fi/', sv: '/sv/' };

const template = readFileSync(join(SRC, 'page.html'), 'utf8');
const locales = Object.fromEntries(
  Object.keys(LANGUAGES).map((language) => [
    language,
    JSON.parse(readFileSync(join(SRC, 'locales', `${language}.json`), 'utf8')),
  ]),
);

// --- Every language has exactly the strings the page uses ---

const used = new Set([...template.matchAll(/{{([\w.]+)}}/g)].map((match) => match[1]));
const problems = [];
for (const [language, strings] of Object.entries(locales)) {
  for (const key of used) {
    if (typeof strings[key] !== 'string' || !strings[key].trim()) {
      problems.push(`${language}.json: "${key}" is missing`);
    }
  }
  for (const key of Object.keys(strings)) {
    if (!used.has(key)) problems.push(`${language}.json: "${key}" isn't used by page.html`);
  }
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
if (process.argv.includes('--check')) {
  console.log(`site: ${used.size} strings, in ${Object.keys(LANGUAGES).join(', ')}`);
  process.exit(0);
}

// --- Build ---

const escape = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const style = readFileSync(join(SRC, 'style.css'), 'utf8');
const styleVersion = createHash('sha256').update(style).digest('hex').slice(0, 8);
const iconVersion = readFileSync(join(APP, 'src', 'constants', 'icon-version.ts'), 'utf8').match(
  /ICON_VERSION = '(\w+)'/,
)[1];

// The English page sends a first-time visitor whose browser prefers Finnish or Swedish to
// that page, unless they've picked a language in the footer. Search engines get English, and
// the hreflang links tell them about the others.
const languageRedirect = `<script>
      try {
        if (!localStorage.getItem('questing.site-language')) {
          var preferred = (navigator.languages || [navigator.language])
            .map(function (tag) { return String(tag).slice(0, 2).toLowerCase(); })
            .find(function (code) { return code === 'en' || code === 'fi' || code === 'sv'; });
          if (preferred === 'fi' || preferred === 'sv') location.replace('/' + preferred + '/');
        }
      } catch (e) {}
    </script>`;

rmSync(DIST, { recursive: true, force: true });
for (const [language, path] of Object.entries(LANGUAGES)) {
  const values = {
    '@lang': language,
    '@path': path,
    '@site': SITE_URL,
    '@app': APP_URL,
    '@url': SITE_URL + path,
    '@iconVersion': iconVersion,
    '@styleVersion': styleVersion,
    '@languageRedirect': language === 'en' ? languageRedirect : '',
  };
  for (const [other, otherPath] of Object.entries(LANGUAGES)) {
    values[`@url.${other}`] = SITE_URL + otherPath;
    values[`@current.${other}`] = other === language ? 'aria-current="page"' : '';
  }
  const html = template.replace(/{{(@?[\w.]+)}}/g, (_, key) => {
    if (key.startsWith('@')) {
      if (!(key in values)) throw new Error(`page.html: unknown value {{${key}}}`);
      return values[key];
    }
    return escape(locales[language][key]);
  });
  mkdirSync(join(DIST, path), { recursive: true });
  writeFileSync(join(DIST, path, 'index.html'), html);
}

writeFileSync(join(DIST, 'style.css'), style);
copyFileSync(join(APP, 'assets', 'logo', 'logo.svg'), join(DIST, 'logo.svg'));
// The app's typefaces (Figtree and Anybody), served from here rather than a font service.
mkdirSync(join(DIST, 'fonts'));
for (const font of readdirSync(join(SRC, 'fonts'))) {
  copyFileSync(join(SRC, 'fonts', font), join(DIST, 'fonts', font));
}
mkdirSync(join(DIST, 'icons'));
for (const icon of readdirSync(join(APP, 'public', 'icons'))) {
  copyFileSync(join(APP, 'public', 'icons', icon), join(DIST, 'icons', icon));
}
writeFileSync(
  join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
);
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.values(LANGUAGES)
  .map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`)
  .join('\n')}
</urlset>
`,
);
console.log(`site: built ${Object.keys(LANGUAGES).length} pages into dist/ (app at ${APP_URL})`);
