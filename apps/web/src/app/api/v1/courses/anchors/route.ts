import { NextResponse } from "next/server";
import { anchorListQuerySchema, listCourseAnchors } from "@/features/courses";
import { withApiHandler } from "@/lib/api";

export const GET = withApiHandler({ auth: "public" }, async (request) => {
  const query = anchorListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  return NextResponse.json(await listCourseAnchors(query));
});
