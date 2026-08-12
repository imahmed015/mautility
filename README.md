# MA Utility Solutions — Website

Production website for MA Utility Solutions, an independent UK utility brokerage (energy, water, solar, fixtures/trades).

**Stack:** [Astro](https://astro.build) (static output) + React islands for interactive components (contact form, feedback form, FAQ accordion) + Tailwind CSS. Fully static build — no server runtime — designed for Cloudflare Pages.

---

## 1. Prerequisites

This project was built on a machine **without Node.js installed**, so none of the commands below have been run yet. Before doing anything else, install:

- **Node.js 20 LTS or later** — https://nodejs.org (installs `npm` too)

Verify after installing:

```bash
node -v
npm -v
```

## 2. Install & configure

```bash
npm install
```

Copy the environment example and fill in real values:

```bash
cp .env.example .env
```

| Variable | Where to get it | Notes |
|---|---|---|
| `PUBLIC_WEB3FORMS_ACCESS_KEY` | https://web3forms.com — free, no backend needed. Sign up, verify your destination inbox, copy the access key. | Powers both the Contact and Feedback forms. |
| `PUBLIC_BOOKINGS_URL` | Microsoft Bookings → your booking page → **Share** → copy the public booking link. | Used by the Business/SME "Book a Free Consultation" button on `/contact`. |

Both variables are prefixed `PUBLIC_` because Astro only exposes `PUBLIC_`-prefixed env vars to client-side code (the React islands run in the browser). Neither value is a secret that needs hiding server-side — the Web3Forms access key is designed to be used client-side and is domain-restrictable from the Web3Forms dashboard.

## 3. Local development

```bash
npm run dev
```

Opens at `http://localhost:4321`.

## 4. Build

```bash
npm run build
```

This runs `astro check` (type-checking) then `astro build`, producing a fully static site in `dist/`. If you just want a fast build without type-checking, use `npm run build:nocheck`.

Preview the production build locally:

```bash
npm run preview
```

## 5. Deploy to Cloudflare Pages

**Option A — Git integration (recommended):**

1. Push this repository to GitHub/GitLab.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**.
3. Build settings:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Add the two environment variables (`PUBLIC_WEB3FORMS_ACCESS_KEY`, `PUBLIC_BOOKINGS_URL`) under **Settings → Environment variables** for both Production and Preview.
5. Deploy. Cloudflare will rebuild automatically on every push.

**Option B — Direct upload:**

```bash
npm run build
```

Then in Cloudflare Pages, choose **Upload assets** and upload the contents of `dist/`.

**Custom domain:** once the Pages project is live, go to **Custom domains** and add `mautilitysolutions.co.uk` (and `www.mautilitysolutions.co.uk` if desired, with a redirect to the apex or vice versa).

## 6. Post-launch checklist

- [x] Set real `PUBLIC_WEB3FORMS_ACCESS_KEY` — set in `.env` (local) and Cloudflare → Settings → Variables and secrets (Production + Preview). ⚠️ Still confirm the domain-restriction step *inside the Web3Forms dashboard itself* (Settings → restrict key to `mautilitysolutions.co.uk`) — that's a Web3Forms-side setting, not something in this repo.
- [x] Set real `PUBLIC_BOOKINGS_URL` — set in `.env` and Cloudflare (Production + Preview); verified live on `/contact` (opens the real Microsoft Bookings page, no login required).
- [ ] Add Cloudflare Turnstile: both [`ContactForm.tsx`](src/components/ContactForm.tsx) and [`FeedbackForm.tsx`](src/components/FeedbackForm.tsx) have clearly marked `TODO` placeholders for wiring in a Turnstile widget once a site key exists — search for `Turnstile` in `src/components/`. Note: adding it will also need new CSP entries in `public/_headers` (already noted there).
- [ ] Once ADR (e.g. Dispute Resolution Ombudsman) accreditation is confirmed, flip `ENABLED = true` in [`src/components/AdrBadge.astro`](src/components/AdrBadge.astro) and supply the badge artwork + verification link. It's referenced once, on `/complaints`.
- [x] Replace the placeholder phone number in [`src/data/site.ts`](src/data/site.ts) (`SITE.phone` / `SITE.phoneHref`) with the real business number — done (`07312 176843`).
- [ ] Confirm the `admin@mautilitysolutions.co.uk` mailbox in [`src/data/site.ts`](src/data/site.ts) (used for both `email` and `complaintsEmail` — no separate complaints/hello mailbox exists yet) is actively monitored.
- [ ] Once real, consented feedback exists via `/feedback` (opt-in checkbox ticked), manually add a Testimonials section — none is included by default, by design.
- [x] Verify `sitemap.xml` and `robots.txt` are reachable at the production domain after first deploy — confirmed live: `sitemap.xml` returns 200 with `Content-Type: application/xml` and lists all 10 pages; `robots.txt` correctly points to it.
- [ ] If a page is added or removed later, update `public/sitemap.xml` to match (it's hand-written, not auto-generated — see the note in `astro.config.mjs`).
- [x] Submit the site to Google Search Console — domain property verified via DNS TXT record (added in Cloudflare DNS), sitemap submitted and accepted.
- [x] Create a Google Business Profile — set up as a service-area business (no public address), phone-verified, category/description/services filled in.
- [x] Run `npm audit` and address findings — fixed both high-severity issues (outdated `astro`, `sharp`/libvips CVEs) by upgrading `astro` to `7.2.1` and replacing the unmaintained `@astrojs/tailwind` integration with plain PostCSS. 3 remaining (2 moderate, 1 high) are dev-server-only `esbuild`/`vite` issues via `@astrojs/react` that don't affect the deployed static site.

## 7. Project structure

```
src/
  components/       Shared Astro components + React islands (forms, accordion)
  data/site.ts       Central content: nav links, footer links, trades list, contact details
  layouts/Layout.astro  Global <head>, SEO meta, Navbar/Footer wrapper
  pages/             One .astro file per route (10 pages + 404)
  styles/global.css  Tailwind + design-system utility classes (.btn-primary, .card, etc.)
public/
  favicon.svg, favicon-32x32.png, apple-touch-icon.png, icon-512.png
  robots.txt, sitemap.xml, _headers
```

## 8. Design tokens

Colours, font and spacing scale live in [`tailwind.config.mjs`](tailwind.config.mjs) (`navy`, `amber`, `amber-dark`, `surface`, `ink`, `ink-light`). Reusable component classes (`.btn-primary`, `.btn-secondary`, `.card`, `.chip`, `.field-input`, etc.) live in [`src/styles/global.css`](src/styles/global.css) — edit there rather than in individual pages to keep every page visually consistent.

**Contrast note:** primary CTA buttons use **navy text on amber**, not white — white-on-amber measures ~2.1:1 (fails WCAG AA); navy-on-amber measures ~7.5:1 (passes AAA). Don't change this without re-checking contrast.

## 9. Compliance notes baked into the build

- No page uses "Get a Free Quote" language — every CTA says **"Book a Free Consultation"**, reflecting the LOA-first business model.
- No testimonials/reviews are fabricated anywhere. The only path to a testimonial is a visitor explicitly ticking the opt-in box on `/feedback`.
- The founder is never named — all copy uses "our founder" or first person.
- `/utilities` explicitly states UK households cannot switch water suppliers.
