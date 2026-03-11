#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const OSV_BASE = 'https://api.osv.dev/v1';

async function postJson(url, body) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
}

async function getJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
}

function formatVuln(vuln) {
    const aliases = vuln.aliases?.join(', ') ?? 'none';
    const severity =
        vuln.database_specific?.severity ?? vuln.severity?.[0]?.score ?? 'N/A';
    // Extract affected version ranges
    const affectedRanges = (vuln.affected ?? [])
        .flatMap((affected) =>
            (affected.ranges ?? []).flatMap((range) =>
                (range.events ?? [])
                    .map((event) =>
                        event.introduced != null
                            ? `introduced: ${event.introduced}`
                            : event.fixed != null
                              ? `fixed: ${event.fixed}`
                              : null
                    )
                    .filter(Boolean)
            )
        )
        .slice(0, 4);

    return [
        `ID: ${vuln.id} | Aliases: ${aliases}`,
        `Summary: ${vuln.summary ?? 'N/A'}`,
        `Severity: ${severity}`,
        affectedRanges.length > 0 ? `Ranges: ${affectedRanges.join(', ')}` : null,
        `Details: https://osv.dev/vulnerability/${vuln.id}`,
    ]
        .filter(Boolean)
        .join('\n');
}

const server = new Server(
    { name: 'osv-vulnerability', version: '1.0.0' },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'query_package',
            description:
                'Query the OSV database for known vulnerabilities (CVE/GHSA) affecting a specific npm package at a given version.',
            inputSchema: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Package name (e.g. "next", "express")',
                    },
                    version: {
                        type: 'string',
                        description: 'Package version (e.g. "14.2.3")',
                    },
                    ecosystem: {
                        type: 'string',
                        description: 'Package ecosystem. Default: "npm". Other values: "PyPI", "Go", "Maven".',
                    },
                },
                required: ['name', 'version'],
            },
        },
        {
            name: 'batch_query',
            description:
                'Query OSV for multiple packages at once. Ideal for scanning all dependencies from package.json.',
            inputSchema: {
                type: 'object',
                properties: {
                    packages: {
                        type: 'array',
                        description: 'Array of packages to check for vulnerabilities.',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string', description: 'Package name' },
                                version: { type: 'string', description: 'Package version' },
                                ecosystem: {
                                    type: 'string',
                                    description: 'Ecosystem. Default: "npm".',
                                },
                            },
                            required: ['name', 'version'],
                        },
                    },
                },
                required: ['packages'],
            },
        },
        {
            name: 'get_vulnerability',
            description:
                'Get full details of a specific vulnerability by its OSV, CVE, or GHSA identifier.',
            inputSchema: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'Vulnerability ID (e.g. "GHSA-jchw-25xp-jwwc" or "CVE-2024-56332")',
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
        if (name === 'query_package') {
            const body = {
                package: { name: args.name, ecosystem: args.ecosystem ?? 'npm' },
                version: args.version,
            };
            const data = await postJson(`${OSV_BASE}/query`, body);
            if (!data.vulns?.length) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `✅ No known vulnerabilities for ${args.name}@${args.version}`,
                        },
                    ],
                };
            }
            const formatted = data.vulns.map(formatVuln).join('\n\n---\n\n');
            return {
                content: [
                    {
                        type: 'text',
                        text: `⚠️  ${data.vulns.length} vulnerability(ies) for ${args.name}@${args.version}:\n\n${formatted}`,
                    },
                ],
            };
        }

        if (name === 'batch_query') {
            const queries = args.packages.map((pkg) => ({
                package: { name: pkg.name, ecosystem: pkg.ecosystem ?? 'npm' },
                version: pkg.version,
            }));
            const data = await postJson(`${OSV_BASE}/querybatch`, { queries });
            const lines = [];
            let totalVulns = 0;

            for (let i = 0; i < args.packages.length; i++) {
                const pkg = args.packages[i];
                const vulns = data.results?.[i]?.vulns ?? [];
                totalVulns += vulns.length;
                if (vulns.length > 0) {
                    lines.push(`⚠️  ${pkg.name}@${pkg.version}: ${vulns.length} vulnerability(ies)`);
                    for (const vuln of vulns) {
                        lines.push(`   - ${vuln.id}: ${vuln.summary ?? 'N/A'}`);
                    }
                }
            }

            if (totalVulns === 0) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `✅ No vulnerabilities found across ${args.packages.length} packages.`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Found ${totalVulns} vulnerability(ies) across ${args.packages.length} packages:\n\n${lines.join('\n')}`,
                    },
                ],
            };
        }

        if (name === 'get_vulnerability') {
            const data = await getJson(
                `${OSV_BASE}/vulns/${encodeURIComponent(args.id)}`
            );
            const references = (data.references ?? [])
                .slice(0, 5)
                .map((ref) => `  - ${ref.url}`)
                .join('\n');
            const lines = [
                `ID: ${data.id}`,
                `Aliases: ${data.aliases?.join(', ') ?? 'none'}`,
                `Summary: ${data.summary ?? 'N/A'}`,
                `Published: ${data.published?.split('T')[0] ?? 'N/A'}`,
                `Modified: ${data.modified?.split('T')[0] ?? 'N/A'}`,
                '',
                `Details:\n${data.details ?? 'N/A'}`,
                references ? `\nReferences:\n${references}` : null,
            ].filter((line) => line !== null);
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
