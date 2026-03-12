---
title: Apply String Validations at Schema Definition
impact: CRITICAL
impactDescription: Unvalidated strings allow SQL injection, XSS, and malformed data; validating at schema level catches issues at the boundary
tags: schema, string, validation, security
---

## Apply String Validations at Schema Definition

Plain `z.string()` accepts any string including empty strings, extremely long strings, and malicious content. Apply constraints like `min()`, `max()`, `email()`, `url()`, or `regex()` at schema definition to reject invalid data at the boundary.

**Incorrect (no string validations):**

```typescript
import { z } from "zod";

const commentSchema = z.object({
  author: z.string(), // Empty string passes
  email: z.string(), // "not-an-email" passes
  content: z.string(), // 10MB string passes, script tags pass
  website: z.string().optional(), // "javascript:alert(1)" passes
});

// All of these pass validation
commentSchema.parse({
  author: "", // Empty - who wrote this?
  email: "invalid", // Not a real email
  content: '<script>alert("XSS")</script>'.repeat(100000), // XSS + huge
  website: "javascript:void(0)", // Dangerous URL
});
```

**Correct (string validations applied):**

```typescript
import { z } from "zod";

const commentSchema = z.object({
  author: z
    .string()
    .min(1, "Author is required")
    .max(100, "Author name too long"),

  email: z.string().email("Invalid email address"),

  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(5000, "Comment too long"),

  website: z
    .string()
    .url("Invalid URL")
    .refine(
      (url) => url.startsWith("http://") || url.startsWith("https://"),
      "Only http/https URLs allowed",
    )
    .optional(),
});

// Invalid data is rejected
commentSchema.parse({
  author: "",
  email: "invalid",
  content: "",
});
// ZodError with all violations listed
```

**Common string validations:**

```typescript
z.string().min(1); // Non-empty (most common need)
z.string().max(255); // Database varchar limit
z.string().length(36); // Exact length (UUIDs)
z.string().email(); // Email format
z.string().url(); // URL format
z.string().uuid(); // UUID format
z.string().cuid(); // CUID format
z.string().regex(/^[a-z0-9-]+$/); // Custom pattern (slugs)
z.string().startsWith("https://"); // Prefix check
z.string().endsWith(".pdf"); // Suffix check
z.string().includes("@"); // Contains check
z.string().trim(); // Strips whitespace (transform)
z.string().toLowerCase(); // Normalizes case (transform)
```

---

### Zod v4: Top-Level Format Validators

Zod v4 introduced **standalone format validators** that work as both top-level schemas (for a bare format type) and as method-chain validators. Use the top-level form when the only constraint is the format itself — it is more concise. Use the method-chain form when combining multiple constraints.

```typescript
import { z } from "zod";

// Top-level format validators (Zod v4+):
z.email(); // Validates an email address
z.uuid(); // UUID (v1–v5)
z.guid(); // Alias for UUID
z.url(); // URL (http / https / ftp)
z.httpUrl(); // Only http / https (recommended over z.url() for most cases)
z.hostname(); // Hostname (e.g., "example.com") with no scheme or path
z.mac(); // IEEE 802 MAC address
z.ipv4(); // IPv4 address
z.ipv6(); // IPv6 address
z.cidrv4(); // CIDR block for IPv4 (e.g., "192.168.0.0/24")
z.cidrv6(); // CIDR block for IPv6
z.base64(); // Base64-encoded string
z.base64url(); // URL-safe base64 (no padding)
z.jwt(); // JSON Web Token (header.payload.signature)
z.hash("sha256"); // Hash string, e.g., "sha1" | "sha256" | "md5"

// ISO date/time — via z.iso namespace
z.iso.date(); // "YYYY-MM-DD"
z.iso.time(); // "HH:mm:ss" or "HH:mm:ss.sss"
z.iso.datetime(); // Full ISO 8601 datetime (UTC "Z" or offset)
z.iso.duration(); // ISO 8601 duration (e.g., "P1Y2M3DT4H")

// Decision guide: top-level vs method-chain
// ✅ Top-level (format is the only constraint)
z.email();

// ✅ Method-chain (combining format + other constraints)
z.string().email().max(255);
z.string().uuid().describe("User identifier");

// Both are equivalent for pure format validation; top-level is more concise
```

**Real-world example — API input schema with v4 format validators:**

```typescript
import { z } from "zod";

const CreateUserSchema = z.object({
  email: z.email().describe("User email address"),
  website: z.httpUrl().optional().describe("Personal website"),
  ipAddress: z.ipv4().optional().describe("Client IP for audit log"),
  sessionToken: z.jwt().describe("Active session token"),
  avatarUrl: z
    .base64url()
    .optional()
    .describe("Base64url-encoded avatar image"),
  birthDate: z.iso.date().optional().describe("ISO 8601 birth date"),
});
```

**When NOT to use this pattern:**

- When accepting arbitrary user content for display only (sanitize on output instead)
- When building a passthrough/proxy that shouldn't validate content

Reference: [Zod API — Strings](https://zod.dev/api#strings) · [Zod v4 Top-Level Validators](https://zod.dev/api#top-level-validators)
