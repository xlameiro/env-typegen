#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { fetchTranscript } from 'youtube-transcript-plus';

// Bypass EU GDPR consent page and generic YouTube blocking
const USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// CONSENT cookie prevents the EU consent redirect; SOCS is the newer consent token
const YT_COOKIES =
    'CONSENT=YES+cb.20240101-07-p0.en+FX+119; SOCS=CAESNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpXzIwMjMwOTI4LjA2X3AxGgJlbiABGgJlbg';

function buildFetchOptions(lang) {
    return {
        userAgent: USER_AGENT,
        // Override the initial video page fetch to inject cookies + US locale params
        videoFetch: async ({ url, userAgent }) => {
            const urlObj = new URL(url);
            urlObj.searchParams.set('gl', 'US');
            urlObj.searchParams.set('hl', 'en');
            return fetch(urlObj.toString(), {
                headers: {
                    'User-Agent': userAgent,
                    'Accept-Language': `${lang},${lang.split('-')[0]};q=0.9,en;q=0.8`,
                    Cookie: YT_COOKIES,
                },
            });
        },
        // Also inject headers on the Innertube API call
        playerFetch: async ({ url, method, body, headers, userAgent }) => {
            return fetch(url, {
                method,
                headers: {
                    ...headers,
                    'User-Agent': userAgent,
                    Cookie: YT_COOKIES,
                },
                body,
            });
        },
    };
}

const server = new Server(
    { name: 'youtube-transcript', version: '1.0.0' },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'get_transcript',
            description:
                'Extract the full transcript from a YouTube video. Supports English and Spanish (and any language with available captions).',
            inputSchema: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'YouTube video URL (any format) or the 11-character video ID',
                    },
                    lang: {
                        type: 'string',
                        description:
                            'Language code for the transcript. Examples: "en" (English), "es" (Spanish), "fr" (French). Defaults to "en".',
                        default: 'en',
                    },
                },
                required: ['url'],
            },
        },
    ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name !== 'get_transcript') {
        return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
        };
    }

    const { url, lang = 'en' } = args;

    try {
        const segments = await fetchTranscript(url, buildFetchOptions(lang));
        const text = segments.map((s) => s.text).join(' ');
        return {
            content: [
                {
                    type: 'text',
                    text: `Transcript [${lang}]:\n\n${text}`,
                },
            ],
        };
    } catch (error) {
        // If the requested language isn't available, surface the available ones
        const availableLangs = error.availableLangs
            ? ` Available languages: ${error.availableLangs.join(', ')}`
            : '';
        return {
            content: [
                {
                    type: 'text',
                    text: `Failed to fetch transcript: ${error.message}.${availableLangs}`,
                },
            ],
            isError: true,
        };
    }
});

const transport = new StdioServerTransport();
await server.connect(transport);
