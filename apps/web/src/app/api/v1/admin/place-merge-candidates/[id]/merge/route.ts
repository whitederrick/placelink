import { NextRequest, NextResponse } from "next/server";
import { mergePlaceMergeCandidate } from "@/features/place-merge-candidates";
import { mergePlaceMergeCandidateSchema } from "@/features/place-merge-candidates/schema";
import { withApiHandler } from "@/lib/api";

export const PATCH = withApiHandler({ auth: "permission", permission: "studio.content.manage" }, async (request: NextRequest, { actor }) => {
  const id = request.nextUrl.pathname.split("/").at(-2)!;
  const body = mergePlaceMergeCandidateSchema.parse(await request.json());
  const result = await mergePlaceMergeCandidate(actor!, id, body.reason);
  return NextResponse.json({ data: result });
});
