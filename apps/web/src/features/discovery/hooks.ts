"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchHomeFeedPage } from "./client";
import type { HomeFeedQuery, HomeFeedResponse } from "./schema";

type FeedFilters = Omit<HomeFeedQuery, "cursor">;

export const discoveryQueryKeys = {
  all: ["discovery"] as const,
  feed: (filters: FeedFilters) =>
    [...discoveryQueryKeys.all, "feed", filters] as const,
};

export function useHomeFeed(
  filters: FeedFilters,
  initialPage: HomeFeedResponse,
) {
  return useInfiniteQuery({
    queryKey: discoveryQueryKeys.feed(filters),
    queryFn: ({ pageParam }) =>
      fetchHomeFeedPage({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor,
    initialData: {
      pages: [initialPage],
      pageParams: [undefined],
    },
    staleTime: 30_000,
  });
}
