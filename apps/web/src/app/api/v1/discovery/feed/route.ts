import { NextResponse } from "next/server";
import { homeFeedQuerySchema, loadHomeFeed } from "@/features/discovery";
import { withApiHandler } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withApiHandler({ auth: "public" }, async (request) => {
  const query = homeFeedQuerySchema.parse({
    locale: request.nextUrl.searchParams.get("locale") ?? undefined,
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    take: request.nextUrl.searchParams.get("take") ?? undefined,
    sort: request.nextUrl.searchParams.get("sort") ?? undefined,
    ranking: request.nextUrl.searchParams.get("ranking") ?? undefined,
    area: request.nextUrl.searchParams.get("area") ?? undefined,
    situation: request.nextUrl.searchParams.get("situation") ?? undefined,
    budget: request.nextUrl.searchParams.get("budget") ?? undefined,
    mood: request.nextUrl.searchParams.get("mood") ?? undefined,
  });
  const page = await loadHomeFeed(query.locale, query);
  return NextResponse.json({
    data: page.data,
    meta: { nextCursor: page.nextCursor },
  });
});
