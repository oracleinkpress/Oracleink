# ARCHITECTURE.md

## 1. Multi-tenancy model
Subdomain per journal, one Next.js codebase, one Supabase project (row-level scoping by `journal_id`) — same pattern as `jase.samipubco.com` under Sami Publishing Co.

- Wildcard DNS + Vercel wildcard domain: `*.[PLATFORM_DOMAIN]`
- `middleware.ts` reads the `host` header, extracts the subdomain, and rewrites the request to `/journal/[journalSlug]/...` internally (URL stays clean for the visitor).
- Root domain (`[PLATFORM_DOMAIN]` with no subdomain) serves the platform-level journal directory — this is your "all journals" marketing/discovery page, good for platform-wide SEO and internal linking into every journal.
- Custom domains per journal (e.g. a journal wants `www.theirjournal.com` instead of a subdomain) — supportable later via a `custom_domain` column + Vercel domain API, not required for v1.

## 2. Database schema (Supabase / Postgres)

```sql
-- Platform: journals
create table journals (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,             -- becomes subdomain: slug.platformdomain.com
  name text not null,
  issn_online text,
  issn_print text,
  subject_area text,
  aims_scope text,                        -- long-form markdown
  publisher_name text default '[PLATFORM_NAME]',
  logo_url text,
  theme_color text,
  custom_domain text,                     -- nullable, future use
  status text default 'active',           -- active | paused
  created_at timestamptz default now()
);

create table editorial_board (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid references journals(id) on delete cascade,
  name text not null,
  role text,                              -- Editor-in-Chief | Associate Editor | Reviewer
  affiliation text,
  order_index int default 0
);

create table volumes (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid references journals(id) on delete cascade,
  volume_number int not null,
  year int not null,
  unique(journal_id, volume_number)
);

create table issues (
  id uuid primary key default gen_random_uuid(),
  volume_id uuid references volumes(id) on delete cascade,
  issue_number int not null,
  publish_date date,
  cover_image text
);

create table authors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  affiliation text,
  orcid text,
  country text
);

create table articles (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid references journals(id) on delete cascade,
  issue_id uuid references issues(id),           -- null until assigned to an issue
  slug text not null,
  title text not null,
  abstract text,
  keywords text[],
  content_html text,                              -- full text, rendered
  pdf_url text,
  doi text,                                        -- '[PENDING]' until registered
  first_page int,
  last_page int,
  status text default 'submitted',
  -- submitted | under_review | revision_requested | accepted | published | rejected
  submitted_at timestamptz default now(),
  published_at timestamptz,
  view_count int default 0,
  download_count int default 0,
  unique(journal_id, slug)
);

create table article_authors (
  article_id uuid references articles(id) on delete cascade,
  author_id uuid references authors(id) on delete cascade,
  author_order int not null,
  is_corresponding boolean default false,
  primary key (article_id, author_id)
);

-- Peer review workflow
create table review_assignments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade,
  reviewer_user_id uuid references auth.users(id),
  assigned_at timestamptz default now(),
  status text default 'pending',    -- pending | in_progress | submitted
  recommendation text,               -- accept | minor_revision | major_revision | reject
  comments text,
  submitted_at timestamptz
);

-- Platform users & roles (Supabase auth.users is base; this extends it)
create table user_roles (
  user_id uuid references auth.users(id) on delete cascade,
  journal_id uuid references journals(id) on delete cascade,
  role text not null,   -- author | reviewer | editor | journal_admin | platform_admin
  primary key (user_id, journal_id, role)
);

-- APC / payments (only if monetizing per-article)
create table payments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id),
  amount numeric,
  currency text default 'USD',
  stripe_payment_id text,
  status text default 'pending',
  created_at timestamptz default now()
);
```

RLS: public read on `journals`, `volumes`, `issues`, `articles` (status = published only), `editorial_board`. Everything else scoped to authenticated user via `user_roles` — an editor can only see submissions where `user_roles.journal_id = articles.journal_id`.

## 3. SEO & Google Scholar implementation — this is the platform's core differentiator

Every published article page must emit, server-rendered (no client JS dependency):

**Highwire Press meta tags** (what Google Scholar actually parses):
```html
<meta name="citation_title" content="..." />
<meta name="citation_author" content="Lastname, Firstname" />   <!-- one tag per author -->
<meta name="citation_publication_date" content="2026/07/01" />
<meta name="citation_journal_title" content="..." />
<meta name="citation_volume" content="..." />
<meta name="citation_issue" content="..." />
<meta name="citation_firstpage" content="..." />
<meta name="citation_lastpage" content="..." />
<meta name="citation_doi" content="..." />
<meta name="citation_pdf_url" content="https://.../article.pdf" />
<meta name="citation_abstract_html_url" content="https://.../article/slug" />
<meta name="citation_issn" content="..." />
<meta name="citation_publisher" content="[PLATFORM_NAME]" />
```

**JSON-LD** — `ScholarlyArticle` schema with `author`, `datePublished`, `isPartOf` (chain: Article → PublicationIssue → PublicationVolume → Periodical with `issn`), `publisher`.

**Sitemaps — critical because scale is per-journal, not per-page:**
- `/sitemap.xml` at root → sitemap index linking to each journal's sitemap
- `/journal/[journalSlug]/sitemap.xml` → all published article URLs for that journal, `lastmod` accurate
- Regenerate on publish, not on a timer — an article should be in the sitemap within seconds of publishing.

**Other required SEO plumbing:**
- Canonical URL per article (protects against subdomain + custom-domain duplicate content later)
- `robots.ts` allowing full crawl of published content, disallowing `/dashboard`, `/admin`, `/api`
- RSS feed per journal (`/journal/[journalSlug]/rss.xml`) — helps discovery services and DOAJ-style aggregators
- Fast TTFB — article pages are SSG, rebuilt via ISR/on-demand revalidation at publish time
- OAI-PMH endpoint (Phase 6, optional but valuable for DOAJ/institutional repository harvesting — flag if you want this scoped in)

## 4. DOI strategy
Real DOI registration requires a Crossref or mEDRA membership (this is what Sami Pub Co uses — DOI prefix `10.48309`). Until you have a registered prefix:
- Store `doi` as `'[PENDING]'` and don't emit `citation_doi` meta tag until real.
- Design the schema so backfilling DOIs later is a single column update, not a migration.

## 5. Routing map (within a resolved journal)

| Route | Rendering | Purpose |
|---|---|---|
| `/` (root domain) | SSG | Platform-wide journal directory |
| `[slug].[domain]/` | SSG | Journal homepage |
| `.../about` | SSG | Aims & scope |
| `.../editorial-board` | SSG | Board listing |
| `.../archive` | ISR | All volumes/issues |
| `.../issue/[vol]/[issue]` | SSG | Table of contents for that issue |
| `.../article/[slug]` | SSG, revalidate on publish | Full article + all SEO tags above |
| `.../submit` | Dynamic | Author submission form → `articles` insert (status: submitted) |
| `/dashboard/*` | Dynamic, authed | Role-specific dashboards |
| `/admin/journals` | Dynamic, authed (platform_admin only) | Create/edit journals |
