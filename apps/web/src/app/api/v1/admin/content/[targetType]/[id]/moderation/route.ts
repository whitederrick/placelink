import { NextRequest, NextResponse } from "next/server";
import { moderateContent, contentTargetTypeSchema } from "@/features/content-moderation";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const PATCH = withApiHandler(
  { auth: "permission", permission: "studio.content.manage" },
  async (request: NextRequest, { actor }) => {
    const segments = request.nextUrl.pathname.split("/");
    const id = segments.at(-2);
    const targetType = contentTargetTypeSchema.parse(segments.at(-3)?.toUpperCase());
    if (!actor || !id) throw new AppError(ErrorCode.INVALID_INPUT, "Content id required", 400);
    return NextResponse.json(await moderateContent(actor, targetType, id, await request.json()));
  },
);
