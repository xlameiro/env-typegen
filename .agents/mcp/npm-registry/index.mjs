#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const REGISTRY = 'https://registry.npmjs.org';

async function fetchJson(url) {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
}

// Simple semver comparison — handles pre-release suffixes by ignoring them
function parseSemver(v) {
    return v.replace(/^[^0-9]*/, '').split('-')[0].split('.').map(Number);
}

function semverGt(a, b) {
    const pa = parseSemver(a);
    const pb = parseSemver(b);
    for (let i = 0; i < 3; i++) {
        if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true;
        if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false;
    }
    return false;
}

const server = new Server(
    { name: 'npm-registry', version: '1.0.0' },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'get_latest_version',
            description: 'Get the latest published version, dist-tags, and publish date for an npm package.',
            inputSchema: {
                type: 'object',
                properties: {
                    pkg: {
                        type: 'string',
                        description: 'Package name (e.g. "next", "react", "typescript")',
                    },
                },
                required: ['pkg'],
            },
        },
        {
            name: 'get_package_info',
            description:
                'Get metadata for an npm package — description, homepage, license, deprecated status, and dependencies.',
            inputSchema: {
                type: 'object',
                properties: {
                    pkg: { type: 'string', description: 'Package name' },
                    version: {
                        type: 'string',
                        description: 'Specific version to inspect. Omit for latest.',
                    },
                },
                required: ['pkg'],
            },
        },
        {
            name: 'compare_versions',
            description:
                'List all npm package versions published between two semver versions with publish dates. Useful for auditing upgrade scope.',
            inputSchema: {
                type: 'object',
                properties: {
                    pkg: { type: 'string', description: 'Package name' },
                    from: { type: 'string', description: 'Starting version (exclusive)' },
                    to: {
                        type: 'string',
                        description: 'Ending version (inclusive). Use "latest" for the current latest.',
                    },
                },
                required: ['pkg', 'from', 'to'],
            },
        },
    ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === 'get_latest_version') {
            const data = await fetchJson(`${REGISTRY}/${encodeURIComponent(args.pkg)}`);
            const latest = data['dist-tags']?.latest;
            const publishedAt = data.time?.[latest];
            const tags = Object.entries(data['dist-tags'] ?? {})
                .map(([tag, ver]) => `  ${tag}: ${ver}`)
                .join('\n');
            return {
                content: [
                    {
                        type: 'text',
                        text: [
                            `Package: ${data.name}`,
                            `Latest: ${latest}${publishedAt ? ` (${publishedAt.split('T')[0]})` : ''}`,
                            `\nDist-tags:\n${tags}`,
                        ].join('\n'),
                    },
                ],
            };
        }

        if (name === 'get_package_info') {
            const version = args.version ?? 'latest';
            const data = await fetchJson(
                `${REGISTRY}/${encodeURIComponent(args.pkg)}/${version}`
            );
            const deps = Object.entries(data.dependencies ?? {});
            const peerDeps = Object.entries(data.peerDependencies ?? {});
            const lines = [
                `Package: ${data.name}@${data.version}`,
                `Description: ${data.description ?? 'N/A'}`,
                `License: ${data.license ?? 'N/A'}`,
                `Homepage: ${data.homepage ?? 'N/A'}`,
                data.deprecated ? `⚠️  DEPRECATED: ${data.deprecated}` : null,
                `\nDependencies (${deps.length}):`,
                ...deps.slice(0, 20).map(([k, v]) => `  ${k}: ${v}`),
                peerDeps.length > 0 ? `\nPeer dependencies (${peerDeps.length}):` : null,
                ...peerDeps.map(([k, v]) => `  ${k}: ${v}`),
            ].filter((line) => line !== null);
            return { content: [{ type: 'text', text: lines.join('\n') }] };
        }

        if (name === 'compare_versions') {
            const data = await fetchJson(`${REGISTRY}/${encodeURIComponent(args.pkg)}`);
            const distTags = data['dist-tags'] ?? {};
            const toVersion = args.to === 'latest' ? distTags.latest : args.to;
            const times = data.time ?? {};
            const allVersions = Object.keys(times).filter(
                (v) => !['created', 'modified'].includes(v)
            );

            const inRange = allVersions
                .filter((v) => semverGt(v, args.from) && !semverGt(v, toVersion))
                .sort((a, b) => (semverGt(a, b) ? 1 : -1));

            if (inRange.length === 0) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `No versions of ${args.pkg} between ${args.from} and ${toVersion}`,
                        },
                    ],
                };
            }

            const lines = [`Versions of ${args.pkg} between ${args.from} → ${toVersion}:\n`];
            for (const v of inRange) {
                const date = times[v]?.split('T')[0] ?? '';
                lines.push(`  ${v.padEnd(20)} ${date}`);
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
