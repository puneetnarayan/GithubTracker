import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });

  it("builds a header row from the first object's keys", () => {
    const csv = toCsv([{ A: 1, B: "x" }]);
    expect(csv.split("\n")[0]).toBe("A,B");
  });

  it("quotes and escapes values containing commas, quotes, or newlines", () => {
    const csv = toCsv([{ Message: 'fix "bug", add tests\nmore' }]);
    expect(csv).toContain('"fix ""bug"", add tests\nmore"');
  });
});
