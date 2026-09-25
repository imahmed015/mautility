import { getCollection } from 'astro:content';

// The single rule for which guides exist on the site: drafts are included in `npm run dev`
// (so they can be reviewed) but never in a production build. Used by the guide pages, the
// nav/footer links and the sitemap, so they always agree.
export async function getGuides() {
  const guides = await getCollection('guides', ({ data }) => import.meta.env.DEV || !data.draft);
  return guides.sort((a, b) => b.data.updated.getTime() - a.data.updated.getTime());
}

export const AUDIENCE_LABELS = {
  home: 'For homes',
  business: 'For businesses',
  both: 'For homes & businesses',
} as const;
