import type { HomeFeedQuery } from "./schema";

const TRACKED_FILTERS = ["area", "situation", "budget", "mood"] as const;

export function findTrackedHomeFilter(
  filters: HomeFeedQuery,
): ["sort" | "ranking" | (typeof TRACKED_FILTERS)[number], string] | undefined {
  if (filters.sort === "popular") return ["sort", filters.sort];
  if (filters.ranking === "monthly") return ["ranking", filters.ranking];
  for (const key of TRACKED_FILTERS) {
    const value = filters[key];
    if (value) return [key, value];
  }
  return undefined;
}
