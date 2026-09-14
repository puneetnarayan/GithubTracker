import { withOctokit } from "@/lib/api-helpers";
import { listTags } from "@/lib/github/tags-releases";
import { assertValidOwnerRepo } from "@/lib/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await params;
  assertValidOwnerRepo(owner, repo);
  return withOctokit(request, async (octokit) => ({ tags: await listTags(octokit, owner, repo) }));
}
