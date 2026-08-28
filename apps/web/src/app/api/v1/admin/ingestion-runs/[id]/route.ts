import { NextResponse } from "next/server";
import { getIngestionRun } from "@/features/studio-operations";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const GET = withApiHandler(
  { auth: "admin" },
  async (request, { actor }) => {
    if (!actor)
      throw new AppError(ErrorCode.UNAUTHORIZED, "Authentication required", 401);
    const id = request.nextUrl.pathname.split("/").at(-1);
    if (!id)
      throw new AppError(ErrorCode.INVALID_INPUT, "Run id is required", 400);
    return NextResponse.json(await getIngestionRun(actor, id));
  },
);
