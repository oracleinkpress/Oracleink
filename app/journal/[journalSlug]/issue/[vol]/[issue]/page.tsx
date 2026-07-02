import { notFound } from "next/navigation";
import Link from "next/link";
import { getJournalBySlug } from "@/lib/tenant";
import { createServerClient } from "@/lib/supabase/server";

interface IssuePageProps {
  params: Promise<{
    journalSlug: string;
    vol: string;
    issue: string;
  }>;
}

export default async function IssuePage({ params }: IssuePageProps) {
  const { journalSlug, vol, issue } = await params;
  const journal = await getJournalBySlug(journalSlug);

  if (!journal) {
    notFound();
  }

  const supabase = await createServerClient();
  let volumeDetails: any = null;
  let issueDetails: any = null;
  let issueArticles: any[] = [];

  try {
    // 1. Fetch Volume matching number
    const { data: volumeData } = await supabase
      .from("volumes")
      .select("id, volume_number, year")
      .eq("journal_id", journal.id)
      .eq("volume_number", parseInt(vol))
      .maybeSingle();

    if (volumeData) {
      volumeDetails = volumeData;
      
      // 2. Fetch Issue matching number under volume
      const { data: issueData } = await supabase
        .from("issues")
        .select("id, issue_number, publish_date, cover_image")
        .eq("volume_id", volumeData.id)
        .eq("issue_number", parseInt(issue))
        .maybeSingle();

      if (issueData) {
        issueDetails = issueData;

        // 3. Fetch Articles in Issue
        const { data: articlesData } = await supabase
          .from("articles")
          .select(`
            id,
            slug,
            title,
            abstract,
            doi,
            first_page,
            last_page,
            published_at,
            article_authors(
              author_order,
              authors(
                id,
                full_name
              )
            )
          `)
          .eq("issue_id", issueData.id)
          .eq("status", "published")
          .order("first_page", { ascending: true });

        if (articlesData) {
          issueArticles = articlesData.map((art: any) => {
            const authorsList = art.article_authors
              ? [...art.article_authors]
                  .sort((a, b) => a.author_order - b.author_order)
                  .map((aa: any) => aa.authors?.full_name || "Unknown Author")
              : [];
            return { ...art, authors: authorsList };
          });
        }
      }
    }
  } catch (err) {
    console.error("Error fetching issue details:", err);
  }

  // Fallback demo values if DB query is empty/failed
  if (!issueDetails && journalSlug === "jase" && vol === "1" && issue === "1") {
    volumeDetails = { volume_number: 1, year: 2026 };
    issueDetails = { issue_number: 1, publish_date: "2026-07-01", cover_image: null };
    issueArticles = [
      {
        id: "demo-1",
        slug: "effect-of-salinity-stress-on-growth-and-yield-of-major-cereal-crops",
        title: "Effect of Salinity Stress on Growth and Yield of Major Cereal Crops",
        abstract: "Salinity is one of the most critical environmental constraints limiting agricultural productivity worldwide. This review evaluates the physiological and biochemical responses of major cereal crops (rice, wheat, and maize) to salinity stress. We analyze the mechanisms of osmotic tolerance and ion exclusion...",
        doi: "[PENDING]",
        first_page: 1,
        last_page: 12,
        published_at: "2026-07-01T12:00:00Z",
        authors: ["Dr. Shikha Sharma", "Dr. Amit Patel"]
      }
    ];
  }

  if (!issueDetails) {
    notFound();
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Header breadcrumb & info */}
      <div className="flex flex-col md:flex-row gap-8 bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Cover thumbnail */}
        <div className="w-full md:w-48 aspect-[3/4] bg-gradient-to-br from-slate-200 to-slate-300 rounded-xl flex items-center justify-center text-xs font-bold text-slate-400 overflow-hidden shadow-inner shrink-0">
          {issueDetails.cover_image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img 
              src={issueDetails.cover_image} 
              alt={`Volume ${volumeDetails.volume_number} Issue ${issueDetails.issue_number} cover`}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="text-center">
              <span>Vol {volumeDetails.volume_number}</span>
              <p className="text-slate-600 font-extrabold text-sm mt-0.5">Issue {issueDetails.issue_number}</p>
            </div>
          )}
        </div>

        {/* Issue Metadata */}
        <div className="flex flex-col justify-between py-2">
          <div>
            <nav className="text-xs font-bold text-slate-400 space-x-2 mb-2">
              <Link href="/archive" className="hover:underline">Archive</Link>
              <span>/</span>
              <span>Volume {volumeDetails.volume_number}</span>
            </nav>
            
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight mb-2">
              Volume {volumeDetails.volume_number}, Issue {issueDetails.issue_number}
            </h2>
            
            <p className="text-slate-500 text-xs sm:text-sm">
              Publication Date: {new Date(issueDetails.publish_date).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4 flex gap-4 text-xs font-semibold text-slate-500">
            <span>Articles: {issueArticles.length}</span>
            <span>•</span>
            <span>Status: Published</span>
          </div>
        </div>
      </div>

      {/* Table of contents */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-900 px-1">
          Table of Contents
        </h3>

        {issueArticles.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm text-center text-slate-400">
            No articles have been assigned to this issue yet.
          </div>
        ) : (
          <div className="space-y-6">
            {issueArticles.map((article, index) => (
              <div 
                key={article.id} 
                className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-150 flex flex-col md:flex-row gap-6 items-start group"
              >
                {/* Index badge */}
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 border"
                  style={{ 
                    borderColor: "rgba(var(--primary-color), 0.2)",
                    color: "var(--primary-color)",
                    backgroundColor: "rgba(var(--primary-color), 0.05)"
                  }}
                >
                  {index + 1}
                </div>

                <div className="flex-1 space-y-3">
                  <h4 className="text-lg font-extrabold text-slate-900 leading-snug group-hover:text-[var(--primary-color)] transition-colors">
                    <Link href={`/article/${article.slug}`}>
                      {article.title}
                    </Link>
                  </h4>

                  {article.authors && article.authors.length > 0 && (
                    <p className="text-sm font-semibold text-slate-700">
                      {article.authors.join(", ")}
                    </p>
                  )}

                  {article.abstract && (
                    <p className="text-slate-500 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                      {article.abstract}
                    </p>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
                    <div className="flex items-center space-x-3">
                      <span>Pages: {article.first_page} - {article.last_page}</span>
                      <span>•</span>
                      <span>DOI: {article.doi || "[PENDING]"}</span>
                    </div>

                    <Link 
                      href={`/article/${article.slug}`}
                      className="text-xs font-bold text-[var(--primary-color)] hover:underline flex items-center"
                    >
                      Read Full Article <span className="ml-1">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
