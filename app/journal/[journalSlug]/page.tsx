import { notFound } from "next/navigation";
import Link from "next/link";
import { getJournalBySlug } from "@/lib/tenant";
import { createServerClient } from "@/lib/supabase/server";

interface JournalHomeProps {
  params: Promise<{ journalSlug: string }>;
}

export default async function JournalHome({ params }: JournalHomeProps) {
  const { journalSlug } = await params;
  const journal = await getJournalBySlug(journalSlug);

  if (!journal) {
    notFound();
  }

  const supabase = createServerClient();

  // Fetch Latest Issue
  let latestIssue: any = null;
  try {
    const { data } = await supabase
      .from("issues")
      .select(`
        id,
        issue_number,
        publish_date,
        cover_image,
        volumes!inner(
          id,
          volume_number,
          year,
          journal_id
        )
      `)
      .eq("volumes.journal_id", journal.id)
      .order("publish_date", { ascending: false })
      .limit(1)
      .maybeSingle();
      
    latestIssue = data;
  } catch (err) {
    console.error("Error fetching latest issue:", err);
  }

  // Fetch Recent Articles
  let recentArticles: any[] = [];
  try {
    const { data } = await supabase
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
      .eq("journal_id", journal.id)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(5);

    if (data) {
      recentArticles = data.map((art: any) => {
        // Sort and map authors
        const authorsList = art.article_authors
          ? [...art.article_authors]
              .sort((a, b) => a.author_order - b.author_order)
              .map((aa: any) => aa.authors?.full_name || "Unknown Author")
          : [];
        return { ...art, authors: authorsList };
      });
    }
  } catch (err) {
    console.error("Error fetching recent articles:", err);
  }

  // Fallback seed values for demo if DB query is empty/failed
  if (recentArticles.length === 0 && journalSlug === "jase") {
    latestIssue = {
      issue_number: 1,
      publish_date: "2026-07-01",
      cover_image: null,
      volumes: {
        volume_number: 1,
        year: 2026
      }
    };
    
    recentArticles = [
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      {/* Left 2 Columns: Aims & Scope + Recent Articles */}
      <div className="lg:col-span-2 space-y-12">
        {/* Aims & Scope Brief */}
        <section className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4 mb-4">
            Aims & Scope
          </h2>
          <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
            {journal.aims_scope || "Aims & Scope details have not been configured for this journal yet."}
          </p>
          <div className="mt-4">
            <Link 
              href="/about" 
              className="text-xs font-bold text-[var(--primary-color)] hover:underline flex items-center"
            >
              Read Full Scope & Policies <span className="ml-1">→</span>
            </Link>
          </div>
        </section>

        {/* Recent Articles */}
        <section className="space-y-6">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center">
            Recent Published Articles
          </h2>
          
          {recentArticles.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 border border-slate-200/80 shadow-sm text-center text-slate-400">
              <span className="text-3xl block mb-2">📄</span>
              No articles have been published in this journal yet.
            </div>
          ) : (
            <div className="space-y-6">
              {recentArticles.map((article) => (
                <article 
                  key={article.id} 
                  className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-950 leading-tight group-hover:text-[var(--primary-color)] transition-colors mb-2">
                      <Link href={`/article/${article.slug}`}>
                        {article.title}
                      </Link>
                    </h3>
                    
                    {/* Authors list */}
                    {article.authors && article.authors.length > 0 && (
                      <p className="text-sm font-semibold text-slate-700 mb-3">
                        {article.authors.join(", ")}
                      </p>
                    )}
                    
                    {/* Abstract snippet */}
                    {article.abstract && (
                      <p className="text-slate-500 text-xs sm:text-sm line-clamp-3 leading-relaxed mb-4">
                        {article.abstract}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-4 mt-2 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
                    <div className="flex items-center space-x-3">
                      <span>Pages: {article.first_page}-{article.last_page}</span>
                      <span>•</span>
                      <span>DOI: {article.doi || "[PENDING]"}</span>
                    </div>
                    
                    <Link 
                      href={`/article/${article.slug}`}
                      className="text-xs font-bold text-[var(--primary-color)] hover:underline flex items-center"
                    >
                      Read Abstract & Full Text <span className="ml-1">→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Right Column: Latest Issue + Editorial Board Summary */}
      <div className="space-y-10">
        {/* Latest Issue Panel */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-900 text-white px-6 py-4 font-bold text-sm tracking-wide uppercase">
            Latest Issue
          </div>
          
          {latestIssue ? (
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl mb-4 border border-slate-200 flex items-center justify-center relative overflow-hidden shadow-inner group-hover:scale-[1.02] transition-transform">
                  {latestIssue.cover_image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img 
                      src={latestIssue.cover_image} 
                      alt={`Volume ${latestIssue.volumes?.volume_number} Issue ${latestIssue.issue_number} cover`}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-2 text-slate-400">
                        📚
                      </div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Volume {latestIssue.volumes?.volume_number}
                      </span>
                      <p className="text-slate-600 font-extrabold text-sm mt-1">
                        Issue {latestIssue.issue_number}
                      </p>
                    </div>
                  )}
                </div>
                
                <h3 className="font-extrabold text-slate-900 text-lg mb-1">
                  Volume {latestIssue.volumes?.volume_number}, Issue {latestIssue.issue_number}
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  Published: {new Date(latestIssue.publish_date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              <Link 
                href={`/issue/${latestIssue.volumes?.volume_number}/${latestIssue.issue_number}`}
                className="w-full text-center py-2.5 rounded-lg border border-[var(--primary-color)] text-[var(--primary-color)] hover:bg-[var(--primary-color)] hover:text-white font-bold text-xs transition-colors"
              >
                Browse Table of Contents
              </Link>
            </div>
          ) : (
            <div className="p-10 text-center text-slate-400">
              No issues published.
            </div>
          )}
        </section>

        {/* Editorial Board Summary */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 mb-2">
            Editorial Leadership
          </h3>
          
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                Editor-in-Chief
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {journalSlug === "jase" ? "Dr. Ali Reza" : "To Be Appointed"}
              </p>
              <p className="text-xs text-slate-500">
                {journalSlug === "jase" ? "University of Tehran" : ""}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <Link 
              href="/editorial-board"
              className="text-xs font-bold text-[var(--primary-color)] hover:underline flex items-center"
            >
              View Full Editorial Board <span className="ml-1">→</span>
            </Link>
          </div>
        </section>

        {/* Author Call to Action */}
        <section className="p-6 rounded-2xl text-white relative overflow-hidden shadow-md" style={{ backgroundColor: "var(--primary-color)" }}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_-20%,rgba(255,255,255,0.1),rgba(0,0,0,0))]" />
          <h3 className="font-extrabold text-lg mb-2 relative z-10">Submit Your Manuscript</h3>
          <p className="text-xs opacity-90 leading-relaxed mb-5 relative z-10">
            We welcome original submissions, review papers, and technical notes in our subject areas. All papers are double-blind peer reviewed.
          </p>
          <Link 
            href="/submit" 
            className="inline-block px-4 py-2 bg-white text-slate-900 rounded-lg text-xs font-bold shadow hover:bg-slate-100 transition-colors relative z-10"
          >
            Author Guidelines & Submission
          </Link>
        </section>
      </div>
    </div>
  );
}
