#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const ALGOLIA = 'https://hn.algolia.com/api/v1';
const HN_ITEM_URL = 'https://news.ycombinator.com/item?id=';

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    return response.json();
}

function formatStory(hit, index) {
    const date = hit.created_at ? hit.created_at.split('T')[0] : '';
    const lines = [
        `${index + 1}. ${hit.title ?? '(no title)'}`,
        `   Points: ${hit.points ?? 0} | Comments: ${hit.num_comments ?? 0} | Date: ${date}`,
        `   HN: ${HN_ITEM_URL}${hit.objectID}`,
        hit.url ? `   URL: ${hit.url}` : null,
    ];
    return lines.filter(Boolean).join('\n');
}

const server = new Server(
    { name: 'hacker-news', version: '1.0.0' },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'search_stories',
            description:
                'Search Hacker News stories by keyword. Great for finding breaking change discussions, library announcements, and community reactions.',
            inputSchema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Search query (e.g. "Next.js 17", "React Server Components")',
                    },
                    tags: {
                        type: 'string',
                        description:
                            'Filter type: "story" (default), "ask_hn", or "show_hn".',
                    },
                    limit: {
                        type: 'number',
                        description: 'Max results. Default: 10, max: 30.',
                    },
                },
                required: ['query'],
            },
        },
        {
            name: 'get_top_stories',
            description: 'Get the current front page (top) stories on Hacker News.',
            inputSchema: {
                type: 'object',
                properties: {
                    limit: {
                        type: 'number',
                        description: 'Number of stories. Default: 15, max: 30.',
                    },
                },
            },
        },
        {
            name: 'get_story',
            description:
                'Get full details of a specific Hacker News story, including top comments.',
            inputSchema: {
                type: 'object',
                properties: {
                    id: {
                        type: 'number',
                        description: 'Hacker News story ID (objectID from search results)',
                    },
                },
                required: ['id'],
            },
        },
    ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === 'search_stories') {
            const limit = Math.min(args.limit ?? 10, 30);
            const tags = args.tags ?? 'story';
            const url = `${ALGOLIA}/search?query=${encodeURIComponent(args.query)}&tags=${tags}&hitsPerPage=${limit}`;
            const data = await fetchJson(url);
            if (!data.hits?.length) {
                return {
                    content: [{ type: 'text', text: `No HN results for "${args.query}"` }],
                };
            }
            const results = data.hits.map(formatStory).join('\n\n');
            return {
                content: [
                    {
                        type: 'text',
                        text: `HN results for "${args.query}" (${data.hits.length} found):\n\n${results}`,
                    },
                ],
            };
        }

        if (name === 'get_top_stories') {
            const limit = Math.min(args.limit ?? 15, 30);
            const url = `${ALGOLIA}/search?tags=front_page&hitsPerPage=${limit}`;
            const data = await fetchJson(url);
            const results = data.hits.map(formatStory).join('\n\n');
            return {
                content: [{ type: 'text', text: `HN Front Page (${data.hits.length}):\n\n${results}` }],
            };
        }

        if (name === 'get_story') {
            const data = await fetchJson(`${ALGOLIA}/items/${args.id}`);
            const lines = [
                `Title: ${data.title}`,
                `Author: ${data.author} | Points: ${data.points} | Date: ${data.created_at?.split('T')[0] ?? ''}`,
                data.url ? `URL: ${data.url}` : null,
                `HN: ${HN_ITEM_URL}${data.id}`,
                `\nTop comments (${data.children?.length ?? 0} total, showing up to 5):`,
            ].filter(Boolean);

            for (const comment of (data.children ?? []).slice(0, 5)) {
                if (comment.text) {
                    // Strip HTML tags from comment text
                    const text = comment.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
                    lines.push(`\n— ${comment.author}: ${text}${comment.text.length > 300 ? '…' : ''}`);
                }
            }

            return { content: [{ type: 'text', text: lines.join('\n') }] };
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
