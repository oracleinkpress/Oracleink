# README — Multi-Journal Publishing Platform Setup

## What's in here
```
CLAUDE.md                     → agent briefing, read first every session
ARCHITECTURE.md               → multi-tenant DB schema, routing, Google Scholar/SEO tech spec
SEO_STRATEGY.md                → why/how SEO works for academic journals specifically
TASKS.md                       → phased checklist, Claude Code updates as it works
config/platform.config.ts      → platform-wide defaults, fill in before coding
.env.example                    → copy to .env.local, fill in keys
```

## Scope confirmed
- Multi-journal platform, subdomain-per-journal (`slug.[PLATFORM_DOMAIN]`), same pattern as Sami Publishing Co./JASE.
- The uploaded law manuscript is demo/sample content only — do not treat it as the platform's real subject area or first live journal.
- "Best SEO" here specifically means Google Scholar citation-tag compliance + fast per-journal sitemaps — see `SEO_STRATEGY.md` before writing any article page code.

## Step-by-step

1. Create project folder, drop these files in root (`config/platform.config.ts` goes in `config/`).

2. Fill in placeholders before prompting Claude Code:
   - `CLAUDE.md`: platform name, domain
   - `config/platform.config.ts`: real platform name/domain, APC model yes/no
   - `.env.example` → copy to `.env.local`, fill real keys
   - Decide now: will you actually pursue Crossref/mEDRA DOI registration at launch, or defer? (Affects Phase 7 timing.)

3. Scaffold the repo:
```bash
npx create-next-app@latest journal-platform --typescript --tailwind --app --no-src-dir --eslint
cd journal-platform
npm install @supabase/supabase-js resend zod
```

4. Set up wildcard domain on Vercel:
```bash
vercel domains add "*.[PLATFORM_DOMAIN]"
```
Add a wildcard DNS `CNAME` record (`*` → `cname.vercel-dns.com`) at your DNS provider.

5. Move all files into the new project root, then open Claude Code and start with:

```
Read CLAUDE.md, ARCHITECTURE.md, SEO_STRATEGY.md, and TASKS.md fully before doing anything.
Confirm you understand the subdomain multi-tenancy model and the Google Scholar SEO
requirements, then start Phase 0 from TASKS.md. Ask me before Phase 1 if the
tenancy routing approach needs any decision from me.
```

6. After each phase:
```
Update TASKS.md to check off completed items, then move to the next phase.
```

7. Before considering any article page "done", explicitly ask Claude Code:
```
Show me the raw server-rendered HTML source of an article page (not devtools) —
confirm every citation_* meta tag from ARCHITECTURE.md section 3 is present.
```
This is the step most likely to get skipped and it's the entire point of this platform.

## Why this structure
Same context-file pattern as your other projects (CLAUDE.md + TASKS.md + ARCHITECTURE.md
+ config file) so Claude Code doesn't re-derive project context every session. The extra
`SEO_STRATEGY.md` exists here specifically because Google Scholar compliance is a set of
exact, easy-to-silently-skip technical requirements — worth its own reference doc instead
of burying it inside ARCHITECTURE.md.
