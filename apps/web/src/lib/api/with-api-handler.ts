import { createHash, timingSafeEqual } from "node:crypto";
import { ZodError } from "zod";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { AppError, ErrorCode } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import type { Actor } from "@/lib/auth/actor";
import {
  hasStudioPermission,
  type StudioPermission,
} from "@/lib/auth/permissions";
import { webEnv } from "@/lib/env";

type HumanAuthMode = "public" | "optional" | "user" | "admin";

type ApiHandlerOptions =
  | { auth: HumanAuthMode }
  | { auth: "permission"; permission: StudioPermission }
  | { auth: "agent"; agentId: string };

const bearerAuthorizationSchema = z.string().regex(/^Bearer [^\s]+$/);

export interface ApiHandlerContext {
  actor: Actor | null;
}
type ApiHandler = (request: NextRequest) => Promise<NextResponse>;
type AuthenticatedApiHandler = (
  request: NextRequest,
  context: ApiHandlerContext,
) => Promise<NextResponse>;

function secureEquals(left: string, right: string) {
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function authenticateAgent(request: NextRequest, agentId: string): Actor {
  const authorization = bearerAuthorizationSchema.safeParse(
    request.headers.get("authorization"),
  );
  const expected = webEnv.CRON_SECRET ? `Bearer ${webEnv.CRON_SECRET}` : null;
  if (
    !authorization.success ||
    !expected ||
    !secureEquals(authorization.data, expected)
  ) {
    throw new AppError(ErrorCode.UNAUTHORIZED, "Authentication required", 401);
  }
  return { id: agentId, type: "AGENT", role: "ADMIN" };
}

export function withApiHandler(
  options: ApiHandlerOptions,
  handler: AuthenticatedApiHandler,
): ApiHandler {
  return async (request) => {
    try {
      let actor: Actor | null = null;
      if (options.auth === "agent") {
        actor = authenticateAgent(request, options.agentId);
      } else if (options.auth !== "public") {
        const session = await auth();
        actor = session?.user?.id
          ? await loadHumanActor(session.user.id)
          : null;
        if (!actor && options.auth !== "optional") {
          throw new AppError(
            ErrorCode.UNAUTHORIZED,
            "Authentication required",
            401,
          );
        }
        if (options.auth === "admin" && actor?.role !== "ADMIN") {
          throw new AppError(
            ErrorCode.FORBIDDEN,
            "Admin permission required",
            403,
          );
        }
        if (
          options.auth === "permission" &&
          !hasStudioPermission(actor, options.permission)
        ) {
          throw new AppError(
            ErrorCode.FORBIDDEN,
            "Studio permission required",
            403,
          );
        }
      }
      return await handler(request, { actor });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: {
              code: ErrorCode.INVALID_INPUT,
              message: "Request validation failed",
            },
          },
          { status: 400 },
        );
      }

      if (error instanceof AppError) {
        return NextResponse.json(
          { error: { code: error.code, message: error.message } },
          { status: error.status },
        );
      }

      logger.error(
        { errorType: error instanceof Error ? error.name : "UnknownError" },
        "api.request_failed",
      );
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.INTERNAL_ERROR,
            message: "An unexpected error occurred",
          },
        },
        { status: 500 },
      );
    }
  };
}
