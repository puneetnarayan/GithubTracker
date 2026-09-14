import { withOctokit } from "@/lib/api-helpers";
import { getRepo } from "@/lib/github/repos";
import { assertValidOwnerRepo } from "@/lib/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await params;
  assertValidOwnerRepo(owner, repo);
  return withOctokit(request, async (octokit) => {
    const data = await getRepo(octokit, owner, repo);
    if (!data) {
      throw Object.assign(new Error("Repository not found"), { status: 404 });
    }
    return data;
  });
}
