import { notFound } from "next/navigation";
import { getJournalBySlug } from "@/lib/tenant";

interface AboutPageProps {
  params: Promise<{ journalSlug: string }>;
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { journalSlug } = await params;
  const journal = await getJournalBySlug(journalSlug);

  if (!journal) {
    notFound();
  }

  return (
    <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200/80 shadow-sm max-w-4xl mx-auto space-y-10">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          About the Journal
        </h2>
        <div className="h-1 w-20 rounded" style={{ backgroundColor: "var(--primary-color)" }} />
      </div>

      {/* Aims & Scope */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold text-slate-900">Aims & Scope</h3>
        <p className="text-slate-600 leading-relaxed text-sm sm:text-base whitespace-pre-line">
          {journal.aims_scope || "Aims & Scope details have not been configured for this journal yet."}
        </p>
      </section>

      {/* Journal Information */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold text-slate-900">Key Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-2">
            <h4 className="font-bold text-slate-800">Frequency & Access</h4>
            <ul className="text-slate-600 space-y-1">
              <li><strong>Publication Frequency:</strong> Quarterly (4 issues per year)</li>
              <li><strong>Open Access:</strong> Yes (Diamond Open Access)</li>
              <li><strong>APC / Article Charges:</strong> None (Free to publish and read)</li>
            </ul>
          </div>
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-2">
            <h4 className="font-bold text-slate-800">Peer Review & Screening</h4>
            <ul className="text-slate-600 space-y-1">
              <li><strong>Review Process:</strong> Double-blind Peer Review</li>
              <li><strong>Plagiarism Check:</strong> iThenticate Screening</li>
              <li><strong>Language:</strong> English</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Open Access Statement */}
      <section className="space-y-3">
        <h3 className="text-xl font-bold text-slate-900">Open Access Statement</h3>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          This is a gold open access journal, which means that all content is freely available without charge to the user or his/her institution. Users are allowed to read, download, copy, distribute, print, search, or link to the full texts of the articles, or use them for any other lawful purpose, without asking prior permission from the publisher or the author. This is in accordance with the BOAI definition of open access.
        </p>
      </section>

      {/* Archiving Policy */}
      <section className="space-y-3">
        <h3 className="text-xl font-bold text-slate-900">Archiving Policy</h3>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          To ensure perpetual access and digital preservation of scientific literature, all articles published in our journals are archived in public repository systems and platforms. This includes compatibility with OAI-PMH harvest standard metadata endpoints for indexers.
        </p>
      </section>
    </div>
  );
}
