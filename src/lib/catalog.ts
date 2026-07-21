import "server-only";

import {
  SHIELDED_PAYMENTS_TRACK_ID,
  ZCASH_ECOSYSTEM_ID,
  parseCatalogResponse,
  parsePublicCurriculum,
  type CatalogResponse,
  type PublicCurriculum,
} from "@/lib/platform";

export type CatalogLoadResult =
  | { catalog: CatalogResponse; error: null }
  | { catalog: null; error: string };

export type CurriculumLoadResult =
  | { curriculum: PublicCurriculum; error: null }
  | { curriculum: null; error: string };

const DEFAULT_LOCAL_CORE_API_BASE_URL = "http://localhost:8080";

export async function loadCatalog(): Promise<CatalogLoadResult> {
  const coreApiBaseUrl = resolveCoreApiBaseUrl();

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

export async function loadCurriculum(): Promise<CurriculumLoadResult> {
  const coreApiBaseUrl = resolveCoreApiBaseUrl();

  if (!coreApiBaseUrl) {
    return {
      curriculum: null,
      error: "Core curriculum is not configured for this environment.",
    };
  }

  const path = [
    "v3/catalog",
    encodeURIComponent(ZCASH_ECOSYSTEM_ID),
    "tracks",
    encodeURIComponent(SHIELDED_PAYMENTS_TRACK_ID),
    "curriculum",
  ].join("/");

  try {
    const response = await fetch(`${coreApiBaseUrl}/${path}`, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      return {
        curriculum: null,
        error: `Core curriculum returned HTTP ${response.status}.`,
      };
    }

    return {
      curriculum: parsePublicCurriculum(await response.json()),
      error: null,
    };
  } catch {
    return {
      curriculum: null,
      error: "Core curriculum is temporarily unavailable.",
    };
  }
}

function resolveCoreApiBaseUrl(): string | null {
  return (
    process.env.CORE_API_BASE_URL?.replace(/\/$/, "") ??
    (process.env.NODE_ENV === "development"
      ? DEFAULT_LOCAL_CORE_API_BASE_URL
      : null)
  );
}
