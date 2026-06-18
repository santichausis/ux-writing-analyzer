import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

export interface AnalysisEntry {
  id: string;
  timestamp: number;
  thumbnail: string; // small base64 data URL
  analysis: string;
  source: "image" | "figma";
  figmaUrl?: string;
  filename?: string;
}
