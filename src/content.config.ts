import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Guides: plain-English explainers in src/content/guides/*.md. Each file's name becomes its
// URL (/guides/<file-name>/). New guides default to draft: true — drafts show up when you
// run `npm run dev` so they can be reviewed, but never in a production build. Set
// `draft: false` to publish.
//
// Compliance: guides inform, they never quote. No prices, price ranges or savings figures —
// the site's rule is that pricing only follows a conversation and a Letter of Authority.
const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    audience: z.enum(['home', 'business', 'both']),
    updated: z.coerce.date(),
    draft: z.boolean().default(true),
  }),
});

export const collections = { guides };
