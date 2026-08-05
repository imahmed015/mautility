import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// Production site URL — used to build canonical/OG tags.
const SITE_URL = 'https://mautilitysolutions.co.uk';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false, // we bring our own base styles in src/styles/global.css
    }),
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
