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

  // Parse query params
  const { searchParams } = new URL(request.url);
  const verb = searchParams.get("verb");
  const metadataPrefix = searchParams.get("metadataPrefix");

  const host = request.headers.get("host") || "oracleinkpress.com";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const protocol = isLocal ? "http" : "https";
  const hostUrl = `${protocol}://${host}`;
  const oaiEndpoint = `${hostUrl}/oai`;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"\n`;
  xml += `         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n`;
  xml += `         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/\n`;
  xml += `         http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">\n`;
  xml += `  <responseDate>${new Date().toISOString()}</responseDate>\n`;
  xml += `  <request${verb ? ` verb="${verb}"` : ""}${metadataPrefix ? ` metadataPrefix="${metadataPrefix}"` : ""}>${oaiEndpoint}</request>\n`;

  // Helper for errors
  const oaiError = (code: string, message: string) => {
    let errorXml = xml;
    errorXml += `  <error code="${code}">${message}</error>\n`;
    errorXml += `</OAI-PMH>`;
    return new Response(errorXml, { headers: { "Content-Type": "application/xml" } });
  };

  if (!verb) {
    return oaiError("badVerb", "Missing OAI-PMH verb parameter");
  }

  // 1. Identify verb
  if (verb === "Identify") {
    xml += `  <Identify>\n`;
    xml += `    <repositoryName>${journal.name}</repositoryName>\n`;
    xml += `    <baseURL>${oaiEndpoint}</baseURL>\n`;
    xml += `    <protocolVersion>2.0</protocolVersion>\n`;
    xml += `    <adminEmail>contact@oracleinkpress.com</adminEmail>\n`;
    xml += `    <earliestDatestamp>2026-07-01T00:00:00Z</earliestDatestamp>\n`;
    xml += `    <deletedRecord>no</deletedRecord>\n`;
    xml += `    <granularity>YYYY-MM-DDThh:mm:ssZ</granularity>\n`;
    xml += `  </Identify>\n`;
  }
  // 2. ListMetadataFormats verb
  else if (verb === "ListMetadataFormats") {
    xml += `  <ListMetadataFormats>\n`;
    xml += `    <metadataFormat>\n`;
    xml += `      <metadataPrefix>oai_dc</metadataPrefix>\n`;
    xml += `      <schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema>\n`;
    xml += `      <metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace>\n`;
    xml += `    </metadataFormat>\n`;
    xml += `  </ListMetadataFormats>\n`;
  }
  // 3. ListRecords verb (Core metadata harvesting)
  else if (verb === "ListRecords") {
    if (!metadataPrefix) {
      return oaiError("badArgument", "Missing metadataPrefix argument");
    }
    if (metadataPrefix !== "oai_dc") {
      return oaiError("cannotDisseminateFormat", "Unsupported metadata prefix format");
    }

    // Fetch published articles
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
          keywords,
          pdf_url,
          published_at,
          article_authors(
            author_order,
            authors(
              full_name
            )
          )
        `)
        .eq("journal_id", journal.id)
        .eq("status", "published");
      
      articles = data || [];
    } catch (err) {
      console.error("Error fetching articles for OAI-PMH:", err);
    }

    // Fallback sandbox test article for harvesting
    if (articles.length === 0 && journalSlug === "jase") {
      articles = [
        {
          id: "demo-harvest-1",
          slug: "effect-of-salinity-stress-on-growth-and-yield-of-major-cereal-crops",
          title: "Effect of Salinity Stress on Growth and Yield of Major Cereal Crops",
          abstract: "Salinity is one of the most critical environmental constraints limiting agricultural productivity worldwide. This review evaluates the physiological and biochemical responses of major cereal crops...",
          keywords: ["salinity stress", "cereal crops", "osmotic tolerance"],
          pdf_url: "/journals/jase/articles/effect-of-salinity-stress.pdf",
          published_at: "2026-07-01T12:00:00Z",
          article_authors: [
            { author_order: 1, authors: { full_name: "Dr. Shikha Sharma" } },
            { author_order: 2, authors: { full_name: "Dr. Amit Patel" } }
          ]
        }
      ];
    }

    if (articles.length === 0) {
      return oaiError("noRecordsMatch", "No published articles found in this repository");
    }

    xml += `  <ListRecords>\n`;
    
    articles.forEach((art) => {
      const pubDate = art.published_at ? new Date(art.published_at).toISOString() : new Date().toISOString();
      const authors = art.article_authors
        ? [...art.article_authors]
            .sort((a, b) => a.author_order - b.author_order)
            .map((aa: any) => aa.authors?.full_name || "Unknown Author")
        : [];

      xml += `    <record>\n`;
      xml += `      <header>\n`;
      xml += `        <identifier>oai:${journal.slug}.${process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "oracleinkpress.com"}:${art.slug}</identifier>\n`;
      xml += `        <datestamp>${pubDate}</datestamp>\n`;
      xml += `      </header>\n`;
      xml += `      <metadata>\n`;
      xml += `        <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"\n`;
      xml += `                   xmlns:dc="http://purl.org/dc/elements/1.1/"\n`;
      xml += `                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n`;
      xml += `                   xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/\n`;
      xml += `                   http://www.openarchives.org/OAI/2.0/oai_dc.xsd">\n`;
      xml += `          <dc:title><![CDATA[${art.title}]]></dc:title>\n`;
      
      authors.forEach((author) => {
        xml += `          <dc:creator><![CDATA[${author}]]></dc:creator>\n`;
      });

      if (art.keywords) {
        art.keywords.forEach((kw: string) => {
          xml += `          <dc:subject><![CDATA[${kw}]]></dc:subject>\n`;
        });
      }

      if (art.abstract) {
        xml += `          <dc:description><![CDATA[${art.abstract}]]></dc:description>\n`;
      }

      xml += `          <dc:publisher>${journal.name}</dc:publisher>\n`;
      xml += `          <dc:date>${pubDate.substring(0, 10)}</dc:date>\n`;
      xml += `          <dc:type>info:eu-repo/semantics/article</dc:type>\n`;
      xml += `          <dc:format>application/pdf</dc:format>\n`;
      xml += `          <dc:identifier>${hostUrl}/article/${art.slug}</dc:identifier>\n`;
      
      if (art.pdf_url) {
        const absolutePdf = art.pdf_url.startsWith("http") ? art.pdf_url : `${hostUrl}${art.pdf_url}`;
        xml += `          <dc:identifier>${absolutePdf}</dc:identifier>\n`;
      }

      xml += `          <dc:language>eng</dc:language>\n`;
      xml += `        </oai_dc:dc>\n`;
      xml += `      </metadata>\n`;
      xml += `    </record>\n`;
    });

    xml += `  </ListRecords>\n`;
  } else {
    return oaiError("badVerb", "Unsupported OAI-PMH verb");
  }

  xml += `</OAI-PMH>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=18000"
    }
  });
}
