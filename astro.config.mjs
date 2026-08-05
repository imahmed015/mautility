import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// Production site URL — used to build the sitemap and canonical/OG tags.
const SITE_URL = 'https://mautilitysolutions.co.uk';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false, // we bring our own base styles in src/styles/global.css
    }),
    sitemap(),
  ],
  build: {
    format: 'directory',
  },
});
