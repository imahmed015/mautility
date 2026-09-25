// Post-build check: every inline <script> in dist/ must be allowlisted by its sha256 hash in
// public/_headers' Content-Security-Policy, or browsers will silently refuse to run it in
// production (the build itself would still "pass"). Runs as part of `npm run build`, so a
// mismatch fails the Cloudflare Pages build and the previous working deploy stays live.
//
// Fix a failure by adding the printed hash(es) to script-src in public/_headers (and a note
// in the comment above it saying which script each belongs to).
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';
const HEADERS_FILE = 'public/_headers';

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });
}

// hash -> { pages, preview }
const found = new Map();
for (const file of htmlFiles(DIST)) {
  const html = readFileSync(file, 'utf8');
  for (const [, attrs, body] of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
    // JSON / JSON-LD data blocks are never executed, so the CSP doesn't apply to them.
    if (/type="application\/(ld\+)?json"/.test(attrs) || !body.trim()) continue;
    const hash = `sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}`;
    if (!found.has(hash)) found.set(hash, { pages: [], preview: body.slice(0, 60).replace(/\s+/g, ' ') });
    found.get(hash).pages.push(relative(DIST, file));
  }
}

const allowed = new Set(readFileSync(HEADERS_FILE, 'utf8').match(/sha256-[A-Za-z0-9+/=]+/g) ?? []);
const missing = [...found].filter(([hash]) => !allowed.has(hash));
const stale = [...allowed].filter((hash) => !found.has(hash));

if (stale.length) {
  console.warn(`check-csp: ${stale.length} hash(es) in ${HEADERS_FILE} no longer match any inline script (safe to remove):`);
  for (const hash of stale) console.warn(`  '${hash}'`);
}

if (missing.length) {
  console.error(`\ncheck-csp: FAILED — ${missing.length} inline script(s) would be blocked by the CSP in production.`);
  console.error(`Add these to script-src in ${HEADERS_FILE}:\n`);
  for (const [hash, { pages, preview }] of missing) {
    console.error(`  '${hash}'`);
    console.error(`     used on: ${pages.slice(0, 5).join(', ')}${pages.length > 5 ? `, +${pages.length - 5} more` : ''}`);
    console.error(`     starts:  ${preview}…\n`);
  }
  process.exit(1);
}

console.log(`check-csp: OK — all ${found.size} inline script(s) are allowlisted in ${HEADERS_FILE}.`);
