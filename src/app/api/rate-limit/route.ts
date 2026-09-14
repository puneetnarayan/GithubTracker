import { withOctokit } from "@/lib/api-helpers";
import { getRateLimit } from "@/lib/github/rate-limit";

export async function GET(request: Request) {
  return withOctokit(request, (octokit) => getRateLimit(octokit));
}
