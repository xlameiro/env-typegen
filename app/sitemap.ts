import { SITE_URL } from "@/lib/constants";
import docsMeta from "@/content/docs/meta.json";
import type { MetadataRoute } from "next";

type DocsMetaEntry = string | { pages?: readonly DocsMetaEntry[] };

function collectDocSlugs(entries: readonly DocsMetaEntry[]): string[] {
  const slugs: string[] = [];

  for (const entry of entries) {
    if (typeof entry === "string") {
      slugs.push(entry);
      continue;
    }

    if (Array.isArray(entry.pages)) {
      slugs.push(...collectDocSlugs(entry.pages));
    }
  }

  return slugs;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const docSlugs = Array.from(new Set(collectDocSlugs(docsMeta.pages)));
  const docsUrls: MetadataRoute.Sitemap = docSlugs.map(
    (slug): MetadataRoute.Sitemap[number] => ({
      url: slug === "index" ? `${SITE_URL}/docs` : `${SITE_URL}/docs/${slug}`,
      lastModified: new Date(),
      changeFrequency: slug === "index" ? "weekly" : "monthly",
      priority: slug === "index" ? 0.9 : 0.7,
    }),
  );

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/llms.txt`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/llms-full.txt`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...docsUrls,
  ];
}
