import { SITE_URL } from "@/lib/constants";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot"],
        allow: ["/", "/docs/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
