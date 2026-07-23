import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { mintCoreAssertion } from "@/lib/core-assertion";

export const maxDuration = 180;
export const dynamic = "force-dynamic";

const CORE_API_BASE_URL = process.env.CORE_API_BASE_URL?.replace(/\/$/, "");
const DEFAULT_LOCAL_CORE_API_BASE_URL = "http://localhost:8080";

type ProtectedRateBucket = {
  count: number;
  resetAt: number;
};

const protectedBuckets = new Map<string, ProtectedRateBucket>();
const PROTECTED_WINDOW_MS = 60_000;
const PROTECTED_REQUEST_LIMIT = 120;
const EXPENSIVE_REQUEST_LIMIT = 20;
const MAX_PROTECTED_BUCKETS = 5_000;

type CoreRouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: NextRequest, context: CoreRouteContext) {
  return proxyCoreRequest(request, context);
}

export async function POST(request: NextRequest, context: CoreRouteContext) {
  return proxyCoreRequest(request, context);
}

export async function PATCH(request: NextRequest, context: CoreRouteContext) {
  return proxyCoreRequest(request, context);
}

export async function DELETE(request: NextRequest, context: CoreRouteContext) {
  return proxyCoreRequest(request, context);
}

async function proxyCoreRequest(
  request: NextRequest,
  context: CoreRouteContext,
) {
  const coreApiBaseUrl =
    CORE_API_BASE_URL ??
    (process.env.NODE_ENV === "development" ? DEFAULT_LOCAL_CORE_API_BASE_URL : null);

  if (!coreApiBaseUrl) {
    return NextResponse.json(
      { error: "CORE_API_BASE_URL is not configured for this deployment." },
      { status: 503 },
    );
  }

  const { path } = await context.params;
  const normalizedPath = path.map(encodeURIComponent).join("/");
  const url = new URL(request.url);
  const targetUrl = `${coreApiBaseUrl}/${normalizedPath}${url.search}`;
  const headers: Record<string, string> = {
    accept: request.headers.get("accept") ?? "application/json",
    "content-type": request.headers.get("content-type") ?? "application/json",
  };

  if (!isPublicCoreRoute(normalizedPath)) {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    });

    if (
      token?.provider !== "google" ||
      typeof token.userId !== "string" ||
      typeof token.providerSubject !== "string"
    ) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401, headers: { "cache-control": "no-store" } },
      );
    }

    const limited = enforceProtectedRateLimit(token.userId, normalizedPath);
    if (limited) {
      return limited;
    }

    try {
      headers.authorization = `Bearer ${await mintCoreAssertion({
        userId: token.userId,
        providerSubject: token.providerSubject,
        email: typeof token.email === "string" ? token.email : null,
        name: typeof token.name === "string" ? token.name : null,
      })}`;
    } catch {
      return NextResponse.json(
        { error: "Core identity signing is not configured." },
        { status: 503, headers: { "cache-control": "no-store" } },
      );
    }
  }

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });
    const responseBody = await response.text();

    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        "cache-control": "no-store",
        "content-type":
          response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach vibequest-core." },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}

function enforceProtectedRateLimit(
  userId: string,
  path: string,
): NextResponse | null {
  const now = Date.now();
  const key = `${userId}:${path}`;
  const current = protectedBuckets.get(key);
  const limit = isExpensiveCoreRoute(path)
    ? EXPENSIVE_REQUEST_LIMIT
    : PROTECTED_REQUEST_LIMIT;

  if (!current || current.resetAt <= now) {
    compactProtectedBuckets(now);
    protectedBuckets.set(key, { count: 1, resetAt: now + PROTECTED_WINDOW_MS });
    return null;
  }

  current.count += 1;
  if (current.count <= limit) {
    return null;
  }

  return NextResponse.json(
    { error: "Too many protected requests." },
    {
      status: 429,
      headers: {
        "cache-control": "no-store",
        "retry-after": String(
          Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
        ),
      },
    },
  );
}

function isExpensiveCoreRoute(path: string): boolean {
  return (
    path.includes("/generate") ||
    path.includes("/tutor") ||
    path.startsWith("ai/learning") ||
    path.startsWith("v3/submissions")
  );
}

function compactProtectedBuckets(now: number) {
  for (const [key, bucket] of protectedBuckets) {
    if (bucket.resetAt <= now) {
      protectedBuckets.delete(key);
    }
  }

  while (protectedBuckets.size >= MAX_PROTECTED_BUCKETS) {
    const oldestKey = protectedBuckets.keys().next().value;
    if (typeof oldestKey !== "string") {
      break;
    }
    protectedBuckets.delete(oldestKey);
  }
}

function isPublicCoreRoute(path: string): boolean {
  return (
    path === "health" ||
    path === "ready" ||
    path === "v3/catalog" ||
    path.startsWith("v3/catalog/")
  );
}
