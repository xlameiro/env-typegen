---
title: Add Descriptions for LLM Metadata and JSON Schema Generation
impact: HIGH
impactDescription: Enables AI agents, tool-calling APIs (Amazon Bedrock, OpenAI, Vercel AI SDK) to understand field semantics; improves LLM accuracy when schemas drive function/tool definitions
tags: schema, llm, ai, json-schema, describe, tool-calling, bedrock, openai
---

## Add Descriptions for LLM Metadata and JSON Schema Generation

In an AI-optimized codebase, Zod schemas are not just for runtime validation — they are
the single source of truth for communicating data shapes to LLMs via JSON Schema. Zod v4
ships `z.toJSONSchema()` built-in and supports `.describe()` on every schema node.

**Always add `.describe()` to schema fields that will be consumed by LLMs or exposed as
tool/function definitions.** This produces richer JSON Schema output that LLMs use to
understand intent, reducing prompt engineering and improving accuracy.

---

### Rule 1 — Use `.describe()` for LLM Field Metadata

**Incorrect (no descriptions — LLM has no context):**

```typescript
import { z } from "zod";

const CreateOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
    }),
  ),
  shippingAddress: z.string(),
  priority: z.enum(["standard", "express", "overnight"]),
});
```

**Correct (descriptions give LLMs semantic context):**

```typescript
import { z } from "zod";

const CreateOrderSchema = z.object({
  customerId: z
    .string()
    .uuid()
    .describe("UUID of the authenticated customer placing the order"),
  items: z
    .array(
      z.object({
        productId: z
          .string()
          .describe("SKU or product identifier from the catalog"),
        quantity: z
          .number()
          .int()
          .positive()
          .describe("Number of units to order; must be at least 1"),
      }),
    )
    .describe("List of products and quantities in this order"),
  shippingAddress: z
    .string()
    .describe("Full delivery address including city, state, and postal code"),
  priority: z
    .enum(["standard", "express", "overnight"])
    .describe(
      "Fulfillment speed: standard (5-7 days), express (2 days), overnight (next day)",
    ),
});
```

**When to add `.describe()`:**

- Any schema passed to `z.toJSONSchema()` for tool/function definitions
- API route input schemas documented for LLM agents
- Server Action parameter schemas
- Form schemas used with AI form-filling or auto-completion

---

### Rule 2 — Use `z.toJSONSchema()` for Tool Calling

Zod v4 ships `z.toJSONSchema()` **built-in** — no extra packages needed. Use it to
generate JSON Schema for Amazon Bedrock tool specs, OpenAI function definitions, or the
Vercel AI SDK.

**Incorrect (manual JSON Schema duplication):**

```typescript
// Never manually write JSON Schema when you already have a Zod schema
const toolSchema = {
  type: "object",
  properties: {
    query: { type: "string", description: "Search query" },
    limit: { type: "number", description: "Max results" },
  },
  required: ["query"],
};
```

**Correct (derive JSON Schema from the Zod schema):**

```typescript
import { z } from "zod";

const SearchParamsSchema = z.object({
  query: z.string().min(1).describe("Full-text search query"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe("Maximum number of results to return (1–100)"),
  filters: z
    .object({
      category: z.string().optional().describe("Filter by product category"),
      inStock: z.boolean().optional().describe("Only return in-stock items"),
    })
    .optional()
    .describe("Optional filters to narrow results"),
});

// Derive JSON Schema — z.toJSONSchema() is built-in in Zod v4
const jsonSchema = z.toJSONSchema(SearchParamsSchema);
```

---

### Rule 3 — Amazon Bedrock Tool Definition Pattern

```typescript
import { z } from "zod";
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

const GetWeatherSchema = z.object({
  location: z.string().describe("City name or lat/lon coordinates"),
  unit: z
    .enum(["celsius", "fahrenheit"])
    .default("celsius")
    .describe("Temperature unit to return"),
});

type GetWeatherParams = z.infer<typeof GetWeatherSchema>;

const client = new BedrockRuntimeClient({ region: "us-east-1" });

const response = await client.send(
  new ConverseCommand({
    modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    messages: [
      { role: "user", content: [{ text: "What is the weather in Madrid?" }] },
    ],
    toolConfig: {
      tools: [
        {
          toolSpec: {
            name: "get_weather",
            description: "Get current weather for a location",
            inputSchema: {
              // z.toJSONSchema() produces the correct shape for Bedrock
              json: z.toJSONSchema(GetWeatherSchema),
            },
          },
        },
      ],
    },
  }),
);

// Parse the tool call response with the same schema
function handleToolCall(input: unknown): GetWeatherParams {
  return GetWeatherSchema.parse(input);
}
```

---

### Rule 4 — Vercel AI SDK Tool Definition Pattern

```typescript
import { z } from "zod";
import { tool } from "ai";

const SearchProductsSchema = z.object({
  query: z.string().describe("Search terms for finding products"),
  maxPrice: z
    .number()
    .optional()
    .describe("Maximum price in USD; omit for no price limit"),
  category: z.string().optional().describe("Product category to filter by"),
});

// Vercel AI SDK `tool()` accepts a Zod schema directly
const searchProductsTool = tool({
  description: "Search the product catalog by query and filters",
  parameters: SearchProductsSchema,
  execute: async (params) => {
    // params is fully typed as z.infer<typeof SearchProductsSchema>
    return searchCatalog(params);
  },
});
```

---

### Rule 5 — Use `z.input<>` vs `z.infer<>` Correctly with Transforms

When a schema includes `.transform()`, the input and output types differ:

```typescript
import { z } from "zod";

const OrderDateSchema = z.object({
  orderId: z.string().uuid().describe("Order unique identifier"),
  // Transform: raw API sends ISO string, internal code uses Date
  createdAt: z
    .string()
    .datetime()
    .transform((s) => new Date(s))
    .describe("ISO 8601 timestamp when the order was created"),
});

// z.input<> = what the API / JSON parser sends (pre-transform)
type OrderDateInput = z.input<typeof OrderDateSchema>;
// { orderId: string; createdAt: string }

// z.infer<> = z.output<> = what your code works with (post-transform)
type OrderDate = z.infer<typeof OrderDateSchema>;
// { orderId: string; createdAt: Date }

// Route Handler: validate raw input
export async function POST(req: Request) {
  const body: unknown = await req.json();
  const order = OrderDateSchema.parse(body); // order.createdAt is Date ✅
  return Response.json({ id: order.orderId });
}

// JSON Schema is generated from the INPUT shape (pre-transform) — correct for LLMs
const schema = z.toJSONSchema(OrderDateSchema);
// createdAt → { type: 'string', format: 'date-time', description: '...' }
```

---

### When NOT to use `.describe()`

- Internal-only schemas never exposed to LLMs or JSON Schema generation
- Very short-lived validation (e.g., a one-off `z.string().parse(env.PORT)`)
- Schemas that are intermediate steps in a pipeline (describe the final schema instead)

---

**Reference:**

- [Zod v4 — JSON Schema](https://zod.dev/json-schema)
- [Zod v4 — `.describe()`](https://zod.dev/api#describe)
- [Amazon Bedrock Tool Use](https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use.html)
- [Vercel AI SDK — Tools](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling)
