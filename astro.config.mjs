import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Production site URL — used to build canonical/OG tags.
const SITE_URL = 'https://mautilitysolutions.co.uk';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  integrations: [
    react(),
    // Tailwind is wired via postcss.config.mjs, not an Astro integration —
    // @astrojs/tailwind is unmaintained and its peer deps cap astro at ^5,
    // which blocked the astro@7 upgrade (see npm audit fix history). Astro
    // has first-class PostCSS support, so a plain postcss.config.mjs is all
    // Tailwind v3 needs; base styles still come from src/styles/global.css.
    //
    // NOTE: @astrojs/sitemap was tried here but its astro:build:done hook throws
    // ("Cannot read properties of undefined (reading 'reduce')") on this Astro version
    // in the Cloudflare Pages build environment. Since this site has a small, fixed set
    // of routes, we hand-write public/sitemap.xml instead — see that file and keep it
    // in sync with src/pages/ if a page is added/removed.
  ],
  build: {
    format: 'directory',
  },
});
