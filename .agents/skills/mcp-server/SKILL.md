---
name: mcp-server
description: Build MCP (Model Context Protocol) servers inside Next.js 16 using Route Handlers. Use when exposing business logic as agent tools for AI clients (VS Code Copilot, Claude Desktop, Cursor). Covers tool definitions, Zod-to-JSON-Schema conversion, bearer token auth, and Streamable HTTP transport.
---

# MCP Server Skill

## Overview

This skill helps you build an **MCP (Model Context Protocol) server** inside this Next.js 16 project using a Route Handler. MCP lets AI clients (Claude Desktop, VS Code Copilot, Cursor) connect to your application as a tool provider, turning your Next.js app into an agent-first backend.

**Use this skill when:**

- Building a feature that needs to be callable by an AI agent via MCP
- Exposing business logic (search, CRUD, data lookup) as agent tools
- Building an MCP server skeleton inside a Next.js app
- Questions about MCP server structure, tool definitions, or Zod-to-JSON-Schema conversion

---

## Project conventions that apply

- Route Handler lives in `app/api/mcp/route.ts` (or a sub-route if namespacing tools)
- All inputs validated with Zod at the boundary — never trust raw request bodies
- `z.toJSONSchema(schema)` is built-in in Zod v4 — no extra packages needed for JSON Schema generation
- Add `.describe("...")` to every Zod field exposed to an AI client — this is the most impactful pattern for AI-optimized schemas
- Server-only — never import MCP handler logic in Client Components
- Use `import 'server-only'` at the top of the tool handler file
- Import env vars from `@/lib/env`, never `process.env` directly

---

## MCP Transport options

| Transport                         | Use case                                                  | Implementation                          |
| --------------------------------- | --------------------------------------------------------- | --------------------------------------- |
| **Streamable HTTP** (recommended) | Stateless tools, serverless deployment, Vercel/AWS Lambda | Single Route Handler at `POST /api/mcp` |
| SSE (legacy)                      | Long-running sessions, streaming responses                | `GET /api/mcp` for event stream         |

This skill uses **Streamable HTTP** transport — it maps naturally to Next.js Route Handlers.

---

## Skeleton: minimal MCP server Route Handler

### 1. Install the MCP SDK

```bash
pnpm add @modelcontextprotocol/sdk
```

### 2. Define tools in `lib/mcp/tools.ts`

```typescript
import "server-only";
import { z } from "zod";

// Each tool: name, description, input schema (Zod), and handler
export const tools = {
  healthCheck: {
    name: "health_check",
    description: "Returns the current health status of the application.",
    inputSchema: z.object({}).describe("No input required"),
    handler: async (_input: Record<string, never>) => ({
      status: "ok",
      timestamp: new Date().toISOString(),
    }),
  },

  getUserById: {
    name: "get_user_by_id",
    description: "Retrieve a user record by their unique identifier.",
    inputSchema: z.object({
      userId: z.string().uuid().describe("The unique identifier of the user"),
    }),
    handler: async (input: { userId: string }) => {
      // Replace with real DB lookup
      return {
        id: input.userId,
        email: "user@example.com",
        name: "Example User",
      };
    },
  },
} as const;
```

### 3. Create the Route Handler at `app/api/mcp/route.ts`

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { tools } from "@/lib/mcp/tools";

// POST /api/mcp — MCP Streamable HTTP transport
export async function POST(request: Request) {
  const server = new McpServer({
    name: "my-nextjs-app",
    version: "1.0.0",
  });

  // Register all tools
  for (const tool of Object.values(tools)) {
    server.tool(
      tool.name,
      tool.description,
      z.toJSONSchema(tool.inputSchema),
      async (args) => {
        const parsed = tool.inputSchema.parse(args);
        const result = await tool.handler(parsed as never);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      },
    );
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);

  return transport.handleRequest(request, new Headers());
}

// GET /api/mcp — required for MCP client capability discovery
export async function GET() {
  return new Response(
    JSON.stringify({
      protocol: "mcp",
      transport: "streamable-http",
      version: "2025-03-26",
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}
```

### 4. Add the MCP endpoint URL to `lib/env.ts`

```typescript
// In lib/env.ts — add to server schema if needed
// MCP_SERVER_SECRET: z.string().min(1).describe('Secret key for MCP endpoint auth'),
```

---

## Authentication for MCP endpoints

Expose MCP endpoints with bearer token auth to prevent unauthorized tool calls:

```typescript
// app/api/mcp/route.ts — add auth check at the top of POST
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = env.MCP_SERVER_SECRET;

  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  // ... rest of handler
}
```

> Never expose unauthenticated MCP tool endpoints in production — any agent with the URL can call them.

---

## Adding your MCP server as a VS Code Copilot tool

Add to `.vscode/mcp.json` in the project root:

```json
{
  "servers": {
    "my-nextjs-app": {
      "type": "http",
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

VS Code Copilot will discover this file and show the tools under **Agent → Tools**.

---

## Registering with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-nextjs-app": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3000/api/mcp"]
    }
  }
}
```

---

## Testing the MCP server

Extract tool handlers into pure functions in `lib/mcp/tools.ts` so they can be unit-tested with Vitest without starting a server:

```typescript
// lib/mcp/tools.test.ts
import { describe, expect, it } from "vitest";
import { tools } from "./tools";

describe("MCP tools", () => {
  describe("healthCheck", () => {
    it("should return ok status", async () => {
      const result = await tools.healthCheck.handler({});
      expect(result.status).toBe("ok");
      expect(result.timestamp).toBeDefined();
    });
  });

  describe("getUserById", () => {
    it("should return user for valid UUID", async () => {
      const result = await tools.getUserById.handler({
        userId: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(result.id).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(result.email).toBeDefined();
    });
  });
});
```

This keeps the agent loop closed — agents can run `pnpm test` to verify tool logic without real API credentials.

---

## JSON Schema generation with Zod v4

Zod v4 has `z.toJSONSchema()` built-in — no extra packages needed:

```typescript
import { z } from "zod";

const schema = z.object({
  query: z.string().min(1).describe("Search query text"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe("Maximum results to return"),
});

// Generate JSON Schema for MCP tool registration
const jsonSchema = z.toJSONSchema(schema);
// { type: 'object', properties: { query: { type: 'string', minLength: 1, description: '...' }, ... } }
```

> Always add `.describe("...")` to every field — AI clients use this description to know what to pass.

---

## Checklist before shipping an MCP server

- [ ] All tool inputs validated with Zod (`inputSchema.parse(args)`)
- [ ] Endpoint protected with bearer token or session auth
- [ ] Tool handler extracted to `lib/mcp/tools.ts` and unit-tested
- [ ] `.describe()` on every Zod field
- [ ] MCP endpoint registered in `.vscode/mcp.json` for local development
- [ ] `import 'server-only'` at top of `lib/mcp/tools.ts`
- [ ] `pnpm lint && pnpm type-check && pnpm test && pnpm build` all pass
