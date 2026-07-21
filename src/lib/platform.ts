export const PLATFORM_SCHEMA_VERSION = 3 as const;
export const ZCASH_ECOSYSTEM_ID = "zcash" as const;
export const SHIELDED_PAYMENTS_TRACK_ID = "shielded-payments-safety" as const;

export type TrackStatus = "building" | "enabled" | "retired";

export type ZcashRegistration = {
  network: string;
  address_standard: string;
  payment_request_standard: string;
  custody_mode: string;
};

export type EcosystemConfiguration = {
  kind: "zcash";
  configuration: ZcashRegistration;
};

export type TrackRegistration = {
  track_id: string;
  title: string;
  summary: string;
  enabled: boolean;
  status: TrackStatus;
  track_version: string;
  content_version: string;
  source_manifest_version: string;
  lesson_count: number;
};

export type EcosystemRegistration = {
  ecosystem_id: string;
  name: string;
  summary: string;
  enabled: boolean;
  configuration: EcosystemConfiguration;
  tracks: TrackRegistration[];
};

export type CatalogResponse = {
  schema_version: typeof PLATFORM_SCHEMA_VERSION;
  ecosystems: EcosystemRegistration[];
};

export type RecordNamespace = {
  schema_version: typeof PLATFORM_SCHEMA_VERSION;
  ecosystem_id: string;
  track_id: string;
  track_version: string;
  content_version: string;
};

export type LearningSessionV3 = {
  session_id: string;
  user_id: string;
  namespace: RecordNamespace;
  current_lesson_id: string | null;
  status: "active" | "completed" | "archived";
  created_at: string;
  updated_at: string;
};

export type VerifierReference = {
  verifier_id: string;
  verifier_version: string;
  fixture_digest: string;
};

export type ScenarioV3 = {
  scenario_id: string;
  namespace: RecordNamespace;
  title: string;
  verifier: VerifierReference;
  source_references: string[];
};

export type EvidenceReference = {
  runner_version: string;
  source_digest: string;
  result_digest: string;
};

export type SubmissionV3 = {
  submission_id: string;
  user_id: string;
  scenario_id: string;
  namespace: RecordNamespace;
  status: "queued" | "running" | "passed" | "failed" | "error";
  evidence: EvidenceReference | null;
  created_at: string;
  updated_at: string;
};

export type CompletionReceiptV3 = {
  receipt_id: string;
  user_id: string;
  namespace: RecordNamespace;
  submission_id: string;
  evidence: EvidenceReference;
  completed_at: string;
};

export function parseCatalogResponse(value: unknown): CatalogResponse {
  if (!isRecord(value) || value.schema_version !== PLATFORM_SCHEMA_VERSION) {
    throw new Error("Core returned an unsupported catalog schema.");
  }
  if (!Array.isArray(value.ecosystems)) {
    throw new Error("Core returned a catalog without ecosystems.");
  }

  return {
    schema_version: PLATFORM_SCHEMA_VERSION,
    ecosystems: value.ecosystems.map(parseEcosystem),
  };
}

function parseEcosystem(value: unknown): EcosystemRegistration {
  if (!isRecord(value) || !Array.isArray(value.tracks)) {
    throw new Error("Core returned an invalid ecosystem registration.");
  }
  if (!isRecord(value.configuration) || value.configuration.kind !== "zcash") {
    throw new Error("Core returned an unsupported ecosystem configuration.");
  }
  const configuration = value.configuration.configuration;
  if (!isRecord(configuration)) {
    throw new Error("Core returned invalid Zcash registration data.");
  }

  return {
    ecosystem_id: readString(value, "ecosystem_id"),
    name: readString(value, "name"),
    summary: readString(value, "summary"),
    enabled: readBoolean(value, "enabled"),
    configuration: {
      kind: "zcash",
      configuration: {
        network: readString(configuration, "network"),
        address_standard: readString(configuration, "address_standard"),
        payment_request_standard: readString(configuration, "payment_request_standard"),
        custody_mode: readString(configuration, "custody_mode"),
      },
    },
    tracks: value.tracks.map(parseTrack),
  };
}

function parseTrack(value: unknown): TrackRegistration {
  if (!isRecord(value)) {
    throw new Error("Core returned an invalid track registration.");
  }
  const status = readString(value, "status");
  if (status !== "building" && status !== "enabled" && status !== "retired") {
    throw new Error("Core returned an unsupported track status.");
  }
  const lessonCount = value.lesson_count;
  if (typeof lessonCount !== "number" || !Number.isInteger(lessonCount) || lessonCount < 0) {
    throw new Error("Core returned an invalid lesson count.");
  }

  return {
    track_id: readString(value, "track_id"),
    title: readString(value, "title"),
    summary: readString(value, "summary"),
    enabled: readBoolean(value, "enabled"),
    status,
    track_version: readString(value, "track_version"),
    content_version: readString(value, "content_version"),
    source_manifest_version: readString(value, "source_manifest_version"),
    lesson_count: lessonCount,
  };
}

function readString(value: Record<string, unknown>, key: string): string {
  const field = value[key];
  if (typeof field !== "string" || field.trim().length === 0) {
    throw new Error(`Core returned an invalid ${key} value.`);
  }
  return field;
}

function readBoolean(value: Record<string, unknown>, key: string): boolean {
  const field = value[key];
  if (typeof field !== "boolean") {
    throw new Error(`Core returned an invalid ${key} value.`);
  }
  return field;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
