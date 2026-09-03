import { NextResponse } from "next/server";
import { getSupportCase, updateSupportCase } from "@/features/support-cases";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

function caseId(pathname: string) {
  return pathname.split("/").at(-1);
}

export const GET = withApiHandler(
  { auth: "admin" },
  async (request, { actor }) => {
    if (!actor)
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        401,
      );
    const id = caseId(request.nextUrl.pathname);
    if (!id)
      throw new AppError(
        ErrorCode.INVALID_INPUT,
        "Support case id is required",
        400,
      );
    return NextResponse.json(await getSupportCase(actor, id));
  },
);

export const PATCH = withApiHandler(
  { auth: "admin" },
  async (request, { actor }) => {
    if (!actor)
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        401,
      );
    const id = caseId(request.nextUrl.pathname);
    if (!id)
      throw new AppError(
        ErrorCode.INVALID_INPUT,
        "Support case id is required",
        400,
      );
    return NextResponse.json(
      await updateSupportCase(actor, id, await request.json()),
    );
  },
);
