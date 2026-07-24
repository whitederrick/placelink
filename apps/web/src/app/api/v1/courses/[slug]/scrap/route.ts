import { NextResponse } from "next/server";
import {
  addCourseScrap,
  loadScrapStatus,
  removeCourseScrap,
  scrapCourseSlugSchema,
} from "@/features/scraps";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

function readSlug(request: Request) {
  const segments = new URL(request.url).pathname.split("/");
  return scrapCourseSlugSchema.parse(segments.at(-2));
}

export const GET = withApiHandler(
  { auth: "user" },
  async (request, { actor }) => {
    if (!actor)
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        401,
      );
    return NextResponse.json(await loadScrapStatus(actor, readSlug(request)));
  },
);

export const POST = withApiHandler(
  { auth: "user" },
  async (request, { actor }) => {
    if (!actor)
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        401,
      );
    return NextResponse.json(await addCourseScrap(actor, readSlug(request)));
  },
);

export const DELETE = withApiHandler(
  { auth: "user" },
  async (request, { actor }) => {
    if (!actor)
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        401,
      );
    return NextResponse.json(await removeCourseScrap(actor, readSlug(request)));
  },
);
