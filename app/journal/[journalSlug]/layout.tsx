import { notFound } from "next/navigation";
import Link from "next/link";
import { getJournalBySlug } from "@/lib/tenant";
import React from "react";

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ journalSlug: string }>;
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { journalSlug } = await params;
  const journal = await getJournalBySlug(journalSlug);

  if (!journal) {
    notFound();
  }

  const primaryColor = journal.theme_color || "#1a3c6e";

  // Navigation Links
  const navLinks = [
    { name: "Home", href: `/` },
    { name: "About", href: `/about` },
    { name: "Editorial Board", href: `/editorial-board` },
    { name: "Archive", href: `/archive` },
    { name: "Submit Manuscript", href: `/submit` },
  ];

  return (
    <div 
      className="min-h-screen flex flex-col bg-slate-50 font-sans"
      style={{ "--primary-color": primaryColor } as React.CSSProperties}
    >
      {/* Journal Metadata Strip */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center space-x-4">
            {journal.issn_print && <span>ISSN (Print): {journal.issn_print}</span>}
            {journal.issn_online && <span>ISSN (Online): {journal.issn_online}</span>}
          </div>
          <div>
            <span>Publisher: {journal.publisher_name || "Oracle Ink Press"}</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo and Journal Name */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-md transition-transform group-hover:scale-105"
                style={{ backgroundColor: "var(--primary-color)" }}
              >
                {journal.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight leading-tight group-hover:text-[var(--primary-color)] transition-colors">
                  {journal.name}
                </span>
                {journal.subject_area && (
                  <span className="text-xs text-slate-500 font-medium mt-0.5">
                    {journal.subject_area}
                  </span>
                )}
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-[var(--primary-color)] hover:bg-slate-50 transition-all duration-150"
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Journal Banner */}
      <div 
        className="w-full py-8 text-white relative overflow-hidden shadow-inner"
        style={{ backgroundColor: "var(--primary-color)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_-20%,rgba(255,255,255,0.15),rgba(0,0,0,0))]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <p className="text-xs font-bold tracking-wider uppercase opacity-85 mb-1">
            {journal.subject_area || "Academic Journal"}
          </p>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-none">
            {journal.name}
          </h1>
        </div>
      </div>

      {/* Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </main>

      {/* Journal Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-12 px-4 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
          <div>
            <p className="font-bold text-white text-base mb-1">{journal.name}</p>
            <p className="opacity-80">Indexed | Open Access | Double-blind Peer Reviewed</p>
            <div className="mt-2 flex gap-4">
              <Link href="/policies" className="text-xs text-slate-400 hover:text-white transition-colors underline font-semibold">
                Journal Policies & Legal Terms
              </Link>
            </div>
          </div>
          <div className="flex flex-col md:items-end gap-1">
            <p>&copy; {new Date().getFullYear()} {journal.publisher_name || "Oracle Ink Press"}. All rights reserved.</p>
            <p className="text-xs opacity-60">Published in partnership with Oracle Ink Press platform.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
