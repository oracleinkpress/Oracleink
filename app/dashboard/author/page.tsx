import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AuthorDashboard() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If not logged in, redirect to login page (we can point them to /journal/jase/submit which has the login interface)
  if (!user) {
    redirect("/journal/jase/submit");
  }

  // Fetch author submissions
  let submissions: any[] = [];
  try {
    const { data } = await supabase
      .from("articles")
      .select(`
        id,
        title,
        status,
        submitted_at,
        published_at,
        journals(
          name,
          slug
        )
      `)
      .eq("submitted_by", user.id)
      .order("submitted_at", { ascending: false });

    submissions = data || [];
  } catch (err) {
    console.error("Error fetching author submissions:", err);
  }

  // Fallback demo submission for preview
  if (submissions.length === 0 && user.email === "test-author@oracleinkpress.com") {
    submissions = [
      {
        id: "demo-submission-1",
        title: "Effect of Salinity Stress on Growth and Yield of Major Cereal Crops",
        status: "published",
        submitted_at: "2026-05-15T10:00:00Z",
        published_at: "2026-07-01T12:00:00Z",
        journals: {
          name: "Journal of Agricultural Sciences and Engineering",
          slug: "jase"
        }
      },
      {
        id: "demo-submission-2",
        title: "Drought tolerance mechanisms in staple food crops: a review",
        status: "under_review",
        submitted_at: "2026-06-20T14:30:00Z",
        journals: {
          name: "Journal of Agricultural Sciences and Engineering",
          slug: "jase"
        }
      }
    ];
  }

  // Status mapping
  const statusSteps = [
    { label: "Submitted", key: "submitted", color: "bg-slate-300" },
    { label: "Under Review", key: "under_review", color: "bg-amber-500" },
    { label: "Accepted", key: "accepted", color: "bg-emerald-500" },
    { label: "Published", key: "published", color: "bg-indigo-600" }
  ];

  const getStepStatus = (currentStatus: string, stepKey: string) => {
    const order = ["submitted", "under_review", "revision_requested", "accepted", "published"];
    
    // Treat revision_requested as under_review or intermediate state
    let mappedStatus = currentStatus;
    if (currentStatus === "revision_requested") {
      mappedStatus = "under_review";
    }
    if (currentStatus === "rejected") {
      return stepKey === "submitted" ? "completed" : "failed";
    }

    const currentIdx = order.indexOf(mappedStatus);
    const stepIdx = order.indexOf(stepKey);

    if (currentIdx >= stepIdx) return "completed";
    return "pending";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Dashboard Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xl">
              A
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900">Author Dashboard</span>
              <p className="text-slate-400 text-xs font-semibold">Track your submitted manuscripts</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-sm font-semibold">
            <span className="text-slate-600 hidden sm:inline-block">Logged in as: {user.email}</span>
            <Link 
              href="/journal/jase/submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 text-xs shadow font-bold transition-colors"
            >
              Submit New Paper
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Your Submissions</h2>
          <p className="text-slate-500 text-sm mt-0.5">Manage and trace the review phases of your papers.</p>
        </div>

        {submissions.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center max-w-lg mx-auto space-y-4">
            <span className="text-4xl block">📝</span>
            <h3 className="font-extrabold text-slate-900 text-lg">No manuscripts submitted</h3>
            <p className="text-slate-500 text-sm">
              You haven't submitted any papers to our platform yet. Click the button below to get started.
            </p>
            <Link 
              href="/journal/jase/submit"
              className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow transition-colors"
            >
              Start Your First Submission
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {submissions.map((sub) => (
              <div 
                key={sub.id} 
                className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6 hover:shadow-md transition-shadow"
              >
                {/* Upper info */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                      {sub.journals?.name || "Journal Platform"}
                    </span>
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                      {sub.title}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Submitted on: {new Date(sub.submitted_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className="self-start">
                    <span 
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border uppercase tracking-wider
                        ${sub.status === "published" ? "bg-indigo-50 border-indigo-200 text-indigo-700" : ""}
                        ${sub.status === "accepted" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : ""}
                        ${sub.status === "under_review" || sub.status === "revision_requested" ? "bg-amber-50 border-amber-200 text-amber-700" : ""}
                        ${sub.status === "submitted" ? "bg-slate-50 border-slate-200 text-slate-600" : ""}
                        ${sub.status === "rejected" ? "bg-rose-50 border-rose-200 text-rose-700" : ""}
                      `}
                    >
                      {sub.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Timeline / Progress bar */}
                {sub.status !== "rejected" ? (
                  <div className="pt-4">
                    <div className="relative">
                      {/* Connecting Line */}
                      <div className="absolute top-4 left-0 right-0 h-1 bg-slate-100 -z-10 rounded" />
                      
                      {/* Steps Grid */}
                      <div className="grid grid-cols-4 text-center">
                        {statusSteps.map((step) => {
                          const stepStatus = getStepStatus(sub.status, step.key);
                          
                          return (
                            <div key={step.key} className="flex flex-col items-center">
                              {/* Step circle */}
                              <div 
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-4 transition-all duration-300
                                  ${stepStatus === "completed" 
                                    ? `${step.color} text-white border-white ring-2 ring-slate-100` 
                                    : "bg-white text-slate-300 border-slate-200"
                                  }
                                `}
                              >
                                {stepStatus === "completed" ? "✓" : "•"}
                              </div>
                              <span 
                                className={`text-[10px] sm:text-xs font-semibold mt-2
                                  ${stepStatus === "completed" ? "text-slate-800 font-bold" : "text-slate-400"}
                                `}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs sm:text-sm text-rose-800 font-medium">
                    This manuscript was rejected by the editorial board. Please refer to your emails for comments and details.
                  </div>
                )}
                
                {/* Actions bottom */}
                {sub.status === "published" && sub.journals?.slug && (
                  <div className="border-t border-slate-100 pt-4 flex justify-end">
                    <a 
                      href={`/journal/${sub.journals.slug}/article/${sub.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")}`}
                      className="text-xs font-bold text-indigo-600 hover:underline flex items-center"
                    >
                      View Live Article <span className="ml-1">→</span>
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
