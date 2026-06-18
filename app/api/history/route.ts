import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export async function GET() {
  try {
    const redis = getRedis();
    if (!redis) return NextResponse.json({ entries: [] });

    const entries = await redis.lrange("ux_analyses", 0, 19);
    return NextResponse.json({ entries });
  } catch (e) {
    console.error("History fetch error:", e);
    return NextResponse.json({ entries: [] });
  }
}
