import { NextResponse } from "next/server";
import { createCoupleInvite, createCoupleInviteRequestSchema } from "@/features/couples";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const POST = withApiHandler({ auth: "user" }, async (request, { actor }) => {
  if (!actor) throw new AppError(ErrorCode.UNAUTHORIZED, "Authentication required", 401);
  const input = createCoupleInviteRequestSchema.parse(await request.json());
  const locale = request.headers.get("x-locale") === "en" ? "en" : "ko";
  return NextResponse.json(await createCoupleInvite(actor, input, request.nextUrl.origin, locale), { status: 201 });
});
