import { toISOString } from "@/lib/dates";
import { ROUTES, SITE_URL } from "@/lib/constants";
import docsMeta from "@/content/docs/meta.json";
import type { MetadataRoute } from "next";
import { Temporal } from "temporal-polyfill";

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
  const generatedAt = toISOString(Temporal.Now.instant());
  const docSlugs = Array.from(new Set(collectDocSlugs(docsMeta.pages)));
  const docsUrls: MetadataRoute.Sitemap = docSlugs.map(
    (slug): MetadataRoute.Sitemap[number] => ({
      url: new URL(
        slug === "index" ? "/docs" : `/docs/${slug}`,
        SITE_URL,
      ).toString(),
      lastModified: generatedAt,
      changeFrequency: slug === "index" ? "weekly" : "monthly",
      priority: slug === "index" ? 0.9 : 0.7,
    }),
  );

  return [
    {
      url: new URL(ROUTES.home, SITE_URL).toString(),
      changeFrequency: "weekly",
      lastModified: generatedAt,
      priority: 1,
    },
    {
      url: new URL(ROUTES.about, SITE_URL).toString(),
      lastModified: generatedAt,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: new URL(ROUTES.contact, SITE_URL).toString(),
      lastModified: generatedAt,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: new URL(ROUTES.privacy, SITE_URL).toString(),
      lastModified: generatedAt,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: new URL("/llms.txt", SITE_URL).toString(),
      lastModified: generatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: new URL("/llms-full.txt", SITE_URL).toString(),
      lastModified: generatedAt,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...docsUrls,
  ];
}
