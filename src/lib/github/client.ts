import { Octokit } from "octokit";
import { getServerAccessToken } from "@/lib/auth";
import { isMockMode } from "@/lib/config";

export class GitHubApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Builds an Octokit instance authenticated with the signed-in user's GitHub
 * access token. The token never leaves the server: it is read from the
 * encrypted session cookie and used only to construct this request client.
 */
export async function getOctokit(request: Request): Promise<Octokit> {
  if (isMockMode()) {
    // Never actually used: every data-access function short-circuits to
    // mock data before calling into Octokit while mock mode is active.
    return new Octokit();
  }
  const token = await getServerAccessToken(request);
  if (!token) {
    throw new GitHubApiError(
      "GitHub connection has expired. Reconnect to continue.",
      401,
    );
  }
  return new Octokit({ auth: token });
}

/** Translates a thrown Octokit/network error into a friendly message + status. */
export function describeGitHubError(error: unknown): { message: string; status: number } {
  if (error instanceof GitHubApiError) {
    return { message: error.message, status: error.status };
  }
  const err = error as { status?: number; message?: string } | undefined;
  const status = err?.status ?? 500;
  switch (status) {
    case 401:
      return { message: "GitHub connection has expired. Reconnect to continue.", status };
    case 403:
      return {
        message:
          "You do not have sufficient permission to perform this operation, or the GitHub API rate limit has been exceeded.",
        status,
      };
    case 404:
      return { message: "The requested GitHub resource was not found.", status };
    case 409:
      return { message: "The operation conflicts with the current repository state.", status };
    case 422:
      return { message: "GitHub rejected the request as unprocessable.", status };
    default:
      return {
        message: err?.message ?? "An unexpected error occurred while contacting GitHub.",
        status: status || 500,
      };
  }
}
