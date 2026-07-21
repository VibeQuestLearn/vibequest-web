import "server-only";

import {
  parseCatalogResponse,
  type CatalogResponse,
} from "@/lib/platform";

export type CatalogLoadResult =
  | { catalog: CatalogResponse; error: null }
  | { catalog: null; error: string };

const DEFAULT_LOCAL_CORE_API_BASE_URL = "http://localhost:8080";

export async function loadCatalog(): Promise<CatalogLoadResult> {
  const coreApiBaseUrl =
    process.env.CORE_API_BASE_URL?.replace(/\/$/, "") ??
    (process.env.NODE_ENV === "development"
      ? DEFAULT_LOCAL_CORE_API_BASE_URL
      : null);

  if (!coreApiBaseUrl) {
    return {
      catalog: null,
      error: "Core catalog is not configured for this environment.",
    };
  }

  try {
    const response = await fetch(`${coreApiBaseUrl}/v3/catalog`, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      return {
        catalog: null,
        error: `Core catalog returned HTTP ${response.status}.`,
      };
    }

    return {
      catalog: parseCatalogResponse(await response.json()),
      error: null,
    };
  } catch {
    return {
      catalog: null,
      error: "Core catalog is temporarily unavailable.",
    };
  }
}
