import NextAuth from "next-auth";
import { type NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/auth";

type AuthRouteContext = {
  params: Promise<{ nextauth: string[] }>;
};

type RateBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateBucket>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 40;
const MAX_BUCKETS = 5_000;

export async function GET(
  request: NextRequest,
  context: AuthRouteContext,
) {
  const blocked = enforceRateLimit(request);
  if (blocked) {
    return blocked;
  }

  return NextAuth(request, context, authOptions);
}

export async function POST(
  request: NextRequest,
  context: AuthRouteContext,
) {
  const blocked = enforceRateLimit(request);
  if (blocked) {
    return blocked;
  }

  return NextAuth(request, context, authOptions);
}

function enforceRateLimit(request: NextRequest): NextResponse | null {
  const now = Date.now();
  const key = requestKey(request);
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    compactBuckets(now);
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }


  current.count += 1;
  if (current.count <= MAX_REQUESTS) {
    return null;
  }

  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1_000));
  return NextResponse.json(
    { error: "Too many authentication requests." },
    {
      status: 429,
      headers: {
        "cache-control": "no-store",
        "retry-after": String(retryAfter),
      },
    },
  );
}

function requestKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";

  return `${address}:${request.nextUrl.pathname}`;
}

function compactBuckets(now: number) {
  if (buckets.size < 1_000) {
    return;
  }

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  while (buckets.size >= MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (typeof oldestKey !== "string") {
      break;
    }
    buckets.delete(oldestKey);
  }
}
