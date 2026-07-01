import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "oracleinkpress.com";
  
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard/",
        "/admin/",
        "/api/",
      ],
    },
    sitemap: `https://${platformDomain}/sitemap.xml`,
  };
}
