import { auth } from "@/auth";
import { createRateLimiter } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

// Shared rate limiter for authentication routes.
// 5 attempts per minute per IP — enough for legitimate users, enough to stop brute force.
// Replace with a distributed store (Upstash Redis, Vercel KV) when deploying multi-replica.
const authRateLimiter = createRateLimiter({ max: 5, windowMs: 60_000 });

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = Boolean(req.auth);

  const isProtectedRoute =
    nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/profile") ||
    nextUrl.pathname.startsWith("/settings");

  const isAuthRoute =
    nextUrl.pathname.startsWith("/auth/sign-in") ||
    nextUrl.pathname.startsWith("/auth/sign-up");

  // Rate-limit unauthenticated requests to auth routes to mitigate brute-force attacks.
  if (isAuthRoute && !isLoggedIn) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { isAllowed, retryAfterSeconds } = authRateLimiter.check(ip);

    if (!isAllowed) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      });
    }
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Redirect unauthenticated users to sign-in, preserving the intended destination
  if (isProtectedRoute && !isLoggedIn) {
    const signInUrl = new URL("/auth/sign-in", nextUrl);
    signInUrl.searchParams.set("returnTo", nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Match all routes except static files, images, and API routes
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
