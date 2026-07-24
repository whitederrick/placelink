"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { scrapStatusResponseSchema } from "./schema";

interface CourseScrapClientStatus {
  signedIn: boolean | undefined;
  scrapped: boolean;
  scrapCount: number;
}

export function useCourseScrap(slug: string, initialScrapCount: number) {
  const queryClient = useQueryClient();
  const queryKey = ["courses", slug, "scrap"] as const;
  const status = useQuery<CourseScrapClientStatus>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/courses/${encodeURIComponent(slug)}/scrap`,
      );
      if (response.status === 401)
        return {
          signedIn: false as const,
          scrapped: false,
          scrapCount: initialScrapCount,
        };
      if (!response.ok) throw new Error("Scrap status request failed");
      const result = scrapStatusResponseSchema.parse(await response.json());
      return { signedIn: true as const, ...result.data };
    },
    initialData: {
      signedIn: undefined,
      scrapped: false,
      scrapCount: initialScrapCount,
    },
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: async (shouldScrap: boolean) => {
      const response = await fetch(
        `/api/v1/courses/${encodeURIComponent(slug)}/scrap`,
        { method: shouldScrap ? "POST" : "DELETE" },
      );
      if (!response.ok) throw new Error("Scrap mutation failed");
      return scrapStatusResponseSchema.parse(await response.json());
    },
    onSuccess: (result) =>
      queryClient.setQueryData(queryKey, {
        signedIn: true as const,
        ...result.data,
      }),
  });
  return { status: status.data, isLoading: status.isFetching, mutation };
}
