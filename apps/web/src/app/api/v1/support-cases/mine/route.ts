import { NextResponse } from "next/server";
import { listCustomerSupportCases } from "@/features/support-cases";
import { withApiHandler } from "@/lib/api";

export const GET = withApiHandler({ auth: "user" }, async (_request, { actor }) => NextResponse.json(await listCustomerSupportCases(actor!)));
