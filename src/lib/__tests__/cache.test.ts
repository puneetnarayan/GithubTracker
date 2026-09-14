import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "@/lib/cache";

describe("mapWithConcurrency", () => {
  it("maps every item and preserves result order", async () => {
    const items = [5, 1, 4, 2, 3];
    const results = await mapWithConcurrency(items, 2, async (n) => {
      await new Promise((r) => setTimeout(r, n));
      return n * 10;
    });
    expect(results).toEqual([50, 10, 40, 20, 30]);
  });

  it("never runs more than `limit` tasks concurrently", async () => {
    let active = 0;
    let maxActive = 0;
    await mapWithConcurrency(Array.from({ length: 10 }, (_, i) => i), 3, async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
    });
    expect(maxActive).toBeLessThanOrEqual(3);
  });
});
