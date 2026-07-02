"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { createJournal, assignUserRole, signInAction, signOutAction } from "./actions";
import Link from "next/link";

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  // Platform admin data
  const [journals, setJournals] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);

  // Page layout states
  const [activeTab, setActiveTab] = useState("journals");
  const [showAddJournal, setShowAddJournal] = useState(false);
  const [addingJournal, setAddingJournal] = useState(false);
  const [addError, setAddError] = useState("");

  // Create Journal form states
  const [journalName, setJournalName] = useState("");
  const [journalSlug, setJournalSlug] = useState("");
  const [issnOnline, setIssnOnline] = useState("");
  const [issnPrint, setIssnPrint] = useState("");
  const [subjectArea, setSubjectArea] = useState("");
  const [aimsScope, setAimsScope] = useState("");
  const [themeColor, setThemeColor] = useState("#1a3c6e");

  // Role form states
  const [roleEmail, setRoleEmail] = useState("");
  const [roleJournalId, setRoleJournalId] = useState("");
  const [roleValue, setRoleValue] = useState("editor");
  const [assigningRole, setAssigningRole] = useState(false);
  const [assignError, setAssignError] = useState("");

  // Auth listener
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

  // Fetch admin dashboard details
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchAdminData() {
      setLoading(true);
      try {
        // Fetch all journals
        const { data: journalsData } = await supabase
          .from("journals")
          .select("*")
          .order("name");
        
        setJournals(journalsData || []);
        if (journalsData && journalsData.length > 0) {
          setRoleJournalId(journalsData[0].id);
        }

        // Fetch user roles
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select(`
            role,
            user_id,
            journals(name)
          `);
        
        // Match user ID with user email from auth listing
        // Note: Client-side cannot list all users. For visual sandbox simulation, we populate mock emails
        // matching our test identities.
        if (rolesData) {
          const mappedRoles = rolesData.map((r: any) => {
            let email = "User UUID: " + r.user_id.substring(0, 8);
            if (r.role === "platform_admin") email = "test-admin@oracleinkpress.com";
            else if (r.role === "editor") email = "test-editor@oracleinkpress.com";
            else if (r.role === "reviewer") email = "test-reviewer@oracleinkpress.com";
            
            return {
              ...r,
              userEmail: email,
              journalName: r.journals?.name || "Platform-wide"
            };
          });
          setUserRoles(mappedRoles);
        }

      } catch (err) {
        console.error("Error fetching admin details:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAdminData();
  }, [user]);

  // Auth Sign In
  // Auth Sign In
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError("");

    try {
      const { error: clientError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (clientError) throw clientError;

      const res = await signInAction(authEmail, authPassword);
      if (!res.success) {
        throw new Error(res.error || "Server session sync failed");
      }
      
      window.location.reload();
    } catch (err: any) {
      setAuthError(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  // Mock Admin Sign In
  const handleMockLogin = async () => {
    setLoading(true);
    setAuthError("");
    const mockEmail = "test-admin@oracleinkpress.com";
    const mockPassword = "password123";

    try {
      const res = await signInAction(mockEmail, mockPassword);
      if (!res.success) {
        throw new Error(res.error || "Mock server login failed");
      }
      
      await supabase.auth.signInWithPassword({
        email: mockEmail,
        password: mockPassword,
      });

      window.location.reload();
    } catch (err: any) {
      setAuthError(err.message || "Mock login failed");
    } finally {
      setLoading(false);
    }
  };

  // Create Journal
  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingJournal(true);
    setAddError("");

    const formData = new FormData();
    formData.append("name", journalName);
    formData.append("slug", journalSlug);
    formData.append("issn_online", issnOnline);
    formData.append("issn_print", issnPrint);
    formData.append("subject_area", subjectArea);
    formData.append("aims_scope", aimsScope);
    formData.append("theme_color", themeColor);

    try {
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data.session?.access_token || null;
      
      const res = await createJournal(token, formData);
      if (res && res.success) {
        setJournals([...journals, res.journal].sort((a, b) => a.name.localeCompare(b.name)));
        setShowAddJournal(false);
        // Reset form
        setJournalName("");
        setJournalSlug("");
        setIssnOnline("");
        setIssnPrint("");
        setSubjectArea("");
        setAimsScope("");
        setThemeColor("#1a3c6e");
        alert("Journal launched successfully!");
      } else {
        setAddError(res.error || "Failed to create journal.");
      }
    } catch (err: any) {
      setAddError(err.message || "An error occurred.");
    } finally {
      setAddingJournal(false);
    }
  };

  // Assign Role
  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleEmail || !roleJournalId) return;

    setAssigningRole(true);
    setAssignError("");

    try {
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data.session?.access_token || null;

      const res = await assignUserRole(token, roleEmail, roleJournalId, roleValue);
      if (res && res.success) {
        const journal = journals.find(j => j.id === roleJournalId);
        
        setUserRoles([...userRoles, {
          role: roleValue,
          userEmail: roleEmail,
          journalName: journal?.name || "Assigned Journal"
        }]);

        setRoleEmail("");
        alert("User role successfully mapped!");
      } else {
        setAssignError(res.error || "Failed to assign role.");
      }
    } catch (err: any) {
      setAssignError(err.message || "An error occurred.");
    } finally {
      setAssigningRole(false);
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
          <h2 className="text-2xl font-black text-slate-900">Platform Admin Portal</h2>
          <p className="text-slate-500 text-sm mt-1">Please sign in to launch and configure journals.</p>
        </div>

        {authError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-semibold">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Admin Email
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
            👑 Sign in with Platform Admin Account
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
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xl">
              P
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900">Platform Admin</span>
              <p className="text-slate-400 text-xs font-semibold">Publisher Control Panel</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs font-semibold">
            <span className="text-slate-600 hidden sm:inline-block">Admin: {user.email}</span>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                await signOutAction();
                window.location.reload();
              }}
              className="text-slate-400 hover:text-rose-600 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Publisher Control</h2>
            <p className="text-slate-500 text-sm mt-0.5">Spin up subdomains instantly and manage role hierarchies.</p>
          </div>
          
          {activeTab === "journals" && (
            <button
              onClick={() => setShowAddJournal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow transition-all duration-200 hover:-translate-y-0.5"
            >
              + Create New Journal
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 gap-1 text-sm font-semibold">
          <button
            onClick={() => setActiveTab("journals")}
            className={`px-4 py-2 border-b-2 font-bold text-xs uppercase tracking-wider transition-all
              ${activeTab === "journals" 
                ? "border-indigo-600 text-indigo-700" 
                : "border-transparent text-slate-400 hover:text-slate-600"
              }
            `}
          >
            Journals ({journals.length})
          </button>
          <button
            onClick={() => setActiveTab("roles")}
            className={`px-4 py-2 border-b-2 font-bold text-xs uppercase tracking-wider transition-all
              ${activeTab === "roles" 
                ? "border-indigo-600 text-indigo-700" 
                : "border-transparent text-slate-400 hover:text-slate-600"
              }
            `}
          >
            Role Management ({userRoles.length})
          </button>
        </div>

        {/* Tab 1: Journals list */}
        {activeTab === "journals" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {journals.map((journal) => (
              <div 
                key={journal.id} 
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider"
                      style={{ 
                        borderColor: journal.theme_color || "#cbd5e1",
                        color: journal.theme_color || "#475569",
                        backgroundColor: (journal.theme_color + "10") || "#f8fafc"
                      }}
                    >
                      {journal.subject_area || "General Science"}
                    </span>
                    
                    <span className="text-slate-400 text-xs font-semibold">
                      ID: {journal.slug}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-lg leading-tight">
                    {journal.name}
                  </h3>

                  <div className="text-xs text-slate-500 space-y-0.5">
                    <p><strong>Online ISSN:</strong> {journal.issn_online || "Pending"}</p>
                    <p><strong>Print ISSN:</strong> {journal.issn_print || "Pending"}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center">
                    🟢 Active
                  </span>
                  
                  <Link 
                    href={`/journal/${journal.slug}`}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    View Domain →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Roles administration */}
        {activeTab === "roles" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
            {/* Assignment form */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Assign Role</h3>
                <p className="text-xs text-slate-400 mt-0.5">Grant dashboard permissions to users by email.</p>
              </div>

              {assignError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-semibold">
                  {assignError}
                </div>
              )}

              <form onSubmit={handleAssignRole} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    User Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. user@oracleinkpress.com"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                    value={roleEmail}
                    onChange={(e) => setRoleEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Select Journal
                  </label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none bg-white font-semibold text-slate-700"
                    value={roleJournalId}
                    onChange={(e) => setRoleJournalId(e.target.value)}
                  >
                    {journals.map((journal) => (
                      <option key={journal.id} value={journal.id}>
                        {journal.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Role Level
                  </label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none bg-white font-semibold text-slate-700"
                    value={roleValue}
                    onChange={(e) => setRoleValue(e.target.value)}
                  >
                    <option value="editor">Journal Editor</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="platform_admin">Platform Admin</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={assigningRole}
                  className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {assigningRole ? "Saving..." : "Save Role Assignment"}
                </button>
              </form>
            </div>

            {/* Current Roles Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <table className="w-full border-collapse text-left text-sm text-slate-500">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">User Email</th>
                    <th className="px-6 py-4">Journal Association</th>
                    <th className="px-6 py-4">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {userRoles.map((ur, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{ur.userEmail}</td>
                      <td className="px-6 py-4">{ur.journalName}</td>
                      <td className="px-6 py-4">
                        <span 
                          className={`text-[10px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-wider
                            ${ur.role === "platform_admin" ? "bg-rose-50 border-rose-200 text-rose-700" : ""}
                            ${ur.role === "editor" ? "bg-indigo-50 border-indigo-200 text-indigo-700" : ""}
                            ${ur.role === "reviewer" ? "bg-amber-50 border-amber-200 text-amber-700" : ""}
                          `}
                        >
                          {ur.role.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Create Journal Modal */}
      {showAddJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-xl w-full border border-slate-200 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">Launch New Journal</h3>
              <p className="text-xs text-slate-400 mt-1">Spin up an isolated subdomain instances automatically.</p>
            </div>

            {addError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-semibold">
                {addError}
              </div>
            )}

            <form onSubmit={handleCreateJournal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Journal Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Journal of Agricultural Sciences"
                    className="w-full px-3 py-2 border rounded-lg text-xs focus:outline-none"
                    value={journalName}
                    onChange={(e) => setJournalName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Subdomain Slug
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. jase"
                    className="w-full px-3 py-2 border rounded-lg text-xs focus:outline-none"
                    value={journalSlug}
                    onChange={(e) => setJournalSlug(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Online ISSN (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2676-5675"
                    className="w-full px-3 py-2 border rounded-lg text-xs focus:outline-none"
                    value={issnOnline}
                    onChange={(e) => setIssnOnline(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Print ISSN (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2676-5667"
                    className="w-full px-3 py-2 border rounded-lg text-xs focus:outline-none"
                    value={issnPrint}
                    onChange={(e) => setIssnPrint(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Subject Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Agricultural Sciences"
                    className="w-full px-3 py-2 border rounded-lg text-xs focus:outline-none"
                    value={subjectArea}
                    onChange={(e) => setSubjectArea(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Theme Color
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                    />
                    <span className="text-xs font-mono font-bold">{themeColor}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Aims & Scope Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide aims & scope details..."
                  className="w-full px-3 py-2 border rounded-lg text-xs focus:outline-none leading-relaxed"
                  value={aimsScope}
                  onChange={(e) => setAimsScope(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddJournal(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingJournal}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  {addingJournal ? "Creating..." : "Launch Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
