"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { submitManuscript } from "./actions";

interface AuthorField {
  name: string;
  email: string;
  affiliation: string;
  orcid: string;
}

export default function SubmitPage({ params }: { params: Promise<{ journalSlug: string }> }) {
  const [journalSlug, setJournalSlug] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [keywords, setKeywords] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [authors, setAuthors] = useState<AuthorField[]>([
    { name: "", email: "", affiliation: "", orcid: "" }
  ]);
  const [correspondingIndex, setCorrespondingIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Resolve params
  useEffect(() => {
    params.then((p) => {
      setJournalSlug(p.journalSlug);
    });
  }, [params]);

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError("");

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        alert("Account created! You are now logged in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleMockLogin = async () => {
    setLoading(true);
    setAuthError("");
    const mockEmail = "test-author@oracleinkpress.com";
    const mockPassword = "password123";

    try {
      // Try signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: mockEmail,
        password: mockPassword,
      });

      if (signInError) {
        // Try signing up if account does not exist
        const { error: signUpError } = await supabase.auth.signUp({
          email: mockEmail,
          password: mockPassword,
        });
        if (signUpError) throw signUpError;
        
        // Auto sign-in
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

  const handleAddAuthor = () => {
    setAuthors([...authors, { name: "", email: "", affiliation: "", orcid: "" }]);
  };

  const handleRemoveAuthor = (index: number) => {
    if (authors.length === 1) return;
    const newAuthors = authors.filter((_, idx) => idx !== index);
    setAuthors(newAuthors);
    if (correspondingIndex >= newAuthors.length) {
      setCorrespondingIndex(0);
    }
  };

  const handleAuthorChange = (index: number, field: keyof AuthorField, value: string) => {
    const newAuthors = [...authors];
    newAuthors[index][field] = value;
    setAuthors(newAuthors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) {
      setSubmitError("Please upload a PDF manuscript.");
      return;
    }
    
    setSubmitting(true);
    setSubmitError("");

    const formData = new FormData();
    formData.append("journalSlug", journalSlug);
    formData.append("title", title);
    formData.append("abstract", abstract);
    formData.append("keywords", keywords);
    formData.append("pdf", pdfFile);
    formData.append("correspondingAuthorIndex", String(correspondingIndex));

    authors.forEach((author) => {
      formData.append("authorName[]", author.name);
      formData.append("authorEmail[]", author.email);
      formData.append("authorAffiliation[]", author.affiliation);
      formData.append("authorOrcid[]", author.orcid);
    });

    try {
      const response = await submitManuscript(null, formData);
      if (response && !response.success) {
        setSubmitError(response.error || "Submission failed.");
      }
    } catch (err: any) {
      setSubmitError(err.message || "An unexpected error occurred during submission.");
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

  // 1. Not Authenticated View
  if (!user) {
    return (
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-md p-8 my-10 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-900">Author Submission Portal</h2>
          <p className="text-slate-500 text-sm mt-1">Please sign in to submit your manuscript.</p>
        </div>

        {authError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-semibold">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm shadow transition-colors"
          >
            {isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs font-bold text-indigo-600 hover:underline"
          >
            {isSignUp ? "Already have an account? Sign In" : "New to the platform? Create Account"}
          </button>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <button
            onClick={handleMockLogin}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow transition-colors"
          >
            🚀 Sign in with Test Account (Dev Sandbox)
          </button>
        </div>
      </div>
    );
  }

  // 2. Authenticated Submission Form View
  return (
    <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200/80 shadow-sm max-w-4xl mx-auto space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Submit a Manuscript
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Logged in as: <strong className="text-slate-800">{user.email}</strong>
          </p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-xs font-bold text-slate-400 hover:text-rose-600 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </div>

      {submitError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl font-semibold">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Title */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Manuscript Title
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
            placeholder="Enter the full title of your research paper..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Abstract */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Abstract
          </label>
          <textarea
            required
            rows={6}
            className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] leading-relaxed"
            placeholder="Provide a comprehensive summary containing aims, methodology, results, and conclusions..."
            value={abstract}
            onChange={(e) => setAbstract(e.target.value)}
          />
        </div>

        {/* Keywords */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Keywords (comma separated)
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
            placeholder="e.g. salinity stress, crop sciences, soil biochemistry"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Manuscript PDF (Under 20MB)
          </label>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 hover:border-[var(--primary-color)] transition-colors relative flex flex-col items-center justify-center bg-slate-50">
            <input
              type="file"
              required
              accept=".pdf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
            />
            <span className="text-3xl mb-1">📁</span>
            {pdfFile ? (
              <p className="text-sm font-bold text-slate-800 text-center">
                Selected: {pdfFile.name} ({(pdfFile.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-slate-500 text-center">
                Drag and drop your PDF manuscript here, or click to select file.
              </p>
            )}
          </div>
        </div>

        {/* Authors Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-base font-extrabold text-slate-900">Author Affiliations</h3>
            <button
              type="button"
              onClick={handleAddAuthor}
              className="px-3 py-1.5 border border-[var(--primary-color)] text-[var(--primary-color)] rounded-lg text-xs font-bold hover:bg-[var(--primary-color)] hover:text-white transition-colors"
            >
              + Add Author
            </button>
          </div>

          <div className="space-y-6">
            {authors.map((author, index) => (
              <div 
                key={index} 
                className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4 relative"
              >
                {authors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAuthor(index)}
                    className="absolute top-4 right-4 text-xs font-bold text-slate-400 hover:text-rose-600"
                  >
                    Remove
                  </button>
                )}

                <h4 className="font-bold text-sm text-slate-800">Author #{index + 1}</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                      placeholder="e.g. Dr. Jane Doe"
                      value={author.name}
                      onChange={(e) => handleAuthorChange(index, "name", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                      placeholder="e.g. jane.doe@univ.edu"
                      value={author.email}
                      onChange={(e) => handleAuthorChange(index, "email", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Affiliation / Institution
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                      placeholder="e.g. University of California, Berkeley"
                      value={author.affiliation}
                      onChange={(e) => handleAuthorChange(index, "affiliation", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      ORCID iD (Optional)
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                      placeholder="e.g. 0000-0002-1825-0097"
                      value={author.orcid}
                      onChange={(e) => handleAuthorChange(index, "orcid", e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="radio"
                    id={`corresponding-${index}`}
                    name="corresponding-author"
                    checked={correspondingIndex === index}
                    onChange={() => setCorrespondingIndex(index)}
                    className="focus:ring-[var(--primary-color)] h-4 w-4 text-[var(--primary-color)] border-slate-300"
                  />
                  <label htmlFor={`corresponding-${index}`} className="text-xs font-bold text-slate-600 cursor-pointer">
                    Set as Corresponding Author
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="pt-4 border-t border-slate-100 flex justify-end gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-[var(--primary-color)] text-white font-bold text-sm rounded-lg shadow hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Uploading & Submitting..." : "Submit Manuscript"}
          </button>
        </div>
      </form>
    </div>
  );
}
