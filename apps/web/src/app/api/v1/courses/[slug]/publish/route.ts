import { NextResponse } from "next/server";
import {
  publishCourseDraft,
  publishCourseRequestSchema,
} from "@/features/courses";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const POST = withApiHandler(
  { auth: "user" },
  async (request, { actor }) => {
    if (!actor)
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        401,
      );
    const segments = request.nextUrl.pathname.split("/");
    const slug = segments.at(-2);
    if (!slug)
      throw new AppError(ErrorCode.INVALID_INPUT, "Course slug required", 400);
    const locale =
      request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ko";
    const input = publishCourseRequestSchema.parse(await request.json());
    return NextResponse.json(
      await publishCourseDraft(actor, slug, locale, input),
    );
  },
);
