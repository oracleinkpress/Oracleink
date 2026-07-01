# SEO_STRATEGY.md

## Why this matters more here than on a normal site
Academic journal traffic comes almost entirely from Google Scholar and Google Search, not social/paid. If an article isn't crawlable and correctly tagged, it effectively doesn't exist to a researcher. "Best SEO" for this platform = Google Scholar compliance + fast indexing + zero duplicate-content risk across hundreds/thousands of articles, not blog-style keyword SEO.

## 1. Google Scholar compliance checklist (per article)
- [ ] All `citation_*` meta tags present and server-rendered (see ARCHITECTURE.md §3)
- [ ] One `citation_author` tag per author, correct `Lastname, Firstname` format
- [ ] `citation_pdf_url` points to a publicly accessible, stable PDF (no auth wall)
- [ ] Page has a single clear `<h1>` = article title, abstract in visible text (not image, not behind a "read more" that requires JS)
- [ ] No robots meta `noindex` on published articles

## 2. Sitemap strategy at scale
- Root sitemap = sitemap **index** file, one `<sitemap>` entry per journal
- Each journal has its own `sitemap.xml` — keeps individual files under the 50k URL / 50MB limits and lets you resubmit just one journal to Search Console if something's wrong
- `lastmod` must reflect actual publish/update time, generated from `published_at`/`updated_at`, never hardcoded to build time
- New article → sitemap updated within seconds via on-demand ISR revalidation, not a nightly cron

## 3. Duplicate content prevention
- Canonical tag on every article page pointing to its own subdomain URL
- If a journal later gets a custom domain, 301 redirect the old subdomain URL — never serve the same article on two live URLs
- No printer-friendly/AMP duplicate versions unless canonicalized properly

## 4. Structured data beyond citation tags
- `ScholarlyArticle` JSON-LD (article level)
- `Periodical` + `PublicationVolume` + `PublicationIssue` JSON-LD chain (journal/issue level) — helps Google understand the hierarchy
- `Organization` JSON-LD on the platform root domain

## 5. Off-page / discovery (manual, ongoing — not code)
- Submit each new journal to: Google Scholar (via correct meta tags, no manual submission needed, but verify indexing manually), DOAJ (Directory of Open Access Journals) once eligible, Crossref/mEDRA for DOIs
- Each journal's editorial board page should list real, named individuals — Google and indexing bodies both weight editorial legitimacy heavily for trust signals
- Encourage authors to link their own institutional pages / ORCID / ResearchGate to the published article — backlinks matter here

## 6. Performance targets
- Article and journal homepage: Lighthouse 90+ SEO and Performance
- TTFB fast because pages are SSG — do not introduce client-side data fetching on the critical path of an article page
- Images (cover pages, author photos) via next/image, explicit dimensions

## 7. What "best SEO" does NOT mean here
- Not keyword-stuffed marketing copy — academic content ranks on citation-tag correctness and authority, not copywriting
- Not fast content velocity — one correctly-tagged article outranks ten sloppy ones over time in this niche
