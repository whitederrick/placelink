import { NextResponse } from "next/server";
import { addSupportCaseEntry } from "@/features/support-cases";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

export const POST = withApiHandler(
  { auth: "admin" },
  async (request, { actor }) => {
    if (!actor)
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        401,
      );
    const segments = request.nextUrl.pathname.split("/");
    const id = segments.at(-2);
    if (!id)
      throw new AppError(
        ErrorCode.INVALID_INPUT,
        "Support case id is required",
        400,
      );
    return NextResponse.json(
      await addSupportCaseEntry(actor, id, await request.json()),
      { status: 201 },
    );
  },
);
