"use client";

import { useMutation } from "@tanstack/react-query";
import {
  createCourseDraftResponseSchema,
  publishCourseResponseSchema,
  updateCourseDraftResponseSchema,
  type CreateCourseDraftRequest,
  type PublishCourseRequest,
  type UpdateCourseDraftRequest,
} from "./schema";

export const courseQueryKeys = {
  all: ["courses"] as const,
  anchors: ["courses", "anchors"] as const,
};

export function useCreateCourseDraft() {
  return useMutation({
    mutationFn: async (input: CreateCourseDraftRequest) => {
      const response = await fetch("/api/v1/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error("Course draft request failed");
      return createCourseDraftResponseSchema.parse(await response.json());
    },
  });
}

export function useUpdateCourseDraft(slug: string, locale: "ko" | "en") {
  return useMutation({
    mutationFn: async (input: UpdateCourseDraftRequest) => {
      const response = await fetch(
        `/api/v1/courses/${encodeURIComponent(slug)}?locale=${locale}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      if (!response.ok) throw new Error("Course draft update failed");
      return updateCourseDraftResponseSchema.parse(await response.json());
    },
  });
}

export function usePublishCourseDraft(slug: string, locale: "ko" | "en") {
  return useMutation({
    mutationFn: async (input: PublishCourseRequest) => {
      const response = await fetch(
        `/api/v1/courses/${encodeURIComponent(slug)}/publish?locale=${locale}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      if (!response.ok) throw new Error("Course publish request failed");
      return publishCourseResponseSchema.parse(await response.json());
    },
  });
}
