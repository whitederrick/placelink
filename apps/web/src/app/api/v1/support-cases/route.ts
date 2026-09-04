import { NextResponse } from "next/server";
import {
  createCustomerSupportCase,
  customerSupportCaseRequestSchema,
} from "@/features/support-cases";
import { withApiHandler } from "@/lib/api";
import { AppError, ErrorCode } from "@/lib/errors";

const MAX_REQUEST_BYTES = 16_384;

export const POST = withApiHandler(
  { auth: "user" },
  async (request, { actor }) => {
    if (!actor) {
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        401,
      );
    }
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      throw new AppError(ErrorCode.INVALID_INPUT, "Request is too large", 413);
    }
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      throw new AppError(ErrorCode.INVALID_INPUT, "Request is too large", 413);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new AppError(ErrorCode.INVALID_INPUT, "Invalid JSON body", 400);
    }
    const input = customerSupportCaseRequestSchema.parse(payload);
    return NextResponse.json(await createCustomerSupportCase(actor, input), {
      status: 201,
    });
  },
);
