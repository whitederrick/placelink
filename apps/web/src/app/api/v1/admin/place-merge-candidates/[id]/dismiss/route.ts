import { NextRequest, NextResponse } from "next/server";
import { dismissPlaceMergeCandidate } from "@/features/place-merge-candidates";
import { withApiHandler } from "@/lib/api";
export const PATCH = withApiHandler({ auth: "permission", permission: "studio.content.manage" }, async (request: NextRequest, { actor }) => { const id = request.nextUrl.pathname.split("/").at(-2)!; const body = await request.json() as { reason?: string }; await dismissPlaceMergeCandidate(actor!, id, body.reason ?? ""); return NextResponse.json({ data: { id } }); });
