import { getJournalBySlug } from "@/lib/tenant";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ journalSlug: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { journalSlug } = await params;
  const journal = await getJournalBySlug(journalSlug);

  if (!journal) {
    return new Response("Journal not found", { status: 404 });
  }

  const host = request.headers.get("host") || "oracleinkpress.com";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const protocol = isLocal ? "http" : "https";
  const hostUrl = `${protocol}://${host}`;

  const supabase = createServerClient();
  let articles: any[] = [];

  try {
    const { data } = await supabase
      .from("articles")
      .select("slug, published_at")
      .eq("journal_id", journal.id)
      .eq("status", "published")
      .order("published_at", { ascending: false });

    articles = data || [];
  } catch (err) {
    console.error(`Error fetching articles for sitemap of ${journalSlug}:`, err);
  }

  // Fallback dev demo article for sitemap
  if (articles.length === 0 && journalSlug === "jase") {
    articles = [
      {
        slug: "effect-of-salinity-stress-on-growth-and-yield-of-major-cereal-crops",
        published_at: "2026-07-01T12:00:00Z"
      }
    ];
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // 1. Journal Homepage
  xml += `  <url>\n`;
  xml += `    <loc>${hostUrl}/</loc>\n`;
  xml += `    <changefreq>daily</changefreq>\n`;
  xml += `    <priority>1.0</priority>\n`;
  xml += `  </url>\n`;

  // 2. Journal About
  xml += `  <url>\n`;
  xml += `    <loc>${hostUrl}/about</loc>\n`;
  xml += `    <changefreq>monthly</changefreq>\n`;
  xml += `    <priority>0.8</priority>\n`;
  xml += `  </url>\n`;

  // 3. Journal Editorial Board
  xml += `  <url>\n`;
  xml += `    <loc>${hostUrl}/editorial-board</loc>\n`;
  xml += `    <changefreq>monthly</changefreq>\n`;
  xml += `    <priority>0.8</priority>\n`;
  xml += `  </url>\n`;

  // 4. Journal Archive
  xml += `  <url>\n`;
  xml += `    <loc>${hostUrl}/archive</loc>\n`;
  xml += `    <changefreq>weekly</changefreq>\n`;
  xml += `    <priority>0.8</priority>\n`;
  xml += `  </url>\n`;

  // 5. Articles List
  articles.forEach((art) => {
    xml += `  <url>\n`;
    xml += `    <loc>${hostUrl}/article/${art.slug}</loc>\n`;
    if (art.published_at) {
      xml += `    <lastmod>${new Date(art.published_at).toISOString()}</lastmod>\n`;
    }
    xml += `    <changefreq>monthly</changefreq>\n`;
    xml += `    <priority>0.9</priority>\n`;
    xml += `  </url>\n`;
  });

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=18000"
    }
  });
}
