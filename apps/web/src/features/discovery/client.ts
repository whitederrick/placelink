import {
  homeFeedResponseSchema,
  type HomeFeedQuery,
  type HomeFeedResponse,
} from "./schema";

type Request = typeof fetch;

export async function fetchHomeFeedPage(
  query: HomeFeedQuery,
  request: Request = fetch,
): Promise<HomeFeedResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const response = await request(`/api/v1/discovery/feed?${params.toString()}`);
  if (!response.ok) throw new Error("Home feed request failed");
  return homeFeedResponseSchema.parse(await response.json());
}
