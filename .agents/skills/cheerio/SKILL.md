---
name: cheerio
description: >
  Cheerio web scraping and HTML parsing for Node.js. Use this skill when the task
  involves scraping web pages, parsing HTML/XML strings, extracting structured data
  from markup, traversing DOM-like trees, or transforming HTML content server-side.
  Trigger on any mention of: scraping, crawling, parsing HTML, extracting links/text/tables,
  RSS feeds, data extraction from URLs, or any task that requires reading external web pages
  programmatically. Also trigger when a user needs to build a Route Handler or Server Action
  that fetches and processes HTML from an external URL.
metadata:
  context7-id: /cheeriojs/cheerio
  version: "1.0.x"
  source: https://cheerio.js.org/
---

# Cheerio — HTML Parsing & Web Scraping

> **Context7 ID**: `/cheeriojs/cheerio` — call `query-docs` with this ID for up-to-date API details.

Cheerio is the standard library for parsing and manipulating HTML/XML in Node.js. It provides a jQuery-like API over a fast `htmlparser2`-powered DOM. Use it in **Server Components**, **Route Handlers**, and **Server Actions** — never in Client Components.

## When to propose Cheerio

| Use case                     | Pattern                            |
| ---------------------------- | ---------------------------------- |
| Scraping an external URL     | `cheerio.fromURL(url)`             |
| Parsing an HTML string       | `cheerio.load(htmlString)`         |
| Extracting structured data   | `$.extract({ ... })`               |
| Transforming/sanitising HTML | `$.html()` after mutation          |
| Parsing RSS/Atom feeds       | `cheerio.load(xml, { xml: true })` |

## Installation

```bash
pnpm add cheerio
```

TypeScript types are bundled — no `@types/cheerio` needed (v1+).

## Core Patterns

### 1. Load from a URL (server-only)

```typescript
import * as cheerio from "cheerio";

// Inside a Server Component, Route Handler, or Server Action
const $ = await cheerio.fromURL("https://example.com/page");
const title = $("h1").text().trim();
```

### 2. Load from an HTML string

```typescript
import * as cheerio from "cheerio";

const html = await fetch("https://example.com").then((r) => r.text());
const $ = cheerio.load(html);
```

### 3. Structured extraction with `$.extract()` (preferred)

`extract()` is the declarative, type-friendly API — prefer it over manual selector chaining for structured data:

```typescript
import * as cheerio from "cheerio";

const $ = await cheerio.fromURL("https://news.ycombinator.com");

const data = $.extract({
  // Single value (string)
  title: "title",
  // Array of items
  stories: [
    {
      selector: ".athing",
      value: {
        text: ".titleline > a",
        url: { selector: ".titleline > a", value: "href" },
        rank: ".rank",
      },
    },
  ],
});
// data.stories: Array<{ text: string; url: string; rank: string }>
```

### 4. Classic jQuery-style traversal

```typescript
const links: Array<{ text: string; href: string }> = [];

$("a").each((_index, element) => {
  links.push({
    text: $(element).text().trim(),
    href: $(element).attr("href") ?? "",
  });
});
```

### 5. XML / RSS parsing

```typescript
import * as cheerio from "cheerio";

const xml = await fetch("https://example.com/rss.xml").then((r) => r.text());
const $ = cheerio.load(xml, { xml: true });

const items = $.extract({
  feed: [
    {
      selector: "item",
      value: {
        title: "title",
        link: "link",
        published: "pubdate",
      },
    },
  ],
});
```

## Project Integration Patterns

### Route Handler — scraping endpoint

```typescript
// app/api/scrape/route.ts
import * as cheerio from "cheerio";
import { z } from "zod";
import { NextResponse } from "next/server";

const RequestSchema = z.object({
  url: z.string().url(),
});

export async function POST(request: Request) {
  const body = RequestSchema.parse(await request.json());

  const $ = await cheerio.fromURL(body.url);

  const data = $.extract({
    title: "title",
    headings: ["h1, h2"],
    links: [{ selector: "a", value: "href" }],
  });

  return NextResponse.json(data);
}
```

