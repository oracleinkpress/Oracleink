// config/platform.config.ts
// Platform-wide defaults. New journals inherit these unless overridden per-journal in the DB.

export const platformConfig = {
  platformName: "Oracle Ink Press",
  platformDomain: "oracleinkpress.com",       // e.g. mypubco.com — journals live at slug.mypubco.com
  publisherLegalName: "Oracle Ink Press, Inc.",

  defaultTheme: {
    primaryColor: "#1a3c6e",
    logoUrl: "/platform-logo.svg",
  },

  contact: {
    email: "contact@oracleinkpress.com",
  },

  submissionDefaults: {
    allowedFileTypes: [".pdf", ".docx"],
    maxFileSizeMB: 20,
    requireOrcid: false,
  },

  seoDefaults: {
    citationPublisher: "Oracle Ink Press",
    robotsAllowIndexing: true,
  },

  analytics: {
    gaId: "",
    searchConsolePropertyPrefix: "", // for per-journal sitemap submission tracking
  },

  monetization: {
    apcModel: false,        // true if charging Article Processing Charges
    defaultApcAmount: 0,
    currency: "USD",
  },
} as const;

export type PlatformConfig = typeof platformConfig;
