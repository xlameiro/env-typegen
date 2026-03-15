import { auth } from "@/auth";
import { createRateLimiter } from "@/lib/rate-limit";
import { sanitizeReturnTo } from "@/lib/utils";
import { NextResponse } from "next/server";

// Shared rate limiter for authentication routes.
// 5 attempts per minute per IP — enough for legitimate users, enough to stop brute force.
// Replace with a distributed store (Upstash Redis, Vercel KV) when deploying multi-replica.
const authRateLimiter = createRateLimiter({ max: 5, windowMs: 60_000 });

const CSP_HEADER = "Content-Security-Policy";

// Build the per-request Content-Security-Policy with the provided nonce.
// Using a nonce eliminates 'unsafe-inline' from script-src, closing the XSS vector
// that a static CSP with 'unsafe-inline' would leave open.
function buildCsp(nonce: string): string {
  // Extracted to satisfy sonarjs/no-duplicate-string (threshold: 3).
  const self = "'self'";
  return [
    `default-src ${self}`,
    // Nonce allows per-request scripts (Next.js internal, route transitions).
    // The sha256 hash allows the static anti-FOUC inline script in layout.tsx
    // without needing a nonce — the hash is content-addressed and never changes.
    // 'unsafe-eval' is intentionally omitted — not needed in production Next.js builds.
    `script-src ${self} 'nonce-${nonce}' 'sha256-PvQI9hLWSH+jZhaO+lhQHad1gRsx3/mgt3lOM7XygHE='`,
    // Tailwind CSS injects inline <style> blocks; 'unsafe-inline' is required for styles.
    `style-src ${self} 'unsafe-inline'`,
    `img-src ${self} blob: data:`,
    `font-src ${self}`,
    "object-src 'none'",
    `base-uri ${self}`,
    `form-action ${self}`,
    "frame-ancestors 'none'",
    // Prevents loading in workers (no web worker or service worker usage by default).
    "worker-src 'none'",
    // Restricts web app manifest loading to same origin.
    `manifest-src ${self}`,
    "upgrade-insecure-requests",
  ].join("; ");
}

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = Boolean(req.auth);

  // Generate a cryptographically unique nonce per request.
  // Layout.tsx reads it via headers() and attaches it to inline <script> elements.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  // Define your protected routes here — replace false with your conditions.
  // Example: nextUrl.pathname.startsWith("/dashboard") || nextUrl.pathname.startsWith("/settings")
  const isProtectedRoute = false;

  const isAuthRoute =
    nextUrl.pathname.startsWith("/auth/sign-in") ||
    nextUrl.pathname.startsWith("/auth/sign-up");

  // Rate-limit unauthenticated POST requests to auth routes to mitigate brute-force attacks.
  // GET requests (page views) are exempt — brute-force attacks submit credentials (POST),
  // not load the sign-in page. Applying rate limiting to GET requests causes false positives
  // in CI/test environments where 2+ parallel workers make many page-view requests from the
  // same IP (e.g. GitHub Actions runners that add x-forwarded-for for localhost traffic).
  // Only applies when a reliable client IP is available via x-forwarded-for.
  if (isAuthRoute && !isLoggedIn && req.method !== "GET") {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

    if (ip) {
      const { isAllowed, retryAfterSeconds } = authRateLimiter.check(ip);

      if (!isAllowed) {
        return new NextResponse("Too Many Requests", {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds),
            [CSP_HEADER]: csp,
          },
        });
      }
    }
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && isLoggedIn) {
    const redirectResponse = NextResponse.redirect(new URL("/", nextUrl));
    redirectResponse.headers.set(CSP_HEADER, csp);
    return redirectResponse;
  }

  // Redirect unauthenticated users to sign-in, preserving the intended destination.
  // sanitizeReturnTo ensures the pathname is a safe relative path before it is forwarded.
  if (isProtectedRoute && !isLoggedIn) {
    const signInUrl = new URL("/auth/sign-in", nextUrl);
    signInUrl.searchParams.set("returnTo", sanitizeReturnTo(nextUrl.pathname));
    const redirectResponse = NextResponse.redirect(signInUrl);
    redirectResponse.headers.set(CSP_HEADER, csp);
    return redirectResponse;
  }

  // Propagate the nonce to Server Components via request headers.
  // Components that render per-request inline scripts (e.g. auth callbacks) can
  // read `x-nonce` via headers() inside a <Suspense> boundary.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set(CSP_HEADER, csp);
  return response;
});

export const config = {
  // Match all routes except static files, images, and API routes
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
