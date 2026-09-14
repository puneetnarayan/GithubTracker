import { describe, expect, it } from "vitest";
import {
  assertValidOwnerRepo,
  branchSchema,
  shaSchema,
  ownerSchema,
  ValidationError,
} from "@/lib/validation";

describe("ownerSchema / repo validation", () => {
  it("accepts normal GitHub owner names", () => {
    expect(ownerSchema.safeParse("octocat").success).toBe(true);
    expect(ownerSchema.safeParse("my-org.io").success).toBe(true);
  });

  it("rejects path traversal and shell metacharacters", () => {
    expect(ownerSchema.safeParse("../etc").success).toBe(false);
    expect(ownerSchema.safeParse("foo;rm -rf /").success).toBe(false);
    expect(ownerSchema.safeParse("foo bar").success).toBe(false);
    expect(ownerSchema.safeParse("$(whoami)").success).toBe(false);
  });

  it("assertValidOwnerRepo throws ValidationError on bad input", () => {
    expect(() => assertValidOwnerRepo("ok-owner", "ok-repo")).not.toThrow();
    expect(() => assertValidOwnerRepo("../ok", "repo")).toThrow(ValidationError);
  });
});

describe("branchSchema", () => {
  it("accepts branches with slashes", () => {
    expect(branchSchema.safeParse("feature/redesign").success).toBe(true);
    expect(branchSchema.safeParse("main").success).toBe(true);
  });

  it("rejects traversal and malformed refs", () => {
    expect(branchSchema.safeParse("../main").success).toBe(false);
    expect(branchSchema.safeParse("a//b").success).toBe(false);
    expect(branchSchema.safeParse("main/").success).toBe(false);
    expect(branchSchema.safeParse("main.lock").success).toBe(false);
  });
});

describe("shaSchema", () => {
  it("accepts short and full hex SHAs", () => {
    expect(shaSchema.safeParse("a81f92c").success).toBe(true);
    expect(shaSchema.safeParse("a".repeat(40)).success).toBe(true);
  });

  it("rejects non-hex or wrong-length values", () => {
    expect(shaSchema.safeParse("not-a-sha").success).toBe(false);
    expect(shaSchema.safeParse("abc").success).toBe(false);
    expect(shaSchema.safeParse("g1234567").success).toBe(false);
  });
});
