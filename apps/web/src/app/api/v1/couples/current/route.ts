import { NextResponse } from "next/server";
import { dissolveCouple } from "@/features/couples";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const DELETE = withApiHandler({ auth: "user" }, async (_request, { actor }) => {
  if (!actor) throw new AppError(ErrorCode.UNAUTHORIZED, "Authentication required", 401);
  return NextResponse.json(await dissolveCouple(actor));
});
