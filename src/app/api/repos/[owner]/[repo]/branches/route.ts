import { withOctokit } from "@/lib/api-helpers";
import { listBranches } from "@/lib/github/branches";
import { getRepo } from "@/lib/github/repos";
import { assertValidOwnerRepo } from "@/lib/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await params;
  assertValidOwnerRepo(owner, repo);
  return withOctokit(request, async (octokit) => {
    const repoData = await getRepo(octokit, owner, repo);
    const branches = await listBranches(octokit, owner, repo, repoData?.defaultBranch ?? "main");
    return { branches };
  });
}
