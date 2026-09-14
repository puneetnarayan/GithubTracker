import { NextResponse } from "next/server";
import { getOctokit, describeGitHubError } from "@/lib/github/client";
import { ValidationError } from "@/lib/validation";
import { auth } from "@/lib/auth";
import { isMockMode } from "@/lib/config";

export async function withOctokit<T>(
  request: Request,
  handler: (octokit: Awaited<ReturnType<typeof getOctokit>>) => Promise<T>,
): Promise<NextResponse> {
  try {
    const octokit = await getOctokit(request);
    const data = await handler(octokit);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const { message, status } = describeGitHubError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

/** Returns the current username for audit logging / attribution — never a token. */
export async function getCurrentUserLabel(): Promise<string> {
  if (isMockMode()) return "demo-user";
  const session = await auth();
  return session?.user?.email ?? session?.user?.name ?? "unknown-user";
}

/**
 * Guards routes that read locally-stored data (backups, audit log) rather
 * than calling GitHub directly, so they don't go through withOctokit's
 * implicit auth check. Returns a 401 response to short-circuit with when
 * unauthenticated, or null when the request may proceed.
 */
export async function requireAuthentication(): Promise<NextResponse | null> {
  if (isMockMode()) return null;
  const session = await auth();
  if (!session) {
    return NextResponse.json(
      { error: "GitHub connection has expired. Reconnect to continue." },
      { status: 401 },
    );
  }
  return null;
}
