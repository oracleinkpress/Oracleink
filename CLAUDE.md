# CLAUDE.md — Agent Briefing

> Claude Code reads this file first, every session.

## 1. Project
- **Name:** [PLATFORM_NAME]
- **Type:** Multi-tenant academic journal publishing platform (like Sami Publishing Company — one platform, many journals, each journal gets its own subdomain, e.g. `jase.samipubco.com`)
- **Primary domain:** [PLATFORM_DOMAIN] — journals live at `[journal-slug].[PLATFORM_DOMAIN]`
- **Goal:** Host unlimited journals, each fully SEO-indexable and Google Scholar-discoverable, with a submission → peer review → publish pipeline, and a real admin backend to spin up new journals without touching code.
- **Reference site studied:** jase.samipubco.com (Journal of Agricultural Sciences and Engineering, Sami Publishing Co.) — replicate its structure (issues/volumes/articles, editorial board, author guidelines, indexing badges), not its content.

## 2. Stack (do not deviate without asking)
- Next.js 14, App Router, TypeScript strict mode
- Supabase (Postgres + Auth + Storage — manuscript PDFs, cover images)
- Middleware-based subdomain routing (one Next.js app serves all journals)
- Stripe (Article Processing Charges / subscriptions — confirm which model before building)
- Resend (submission confirmations, review invites, decision letters)
- Vercel (deploy, wildcard domain `*.[PLATFORM_DOMAIN]`)
- react-pdf or similar for in-browser PDF preview

## 3. Non-negotiable rules
- **Multi-tenancy is core, not an afterthought.** Every query is scoped by `journal_id`. No journal should ever be able to see another's unpublished submissions.
- **SEO/Google Scholar compliance is mandatory on every article page** — see ARCHITECTURE.md §3. This is the platform's main differentiator ("best SEO"), not optional polish.
- Article pages must be SSG/ISR — never client-rendered. Google Scholar's crawler does not execute JS reliably.
- Every published article needs: DOI-ready metadata fields, citation meta tags, ScholarlyArticle JSON-LD, PDF + HTML full text, abstract, keywords, author affiliations.
- Manuscript workflow states must be explicit and auditable: `submitted → under_review → revision_requested → accepted → published` or `rejected`. Never skip states silently.
- New journal creation must be possible via an admin form (name, slug/subdomain, subject area, ISSN, editorial board) — do not require a code deploy per journal.
- Give me full file contents when editing, not partial snippets, unless the change is trivially small.
- Never fabricate ISSN numbers, DOIs, or indexing claims (Scopus/DOAJ/etc.) — these are real registrations, mark as `[PENDING]` until actually issued.

## 4. File structure to scaffold
```
/app
  /(platform)/page.tsx                → samipubco.com-style homepage: browse all journals
  /(platform)/journals/page.tsx       → journal directory/search
  /(journal)/[[...slug]]              → resolved via middleware per subdomain, OR:
  /middleware.ts                      → detects subdomain, rewrites to /journal/[journalSlug]/...
  /journal/[journalSlug]/page.tsx     → journal homepage (aims & scope, latest issue)
  /journal/[journalSlug]/about/page.tsx
  /journal/[journalSlug]/editorial-board/page.tsx
  /journal/[journalSlug]/archive/page.tsx           → all volumes/issues
  /journal/[journalSlug]/issue/[vol]/[issue]/page.tsx
  /journal/[journalSlug]/article/[articleSlug]/page.tsx
  /journal/[journalSlug]/submit/page.tsx            → author submission form
  /dashboard/author/page.tsx          → author's submission tracker
  /dashboard/editor/page.tsx          → editor's manuscript queue
  /dashboard/reviewer/page.tsx        → reviewer's assignments
  /admin/journals/page.tsx            → platform admin: create/manage journals
  /api/submissions/route.ts
  /api/reviews/route.ts
  /sitemap.ts + /journal/[journalSlug]/sitemap.xml   → per-journal sitemap (see ARCHITECTURE.md)
  /robots.ts
/components
  /journal (JournalHeader, IssueList, ArticleCard, CitationBlock)
  /submission (ManuscriptUploadForm, StatusTimeline)
  /admin
/lib
  supabase/client.ts, supabase/server.ts
  seo.ts          → citation meta tags + ScholarlyArticle JSON-LD generator
  tenant.ts        → resolves current journal from subdomain/host header
  resend.ts
/config
  platform.config.ts
/supabase/migrations
```

## 5. Reference docs (read these too)
- `ARCHITECTURE.md` — DB schema, multi-tenant routing, Google Scholar/SEO implementation
- `SEO_STRATEGY.md` — indexing plan, DOI/Crossref approach, sitemap strategy
- `TASKS.md` — current build phase
- `config/platform.config.ts` — platform-wide defaults (new journals inherit these)

## 6. Working style
- Work phase by phase from `TASKS.md`, update checkboxes as you complete them.
- Confirm the tenancy model (subdomain vs path-based) with me before Phase 1 if anything is ambiguous — this decision is expensive to reverse later.
- Flag assumptions explicitly, don't bury them in code comments only.
