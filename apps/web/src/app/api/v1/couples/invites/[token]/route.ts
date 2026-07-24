import { NextResponse } from "next/server";
import { acceptCoupleInvite, acceptCoupleInviteRequestSchema, coupleInviteTokenSchema, loadCoupleInvite } from "@/features/couples";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

function readToken(request: Request) {
  return coupleInviteTokenSchema.parse(new URL(request.url).pathname.split("/").at(-1));
}

export const GET = withApiHandler({ auth: "public" }, async (request) =>
  NextResponse.json(await loadCoupleInvite(readToken(request))),
);

export const POST = withApiHandler({ auth: "user" }, async (request, { actor }) => {
  if (!actor) throw new AppError(ErrorCode.UNAUTHORIZED, "Authentication required", 401);
  const input = acceptCoupleInviteRequestSchema.parse(await request.json());
  return NextResponse.json(await acceptCoupleInvite(actor, readToken(request), input));
});