### Server Action — scraping with caching

```typescript
// lib/scraping/fetch-page.ts
"use server";

import * as cheerio from "cheerio";

// Cache responses for 1 hour via Next.js Cache Component directive
export async function scrapePageTitle(url: string): Promise<string> {
  const $ = await cheerio.fromURL(url);
  return $("title").text().trim();
}
```

### Server Component — inline scraping

```typescript
// app/dashboard/news/page.tsx
import * as cheerio from 'cheerio';

export default async function NewsPage() {
  const $ = await cheerio.fromURL('https://example.com/news');

  const articles = $.extract({
    items: [
      {
        selector: 'article',
        value: { headline: 'h2', summary: 'p:first-of-type' },
      },
    ],
  });

  return (
    <ul>
      {articles.items.map((item, index) => (
        <li key={index}>
          <strong>{item.headline}</strong>: {item.summary}
        </li>
      ))}
    </ul>
  );
}
```

## Security Rules

> Never skip these — scraping external content is a trust boundary.

- **Validate the URL** with Zod (`z.string().url()`) before passing to `fromURL` — prevents SSRF
- **Never render raw scraped HTML** directly in JSX with `dangerouslySetInnerHTML` — sanitise first with [DOMPurify](https://github.com/cure53/DOMPurify) (server-side: use `isomorphic-dompurify`)
- **Whitelist domains** — maintain an allowlist of scrapable domains; reject anything not on it
- **Respect robots.txt** — check `robots.txt` before crawling production sites
- **Rate-limit scraping endpoints** — apply rate limiting in `proxy.ts` or Route Handler middleware
- **Never expose internal URLs** to client-driven scraping without validation

```typescript
// Domain whitelist example
const ALLOWED_SCRAPE_DOMAINS = new Set(["example.com", "news.ycombinator.com"]);

function assertAllowedDomain(url: string) {
  const { hostname } = new URL(url);
  if (!ALLOWED_SCRAPE_DOMAINS.has(hostname)) {
    throw new Error(`Scraping domain '${hostname}' is not allowed`);
  }
}
```

## Performance

- **Cache results** — scraping is slow; wrap in `'use cache'` or `unstable_cache` with a `revalidate` window
- **Stream large documents** — use `cheerio.stringStream()` for multi-MB HTML responses
- **Select narrowly** — prefer `$('section.results a')` over `$('a')` to reduce traversal work
- **Avoid re-loading** — load once per request, extract all data in one pass

## AWS Integration

When scraping at scale, combine Cheerio with AWS services:

| Need                      | AWS service                                    |
| ------------------------- | ---------------------------------------------- |
| Run scraper on a schedule | AWS Lambda + EventBridge Scheduler             |
| Store scraped data        | DynamoDB (structured) or S3 (raw HTML archive) |
| Queue URLs to scrape      | Amazon SQS FIFO queue                          |
| Cache scraped results     | Amazon ElastiCache (Redis)                     |
| Monitor failures          | AWS CloudWatch + SNS alerts                    |

See the `aws-ecosystem` skill for patterns on wiring these together.

## Common Selectors Reference

| Goal                  | Selector                           |
| --------------------- | ---------------------------------- |
| Element by class      | `.class-name`                      |
| Element by ID         | `#element-id`                      |
| Direct attribute      | `[attr="value"]`                   |
| Attribute value       | `$(el).attr('href')`               |
| Text content          | `$(el).text()`                     |
| Inner HTML            | `$(el).html()`                     |
| First match only      | `$('ul li').first()`               |
| Nth child             | `$('li:nth-child(2)')`             |
| Attribute via extract | `{ selector: 'a', value: 'href' }` |

## Context7 Lookup

For current API details, run:

```
query-docs: { libraryId: "/cheeriojs/cheerio", query: "<your specific question>" }
```
