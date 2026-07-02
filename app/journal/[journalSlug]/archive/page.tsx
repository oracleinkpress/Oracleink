import { notFound } from "next/navigation";
import Link from "next/link";
import { getJournalBySlug } from "@/lib/tenant";
import { createServerClient } from "@/lib/supabase/server";

interface ArchivePageProps {
  params: Promise<{ journalSlug: string }>;
}

export default async function ArchivePage({ params }: ArchivePageProps) {
  const { journalSlug } = await params;
  const journal = await getJournalBySlug(journalSlug);

  if (!journal) {
    notFound();
  }

  const supabase = await createServerClient();
  let volumes: any[] = [];

  try {
    const { data } = await supabase
      .from("volumes")
      .select(`
        id,
        volume_number,
        year,
        issues(
          id,
          issue_number,
          publish_date,
          cover_image
        )
      `)
      .eq("journal_id", journal.id)
      .order("year", { ascending: false });
    
    volumes = data || [];
  } catch (err) {
    console.error("Error fetching archive volumes:", err);
  }

  // Fallback demo volumes/issues if empty/failed (specifically for JASE)
  if (volumes.length === 0 && journalSlug === "jase") {
    volumes = [
      {
        id: "v1",
        volume_number: 1,
        year: 2026,
        issues: [
          {
            id: "i1",
            issue_number: 1,
            publish_date: "2026-07-01",
            cover_image: null
          }
        ]
      }
    ];
  }

  return (
    <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200/80 shadow-sm max-w-4xl mx-auto space-y-10">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Journal Archive
        </h2>
        <p className="text-slate-500 text-sm">
          Browse all published volumes, issues, and articles.
        </p>
        <div className="h-1 w-20 rounded mt-4" style={{ backgroundColor: "var(--primary-color)" }} />
      </div>

      {volumes.length === 0 ? (
        <div className="text-center p-10 text-slate-400">
          No archive items have been published in this journal yet.
        </div>
      ) : (
        <div className="space-y-8">
          {volumes.map((volume) => {
            // Sort issues in desc order
            const sortedIssues = volume.issues
              ? [...volume.issues].sort((a, b) => b.issue_number - a.issue_number)
              : [];

            return (
              <div key={volume.id} className="border-b border-slate-100 pb-8 last:border-0 last:pb-0">
                <h3 className="text-xl font-extrabold text-slate-900 mb-4 flex items-center">
                  <span>Volume {volume.volume_number} ({volume.year})</span>
                </h3>
                
                {sortedIssues.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No issues published under this volume.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {sortedIssues.map((issue) => (
                      <div 
                        key={issue.id} 
                        className="bg-slate-50 rounded-xl border border-slate-100 p-5 hover:border-slate-200 hover:shadow-sm transition-all duration-200 flex flex-col justify-between group"
                      >
                        <div>
                          <div className="aspect-[3/4] bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg mb-3 flex items-center justify-center text-xs font-bold text-slate-400 overflow-hidden shadow-inner">
                            {issue.cover_image ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img 
                                src={issue.cover_image} 
                                alt={`Issue ${issue.issue_number} cover`}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <div className="text-center">
                                <span>Vol {volume.volume_number}</span>
                                <p className="text-slate-600 font-extrabold text-sm mt-0.5">Issue {issue.issue_number}</p>
                              </div>
                            )}
                          </div>
                          
                          <h4 className="font-extrabold text-slate-900 leading-tight mb-1">
                            Issue {issue.issue_number}
                          </h4>
                          <p className="text-xs text-slate-400 mb-4">
                            Published: {new Date(issue.publish_date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>

                        <Link 
                          href={`/issue/${volume.volume_number}/${issue.issue_number}`}
                          className="w-full text-center py-2 bg-white rounded-lg border border-slate-200 text-slate-700 hover:text-[var(--primary-color)] hover:border-[var(--primary-color)] font-bold text-xs transition-colors"
                        >
                          View Table of Contents
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
