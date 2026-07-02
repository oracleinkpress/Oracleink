"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { submitReviewRecommendation } from "./actions";

export default function ReviewerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  // Review data
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Form states
  const [recommendation, setRecommendation] = useState<"accept" | "minor_revision" | "major_revision" | "reject">("accept");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session) {
        document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=604800; SameSite=Lax; Secure`;
      } else {
        document.cookie = `sb-access-token=; path=/; max-age=0`;
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session) {
        document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=604800; SameSite=Lax; Secure`;
      } else {
        document.cookie = `sb-access-token=; path=/; max-age=0`;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch reviews
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchReviews() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("review_assignments")
          .select(`
            id,
            assigned_at,
            status,
            recommendation,
            comments,
            submitted_at,
            articles(
              id,
              title,
              abstract,
              pdf_url,
              journals(name)
            )
          `)
          .eq("reviewer_user_id", user.id)
          .order("assigned_at", { ascending: false });

        setAssignments(data || []);
      } catch (err) {
        console.error("Error fetching review assignments:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchReviews();
  }, [user]);

  // Fallback demo reviewer assignments for test account
  useEffect(() => {
    if (user && user.email === "test-reviewer@oracleinkpress.com" && assignments.length === 0) {
      setAssignments([
        {
          id: "demo-assignment-1",
          assigned_at: "2026-06-25T11:00:00Z",
          status: "pending",
          articles: {
            id: "demo-art-1",
            title: "Effect of Salinity Stress on Growth and Yield of Major Cereal Crops",
            abstract: "Salinity is one of the most critical environmental constraints limiting agricultural productivity worldwide. This review evaluates the physiological and biochemical responses of major cereal crops...",
            pdf_url: "/journals/jase/articles/effect-of-salinity-stress.pdf",
            journals: {
              name: "Journal of Agricultural Sciences and Engineering"
            }
          }
        }
      ]);
    }
  }, [user, assignments]);

  // Auth Sign In
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

  // Mock Reviewer Sign In
  const handleMockLogin = async () => {
    setLoading(true);
    setAuthError("");
    const mockEmail = "test-reviewer@oracleinkpress.com";
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

  // Submit Review Form
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !comments) return;

    setSubmitting(true);
    try {
      const res = await submitReviewRecommendation(
        selectedAssignment.id,
        recommendation,
        comments
      );

      if (res.success) {
        setAssignments(assignments.map(a => 
          a.id === selectedAssignment.id 
            ? { ...a, status: "submitted", recommendation, comments, submitted_at: new Date().toISOString() } 
            : a
        ));
        setShowReviewForm(false);
        setComments("");
        alert("Review recommendation submitted successfully!");
      } else {
        alert(res.error || "Failed to submit review recommendation.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
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
          <h2 className="text-2xl font-black text-slate-900">Reviewer Dashboard Portal</h2>
          <p className="text-slate-500 text-sm mt-1">Please sign in to view assigned manuscripts.</p>
        </div>

        {authError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-semibold">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Reviewer Email
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
            🔬 Sign in with Test Reviewer Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-900 flex items-center justify-center text-white font-black text-xl">
              R
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900">Reviewer Dashboard</span>
              <p className="text-slate-400 text-xs font-semibold">Manuscript Evaluation</p>
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
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Review Assignments</h2>
          <p className="text-slate-500 text-sm mt-0.5">Evaluate assigned papers and submit comments to editors.</p>
        </div>

        {assignments.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-400">
            You do not have any active review assignments.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {assignments.map((assignment) => (
              <div 
                key={assignment.id} 
                className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {assignment.articles?.journals?.name}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-lg">
                      {assignment.articles?.title}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <span 
                      className={`text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider
                        ${assignment.status === "submitted" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}
                      `}
                    >
                      {assignment.status}
                    </span>
                  </div>
                </div>

                {/* Abstract Preview */}
                {assignment.articles?.abstract && (
                  <div className="text-slate-500 text-sm leading-relaxed whitespace-pre-line bg-slate-50 p-5 rounded-xl border border-slate-100">
                    <strong className="text-slate-700 text-xs uppercase tracking-wider font-extrabold block mb-1">Abstract</strong>
                    {assignment.articles.abstract}
                  </div>
                )}

                {/* Action panel */}
                <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    {assignment.articles?.pdf_url && (
                      <a 
                        href={assignment.articles.pdf_url} 
                        download
                        className="px-4 py-2 border rounded-lg text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-slate-50 transition-colors"
                      >
                        📥 Download Manuscript PDF
                      </a>
                    )}
                  </div>

                  <div>
                    {assignment.status === "pending" ? (
                      <button
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setShowReviewForm(true);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow transition-colors"
                      >
                        Submit Recommendation
                      </button>
                    ) : (
                      <div className="text-xs text-slate-400 font-semibold bg-slate-50 px-3 py-1.5 border rounded-lg">
                        Recommendation Submitted: <strong>{assignment.recommendation.replace("_", " ").toUpperCase()}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Review Submission Modal */}
      {showReviewForm && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-xl w-full border border-slate-200 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">Submit Evaluation</h3>
              <p className="text-xs text-slate-400 mt-1">
                Your recommendation will be delivered to the Editor-in-Chief. Double-blind policy remains active.
              </p>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Recommendation
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none bg-white font-semibold text-slate-700"
                  value={recommendation}
                  onChange={(e: any) => setRecommendation(e.target.value)}
                >
                  <option value="accept">Accept Submission</option>
                  <option value="minor_revision">Request Minor Revisions</option>
                  <option value="major_revision">Request Major Revisions</option>
                  <option value="reject">Reject Submission</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Comments & Review Reports
                </label>
                <textarea
                  required
                  rows={8}
                  placeholder="Provide structured feedback regarding methodology, clarity, novelty, and areas of improvement..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none leading-relaxed"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
