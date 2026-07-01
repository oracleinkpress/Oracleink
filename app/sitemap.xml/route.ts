import { getJournalBySlug } from "@/lib/tenant";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const host = request.headers.get("host") || "oracleinkpress.com";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const protocol = isLocal ? "http" : "https";
  
  let baseDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "oracleinkpress.com";
  if (isLocal) {
    const port = host.split(":")[1] || "3000";
    baseDomain = `localhost:${port}`;
  }

  // Fetch all active journals from database
  let journalsList: any[] = [];
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("journals")
      .select("slug, created_at")
      .eq("status", "active");
    
    journalsList = data || [];
  } catch (err) {
    console.error("Error fetching journals for sitemap index:", err);
  }

  // Fallback demo items for development sitemap preview
  if (journalsList.length === 0) {
    journalsList = [
      { slug: "jase", created_at: new Date().toISOString() }
    ];
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  journalsList.forEach((j) => {
    xml += `  <sitemap>\n`;
    xml += `    <loc>${protocol}://${j.slug}.${baseDomain}/sitemap.xml</loc>\n`;
    xml += `    <lastmod>${new Date(j.created_at || Date.now()).toISOString()}</lastmod>\n`;
    xml += `  </sitemap>\n`;
  });
  
  xml += `</sitemapindex>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=18000"
    }
  });
}
