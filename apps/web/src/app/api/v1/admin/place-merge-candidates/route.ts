import { NextResponse } from "next/server";
import { listPlaceMergeCandidates } from "@/features/place-merge-candidates";
import { withApiHandler } from "@/lib/api";
export const dynamic = "force-dynamic";
export const GET = withApiHandler({ auth: "permission", permission: "studio.content.read" }, async (_request, { actor }) => NextResponse.json(await listPlaceMergeCandidates(actor!)));
