import { ZodError } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { AppError, ErrorCode } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import type { Actor } from "@/lib/auth/actor";

type AuthMode = "public" | "user" | "admin";

interface ApiHandlerOptions {
  auth: AuthMode;
}

export interface ApiHandlerContext { actor: Actor | null }
type ApiHandler = (request: NextRequest) => Promise<NextResponse>;
type AuthenticatedApiHandler = (request: NextRequest, context: ApiHandlerContext) => Promise<NextResponse>;

export function withApiHandler(options: ApiHandlerOptions, handler: AuthenticatedApiHandler): ApiHandler {
  return async (request) => {
    try {
      let actor: Actor | null = null;
      if (options.auth !== "public") {
        const session = await auth();
        actor = session?.user?.id ? await loadHumanActor(session.user.id) : null;
        if (!actor) throw new AppError(ErrorCode.UNAUTHORIZED, "Authentication required", 401);
        if (options.auth === "admin" && actor.role !== "ADMIN") {
          throw new AppError(ErrorCode.FORBIDDEN, "Admin permission required", 403);
        }
      }
      return await handler(request, { actor });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: { code: ErrorCode.INVALID_INPUT, message: "Request validation failed" } },
          { status: 400 }
        );
      }

      if (error instanceof AppError) {
        return NextResponse.json(
          { error: { code: error.code, message: error.message } },
          { status: error.status }
        );
      }

      logger.error(
        { errorType: error instanceof Error ? error.name : "UnknownError" },
        "api.request_failed"
      );
      return NextResponse.json(
        { error: { code: ErrorCode.INTERNAL_ERROR, message: "An unexpected error occurred" } },
        { status: 500 }
      );
    }
  };
}
