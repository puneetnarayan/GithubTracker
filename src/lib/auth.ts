import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { getToken } from "next-auth/jwt";
import { config, isMockMode } from "@/lib/config";

// Only request the scopes the enabled features actually need:
// - `repo` for reading private repository metadata, commits, branches, etc.
// - `read:user` for basic profile display.
// No write/admin scopes are requested; destructive Git operations are never
// performed automatically by this application (see cleanup/history-rewrite
// docs in the README).
const SCOPES = "read:user repo";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: isMockMode()
    ? []
    : [
        GitHub({
          clientId: config.github.clientId,
          clientSecret: config.github.clientSecret,
          authorization: { params: { scope: SCOPES } },
        }),
      ],
  secret: config.nextAuthSecret || undefined,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session }) {
      // Deliberately do NOT copy the access token onto the session object:
      // that object is serialized and sent to the browser via
      // /api/auth/session. Server code reads the token straight out of the
      // encrypted JWT cookie instead — see getServerAccessToken() below.
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

/**
 * Reads the GitHub access token directly from the encrypted session JWT.
 * Server-only: never expose the return value of this function to the
 * client (do not return it from a Server Component prop, API JSON body,
 * log line, etc).
 */
export async function getServerAccessToken(request: Request): Promise<string | null> {
  if (isMockMode()) return null;
  // getToken() picks the session cookie's name (the "__Secure-" prefixed
  // variant vs. the plain one) based on this flag. Behind Vercel's proxy,
  // request.url can report an internal http:// origin even though the
  // browser connected over https, so secureCookie must be forced from
  // NODE_ENV rather than inferred from the request URL — otherwise it
  // looks for the wrong cookie and silently finds nothing.
  const token = await getToken({
    req: request as never,
    secret: config.nextAuthSecret,
    secureCookie: config.isProduction,
  });
  return (token?.accessToken as string | undefined) ?? null;
}
