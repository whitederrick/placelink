import { NextResponse } from "next/server";
import { placeListQuerySchema, searchPlaces } from "@/features/places";
import { withApiHandler } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withApiHandler({ auth: "public" }, async (request) => {
  const query = placeListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  return NextResponse.json(await searchPlaces(query));
});
