import { auth } from "@/auth";
import { AuthenticationError } from "@/lib/errors";
import type { Session } from "next-auth";
import "server-only";

/**
 * Returns the current session server-side.
 * Use in Server Components, Server Actions, and Route Handlers.
 */
export { auth as getSession } from "@/auth";

/**
 * Returns the current session or throws if the user is not authenticated.
 * Use in protected Server Actions and Route Handlers.
 */
export async function requireAuth(): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    throw new AuthenticationError();
  }
  return session;
}
