#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import Parser from 'rss-parser';

const parser = new Parser({ timeout: 10000 });

// Pre-configured feeds relevant to the Next.js 16 starter stack
const KNOWN_FEEDS = {
    nextjs: 'https://nextjs.org/feed.xml',
    typescript: 'https://devblogs.microsoft.com/typescript/feed/',
    tailwindcss: 'https://tailwindcss.com/blog/feed.xml',
    react: 'https://react.dev/blog/rss.xml',
};

const server = new Server(
    { name: 'rss-feed', version: '1.0.0' },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'get_feed',
            description:
                'Parse an RSS or Atom feed and return all available items. Supports named aliases for the Next.js stack: "nextjs", "typescript", "tailwindcss", "react".',
            inputSchema: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description:
                            'Feed URL or known alias: "nextjs", "typescript", "tailwindcss", "react".',
                    },
                },
                required: ['url'],
            },
        },
        {
            name: 'list_latest_posts',
            description:
                'Return the N most recent posts from an RSS/Atom feed with title, date, link, and summary.',
            inputSchema: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description:
                            'Feed URL or known alias: "nextjs", "typescript", "tailwindcss", "react".',
                    },
                    limit: {
                        type: 'number',
                        description: 'Number of posts to return. Default: 5.',
                    },
                },
                required: ['url'],
            },
        },
    ],
}));

function resolveUrl(input) {
    return KNOWN_FEEDS[input] ?? input;
}

function formatItem(item, index) {
    const pubDate =
        item.pubDate != null
            ? new Date(item.pubDate).toISOString().split('T')[0]
            : (item.isoDate?.split('T')[0] ?? '');
    const summary = (item.contentSnippet ?? item.summary ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200);
    return [
        `${index + 1}. ${item.title ?? 'Untitled'}`,
        `   Date: ${pubDate}`,
        `   Link: ${item.link ?? 'N/A'}`,
        summary ? `   Summary: ${summary}${summary.length >= 200 ? '…' : ''}` : null,
    ]
        .filter(Boolean)
        .join('\n');
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        const feedUrl = resolveUrl(args.url);

        if (name === 'get_feed') {
            const feed = await parser.parseURL(feedUrl);
            const header = `Feed: ${feed.title ?? feedUrl}\nTotal items: ${feed.items.length}\n`;
            const items = feed.items.map(formatItem).join('\n\n');
            return { content: [{ type: 'text', text: `${header}\n${items}` }] };
        }

        if (name === 'list_latest_posts') {
            const limit = args.limit ?? 5;
            const feed = await parser.parseURL(feedUrl);
            const latest = feed.items.slice(0, limit);
            const header = `Latest ${latest.length} posts from ${feed.title ?? feedUrl}:\n`;
            const items = latest.map(formatItem).join('\n\n');
            return { content: [{ type: 'text', text: `${header}\n${items}` }] };
        }

        return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
        };
    } catch (error) {
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});

const transport = new StdioServerTransport();
await server.connect(transport);
