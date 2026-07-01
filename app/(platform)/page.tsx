import { headers } from "next/headers";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

export const revalidate = 60; // Revalidate page every minute

export default async function PlatformHome() {
  const headersList = await headers();
  const host = headersList.get("host") || "oracleinkpress.com";
  
  // Determine protocol & base domain
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const protocol = isLocal ? "http" : "https";
  
  let baseDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "oracleinkpress.com";
  if (isLocal) {
    // Keep port if local
    const port = host.split(":")[1] || "3000";
    baseDomain = `localhost:${port}`;
  }

  // Fetch journals
  const supabase = createServerClient();
  let journals: any[] = [];
  let fetchError = null;

  try {
    const { data, error } = await supabase
      .from("journals")
      .select("*")
      .order("name");

    if (error) throw error;
    journals = data || [];
  } catch (err: any) {
    console.error("Error fetching journals for home directory:", err);
    fetchError = err.message || String(err);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      {/* Dynamic Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-900 flex items-center justify-center shadow-md">
              <span className="text-white font-black text-xl">O</span>
            </div>
            <div>
              <span className="font-extrabold text-xl bg-gradient-to-r from-indigo-950 to-indigo-700 bg-clip-text text-transparent">
                Oracle Ink Press
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                Publisher
              </span>
            </div>
          </div>
          
          <nav className="flex items-center space-x-6 text-sm font-semibold text-slate-600">
            <a href="#journals" className="hover:text-indigo-900 transition-colors">Journals</a>
            <a href="#about" className="hover:text-indigo-900 transition-colors">Ethics & Policies</a>
            <a href="#authors" className="hover:text-indigo-900 transition-colors">Author Guidelines</a>
            <Link 
              href="/admin/journals" 
              className="px-4 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-950 text-xs font-bold shadow transition-all duration-150 hover:-translate-y-0.5"
            >
              Admin Panel
            </Link>
          </nav>
        </div>
      </header>

      {/* Modern Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white py-24 sm:py-32 px-4 border-b border-indigo-950">
        {/* Background micro grid */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/35 via-transparent to-transparent opacity-65 -z-10" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:30px_30px] -z-10" />

        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="inline-block px-3 py-1 bg-indigo-500/10 text-indigo-300 rounded-full text-xs font-extrabold tracking-wider uppercase border border-indigo-500/20">
            Diamond Open Access Publishing
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            Advancing Global Knowledge through Rigorous Peer Review
          </h1>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Oracle Ink Press publishes high-impact, peer-reviewed, diamond open-access journals. We enforce COPE ethical guidelines and support double-blind evaluations.
          </p>

          <div className="pt-6 flex flex-wrap justify-center gap-4">
            <a 
              href="#journals" 
              className="px-6 py-3 bg-white text-indigo-950 hover:bg-slate-100 rounded-lg text-sm font-bold shadow-lg transition-transform duration-150 hover:-translate-y-0.5"
            >
              Explore Our Journals
            </a>
            <a 
              href="#about" 
              className="px-6 py-3 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white rounded-lg text-sm font-bold transition-colors"
            >
              Ethics & Guidelines
            </a>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-y border-slate-200 py-8 px-4 shadow-sm relative z-10 -mt-8 max-w-6xl mx-auto rounded-xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <div className="space-y-1">
          <p className="text-3xl font-black text-indigo-950">4+</p>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active Journals</p>
        </div>
        <div className="space-y-1 border-l border-slate-100">
          <p className="text-3xl font-black text-indigo-950">100%</p>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Diamond Open Access</p>
        </div>
        <div className="space-y-1 border-l border-slate-100">
          <p className="text-3xl font-black text-indigo-950">COPE</p>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Ethical Compliance</p>
        </div>
        <div className="space-y-1 border-l border-slate-100">
          <p className="text-3xl font-black text-indigo-950">iThenticate</p>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Similarity Screened</p>
        </div>
      </section>

      {/* Active Journals Grid */}
      <main id="journals" className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Active Portals</h2>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">
            Browse our subject-specific academic divisions. All papers are fully archived, indexed, and peer-reviewed.
          </p>
        </div>

        {fetchError && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 mb-8 flex items-center space-x-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold">Note on Database Schema</p>
              <p className="text-sm opacity-90">
                The database connection is currently offline. We are showing local sandbox journals for preview.
              </p>
            </div>
          </div>
        )}

        {journals.length === 0 ? (
          /* Fallback Sample Journals for Preview & Local Testing */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* JASE Sample */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group">
              <div className="h-3 bg-gradient-to-r from-indigo-900 to-indigo-700" />
              <div className="p-6 flex-1 flex flex-col">
                <span className="text-[10px] font-bold text-indigo-700 tracking-wider uppercase mb-2 bg-indigo-50 px-2 py-0.5 rounded-full w-max">
                  Agricultural Sciences
                </span>
                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-900 transition-colors">
                  Journal of Agricultural Sciences and Engineering (JASE)
                </h3>
                <p className="text-slate-500 text-sm line-clamp-4 mb-6 flex-1 leading-relaxed">
                  JASE publishes original research and reviews in all areas of agriculture, crop science, soil fertility, plant breeding, biological control, entomology, and modern agricultural engineering.
                </p>
                <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs text-slate-400">
                  <span>Online ISSN: 2676-5675</span>
                  <a 
                    href={`${protocol}://jase.${baseDomain}`}
                    className="font-bold text-indigo-750 hover:text-indigo-900 flex items-center group-hover:translate-x-1 transition-transform"
                  >
                    Visit Journal <span className="ml-1">→</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Other Sample Journal */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group">
              <div className="h-3 bg-gradient-to-r from-emerald-800 to-emerald-600" />
              <div className="p-6 flex-1 flex flex-col">
                <span className="text-[10px] font-bold text-emerald-700 tracking-wider uppercase mb-2 bg-emerald-50 px-2 py-0.5 rounded-full w-max">
                  Computer Science
                </span>
                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-emerald-800 transition-colors">
                  Journal of Advanced Computing and AI (JACAI)
                </h3>
                <p className="text-slate-500 text-sm line-clamp-4 mb-6 flex-1 leading-relaxed">
                  JACAI features papers on machine learning advancements, distributed systems architectures, software engineering methodologies, and security in next-generation computing environments.
                </p>
                <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs text-slate-400">
                  <span>Online ISSN: Pending</span>
                  <a 
                    href={`${protocol}://jacai.${baseDomain}`}
                    className="font-bold text-emerald-750 hover:text-emerald-900 flex items-center group-hover:translate-x-1 transition-transform"
                  >
                    Visit Journal <span className="ml-1">→</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Third Sample Journal */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group">
              <div className="h-3 bg-gradient-to-r from-rose-800 to-rose-600" />
              <div className="p-6 flex-1 flex flex-col">
                <span className="text-[10px] font-bold text-rose-700 tracking-wider uppercase mb-2 bg-rose-50 px-2 py-0.5 rounded-full w-max">
                  Social Sciences
                </span>
                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-rose-800 transition-colors">
                  Journal of Law and Social Policy (JLSP)
                </h3>
                <p className="text-slate-500 text-sm line-clamp-4 mb-6 flex-1 leading-relaxed">
                  JLSP is a forum for interdisciplinary research examining legal frameworks, socio-economic developments, policy impacts, and justice initiatives around the world.
                </p>
                <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs text-slate-400">
                  <span>Online ISSN: Pending</span>
                  <a 
                    href={`${protocol}://jlsp.${baseDomain}`}
                    className="font-bold text-rose-750 hover:text-rose-900 flex items-center group-hover:translate-x-1 transition-transform"
                  >
                    Visit Journal <span className="ml-1">→</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Actual database journals */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {journals.map((journal) => (
              <div key={journal.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group">
                <div 
                  className="h-3" 
                  style={{ backgroundColor: journal.theme_color || "#1a3c6e" }}
                />
                <div className="p-6 flex-1 flex flex-col">
                  <span 
                    className="text-[10px] font-bold tracking-wider uppercase mb-2 px-2.5 py-0.5 rounded-full w-max"
                    style={{ 
                      color: journal.theme_color || "#1a3c6e",
                      backgroundColor: (journal.theme_color + "12") || "#1a3c6e12"
                    }}
                  >
                    {journal.subject_area || "General Science"}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-900 transition-colors">
                    {journal.name}
                  </h3>
                  <p className="text-slate-500 text-sm line-clamp-4 mb-6 flex-1 leading-relaxed">
                    {journal.aims_scope || "Explore research articles published in this journal."}
                  </p>
                  <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs text-slate-400">
                    <span>Online ISSN: {journal.issn_online || "Pending"}</span>
                    <a 
                      href={`${protocol}://${journal.slug}.${baseDomain}`}
                      className="font-bold hover:opacity-80 flex items-center group-hover:translate-x-1 transition-transform"
                      style={{ color: journal.theme_color || "#1a3c6e" }}
                    >
                      Visit Journal <span className="ml-1">→</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Ethics & Policies Section */}
      <section id="about" className="bg-slate-900 text-white py-20 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block">Publishing Excellence</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Editorial Standards & Core Ethics</h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Oracle Ink Press is committed to transparency, open science, and peer review integrity. We align with the guidelines set by the **Committee on Publication Ethics (COPE)**.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-slate-300">
              <div className="space-y-1">
                <h4 className="font-bold text-white">Double-Blind Peer Review</h4>
                <p className="text-slate-400 text-xs leading-relaxed">Concealing author and reviewer identities ensures maximum objectivity and bias elimination.</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white">iThenticate Screening</h4>
                <p className="text-slate-400 text-xs leading-relaxed">All manuscripts undergo strict similarity checks. A limit of 20% is strictly enforced.</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white">Diamond Open Access</h4>
                <p className="text-slate-400 text-xs leading-relaxed">No submission fees (APC) or reading fees. Free to distribute globally under CC BY 4.0.</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white">Persistent DOIs</h4>
                <p className="text-slate-400 text-xs leading-relaxed">Permanent Crossref-allocated Digital Object Identifiers are generated for every paper.</p>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800 p-8 sm:p-10 rounded-2xl border border-slate-700/50 space-y-6">
            <h3 className="font-extrabold text-xl">Harvester & Metadata Harvesting</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              All of our hosted journals operate an OAI-PMH compliant metadata repository. Harvest systems can read metadata formats dynamically in standard Dublin Core format at each journal’s `/oai` endpoint.
            </p>
            <div className="p-4 bg-indigo-950/50 border border-indigo-900 rounded-xl space-y-2 font-mono text-xs text-indigo-300">
              <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Example OAI-PMH Commands</p>
              <p>Identify: <code className="text-white">/oai?verb=Identify</code></p>
              <p>List Metadata: <code className="text-white">/oai?verb=ListMetadataFormats</code></p>
              <p>List Records: <code className="text-white">/oai?verb=ListRecords&amp;metadataPrefix=oai_dc</code></p>
            </div>
          </div>
        </div>
      </section>

      {/* Guidelines & Services Section */}
      <section id="authors" className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">For Authors &amp; Researchers</h2>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">
            Everything you need to compile and submit your paper for peer review.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <span className="text-3xl block">📋</span>
            <h3 className="font-extrabold text-slate-950 text-lg">Author Guidelines</h3>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              Ensure that your article includes a structured abstract, clear keywords, ORCID links, and a references list aligned with APA format.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <span className="text-3xl block">📄</span>
            <h3 className="font-extrabold text-slate-950 text-lg">Templates (Word/LaTeX)</h3>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              Download our manuscript layouts to structure tables, mathematical equations, and author affiliations automatically before uploading.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <span className="text-3xl block">🔬</span>
            <h3 className="font-extrabold text-slate-950 text-lg">Copyright CC BY 4.0</h3>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              Authors retain complete copyrights. The public is permitted to read, reuse, and cite the papers with clear original attribution.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-16 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start justify-between gap-10">
          <div className="space-y-4 max-w-sm">
            <div className="flex items-center space-x-3">
              <span className="font-extrabold text-white text-lg">Oracle Ink Press</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Oracle Ink Press is a premium open-access publisher. We support universities, research institutions, and individual scientists with high-impact publication pipelines.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-white text-sm font-bold uppercase tracking-wider">Contact &amp; Support</h4>
            <p className="text-xs text-slate-400">
              Correspondence Address: UAE / Worldwide Correspondence Office
            </p>
            <p className="text-xs text-slate-400">
              Support Email: <a href="mailto:contact@oracleinkpress.com" className="text-indigo-400 hover:underline">contact@oracleinkpress.com</a>
            </p>
          </div>
          
          <div className="space-y-4 text-xs text-slate-400">
            <p>&copy; {new Date().getFullYear()} Oracle Ink Press, Inc. All rights reserved.</p>
            <p className="opacity-60">Diamond Open Access multi-journal publishing platform.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
