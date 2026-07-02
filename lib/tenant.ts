import { cache } from "react";
import { createServerClient } from "./supabase/server";

export interface Journal {
  id: string;
  slug: string;
  name: string;
  issn_online: string | null;
  issn_print: string | null;
  subject_area: string | null;
  aims_scope: string | null;
  publisher_name: string;
  logo_url: string | null;
  theme_color: string | null;
  custom_domain: string | null;
  status: string;
  created_at: string;
}

/**
 * Fetch journal details server-side from the slug.
 * Memoized per request using React cache.
 */
export const getJournalBySlug = cache(async (slug: string): Promise<Journal | null> => {
  if (!slug) return null;
  
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("journals")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    console.warn(`Journal not found or error fetching for slug "${slug}":`, error?.message || error);
    
    // Dev Sandbox Fallback for local testing when Supabase is offline
    if (slug === "jase") {
      return {
        id: "a3b1a135-777c-474c-a1d2-06b23d9b4b9b",
        slug: "jase",
        name: "Journal of Agricultural Sciences and Engineering",
        issn_online: "2676-5675",
        issn_print: "2676-5667",
        subject_area: "Agricultural Sciences",
        aims_scope: "The Journal of Agricultural Sciences and Engineering (JASE) is a peer-reviewed, open-access journal dedicated to publishing high-quality papers in all fields of agricultural sciences and engineering. The journal aims to provide a platform for researchers and academicians to share their findings on crop science, soil fertility, plant breeding, biological control, entomology, and modern agricultural technologies.",
        publisher_name: "Oracle Ink Press",
        logo_url: null,
        theme_color: "#1a3c6e",
        custom_domain: null,
        status: "active",
        created_at: new Date().toISOString()
      };
    }
    
    return null;
  }

  return data as Journal;
});
