import { notFound } from "next/navigation";
import { getJournalBySlug } from "@/lib/tenant";
import { createServerClient } from "@/lib/supabase/server";

interface EditorialBoardPageProps {
  params: Promise<{ journalSlug: string }>;
}

export default async function EditorialBoardPage({ params }: EditorialBoardPageProps) {
  const { journalSlug } = await params;
  const journal = await getJournalBySlug(journalSlug);

  if (!journal) {
    notFound();
  }

  const supabase = await createServerClient();
  let boardMembers: any[] = [];

  try {
    const { data } = await supabase
      .from("editorial_board")
      .select("*")
      .eq("journal_id", journal.id)
      .order("order_index", { ascending: true });
    
    boardMembers = data || [];
  } catch (err) {
    console.error("Error fetching editorial board:", err);
  }

  // Fallback demo board members if DB query is empty/failed
  if (boardMembers.length === 0 && journalSlug === "jase") {
    boardMembers = [
      {
        id: "1",
        name: "Dr. Ali Reza",
        role: "Editor-in-Chief",
        affiliation: "University of Tehran, Department of Agronomy",
        order_index: 1
      },
      {
        id: "2",
        name: "Dr. Maria Santos",
        role: "Associate Editor",
        affiliation: "University of Lisbon, Soil Science Lab",
        order_index: 2
      },
      {
        id: "3",
        name: "Dr. John Doe",
        role: "Associate Editor",
        affiliation: "California State University, Entomology Department",
        order_index: 3
      },
      {
        id: "4",
        name: "Dr. Sarah Jenkins",
        role: "Editorial Board Member",
        affiliation: "CSIRO Agriculture and Food, Australia",
        order_index: 4
      },
      {
        id: "5",
        name: "Dr. Kenji Tanaka",
        role: "Editorial Board Member",
        affiliation: "Kyoto University, Graduate School of Agriculture",
        order_index: 5
      }
    ];
  }

  // Group members by role
  const groupedMembers = boardMembers.reduce((acc: any, member: any) => {
    const role = member.role || "Board Member";
    if (!acc[role]) acc[role] = [];
    acc[role].push(member);
    return acc;
  }, {});

  // Order of sections to display
  const roleOrder = ["Editor-in-Chief", "Associate Editor", "Editorial Board Member", "Advisory Board", "Reviewer"];
  
  // Sort roles based on roleOrder index (fallback to alphabetical if not in list)
  const sortedRoles = Object.keys(groupedMembers).sort((a, b) => {
    const indexA = roleOrder.indexOf(a);
    const indexB = roleOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200/80 shadow-sm max-w-4xl mx-auto space-y-10">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Editorial Board
        </h2>
        <p className="text-slate-500 text-sm">
          Distinguished international experts steering the scientific quality of our journal.
        </p>
        <div className="h-1 w-20 rounded mt-4" style={{ backgroundColor: "var(--primary-color)" }} />
      </div>

      {boardMembers.length === 0 ? (
        <div className="text-center p-10 text-slate-400">
          No editorial board members have been configured yet.
        </div>
      ) : (
        <div className="space-y-10">
          {sortedRoles.map((role) => (
            <section key={role} className="space-y-4">
              <h3 
                className="text-lg font-bold border-b border-slate-100 pb-2 uppercase tracking-wider text-xs"
                style={{ color: "var(--primary-color)" }}
              >
                {role}s
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groupedMembers[role].map((member: any) => (
                  <div key={member.id} className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-1 hover:border-slate-200 transition-colors">
                    <p className="font-extrabold text-slate-950 text-base">{member.name}</p>
                    {member.affiliation && (
                      <p className="text-slate-500 text-xs sm:text-sm font-medium leading-normal">
                        {member.affiliation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
