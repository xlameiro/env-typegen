import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // Uncomment and configure the providers you need:
    Google({
      // Auth.js v5 reads AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET from process.env by convention.
      // Using process.env directly here is an intentional exception — importing from @/lib/env
      // would create a circular dependency chain during build initialisation.
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    // GitHub({
    //   clientId: process.env.AUTH_GITHUB_ID,
    //   clientSecret: process.env.AUTH_GITHUB_SECRET,
    // }),
    // Credentials({
    //   credentials: { email: {}, password: {} },
    //   authorize: async (credentials) => { ... }
    // }),
  ],
  callbacks: {
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/error",
  },
});
