export const discoveryQueryKeys = {
  all: ["discovery"] as const,
  feed: () => [...discoveryQueryKeys.all, "feed"] as const
};
