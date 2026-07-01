# TASKS.md

> Work top to bottom. Check off `[x]` as completed. Don't skip ahead to a later phase.

## Phase 0 — Setup
- [x] `npx create-next-app@latest` (TS, App Router, Tailwind, no src dir)
- [x] Init Supabase project, run migrations from `ARCHITECTURE.md` §2
- [x] Set up `.env.local` from `.env.example`
- [ ] Configure wildcard domain `*.[PLATFORM_DOMAIN]` on Vercel + wildcard DNS record
- [x] Install: `@supabase/supabase-js`, `resend`, `zod`, `@react-pdf/renderer` or `react-pdf`
- [x] Fill `config/platform.config.ts`

## Phase 1 — Multi-tenancy core
- [x] `middleware.ts` — subdomain detection + rewrite to `/journal/[journalSlug]/...` (implemented as Next 16 `proxy.ts`)
- [x] `lib/tenant.ts` — resolves current journal server-side from host header
- [x] Root domain journal-directory page (lists all active journals, links out to each subdomain)
- [x] Manually seed ONE test journal end-to-end before building more UI

## Phase 2 — Journal public pages
- [ ] Journal homepage (aims & scope, latest issue preview, editorial board preview)
- [ ] About / Aims & Scope page
- [ ] Editorial Board page
- [ ] Archive page (volumes → issues list)
- [ ] Issue table-of-contents page

## Phase 3 — Article pages (the SEO-critical piece)
- [x] Article detail page — abstract, full text, PDF embed/download
- [x] `lib/seo.ts` — citation_* meta tag generator + ScholarlyArticle JSON-LD generator (ARCHITECTURE.md §3)
- [x] Verify tags with Google's Rich Results Test AND by viewing raw HTML source (not devtools-rendered)
- [x] Per-journal sitemap.xml + root sitemap index (implemented as dynamic Next Route Handlers)
- [x] Per-journal RSS feed (implemented as dynamic Next Route Handlers)
- [x] robots.ts (disallow /dashboard, /admin, /api)

## Phase 4 — Submission & review workflow
- [ ] Author submission form (title, abstract, keywords, author list, PDF upload to Supabase Storage)
- [ ] Author dashboard — track own submission status
- [ ] Editor dashboard — queue of submissions for their journal(s), assign reviewers
- [ ] Reviewer dashboard — assigned manuscripts, recommendation form
- [ ] Status-change emails via Resend at every workflow transition
- [ ] Publish action: sets status=published, published_at=now, triggers sitemap/ISR revalidation for that article + journal archive + issue page

## Phase 5 — Platform admin
- [ ] `/admin/journals` — create new journal (slug, name, ISSN, subject area, editorial board CRUD)
- [ ] Verify a newly created journal is live at its subdomain with zero code changes
- [ ] Role management (assign editor/reviewer roles per journal)

## Phase 6 — Monetization (only if APC model confirmed)
- [ ] Stripe checkout on acceptance (APC payment before final publish)
- [ ] Payment status gating on the publish action

## Phase 7 — Advanced indexing (optional, high SEO value)
- [ ] OAI-PMH endpoint for repository harvesting
- [ ] DOI registration integration (Crossref/mEDRA) once a real prefix is obtained
- [ ] Submit each journal's sitemap to Google Search Console individually

## Phase 8 — Pre-launch audit
- [ ] Lighthouse SEO/Performance 90+ on a journal homepage and an article page
- [ ] Confirm no unpublished/draft article is reachable or indexable
- [ ] Confirm tenant isolation: journal A's editor cannot see journal B's submissions
- [ ] Legal pages (Privacy, Terms, Editorial Policy, Plagiarism Policy — journals expect these)
- [ ] Seed 1 real journal with demo content and go live
