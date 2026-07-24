import { NextResponse } from "next/server";
import { createCourseDraft, createCourseDraftRequestSchema } from "@/features/courses";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const POST = withApiHandler({ auth: "user" }, async (request, { actor }) => {
  if (!actor) throw new AppError(ErrorCode.UNAUTHORIZED, "Authentication required", 401);
  const input = createCourseDraftRequestSchema.parse(await request.json());
  return NextResponse.json(await createCourseDraft(actor, input), { status: 201 });
});
