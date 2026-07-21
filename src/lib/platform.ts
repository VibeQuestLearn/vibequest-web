export const PLATFORM_SCHEMA_VERSION = 3 as const;
export const ZCASH_ECOSYSTEM_ID = "zcash" as const;
export const SHIELDED_PAYMENTS_TRACK_ID = "shielded-payments-safety" as const;
export const CURRICULUM_VERSION =
  "zcash-shielded-payments-1.0.0" as const;
export const SCENARIO_MANIFEST_VERSION =
  "shielded-checkout-scenarios-1.0.0" as const;

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

export type ReviewerStatus = "reviewed";

export type CurriculumSource = {
  source_id: string;
  title: string;
  version: string;
  url: string;
};

export type CurriculumCodeLens = {
  path: string;
  symbol: string;
  language: string;
  snippet: string;
};

export type CurriculumCheckpointOption = {
  option_id: string;
  label: string;
};

export type CurriculumCheckpoint = {
  checkpoint_id: string;
  prompt: string;
  options: CurriculumCheckpointOption[];
};

export type CurriculumLesson = {
  lesson_id: string;
  sequence: number;
  title: string;
  learner_outcome: string;
  explainer: string[];
  code_lens: CurriculumCodeLens;
  source_references: string[];
  misconception: string;
  checkpoint: CurriculumCheckpoint;
  lab_bridge: string;
  content_version: string;
  reviewer_status: ReviewerStatus;
  valid_case_count: number;
  denial_case_count: number;
};

export type CurriculumCapstone = {
  capstone_id: string;
  title: string;
  objective: string;
  repair_count: number;
  explanation_count: number;
  completion_evidence: string[];
};

export type PublicCurriculum = {
  curriculum_version: typeof CURRICULUM_VERSION;
  ecosystem_id: typeof ZCASH_ECOSYSTEM_ID;
  track_id: typeof SHIELDED_PAYMENTS_TRACK_ID;
  track_version: string;
  content_version: string;
  source_manifest_version: string;
  scenario_manifest_version: typeof SCENARIO_MANIFEST_VERSION;
  tutor_contract_version: string;
  reviewer_status: ReviewerStatus;
  lessons: CurriculumLesson[];
  sources: CurriculumSource[];
  capstone: CurriculumCapstone;
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

export function parsePublicCurriculum(value: unknown): PublicCurriculum {
  if (
    !isRecord(value) ||
    value.curriculum_version !== CURRICULUM_VERSION ||
    value.ecosystem_id !== ZCASH_ECOSYSTEM_ID ||
    value.track_id !== SHIELDED_PAYMENTS_TRACK_ID ||
    value.scenario_manifest_version !== SCENARIO_MANIFEST_VERSION ||
    value.reviewer_status !== "reviewed" ||
    !Array.isArray(value.lessons) ||
    value.lessons.length !== 5 ||
    !Array.isArray(value.sources) ||
    !isRecord(value.capstone)
  ) {
    throw new Error("Core returned an unsupported curriculum contract.");
  }

  return {
    curriculum_version: CURRICULUM_VERSION,
    ecosystem_id: ZCASH_ECOSYSTEM_ID,
    track_id: SHIELDED_PAYMENTS_TRACK_ID,
    track_version: readString(value, "track_version"),
    content_version: readString(value, "content_version"),
    source_manifest_version: readString(value, "source_manifest_version"),
    scenario_manifest_version: SCENARIO_MANIFEST_VERSION,
    tutor_contract_version: readString(value, "tutor_contract_version"),
    reviewer_status: "reviewed",
    lessons: value.lessons.map(parseCurriculumLesson),
    sources: value.sources.map(parseCurriculumSource),
    capstone: {
      capstone_id: readString(value.capstone, "capstone_id"),
      title: readString(value.capstone, "title"),
      objective: readString(value.capstone, "objective"),
      repair_count: readCount(value.capstone, "repair_count", 1),
      explanation_count: readCount(value.capstone, "explanation_count", 1),
      completion_evidence: readStringArray(
        value.capstone,
        "completion_evidence",
      ),
    },
  };
}

function parseCurriculumLesson(value: unknown): CurriculumLesson {
  if (
    !isRecord(value) ||
    value.reviewer_status !== "reviewed" ||
    !isRecord(value.code_lens) ||
    !isRecord(value.checkpoint) ||
    !Array.isArray(value.checkpoint.options) ||
    value.checkpoint.options.length !== 4
  ) {
    throw new Error("Core returned an invalid reviewed lesson.");
  }

  return {
    lesson_id: readString(value, "lesson_id"),
    sequence: readCount(value, "sequence", 1),
    title: readString(value, "title"),
    learner_outcome: readString(value, "learner_outcome"),
    explainer: readStringArray(value, "explainer"),
    code_lens: {
      path: readString(value.code_lens, "path"),
      symbol: readString(value.code_lens, "symbol"),
      language: readString(value.code_lens, "language"),
      snippet: readString(value.code_lens, "snippet"),
    },
    source_references: readStringArray(value, "source_references"),
    misconception: readString(value, "misconception"),
    checkpoint: {
      checkpoint_id: readString(value.checkpoint, "checkpoint_id"),
      prompt: readString(value.checkpoint, "prompt"),
      options: value.checkpoint.options.map(parseCheckpointOption),
    },
    lab_bridge: readString(value, "lab_bridge"),
    content_version: readString(value, "content_version"),
    reviewer_status: "reviewed",
    valid_case_count: readCount(value, "valid_case_count", 1),
    denial_case_count: readCount(value, "denial_case_count", 2),
  };
}

function parseCheckpointOption(value: unknown): CurriculumCheckpointOption {
  if (!isRecord(value)) {
    throw new Error("Core returned an invalid checkpoint option.");
  }
  return {
    option_id: readString(value, "option_id"),
    label: readString(value, "label"),
  };
}

function parseCurriculumSource(value: unknown): CurriculumSource {
  if (!isRecord(value)) {
    throw new Error("Core returned an invalid curriculum source.");
  }
  return {
    source_id: readString(value, "source_id"),
    title: readString(value, "title"),
    version: readString(value, "version"),
    url: readString(value, "url"),
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

function readCount(
  value: Record<string, unknown>,
  key: string,
  minimum: number,
): number {
  const field = value[key];
  if (
    typeof field !== "number" ||
    !Number.isInteger(field) ||
    field < minimum
  ) {
    throw new Error(`Core returned an invalid ${key} value.`);
  }
  return field;
}

function readStringArray(
  value: Record<string, unknown>,
  key: string,
): string[] {
  const field = value[key];
  if (
    !Array.isArray(field) ||
    field.length === 0 ||
    field.some((entry) => typeof entry !== "string" || entry.trim().length === 0)
  ) {
    throw new Error(`Core returned an invalid ${key} value.`);
  }
  return field;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
