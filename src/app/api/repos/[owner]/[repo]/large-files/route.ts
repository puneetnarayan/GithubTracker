import { withOctokit } from "@/lib/api-helpers";
import { analyzeLargeFiles } from "@/lib/github/large-files";
import { getRepo } from "@/lib/github/repos";
import { assertValidOwnerRepo } from "@/lib/validation";
import { cached } from "@/lib/cache";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await params;
  assertValidOwnerRepo(owner, repo);
  return withOctokit(request, async (octokit) => {
    const repoData = await getRepo(octokit, owner, repo);
    const branch = repoData?.defaultBranch ?? "main";
    const { value: files } = await cached(`large-files:${owner}/${repo}`, 10 * 60 * 1000, () =>
      analyzeLargeFiles(octokit, owner, repo, branch),
    );
    return { files };
  });
}
