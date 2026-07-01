import { Journal } from "./tenant";

export interface ArticleSEOData {
  title: string;
  abstract: string | null;
  slug: string;
  doi: string | null;
  firstPage: number | null;
  lastPage: number | null;
  publishedAt: string | null;
  pdfUrl: string | null;
  authors: Array<{
    fullName: string;
    affiliation?: string | null;
    orcid?: string | null;
  }>;
  volumeNumber?: number | null;
  volumeYear?: number | null;
  issueNumber?: number | null;
}

/**
 * Generates Google Scholar compliant citation tags for Next.js Metadata configuration.
 * Maps to metadata.other object.
 */
export function generateCitationMetaTags(article: ArticleSEOData, journal: Journal, hostUrl: string) {
  const meta: Record<string, string | string[]> = {
    "citation_title": article.title,
    "citation_publisher": journal.publisher_name || "Oracle Ink Press",
    "citation_journal_title": journal.name,
  };

  // Add authors - Google Scholar parses multiple "citation_author" tags
  if (article.authors && article.authors.length > 0) {
    meta["citation_author"] = article.authors.map(a => a.fullName);
    
    // Add affiliations if available (for the first author or matched order)
    const affiliations = article.authors
      .map(a => a.affiliation)
      .filter((aff): aff is string => !!aff);
    if (affiliations.length > 0) {
      meta["citation_author_institution"] = affiliations;
    }
  }

  // Publication date in YYYY/MM/DD format
  if (article.publishedAt) {
    const pubDate = new Date(article.publishedAt);
    const yyyy = pubDate.getFullYear();
    const mm = String(pubDate.getMonth() + 1).padStart(2, "0");
    const dd = String(pubDate.getDate()).padStart(2, "0");
    meta["citation_publication_date"] = `${yyyy}/${mm}/${dd}`;
  }

  if (article.volumeNumber) {
    meta["citation_volume"] = String(article.volumeNumber);
  }

  if (article.issueNumber) {
    meta["citation_issue"] = String(article.issueNumber);
  }

  if (article.firstPage !== null && article.firstPage !== undefined) {
    meta["citation_firstpage"] = String(article.firstPage);
  }

  if (article.lastPage !== null && article.lastPage !== undefined) {
    meta["citation_lastpage"] = String(article.lastPage);
  }

  // DOI link
  if (article.doi && article.doi !== "[PENDING]") {
    meta["citation_doi"] = article.doi;
  }

  // PDF URL (Must be direct and public)
  if (article.pdfUrl) {
    // If pdfUrl is relative, make it absolute
    const absolutePdf = article.pdfUrl.startsWith("http")
      ? article.pdfUrl
      : `${hostUrl}${article.pdfUrl}`;
    meta["citation_pdf_url"] = absolutePdf;
  }

  // Full-text abstract URL
  meta["citation_abstract_html_url"] = `${hostUrl}/article/${article.slug}`;

  // ISSNs
  const issns: string[] = [];
  if (journal.issn_online) issns.push(journal.issn_online);
  if (journal.issn_print) issns.push(journal.issn_print);
  if (issns.length > 0) {
    meta["citation_issn"] = issns;
  }

  return meta;
}

/**
 * Generates ScholarlyArticle JSON-LD structured data.
 */
export function generateScholarlyArticleJsonLd(article: ArticleSEOData, journal: Journal, hostUrl: string) {
  const issns: string[] = [];
  if (journal.issn_online) issns.push(journal.issn_online);
  if (journal.issn_print) issns.push(journal.issn_print);

  const authorSchema = article.authors.map(a => ({
    "@type": "Person",
    "name": a.fullName,
    ...(a.affiliation ? { "affiliation": { "@type": "Organization", "name": a.affiliation } } : {}),
    ...(a.orcid ? { "identifier": a.orcid } : {})
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    "headline": article.title,
    "name": article.title,
    "description": article.abstract,
    "datePublished": article.publishedAt,
    "author": authorSchema,
    "publisher": {
      "@type": "Organization",
      "name": journal.publisher_name || "Oracle Ink Press",
      "logo": journal.logo_url ? {
        "@type": "ImageObject",
        "url": journal.logo_url.startsWith("http") ? journal.logo_url : `${hostUrl}${journal.logo_url}`
      } : undefined
    },
    "mainEntityOfPage": `${hostUrl}/article/${article.slug}`,
    ...(article.doi && article.doi !== "[PENDING]" ? { "identifier": `https://doi.org/${article.doi}` } : {}),
    "isPartOf": {
      "@type": "PublicationIssue",
      "issueNumber": article.issueNumber ? String(article.issueNumber) : undefined,
      "isPartOf": {
        "@type": "PublicationVolume",
        "volumeNumber": article.volumeNumber ? String(article.volumeNumber) : undefined,
        "isPartOf": {
          "@type": "Periodical",
          "name": journal.name,
          "issn": issns.length > 0 ? issns : undefined
        }
      }
    }
  };

  return jsonLd;
}
