import { notFound } from "next/navigation";
import { getJournalBySlug } from "@/lib/tenant";

interface PoliciesPageProps {
  params: Promise<{ journalSlug: string }>;
}

export default async function PoliciesPage({ params }: PoliciesPageProps) {
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
          Journal Policies & Legal Terms
        </h2>
        <p className="text-slate-500 text-sm">
          Please review the editorial standards, plagiarism regulations, and terms of use for publishing in <strong>{journal.name}</strong>.
        </p>
        <div className="h-1 w-20 rounded mt-4" style={{ backgroundColor: "var(--primary-color)" }} />
      </div>

      {/* 1. Editorial Policy */}
      <section className="space-y-3">
        <h3 className="text-xl font-bold text-slate-900 border-l-4 border-[var(--primary-color)] pl-3">
          1. Editorial & Peer Review Policy
        </h3>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          <strong>{journal.name}</strong> operates a strict <strong>double-blind peer review process</strong>. This means both the reviewer and author identities are concealed throughout the evaluation loop. 
        </p>
        <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
          <li>Submitted manuscripts are initially screened by editors for scope fit and compliance.</li>
          <li>Qualified manuscripts are assigned to at least two independent expert reviewers.</li>
          <li>Decision options include: Accept, Minor Revision, Major Revision, or Reject.</li>
          <li>Authors must declare all potential conflicts of interest during submission.</li>
        </ul>
      </section>

      {/* 2. Plagiarism Policy */}
      <section className="space-y-3">
        <h3 className="text-xl font-bold text-slate-900 border-l-4 border-[var(--primary-color)] pl-3">
          2. Plagiarism Detection Policy
        </h3>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Plagiarism, data fabrication, or duplicate publication are severe ethical breaches. All incoming manuscripts are automatically screened using <strong>iThenticate screening tools</strong>.
        </p>
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm rounded-xl font-medium">
          <strong>Tolerances:</strong> Manuscripts displaying a similarity index exceeding <strong>20%</strong> (or containing high-matches from a single external source) are rejected immediately during initial screening.
        </div>
      </section>

      {/* 3. Open Access & Copyright License */}
      <section className="space-y-3">
        <h3 className="text-xl font-bold text-slate-900 border-l-4 border-[var(--primary-color)] pl-3">
          3. Open Access & Licensing Terms
        </h3>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          This is a Diamond Open Access publication. All published content is immediately free to read, download, print, or link to.
        </p>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Articles are distributed under the terms of the <strong>Creative Commons Attribution 4.0 International License (CC BY 4.0)</strong>. Authors retain the copyright of their work and grant the journal first publication rights. 
        </p>
      </section>

      {/* 4. Privacy Policy */}
      <section className="space-y-3">
        <h3 className="text-xl font-bold text-slate-900 border-l-4 border-[var(--primary-color)] pl-3">
          4. Privacy & Data Protection (GDPR)
        </h3>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Names, email addresses, and institutional affiliations submitted to this journal will be used exclusively for the stated purposes of peer review and publication. They will not be made available for any other purpose or to any other party. 
        </p>
      </section>

      {/* 5. Terms of Use */}
      <section className="space-y-3">
        <h3 className="text-xl font-bold text-slate-900 border-l-4 border-[var(--primary-color)] pl-3">
          5. Submission Terms of Use
        </h3>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          By submitting a manuscript, authors certify that the work is original, has not been published elsewhere, is not currently under review by another journal, and that all co-authors have approved the submission.
        </p>
      </section>
    </div>
  );
}
