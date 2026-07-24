import { NextResponse } from "next/server";
import { findMapPlaces, mapPlacesQuerySchema } from "@/features/places";
import { withApiHandler } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withApiHandler({ auth: "public" }, async (request) => {
  const query = mapPlacesQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  return NextResponse.json(await findMapPlaces(query));
});
