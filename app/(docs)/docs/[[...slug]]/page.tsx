import { source } from "@/lib/source";
import { APP_NAME, SITE_URL } from "@/lib/constants";
import type { InferPageType } from "fumadocs-core/source";
import type { Metadata } from "next";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

type Page = InferPageType<typeof source>;

export default async function Page({ params }: Readonly<PageProps>) {
  const { slug } = await params;
  const page = source.getPage(slug) as Page | undefined;

  if (!page) {
    notFound();
  }

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams(): Promise<{ slug: string[] }[]> {
  return source.generateParams();
}

export async function generateMetadata({ params }: Readonly<PageProps>) {
  const { slug } = await params;
  const page = source.getPage(slug) as Page | undefined;

  if (!page) {
    notFound();
  }

  const slugPath = slug?.join("/") ?? "";

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      title: `${page.data.title} | ${APP_NAME}`,
      description: page.data.description,
      type: "article",
      url: `${SITE_URL}/docs/${slugPath}`,
    },
    twitter: {
      card: "summary",
      title: `${page.data.title} | ${APP_NAME}`,
      description: page.data.description,
    },
    alternates: {
      canonical: `${SITE_URL}/docs/${slugPath}`,
    },
  } satisfies Metadata;
}
