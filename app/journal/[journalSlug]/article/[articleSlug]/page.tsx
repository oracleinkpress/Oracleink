import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { getJournalBySlug } from "@/lib/tenant";
import { createServerClient } from "@/lib/supabase/server";
import { generateCitationMetaTags, generateScholarlyArticleJsonLd, ArticleSEOData } from "@/lib/seo";
import type { Metadata } from "next";

interface ArticlePageProps {
  params: Promise<{
    journalSlug: string;
    articleSlug: string;
  }>;
}

// Fetch helper used by page and metadata generator
async function fetchArticleAndJournal(journalSlug: string, articleSlug: string) {
  const journal = await getJournalBySlug(journalSlug);
  if (!journal) return null;

  const supabase = await createServerClient();
  let article: any = null;

  try {
    const { data } = await supabase
      .from("articles")
      .select(`
        id,
        slug,
        title,
        abstract,
        keywords,
        content_html,
        pdf_url,
        doi,
        first_page,
        last_page,
        status,
        published_at,
        issue_id,
        issues(
          id,
          issue_number,
          publish_date,
          volumes(
            id,
            volume_number,
            year
          )
        ),
        article_authors(
          author_order,
          is_corresponding,
          authors(
            id,
            full_name,
            email,
            affiliation,
            orcid,
            country
          )
        )
      `)
      .eq("journal_id", journal.id)
      .eq("slug", articleSlug)
      .eq("status", "published")
      .maybeSingle();
    
    article = data;
  } catch (err) {
    console.error("Error fetching article details:", err);
  }

  // Fallback demo article (JASE)
  if (!article && journalSlug === "jase" && articleSlug === "effect-of-salinity-stress-on-growth-and-yield-of-major-cereal-crops") {
    article = {
      id: "demo-1",
      slug: "effect-of-salinity-stress-on-growth-and-yield-of-major-cereal-crops",
      title: "Effect of Salinity Stress on Growth and Yield of Major Cereal Crops",
      abstract: "Salinity is one of the most critical environmental constraints limiting agricultural productivity worldwide. This review evaluates the physiological and biochemical responses of major cereal crops (rice, wheat, and maize) to salinity stress. We analyze the mechanisms of osmotic tolerance and ion exclusion, and summarize breeding and genetic approaches to enhance salinity tolerance. Recent trials demonstrate that combined application of biochar and plant growth-promoting rhizobacteria (PGPR) can mitigate yield losses by up to 24% under moderate salinity conditions (8 dS/m). We recommend integrated soil-crop management practices for sustainable cultivation in salt-affected areas.",
      keywords: ["salinity stress", "cereal crops", "osmotic tolerance", "soil fertility", "sustainable agriculture"],
      content_html: `
        <h2>Introduction</h2>
        <p>Soil salinity affects over 20% of irrigated agricultural land worldwide, posing a major threat to global food security. Cereal crops, which form the staple diet of the majority of the human population, are particularly sensitive to elevated salt levels during their early vegetative and reproductive stages.</p>
        
        <h2>Physiological Responses</h2>
        <p>Elevated levels of sodium (Na+) and chloride (Cl-) in the soil solution limit root water uptake, inducing osmotic stress. Over time, accumulation of Na+ in leaves triggers ion toxicity, inhibiting photosynthesis and enzyme activities. Plants employ various mechanisms, including sodium exclusion at the root level and vacuolar sequestration, to survive these conditions.</p>
        
        <h2>Mitigation Strategies</h2>
        <p>Integrated management combining salt-tolerant crop cultivars with soil amendments has shown promising results. In trials conducted over the past 12 months, the application of organic biochar significantly improved soil structure and water-holding capacity, reducing Na+ uptake in cereal crops.</p>

        <h2>Conclusion</h2>
        <p>Enhancing salinity tolerance in staple cereals is crucial for sustaining global agricultural output. Collaborative efforts combining marker-assisted selection, CRISPR gene editing, and microbiological soil inoculants represent the most viable pathway forward for reclamation of saline farmlands.</p>
      `,
      pdf_url: "/journals/jase/articles/effect-of-salinity-stress.pdf",
      doi: "[PENDING]",
      first_page: 1,
      last_page: 12,
      status: "published",
      published_at: "2026-07-01T12:00:00Z",
      issues: {
        issue_number: 1,
        publish_date: "2026-07-01",
        volumes: {
          volume_number: 1,
          year: 2026
        }
      },
      article_authors: [
        {
          author_order: 1,
          is_corresponding: true,
          authors: {
            id: "auth-1",
            full_name: "Dr. Shikha Sharma",
            email: "shikha@example.com",
            affiliation: "Indian Agricultural Research Institute, Department of Agronomy",
            orcid: "0000-0002-1825-0097",
            country: "India"
          }
        },
        {
          author_order: 2,
          is_corresponding: false,
          authors: {
            id: "auth-2",
            full_name: "Dr. Amit Patel",
            email: "amit.patel@example.com",
            affiliation: "Indian Agricultural Research Institute, Division of Soil Science",
            orcid: "0000-0003-2415-8812",
            country: "India"
          }
        }
      ]
    };
  }

  if (!article) return null;

  // Format into standard SEO structures
  const authors = article.article_authors
    ? [...article.article_authors]
        .sort((a, b) => a.author_order - b.author_order)
        .map((aa: any) => ({
          fullName: aa.authors?.full_name || "Unknown Author",
          affiliation: aa.authors?.affiliation,
          orcid: aa.authors?.orcid,
          email: aa.authors?.email,
          country: aa.authors?.country,
          isCorresponding: aa.is_corresponding
        }))
    : [];

  const formattedArticle: ArticleSEOData & { raw: any; sortedAuthors: typeof authors } = {
    title: article.title,
    abstract: article.abstract,
    slug: article.slug,
    doi: article.doi,
    firstPage: article.first_page,
    lastPage: article.last_page,
    publishedAt: article.published_at,
    pdfUrl: article.pdf_url,
    authors: authors,
    volumeNumber: article.issues?.volumes?.volume_number,
    volumeYear: article.issues?.volumes?.year,
    issueNumber: article.issues?.issue_number,
    raw: article,
    sortedAuthors: authors
  };

  return { journal, article: formattedArticle };
}

