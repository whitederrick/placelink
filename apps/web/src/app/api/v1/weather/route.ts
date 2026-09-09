import { NextResponse } from "next/server";
import { createKmaWeatherProvider } from "@/lib/adapters/weather";
import { webEnv } from "@/lib/env";
import { withApiHandler } from "@/lib/api";

export const dynamic = "force-dynamic";

const provider = webEnv.KMA_SERVICE_KEY
  ? createKmaWeatherProvider(webEnv.KMA_SERVICE_KEY)
  : undefined;

export const GET = withApiHandler({ auth: "public" }, async () => {
  if (!provider) return NextResponse.json({ data: null });
  try {
    return NextResponse.json({ data: await provider.getCurrentSeoulWeather(new Date()) });
  } catch {
    return NextResponse.json({ data: null });
  }
});
