/**
 * Next.js Instrumentation Hook
 *
 * This file runs once when the Next.js server starts (both Node.js and Edge runtimes).
 * It is the recommended place to initialize error monitoring, distributed tracing,
 * and logging SDKs so they are active before any request is handled.
 *
 * Uncomment and configure one of the setups below when adding observability to
 * a project built on this template.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Node.js runtime — full SDK access, runs in the main server process.
    //
    // ── Sentry ────────────────────────────────────────────────────────────────
    // pnpm add @sentry/nextjs
    // Then run: npx @sentry/wizard@latest -i nextjs
    //
    // await import("../sentry.server.config");
    //
    // ── Axiom (structured logging) ────────────────────────────────────────────
    // pnpm add next-axiom
    // Wrap next.config.ts export with withAxiom() from "next-axiom".
    // No instrumentation code needed here — withAxiom handles it.
    //
    // ── Highlight.io ──────────────────────────────────────────────────────────
    // pnpm add @highlight-run/node
    //
    // const { H } = await import("@highlight-run/node");
    // H.init({ projectID: process.env.HIGHLIGHT_PROJECT_ID ?? "" });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Edge runtime — limited to Web APIs; runs in proxy.ts and Edge Route Handlers.
    //
    // ── Sentry (Edge) ─────────────────────────────────────────────────────────
    // await import("../sentry.edge.config");
  }
}
