import type { APIRoute } from 'astro';
import { getGuides } from '../lib/guides';

// Generated at build time (replaces the old hand-written public/sitemap.xml, which had to
// be edited every time a page was added). Lists every static page in src/pages, plus each
// published guide; skips dynamic routes, 404, and drafts. @astrojs/sitemap isn't used —
// see the note in astro.config.mjs.
const pageFiles = Object.keys(import.meta.glob('./**/*.astro'));

export const GET: APIRoute = async ({ site }) => {
  const guides = await getGuides();

  const staticPaths = pageFiles
    .filter((file) => !file.includes('[') && !file.endsWith('/404.astro'))
    .map((file) => file.replace(/^\./, '').replace(/index\.astro$/, '').replace(/\.astro$/, '/'))
    .filter((path) => path !== '/guides/' || guides.length > 0);

  const entries = [
    ...staticPaths.map((path) => ({ loc: new URL(path, site).href, lastmod: undefined as string | undefined })),
    ...guides.map((guide) => ({
      loc: new URL(`/guides/${guide.id}/`, site).href,
      lastmod: guide.data.updated.toISOString().slice(0, 10),
    })),
  ].sort((a, b) => a.loc.localeCompare(b.loc));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url><loc>${e.loc}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
