import { NextResponse } from "next/server";
import { homeFeedQuerySchema, loadHomeFeed } from "@/features/discovery";
import { withApiHandler } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withApiHandler({ auth: "public" }, async (request) => {
  const query = homeFeedQuerySchema.parse({
    locale: request.nextUrl.searchParams.get("locale") ?? undefined,
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    take: request.nextUrl.searchParams.get("take") ?? undefined
  });
  const page = await loadHomeFeed(query.locale, query);
  return NextResponse.json({ data: page.data, meta: { nextCursor: page.nextCursor } });
});