// Generate metadata including Google Scholar tags
export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { journalSlug, articleSlug } = await params;
  const data = await fetchArticleAndJournal(journalSlug, articleSlug);

  if (!data) return {};

  const { journal, article } = data;
  const headersList = await headers();
  const host = headersList.get("host") || "oracleinkpress.com";
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  const hostUrl = `${protocol}://${host}`;

  const citationTags = generateCitationMetaTags(article, journal, hostUrl);

  return {
    title: `${article.title} | ${journal.name}`,
    description: article.abstract || undefined,
    alternates: {
      canonical: `${hostUrl}/article/${article.slug}`,
    },
    other: citationTags as Record<string, string>,
  };
}

export default async function ArticleDetail({ params }: ArticlePageProps) {
  const { journalSlug, articleSlug } = await params;
  const data = await fetchArticleAndJournal(journalSlug, articleSlug);

  if (!data) {
    notFound();
  }

  const { journal, article } = data;
  const headersList = await headers();
  const host = headersList.get("host") || "oracleinkpress.com";
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  const hostUrl = `${protocol}://${host}`;

  // Generate JSON-LD schema
  const jsonLd = generateScholarlyArticleJsonLd(article, journal, hostUrl);

  return (
    <article className="max-w-4xl mx-auto space-y-10">
      {/* JSON-LD Script tag */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Main Metadata Display Card */}
      <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200/80 shadow-sm space-y-6">
        {/* Issue link & breadcrumb */}
        {article.volumeNumber && article.issueNumber && (
          <nav className="text-xs font-bold text-slate-400 space-x-2">
            <Link href="/archive" className="hover:underline">Archive</Link>
            <span>/</span>
            <Link 
              href={`/issue/${article.volumeNumber}/${article.issueNumber}`} 
              className="hover:underline"
            >
              Volume {article.volumeNumber}, Issue {article.issueNumber}
            </Link>
          </nav>
        )}

        {/* Article Title */}
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight tracking-tight">
          {article.title}
        </h1>

        {/* Authors List */}
        <div className="space-y-3 pt-2">
          <p className="text-base font-bold text-slate-800">
            {article.sortedAuthors.map((auth, idx) => (
              <span key={idx}>
                {auth.fullName}
                {auth.isCorresponding && <span className="text-indigo-600 font-extrabold ml-0.5" title="Corresponding Author">*</span>}
                {auth.orcid && (
                  <a 
                    href={`https://orcid.org/${auth.orcid}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-block ml-1 text-slate-400 hover:text-green-600 transition-colors"
                  >
                    🟢
                  </a>
                )}
                {idx < article.sortedAuthors.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>

          {/* Affiliations */}
          <div className="space-y-1.5 text-xs sm:text-sm text-slate-500 font-medium leading-normal border-l-2 border-slate-200 pl-4">
            {article.sortedAuthors.map((auth, idx) => (
              <p key={idx}>
                <span className="font-semibold text-slate-700">{auth.fullName}:</span> {auth.affiliation || "No affiliation listed"} ({auth.country || "International"})
              </p>
            ))}
          </div>
        </div>

        {/* Meta stats bar */}
        <div className="border-t border-b border-slate-100 py-4 flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold text-slate-400">
          {article.publishedAt && (
            <span>Published: {new Date(article.publishedAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
          )}
          {article.volumeNumber && (
            <span>Volume: {article.volumeNumber}</span>
          )}
          {article.issueNumber && (
            <span>Issue: {article.issueNumber}</span>
          )}
          {article.firstPage && (
            <span>Pages: {article.firstPage}-{article.lastPage}</span>
          )}
          <span>DOI: {article.doi || "[PENDING]"}</span>
        </div>

        {/* Abstract */}
        {article.abstract && (
          <div className="space-y-3 bg-slate-50 p-6 rounded-xl border border-slate-100">
            <h3 className="font-extrabold text-slate-900 uppercase tracking-widest text-xs">
              Abstract
            </h3>
            <p className="text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-line">
              {article.abstract}
            </p>
          </div>
        )}

        {/* Keywords */}
        {article.raw?.keywords && article.raw.keywords.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Keywords:
            </span>
            {article.raw.keywords.map((kw: string, idx: number) => (
              <span 
                key={idx} 
                className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200"
              >
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main Body HTML text */}
      {article.raw?.content_html && (
        <section className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200/80 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">
            Full Text
          </h2>
          <div 
            className="prose prose-slate max-w-none text-slate-700 leading-relaxed text-sm sm:text-base space-y-4
              prose-h2:text-lg prose-h2:font-bold prose-h2:text-slate-900 prose-h2:pt-4
              prose-p:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: article.raw.content_html }}
          />
        </section>
      )}

      {/* PDF View / Download Section */}
      <section className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-900">
            Article PDF
          </h2>
          
          {article.pdfUrl && (
            <a 
              href={article.pdfUrl} 
              download 
              className="px-4 py-2 bg-[var(--primary-color)] text-white font-bold text-xs rounded-lg shadow shadow-slate-100 hover:opacity-90 flex items-center gap-1.5 transition-colors"
            >
              📥 Download PDF
            </a>
          )}
        </div>

        {article.pdfUrl ? (
          /* PDF Viewer / Embed */
          <div className="aspect-[4/3] w-full border border-slate-200 rounded-xl overflow-hidden shadow-inner bg-slate-50 flex flex-col items-center justify-center relative">
            <iframe 
              src={`${article.pdfUrl}#toolbar=0&navpanes=0`} 
              className="w-full h-full hidden sm:block border-0" 
              title="Article PDF Document"
            />
            {/* Mobile / Fallback view */}
            <div className="sm:hidden text-center p-6 space-y-4">
              <span className="text-4xl">📄</span>
              <p className="text-slate-500 font-semibold text-sm">PDF View is not optimized for small screens.</p>
              <a 
                href={article.pdfUrl} 
                className="inline-block px-4 py-2 border rounded-lg text-xs font-bold text-[var(--primary-color)] border-[var(--primary-color)] hover:bg-[var(--primary-color)] hover:text-white transition-colors"
              >
                Open PDF in New Tab
              </a>
            </div>
          </div>
        ) : (
          <div className="p-10 text-center text-slate-400 bg-slate-50 border rounded-xl">
            No PDF manuscript is uploaded for this article.
          </div>
        )}
      </section>
    </article>
  );
}
