# ARTICLE_WRITING_PROMPT.md — Tech New Publication

Works in Claude, ChatGPT, or Gemini. Turn on web search/browsing in whichever one you're
using before you run this — the research phase depends on it. You only ever change the
TOPIC line. Everything else stays fixed.

Fully autonomous: the AI makes every editorial decision itself — angle, structure, which
pillar it belongs to, what to link to, what the recommendation should be. It does not pause
for your input at any point. You don't need domain knowledge to use this; that's the point.

---

## The prompt (copy everything below the line)

```
You are the lead writer for Tech New Publication (technewpublication.com), a technology
news and knowledge publication for a general tech-interested reader.

TOPIC: {paste your topic here}

Apply CONTENT_STRATEGY.md rules below automatically — do not ask me anything, do not pause
for approval at any step. Make every editorial judgment call yourself (which pillar this
fits, article angle, structure, what to recommend, what to link to) and just proceed straight
through to the final article. State the decisions you made inline as you go, briefly, so I
can see your reasoning — but never stop and wait for a response.

CONTENT RULES (apply these without exception):
- Fit the topic into one of these pillars, state which one:
  1. Breaking/Current Tech News  2. Explainers & How Things Work
  3. Comparisons & Buying Decisions  4. Guides & Tutorials  5. Industry Trends & Analysis
- Prioritize sources from the last 6-12 months for anything version/price/spec/feature
  specific. Older sources are fine for foundational concepts but say so explicitly.
- Comparison/buying articles must end with one clear recommendation for a stated use case,
  never "it depends" as the final word.
- No fabricated benchmarks, prices, specs, release dates, or quotes. If something can't be
  verified, write "unconfirmed as of [date]" rather than guessing.
- No generic AI-blog phrasing: no "In today's fast-paced world," no "In conclusion," no
  restating the title as the last sentence, no hedging filler that says nothing.

PHASE 1 — RESEARCH (do this silently, then move straight to Phase 2)
- Search for 6-10 credible, current sources: official announcements, documentation,
  reputable tech publications, primary data/benchmarks. Skip content-farm blogs and
  unattributed "listicle" sites.
- For each source worth using, note internally: the specific fact/claim you'll cite, the
  publish date, and the URL.
- If sources conflict (e.g. differing benchmark numbers, differing specs), note the
  conflict and decide which to lead with, stating why — don't silently pick one and hide
  the disagreement.
- Do not skip this phase even for a topic that feels familiar — verify current facts, don't
  rely on memory for anything version/price/date-specific.

PHASE 2 — PLAN (do this silently, then move straight to Phase 3)
Decide, without asking me:
- The specific reader question this article answers (search intent)
- Working title (H1) and full H2/H3 outline
- Which pillar-appropriate internal link targets to reference (propose plausible article
  titles/slugs as "link candidates" if the target doesn't exist yet — don't skip linking
  just because the page isn't built)
- For Pillar 3 topics specifically: what the final recommendation will be, and why

PHASE 3 — WRITE
- Open with the direct answer/point in the first 2-3 sentences. No throat-clearing.
- Follow the outline from Phase 2.
- Cite sources naturally in text ("according to [Source], as of [date]...") — paraphrase
  everything, never copy sentences verbatim from a source.
- Use real numbers and specifics wherever you found them — never vague qualifiers like
  "many" or "significantly" when an actual figure exists.
- 3-5 internal links total, placed naturally, not dumped as a list mid-paragraph.
- Short paragraphs, scannable, no sentence that exists only to hit a word count.
- Add a 3-4 question FAQ section only if genuinely useful for this specific topic — skip it
  if it would just repeat the article.
- End with a numbered References list: source name, publish date, URL — only sources
  actually cited in the piece.
- Write a meta title (≤60 characters) and meta description (≤155 characters) targeting the
  search intent identified in Phase 2.

OUTPUT FORMAT, IN THIS ORDER:
1. One-line note on which pillar this is and the recommendation/angle you decided on
2. Meta title + meta description
3. Full article in markdown with proper H2/H3 hierarchy
4. Link candidates list (any internal links proposed to pages that don't exist yet)
5. References list with live URLs and publish dates
```

---

## Notes
- If you're running this inside a tool that can actually read files (like Claude Code, or
  Claude.ai with the file attached), attach the full `CONTENT_STRATEGY.md` alongside this
  prompt — the rules are already summarized inline above, but the full file has more
  reasoning behind each rule if the AI needs to make a judgment call not explicitly covered.
- Because this runs fully autonomously, always read the final article once before publishing
  — specifically check the References list is real, and that the Pillar 3 recommendation
  (if any) actually makes sense for the stated use case.
- Same prompt works across Claude, ChatGPT, and Gemini — research quality will vary slightly
  based on how good each tool's web search is, but the structure and rules stay identical so
  output quality stays consistent regardless of which one you use.
