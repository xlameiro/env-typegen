---
title: Generate JSON Schema for LLM Tool Calling with z.toJSONSchema and z.fromJSONSchema
impact: HIGH
impactDescription: Manually written JSON Schema diverges from runtime validation logic; z.toJSONSchema() generates accurate tool specs from Zod schemas already used for validation
tags: schema, llm, ai, json-schema, tool-calling, bedrock, openai, vercel-ai-sdk
---

## Generate JSON Schema for LLM Tool Calling

Zod v4 ships `z.toJSONSchema()` as a **built-in** function — no extra packages needed. Use it to generate tool/function parameter specs for Amazon Bedrock, the OpenAI function-calling API, or the Vercel AI SDK directly from the same Zod schemas you use for runtime validation.

---

### z.toJSONSchema() — basic usage

```typescript
import { z } from "zod";

const SearchParamsSchema = z.object({
  query: z.string().min(1).describe("The search query string"),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe("Maximum results to return"),
  category: z
    .enum(["news", "products", "docs"])
    .optional()
    .describe("Filter by content category"),
});

// Built-in in Zod v4 — no extra packages
const jsonSchema = z.toJSONSchema(SearchParamsSchema);
// Produces JSON Schema Draft-7 compatible object:
// {
//   type: "object",
//   properties: {
//     query: { type: "string", minLength: 1, description: "The search query string" },
//     maxResults: { type: "integer", minimum: 1, maximum: 100, default: 10, description: "Maximum results to return" },
//     category: { type: "string", enum: ["news", "products", "docs"], description: "Filter by content category" }
//   },
//   required: ["query"]
// }
```

---

### Handling unrepresentable types

Some TypeScript types (`bigint`, `Symbol`, `Date`) have no direct JSON Schema equivalent. Use `{ unrepresentable: "any" }` to allow them through as unconstrained rather than throwing:

```typescript
const OptionsSchema = z.object({
  id: z.bigint().describe("Record identifier"),
  name: z.string(),
});

// ❌ Throws — bigint has no JSON Schema representation by default
const bad = z.toJSONSchema(OptionsSchema);

// ✅ Passes — bigint becomes {} (unconstrained)
const ok = z.toJSONSchema(OptionsSchema, { unrepresentable: "any" });
```

---

### z.fromJSONSchema() — reverse conversion (Zod v4.3.0+)

Convert an existing JSON Schema or OpenAPI definition into a Zod schema. Useful when consuming third-party API specs:

```typescript
import { z } from "zod";

const externalSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    amount: { type: "number", minimum: 0 },
  },
  required: ["id", "amount"],
} as const;

// Convert to Zod schema — now you can use .parse(), z.infer<>, etc.
const ZodSchema = z.fromJSONSchema(externalSchema);
type Result = z.infer<typeof ZodSchema>;
// { id: string; amount: number }

// Round-trip: Zod → JSON Schema → Zod
const original = z.object({ email: z.string().email() });
const json = z.toJSONSchema(original);
const restored = z.fromJSONSchema(json);
```

---

### Amazon Bedrock — tool_spec.inputSchema.json

```typescript
import { z } from "zod";
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

const GetWeatherSchema = z.object({
  location: z.string().describe("City and country, e.g., 'Paris, France'"),
  unit: z
    .enum(["celsius", "fahrenheit"])
    .default("celsius")
    .describe("Temperature unit"),
});

const client = new BedrockRuntimeClient({ region: "us-east-1" });

const response = await client.send(
  new ConverseCommand({
    modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    messages: [
      { role: "user", content: [{ text: "What's the weather in Paris?" }] },
    ],
    toolConfig: {
      tools: [
        {
          toolSpec: {
            name: "get_weather",
            description: "Get current weather for a location",
            inputSchema: {
              json: z.toJSONSchema(GetWeatherSchema), // ← direct use
            },
          },
        },
      ],
    },
  }),
);
```

---

### OpenAI function calling

```typescript
import OpenAI from "openai";
import { z } from "zod";

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200).describe("Task title"),
  priority: z.enum(["low", "medium", "high"]).describe("Task priority level"),
  dueDate: z
    .string()
    .optional()
    .describe("ISO 8601 date string, e.g. '2025-12-31'"),
});

const openai = new OpenAI();

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "user", content: "Create a high-priority task for tomorrow" },
  ],
  tools: [
    {
      type: "function",
      function: {
        name: "create_task",
        description: "Create a new task",
        parameters: z.toJSONSchema(CreateTaskSchema), // ← direct use
      },
    },
  ],
});
```

---

### Vercel AI SDK

```typescript
import { tool } from "ai";
import { z } from "zod";

// The Vercel AI SDK accepts Zod schemas directly —
// use z.toJSONSchema() only when you need the raw JSON Schema object
const searchTool = tool({
  description: "Search the product catalog",
  parameters: z.object({
    query: z.string().describe("Search query"),
    limit: z.number().int().min(1).max(50).default(10),
  }),
  execute: async ({ query, limit }) => {
    // implementation
    return { results: [] };
  },
});
```

---

### z.prettifyError() — human-readable validation errors

`z.prettifyError(err)` formats a `ZodError` as a readable multiline string. Use it for logging, agent error surfacing, and debugging — not for end-user form display (use `error.flatten()` for that):

```typescript
import { z } from "zod";

const AgentInputSchema = z.object({
  userId: z.string().uuid().describe("User identifier"),
  action: z.enum(["read", "write", "delete"]).describe("Action to perform"),
  resourceId: z.string().min(1).describe("Target resource ID"),
});

const result = AgentInputSchema.safeParse({
  userId: "not-a-uuid",
  action: "hack",
  resourceId: "",
});

if (!result.success) {
  // For logging / agent error reporting
  console.error(z.prettifyError(result.error));
  // Output:
  // ✖ Invalid uuid
  //   → at userId
  // ✖ Invalid option: expected 'read' | 'write' | 'delete'
  //   → at action
  // ✖ String must contain at least 1 character(s)
  //   → at resourceId

  // For end-user form display, use flatten() instead
  const fieldErrors = result.error.flatten().fieldErrors;
}
```

---

### Project Rule

> Always use `z.toJSONSchema(schema)` when building LLM tool specs. Never write JSON Schema objects manually when a Zod schema already exists — they will diverge.
>
> Add `.describe("...")` to every field that will be read by an LLM — this is the single highest-impact pattern for accurate tool calling.
>
> Use `z.prettifyError()` for agent-facing error logging; use `error.flatten()` for user-facing form errors.

---

Reference: [Zod v4 — JSON Schema](https://zod.dev/json-schema) · [Zod v4 API — prettifyError](https://zod.dev/api#prettifyerror)
