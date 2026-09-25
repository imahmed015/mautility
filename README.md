# MA Utility Solutions — Website

Production website for MA Utility Solutions, an independent UK utility brokerage (energy, water, solar, fixtures/trades).

**Stack:** [Astro](https://astro.build) (static output) + React islands for interactive components (contact form, feedback form, FAQ accordion) + Tailwind CSS. Fully static build — no server runtime — designed for Cloudflare Pages.

---

## 1. Prerequisites

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
| `PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare dashboard → **Turnstile** → your widget → **Site key**. | Spam protection on both forms. The matching **secret** key goes in the Web3Forms dashboard (which verifies tokens server-side), never in this repo. If unset, the widget simply isn't rendered. |

All variables are prefixed `PUBLIC_` because Astro only exposes `PUBLIC_`-prefixed env vars to client-side code (the React islands run in the browser). None is a secret that needs hiding server-side — the Web3Forms access key is designed to be used client-side and is domain-restrictable from the Web3Forms dashboard, and a Turnstile site key is public by design. They're baked in at **build** time, so changing one in Cloudflare needs a redeploy to take effect.

## 3. Local development

```bash
npm run dev
```

Opens at `http://localhost:4321`.

## 4. Build

```bash
npm run build
```

This runs `astro check` (type-checking), then `astro build` (producing a fully static site in `dist/`), then `scripts/check-csp.mjs`. That last step fails the build if any inline script isn't allowlisted by its sha256 hash in the Content-Security-Policy in `public/_headers` — otherwise browsers would silently block it in production. The error prints the exact hash to add. Cloudflare Pages runs the same command, so a failed check keeps the previous deploy live. Run it on its own with `npm run check:csp`.

If you just want a fast build without type-checking or the CSP check, use `npm run build:nocheck`.

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
4. Add the three environment variables (`PUBLIC_WEB3FORMS_ACCESS_KEY`, `PUBLIC_BOOKINGS_URL`, `PUBLIC_TURNSTILE_SITE_KEY`) under **Settings → Environment variables** for both Production and Preview.
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
- [x] Cloudflare Turnstile is implemented — wired into both [`ContactForm.tsx`](src/components/ContactForm.tsx) and [`FeedbackForm.tsx`](src/components/FeedbackForm.tsx) via [`src/hooks/useTurnstile.ts`](src/hooks/useTurnstile.ts), with matching CSP entries in `public/_headers`. Verified rendering on production (September 2026).
- [x] ADR accreditation — DRO membership confirmed (Member E3593). [`AdrBadge.astro`](src/components/AdrBadge.astro) is enabled with the DRO artwork (`public/dro-badge.png`) on `/complaints`; the DRO certificate (`public/dro-cert.pdf`, `noindex` via `_headers`) and the ICO's public register entry (`COMPANY.icoRegisterUrl` in `site.ts`) are linked from `/complaints` and the Credentials strip. ICO registration renews annually (next due July 2027) — the register link stays current automatically.
- [ ] Add a Cloudflare Redirect Rule sending `www.mautilitysolutions.co.uk` → `https://mautilitysolutions.co.uk` (301). `www` currently serves the site directly (duplicate host) — and if the Turnstile widget's hostname list or the Web3Forms domain restriction only covers the apex, forms fail on `www`. Check the widget on `https://www.mautilitysolutions.co.uk/contact/` until the redirect is in place.
- [x] Replace the placeholder phone number in [`src/data/site.ts`](src/data/site.ts) (`SITE.phone` / `SITE.phoneHref`) with the real business number — done (`07312 176843`).
- [ ] Confirm the `admin@mautilitysolutions.co.uk` mailbox in [`src/data/site.ts`](src/data/site.ts) (used for both `email` and `complaintsEmail` — no separate complaints/hello mailbox exists yet) is actively monitored.
- [ ] Once real, consented feedback exists via `/feedback` (opt-in checkbox ticked), manually add a Testimonials section — none is included by default, by design.
- [x] Verify `sitemap.xml` and `robots.txt` are reachable at the production domain after first deploy — confirmed live: `sitemap.xml` returns 200 with `Content-Type: application/xml` and lists all 10 pages; `robots.txt` correctly points to it.
- [x] Sitemap is generated at build time by [`src/pages/sitemap.xml.ts`](src/pages/sitemap.xml.ts) from `src/pages` plus published guides — adding or removing a page needs no sitemap edit.
- [x] Submit the site to Google Search Console — domain property verified via DNS TXT record (added in Cloudflare DNS), sitemap submitted and accepted.
- [x] Create a Google Business Profile — set up as a service-area business (no public address), phone-verified, category/description/services filled in.
- [x] Run `npm audit` and address findings — `npm audit` reports **0 vulnerabilities** as of September 2026, after upgrading `astro` to `7.3.5` and `@astrojs/react` to `7.0.0` (still on React 18). The older `@astrojs/react` 3.x pulled in a second, outdated copy of Vite, which caused the remaining dev-server-only advisories and a broken dev-mode hydration error. Re-run `npm audit` periodically.

## 7. Project structure

```
src/
  components/       Shared Astro components + React islands (the two forms);
                    Icon.astro is the single icon library, Credentials.astro the trust strip,
                    PageHero.astro the photo hero on the service pages
  assets/images/     Page photos (licensed). Used via <Picture> from astro:assets, which
                    builds AVIF/WebP at several widths — keep originals large (1600px+)
  hooks/             React hooks (useTurnstile.ts)
  content/guides/    Guide articles (Markdown) — see "Publishing a guide" below
  lib/guides.ts      Which guides are visible (drafts in dev only) — used by pages, nav, sitemap
  lib/web3forms.ts   Shared Web3Forms submit helper + messages for both forms
scripts/
  check-csp.mjs      Post-build check that every inline script is allowlisted in the CSP
  data/site.ts       Central content: nav links, footer links, trades list, contact details,
                    statutory company details (COMPANY), shared headline figures (STATS)
  layouts/Layout.astro  Global <head>, SEO meta, Navbar/Footer wrapper
  pages/             One .astro file per route (10 pages + 404)
  styles/global.css  Tailwind + design-system utility classes (.btn-primary, .card, etc.)
public/
  favicon.svg, favicon-32x32.png, apple-touch-icon.png, icon-512.png
  og-image.jpg      Social share card (1200x630)
  dro-badge.png, dro-cert.pdf   DRO accreditation artwork/certificate
  robots.txt, _headers    (sitemap.xml is generated — see src/pages/sitemap.xml.ts)
```

### Publishing a guide

Guides are Markdown files in `src/content/guides/`; the file name becomes the URL (`letter-of-authority.md` → `/guides/letter-of-authority/`). New guides start with `draft: true`: they appear in `npm run dev` (with a "Draft" badge) so you can review them, but are never included in a production build.

To publish, set `draft: false` (and update `updated:`), commit and push. The guide then appears on `/guides/` and in the sitemap, and the "Guides" link is added to the navbar and footer automatically once at least one guide is published.

Guides inform — they never quote. No prices, price ranges or savings figures.

## 8. Design tokens

Colours, font and spacing scale live in [`tailwind.config.mjs`](tailwind.config.mjs) (`navy`, `amber`, `amber-dark`, `surface`, `ink`, `ink-light`). Reusable component classes (`.btn-primary`, `.btn-secondary`, `.card`, `.chip`, `.field-input`, etc.) live in [`src/styles/global.css`](src/styles/global.css) — edit there rather than in individual pages to keep every page visually consistent.

**Contrast note:** primary CTA buttons use **navy text on amber**, not white — white-on-amber measures ~2.1:1 (fails WCAG AA); navy-on-amber measures ~7.5:1 (passes AAA). Don't change this without re-checking contrast.

## 9. Compliance notes baked into the build

- No page uses "Get a Free Quote" (or any "quote") language, reflecting the LOA-first business model. Page CTAs say **"Book a Free Consultation"**; the navbar uses the shorter **"Get in Touch"** and the 404 page **"Contact us"**.
- No testimonials/reviews are fabricated anywhere. The only path to a testimonial is a visitor explicitly ticking the opt-in box on `/feedback`.
- The founder is never named — all copy uses "our founder" or first person.
- `/utilities` explicitly states UK households cannot switch water suppliers.
