import { APP_NAME, SITE_URL } from "@/lib/constants";
import { source } from "@/lib/source";
import type { InferPageType } from "fumadocs-core/source";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

type Page = InferPageType<typeof source>;

export default async function Page({ params }: Readonly<PageProps>) {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  const Mdx = page.data.body;

  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <Mdx />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams(): Promise<{ slug: string[] }[]> {
  return source.generateParams();
}

export async function generateMetadata({
  params,
}: Readonly<PageProps>): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  const slugPath = slug?.join("/") ?? "";
  const docsPath = slugPath.length > 0 ? `/docs/${slugPath}` : "/docs";
  const canonicalUrl = `${SITE_URL}${docsPath}`;

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      title: `${page.data.title} | ${APP_NAME}`,
      description: page.data.description,
      type: "article",
      url: canonicalUrl,
      images: [{ url: `${SITE_URL}/opengraph-image`, alt: APP_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${page.data.title} | ${APP_NAME}`,
      description: page.data.description,
      images: [`${SITE_URL}/opengraph-image`],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  } satisfies Metadata;
}
