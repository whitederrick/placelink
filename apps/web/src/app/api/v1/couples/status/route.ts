import { NextResponse } from "next/server";
import { loadCoupleStatus } from "@/features/couples";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const GET = withApiHandler({ auth: "user" }, async (_request, { actor }) => {
  if (!actor) throw new AppError(ErrorCode.UNAUTHORIZED, "Authentication required", 401);
  return NextResponse.json(await loadCoupleStatus(actor));
});
