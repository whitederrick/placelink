import { NextResponse } from "next/server";
import { loadCourseDraft, updateCourseDraft, updateCourseDraftRequestSchema } from "@/features/courses";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const GET = withApiHandler({ auth: "user" }, async (request, { actor }) => {
  if (!actor) throw new AppError(ErrorCode.UNAUTHORIZED, "Authentication required", 401);
  const slug = request.nextUrl.pathname.split("/").at(-1);
  if (!slug) throw new AppError(ErrorCode.INVALID_INPUT, "Course slug required", 400);
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ko";
  return NextResponse.json(await loadCourseDraft(actor, slug, locale));
});

export const PATCH = withApiHandler({ auth: "user" }, async (request, { actor }) => {
  if (!actor) throw new AppError(ErrorCode.UNAUTHORIZED, "Authentication required", 401);
  const slug = request.nextUrl.pathname.split("/").at(-1);
  if (!slug) throw new AppError(ErrorCode.INVALID_INPUT, "Course slug required", 400);
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ko";
  const input = updateCourseDraftRequestSchema.parse(await request.json());
  return NextResponse.json(await updateCourseDraft(actor, slug, locale, input));
});
