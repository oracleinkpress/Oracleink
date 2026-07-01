"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { assignReviewer, updateArticleStatus } from "./actions";

export default function EditorDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  // Submissions data
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);

  // Editor interactive states
  const [activeTab, setActiveTab] = useState("all");
  const [showReviewerModal, setShowReviewerModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Publish form states
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState("");
  const [firstPage, setFirstPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(10);
  const [publishing, setPublishing] = useState(false);

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      setLoading(true);
      try {
        // Query journal associations
        let journalIds: string[] = [];
        
        if (user.email === "test-editor@oracleinkpress.com") {
          // Hardcode JASE journal UUID in dev fallback
          journalIds = ["a3b1a135-777c-474c-a1d2-06b23d9b4b9b"];
        } else {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("journal_id")
            .eq("user_id", user.id)
            .in("role", ["editor", "journal_admin", "platform_admin"]);
          
          if (roles) {
            journalIds = roles.map(r => r.journal_id);
          }
        }

        if (journalIds.length > 0) {
          // Fetch articles
          const { data: articles } = await supabase
            .from("articles")
            .select(`
              id,
              title,
              status,
              submitted_at,
              published_at,
              pdf_url,
              journal_id,
              journals(name, slug),
              article_authors(
                author_order,
                authors(
                  full_name,
                  email
                )
              )
            `)
            .in("journal_id", journalIds)
            .order("submitted_at", { ascending: false });

          if (articles) {
            setSubmissions(articles.map((art: any) => {
              const mainAuthor = art.article_authors?.find((aa: any) => aa.author_order === 1)?.authors || { full_name: "Unknown", email: "" };
              return { ...art, authorName: mainAuthor.full_name, authorEmail: mainAuthor.email };
            }));
          }

          // Fetch issues/volumes for publishing
          const { data: issuesData } = await supabase
            .from("issues")
            .select(`
              id,
              issue_number,
              volumes!inner(
                volume_number,
                year,
                journal_id
              )
            `)
            .in("volumes.journal_id", journalIds);
          
          if (issuesData) {
            setIssues(issuesData);
            if (issuesData.length > 0) {
              setSelectedIssueId(issuesData[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching editor dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  // Auth Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  // Mock Editor Sign In
  const handleMockLogin = async () => {
    setLoading(true);
    setAuthError("");
    const mockEmail = "test-editor@oracleinkpress.com";
    const mockPassword = "password123";

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: mockEmail,
        password: mockPassword,
      });

      if (signInError) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: mockEmail,
          password: mockPassword,
        });
        if (signUpError) throw signUpError;
        
        const { error: reSignIn } = await supabase.auth.signInWithPassword({
          email: mockEmail,
          password: mockPassword,
        });
        if (reSignIn) throw reSignIn;
      }
    } catch (err: any) {
      setAuthError(err.message || "Mock login failed");
    } finally {
      setLoading(false);
    }
  };

  // Assign Reviewer Submission
  const handleAssignReviewer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticle || !reviewerEmail || !reviewerName) return;

    setAssigning(true);
    try {
      const res = await assignReviewer(
        selectedArticle.id,
        reviewerEmail,
        reviewerName,
        selectedArticle.journals?.name || "Academic Journal"
      );

      if (res.success) {
        // Update local status
        setSubmissions(submissions.map(s => 
          s.id === selectedArticle.id ? { ...s, status: "under_review" } : s
        ));
        setShowReviewerModal(false);
        setReviewerName("");
        setReviewerEmail("");
        alert("Reviewer successfully assigned and notified!");
      } else {
        alert(res.error || "Failed to assign reviewer.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAssigning(false);
    }
  };

  // Handle article publishing
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticle || !selectedIssueId) return;

    setPublishing(true);
    try {
      const res = await updateArticleStatus(
        selectedArticle.id,
        "published",
        selectedArticle.authorEmail,
        selectedArticle.authorName,
        selectedArticle.title,
        selectedArticle.journals?.name || "Academic Journal",
        selectedArticle.journals?.slug || "jase",
        undefined,
        selectedIssueId,
        firstPage,
        lastPage
      );

      if (res.success) {
        setSubmissions(submissions.map(s => 
          s.id === selectedArticle.id ? { ...s, status: "published" } : s
        ));
        setShowPublishModal(false);
        alert("Article successfully published to current issue!");
      } else {
        alert(res.error || "Publishing failed.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPublishing(false);
    }
  };

  const handleUpdateStatus = async (
    article: any, 
    newStatus: "accepted" | "revision_requested" | "rejected"
  ) => {
    const confirmMsg = `Are you sure you want to transition this manuscript to: ${newStatus.toUpperCase()}?`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await updateArticleStatus(
        article.id,
        newStatus,
        article.authorEmail,
        article.authorName,
        article.title,
        article.journals?.name || "Academic Journal",
        article.journals?.slug || "jase",
        "The editorial board has finished evaluating your review outcomes."
      );

      if (res.success) {
        setSubmissions(submissions.map(s => 
          s.id === article.id ? { ...s, status: newStatus } : s
        ));
        alert(`Status updated to: ${newStatus.replace("_", " ")}`);
      } else {
        alert(res.error || "Failed to update status.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // Not Authenticated View
  if (!user) {
    return (
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-md p-8 my-10 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-900">Editor Dashboard Portal</h2>
          <p className="text-slate-500 text-sm mt-1">Please sign in to access review lists.</p>
        </div>

        {authError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-semibold">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Editor Email
            </label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm shadow transition-colors"
          >
            Sign In
          </button>
        </form>

        <div className="border-t border-slate-100 pt-6">
          <button
            onClick={handleMockLogin}
            className="w-full py-2.5 bg-indigo-950 hover:bg-indigo-900 text-white rounded-lg font-bold text-sm shadow transition-colors"
          >
            ⚖️ Sign in with Test Editor Account
          </button>
        </div>
      </div>
    );
  }

  const filteredSubmissions = submissions.filter((sub) => {
    if (activeTab === "all") return true;
    return sub.status === activeTab;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-900 flex items-center justify-center text-white font-black text-xl">
              E
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900">Editor Dashboard</span>
              <p className="text-slate-400 text-xs font-semibold">Manuscript Review Queue</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs font-semibold">
            <span className="text-slate-600 hidden sm:inline-block">Logged in: {user.email}</span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-slate-400 hover:text-rose-600 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manuscript Queue</h2>
          <p className="text-slate-500 text-sm mt-0.5">Assign reviewers, review recommendation responses, and publish articles.</p>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap border-b border-slate-200 gap-1 text-sm font-semibold">
          {[
            { label: "All Submissions", key: "all" },
            { label: "Submitted", key: "submitted" },
            { label: "Under Review", key: "under_review" },
            { label: "Revision Requested", key: "revision_requested" },
            { label: "Accepted", key: "accepted" },
            { label: "Published", key: "published" },
            { label: "Rejected", key: "rejected" }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 border-b-2 font-bold text-xs uppercase tracking-wider transition-all
                ${activeTab === tab.key 
                  ? "border-indigo-600 text-indigo-700" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-400">
            No submissions in this queue filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredSubmissions.map((sub) => (
              <div 
                key={sub.id} 
                className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 border rounded-full">
                      {sub.journals?.name}
                    </span>
                    <span 
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider
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

                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                    {sub.title}
                  </h3>

                  <div className="text-xs text-slate-400 flex flex-wrap gap-4 font-semibold">
                    <span>Author: <strong className="text-slate-600">{sub.authorName}</strong> ({sub.authorEmail})</span>
                    <span>•</span>
                    <span>Submitted: {new Date(sub.submitted_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Dashboard Actions */}
                <div className="flex flex-wrap gap-2.5 shrink-0">
                  {sub.pdf_url && (
                    <a 
                      href={sub.pdf_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      📄 View PDF
                    </a>
                  )}

                  {sub.status === "submitted" && (
                    <button
                      onClick={() => {
                        setSelectedArticle(sub);
                        setShowReviewerModal(true);
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow"
                    >
                      Assign Reviewer
                    </button>
                  )}

                  {sub.status === "under_review" && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(sub, "accepted")}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(sub, "revision_requested")}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow"
                      >
                        Request Revision
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(sub, "rejected")}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {sub.status === "accepted" && (
                    <button
                      onClick={() => {
                        setSelectedArticle(sub);
                        setShowPublishModal(true);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow"
                    >
                      Publish Article
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Reviewer Assignment Modal */}
      {showReviewerModal && selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-xl space-y-6">
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">Assign Peer Reviewer</h3>
              <p className="text-xs text-slate-400 mt-1">Review invites will be dispatched via Resend.</p>
            </div>

            <form onSubmit={handleAssignReviewer} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Reviewer Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. John Doe"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Reviewer Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. reviewer@univ.edu"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                  value={reviewerEmail}
                  onChange={(e) => setReviewerEmail(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewerModal(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  {assigning ? "Assigning..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Publish Assignment Modal */}
      {showPublishModal && selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-xl space-y-6">
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">Publish Article</h3>
              <p className="text-xs text-slate-400 mt-1">Assign the manuscript to an active issue and set page indexing ranges.</p>
            </div>

            {issues.length === 0 ? (
              <div className="text-center p-4 text-xs text-rose-600 font-semibold bg-rose-50 border rounded-lg">
                No active issues found. You must create an issue under a volume in the database before you can publish articles.
              </div>
            ) : (
              <form onSubmit={handlePublish} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Select Issue
                  </label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none bg-white"
                    value={selectedIssueId}
                    onChange={(e) => setSelectedIssueId(e.target.value)}
                  >
                    {issues.map((issue) => (
                      <option key={issue.id} value={issue.id}>
                        Volume {issue.volumes?.volume_number} ({issue.volumes?.year}), Issue {issue.issue_number}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Start Page
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      value={firstPage}
                      onChange={(e) => setFirstPage(parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      End Page
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      value={lastPage}
                      onChange={(e) => setLastPage(parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPublishModal(false)}
                    className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={publishing}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                  >
                    {publishing ? "Publishing..." : "Publish Now"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
