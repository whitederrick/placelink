import { NextResponse } from "next/server";
import { getSupportCaseAttention } from "@/features/support-cases";
import { withApiHandler } from "@/lib/api";

export const GET = withApiHandler({ auth: "permission", permission: "studio.support.read" }, async (_request, { actor }) => NextResponse.json({ data: await getSupportCaseAttention(actor!) }));
