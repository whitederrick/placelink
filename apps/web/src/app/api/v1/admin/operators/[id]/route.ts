import { NextResponse } from "next/server";
import { updateStudioOperator } from "@/features/studio-operations";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const PATCH = withApiHandler(
  { auth: "permission", permission: "studio.roles.manage" },
  async (request, { actor }) => {
    if (!actor)
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        401,
      );
    const id = request.nextUrl.pathname.split("/").at(-1);
    if (!id)
      throw new AppError(ErrorCode.INVALID_INPUT, "User id is required", 400);
    return NextResponse.json(
      await updateStudioOperator(actor, id, await request.json()),
    );
  },
);
