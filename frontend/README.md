# Events Emporio — Storefront & Admin (Frontend)

A premium, editorial e‑commerce frontend for **Events Emporio**, a Srinagar studio for wedding essentials and décor — mehndi baskets, bridal hampers, gifting and decorative disposables.

> **Status: frontend with demo data.** Every page and control works, but data comes from bundled demo files and browser storage.
> No real payments, emails, accounts or persistence exist yet — see [What's real vs simulated](#whats-real-vs-simulated).

---

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

| Script              | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Dev server (Turbopack)                             |
| `npm run build`     | Production build (validates Cache Components)      |
| `npm start`         | Serve the production build                         |
| `npm run typecheck` | `tsc --noEmit` (strict)                            |
| `npm run lint`      | ESLint (Next + React Compiler rules)               |
| `npm test`          | Vitest unit tests                                  |
| `npm run test:e2e`  | Playwright E2E (desktop + mobile projects)         |
| `npm run format`    | Prettier                                           |

**E2E tips:** `npx playwright install chromium` once. To test an already-running server and/or use an installed browser:

```bash
E2E_BASE_URL=http://localhost:3000 PW_CHANNEL=msedge npm run test:e2e
```

Run E2E against `npm run build && npm start` for realistic timings — the dev server compiles each route on first visit.

---

## Stack

Next.js 16 (App Router, **Cache Components + Partial Prefetching**, React Compiler) · React 19 · TypeScript strict · Tailwind CSS v4 ·
Radix primitives (restyled, shadcn-style) · Lucide · GSAP + ScrollTrigger · React Hook Form + Zod · Sonner · Vitest · Playwright.

No state library, no smooth-scroll library, no chart library — small, purpose-built utilities instead.

---

## Design system

**Direction:** modern editorial luxury — ivory canvas, burgundy actions, champagne accents, generous whitespace, asymmetric editorial layouts.

| Token (`src/app/globals.css`) | Value     | Use                                           |
| ----------------------------- | --------- | --------------------------------------------- |
| `--canvas`                    | `#FBF7F1` | Page background                               |
| `--surface`                   | `#F2ECE5` | Soft panels                                   |
| `--brand` / `--brand-deep`    | `#5A2334` / `#3F1823` | Primary buttons, footer          |
| `--accent`                    | `#C5A46D` | Decorative gold only                          |
| `--accent-ink`                | `#85662F` | Gold for small text (passes WCAG AA on ivory) |
| `--ink` / `--muted`           | `#242020` / `#756D69` | Text                             |
| `--line`                      | `#E7DED3` | Borders                                       |
| `--success` / `--danger`      | `#246A50` / `#B64242` | States                           |

Colors are defined once on `:root` and mapped to Tailwind via `@theme inline`, so a palette derived from the official logo (emerald, mocha, charcoal…) is a one-file change.

**Corner radius:** fluid tokens (also on `:root`, mapped to Tailwind `rounded-*` utilities) so corners stay proportionate from phone to desktop:

| Utility           | Value                        | Used for                                            |
| ----------------- | ---------------------------- | --------------------------------------------------- |
| `rounded-full`    | pill                         | Buttons, chips, badges, quantity selector, pagination |
| `rounded-chip`    | 8px                          | Small thumbnails, table inputs                      |
| `rounded-control` | 12px                         | Inputs, selects, option tiles, notices              |
| `rounded-card`    | 14px → 20px (`clamp`)        | Panels, summaries, product images, toasts           |
| `rounded-media`   | 16px → 28px (`clamp`)        | Hero, category tiles, editorial & gallery imagery   |
| `rounded-sheet`   | 24px                         | Dialogs, floating drawers (from `sm`), bottom sheets |

Drawers are full-screen with square edges on phones (maximum space), and float with rounded corners from the `sm` breakpoint up.

**Type:** Cormorant Garamond (headings, editorial) + DM Sans (UI/body), via `next/font`. Fluid scale with `clamp()`: `text-display`, `text-h1`, `text-h2`, `text-h3`, plus `eyebrow`.

**Motion:** hero entrance is pure CSS (never hidden waiting for JS; protects LCP). GSAP handles scroll reveals and gentle parallax, wrapped in `gsap.matchMedia` so `prefers-reduced-motion` disables it, and cleaned up by `useGSAP`. Content is visible in server HTML even if scripts fail.

**Logo:** no logo file was supplied, so a typographic wordmark is used (`Logo` in `components/ui/primitives.tsx`). Swap in the official SVG there.

---

## Site map

**Store** — `/` · `/shop` · `/category/[slug]` · `/collections` · `/collections/[slug]` · `/products/[slug]` · `/search` · `/wishlist` · `/cart` · `/checkout` · `/checkout/success` · `/track-order` · `/about` · `/custom-orders` · `/contact` · `/faq` · `/shipping-policy` · `/returns-policy` · `/privacy-policy` · `/terms` · 404

**Auth** — `/login` · `/register` · `/forgot-password` · `/reset-password`

**Account** — `/account` · `/account/orders` · `/account/orders/[id]` · `/account/addresses` · `/account/profile`

**Admin** — `/admin` (dashboard) · products (list, new, edit) · categories · collections · inventory · orders (list, detail) · customers · coupons · homepage & banners · testimonials · gallery · custom orders · contact enquiries · newsletter · settings · admin users

**API (route handlers)** — `GET /api/search` (typeahead) · `GET /api/products?slugs=` · `POST /api/checkout/quote` (server-side pricing)

**SEO** — `/sitemap.xml`, `/robots.txt`, per-page metadata & canonicals, Product / BreadcrumbList / Store / FAQPage JSON-LD.

---

## Project structure

```
src/
  app/
    (store)/        storefront routes, shared header/footer layout
    (auth)/         split-screen auth layout + pages
    admin/          admin shell + all admin routes
    api/            route handlers (search, products, checkout quote)
    sitemap.ts robots.ts not-found.tsx layout.tsx globals.css
  components/
    ui/             Button, Field/Input/Select, Sheet (dialog/drawer), Accordion, Pagination, primitives
    layout/         Header (mega menu), MobileMenu, SearchDialog, Footer, AnnouncementBar, ContentPage
    home/ shop/ product/ cart/ checkout/ account/ auth/ forms/ motion/
    admin/          AdminShell, DataTable, product editor, orders, catalogue, content, inbox, settings
  lib/
    data/           DEMO data: products, categories, content, settings, admin seed, image registry
    catalog.ts      catalogue query layer (filter/sort/paginate on the server)
    pricing.ts      integer-paise totals, coupons, shipping (pure, tested)
    quote.ts        authoritative server quote for checkout
    order-status.ts order state machine (pure, tested)
    validations.ts  shared Zod schemas (forms now, request bodies later)
    store/          tiny persisted stores (cart, wishlist, session, orders, admin)
tests/
  unit/             Vitest
  e2e/              Playwright
```

---

## What's real vs simulated

| Area | Real now | Simulated (demo) |
| --- | --- | --- |
| Catalogue, filters, sort, pagination, search | ✅ Server-rendered from data via `lib/catalog.ts`, URL-based & shareable | Data source is `lib/data/products.ts`, not MongoDB |
| Cart & wishlist | ✅ Persisted in the browser, stock-capped quantities | Not yet merged into an account server-side |
| Checkout pricing | ✅ `POST /api/checkout/quote` recalculates prices, stock, coupons and shipping on the server | — |
| Payment | — | “Simulate success / failure” dialog stands in for Razorpay |
| Orders | ✅ Created from the server quote, shown in confirmation/account/tracking | Stored in `localStorage` |
| Auth & account | ✅ Validated forms, guarded account UI | Session is a browser-only demo; no passwords stored |
| Admin | ✅ Every screen is editable (CRUD, status transitions, stock adjustments, exports) | Edits live in this browser’s `localStorage` (“Reset demo” restores seed) and **do not change the storefront** |
| Contact / custom order / newsletter forms | ✅ Validated | Nothing is sent |

### Demo content — must be replaced before launch
- **Products, prices, stock, collections** — illustrative only (`src/lib/data/products.ts`, `categories.ts`).
- **Photography** — Unsplash placeholders that do **not** depict Events Emporio products. Sources in `public/images/demo/CREDITS.md`.
- **Testimonials** — clearly flagged `isSample`, shown with a visible “Demo” note, and never emitted as review structured data.
- **Policies** — drafts with highlighted “to be confirmed” placeholders.
- **Contact details** — intentionally empty (`settings.ts`); the UI shows only what is configured. Only the Instagram handle, bio and Srinagar location are taken from the brand’s public profile.
- **Shipping rates / free-shipping threshold** — demo values in `settings.ts`.

---

## Backend integration plan

The frontend was shaped so the backend slots in without page rewrites:

1. **Data** — replace the bodies of `lib/catalog.ts` with MongoDB/Mongoose repository calls (same signatures). Add `"use cache"` + `cacheTag("products")` and call `revalidateTag` from admin mutations.
2. **Auth** — HTTP-only session cookies, Argon2id/bcrypt hashing, rate-limited login. Replace `sessionStore` reads with a server session; protect `/account` and `/admin` in layouts **and** every API.
3. **Cart** — persist guest carts server-side by cookie id; merge into the user cart on login.
4. **Checkout & Razorpay** — `buildQuote()` already produces the trusted amount. Next: reserve stock atomically (Mongo transaction), create the Razorpay order server-side, verify `razorpay_signature` on return, process webhooks with raw-body signature checks and idempotency keys, then confirm the order and send email.
5. **Admin** — swap `updateAdmin()` calls for authenticated Server Actions validated with the same Zod schemas, with role checks and audit logging.
6. **Media** — Cloudinary/S3 signed uploads with type/size validation.
7. **Email** — Resend templates triggered only by verified backend events.

### Known behaviours worth knowing
- Unknown product/category slugs render the 404 UI inside a streamed Suspense boundary, so Next.js keeps HTTP 200 and adds `noindex` (documented Cache Components behaviour). For a hard 404 status, add a request-time slug check in `proxy.ts` once slugs come from the database.
- With Cache Components, Next keeps recently visited routes mounted but hidden (React `<Activity>`); E2E selectors filter to visible elements.

---

## Deployment

Vercel-ready (Node runtime; Cache Components requires Node, not Edge). Set `NEXT_PUBLIC_SITE_URL` to the production origin. Security headers (nosniff, referrer policy, frame options, permissions policy) are set in `next.config.ts`; add a CSP when third-party scripts (Razorpay, analytics) are introduced.
