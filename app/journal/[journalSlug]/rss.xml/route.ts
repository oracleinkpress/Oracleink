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

  const supabase = await createServerClient();
  let articles: any[] = [];

  try {
    const { data } = await supabase
      .from("articles")
      .select(`
        id,
        slug,
        title,
        abstract,
        published_at,
        article_authors(
          author_order,
          authors(
            full_name
          )
        )
      `)
      .eq("journal_id", journal.id)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(10);

    if (data) {
      articles = data.map((art: any) => {
        const authorsList = art.article_authors
          ? [...art.article_authors]
              .sort((a, b) => a.author_order - b.author_order)
              .map((aa: any) => aa.authors?.full_name || "Unknown Author")
          : [];
        return { ...art, authors: authorsList };
      });
    }
  } catch (err) {
    console.error(`Error fetching articles for RSS feed of ${journalSlug}:`, err);
  }

  // Fallback dev demo article for RSS
  if (articles.length === 0 && journalSlug === "jase") {
    articles = [
      {
        slug: "effect-of-salinity-stress-on-growth-and-yield-of-major-cereal-crops",
        title: "Effect of Salinity Stress on Growth and Yield of Major Cereal Crops",
        abstract: "Salinity is one of the most critical environmental constraints limiting agricultural productivity worldwide. This review evaluates the physiological and biochemical responses of major cereal crops...",
        published_at: "2026-07-01T12:00:00Z",
        authors: ["Dr. Shikha Sharma", "Dr. Amit Patel"]
      }
    ];
  }

  let xml = `<?xml version="1.0" encoding="UTF-8" ?>\n`;
  xml += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n`;
  xml += `  <channel>\n`;
  xml += `    <title>${journal.name}</title>\n`;
  xml += `    <link>${hostUrl}</link>\n`;
  xml += `    <description>${journal.aims_scope || "Academic Journal"}</description>\n`;
  xml += `    <language>en-us</language>\n`;
  xml += `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`;
  xml += `    <atom:link href="${hostUrl}/rss.xml" rel="self" type="application/rss+xml" />\n`;

  articles.forEach((art) => {
    const pubDate = art.published_at ? new Date(art.published_at).toUTCString() : new Date().toUTCString();
    const authorsStr = art.authors && art.authors.length > 0 ? art.authors.join(", ") : "";

    xml += `    <item>\n`;
    xml += `      <title><![CDATA[${art.title}]]></title>\n`;
    xml += `      <link>${hostUrl}/article/${art.slug}</link>\n`;
    xml += `      <guid>${hostUrl}/article/${art.slug}</guid>\n`;
    xml += `      <pubDate>${pubDate}</pubDate>\n`;
    if (authorsStr) {
      xml += `      <author><![CDATA[${authorsStr}]]></author>\n`;
    }
    if (art.abstract) {
      xml += `      <description><![CDATA[${art.abstract}]]></description>\n`;
    }
    xml += `    </item>\n`;
  });

  xml += `  </channel>\n`;
  xml += `</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=18000"
    }
  });
}
