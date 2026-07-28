export type EcosystemId = "basics" | "ckb" | "fiber" | "zcash" | "stacks";
export type QuestSource = "open-ai";

export type PersistenceStatus = {
  saved: boolean;
  warning: string | null;
};

export type LearningResourceDto = {
  title: string;
  url: string;
  reason: string;
};

export type LearningEvidenceDto = {
  claim: string;
  source_title: string;
  source_url: string;
  lesson_section: string;
  confidence: string;
};

export type LearningQualityScoreDto = {
  source_coverage: number;
  technical_depth: number;
  checkpoint_quality: number;
  placeholder_free: boolean;
  ecosystem_alignment: boolean;
  passed: boolean;
};

export type LearningModuleValidationStateDto = {
  source_grounding: boolean;
  technical_depth: boolean;
  placeholder_free: boolean;
  repetition_check: boolean;
  checkpoint_quality: boolean;
  ecosystem_alignment: boolean;
  passed: boolean;
};

export type LearningModuleGenerationStateDto = {
  lesson_index: number;
  lesson_id?: string | null;
  status: "queued" | "generating" | "ready" | "failed" | "validated" | string;
  validation: LearningModuleValidationStateDto;
  error?: string | null;
  updated_at: string;
};

export type AiProviderMetadataDto = {
  provider_kind: string;
  model: string;
  endpoint_origin: string;
  reasoning_effort: string;
  response_storage_disabled: boolean;
  timeout_seconds: number;
  configured: boolean;
};

export type LearningLessonEvalReportDto = {
  lesson_id: string;
  title: string;
  validation: LearningModuleValidationStateDto;
  quality_score: LearningQualityScoreDto;
  source_titles: string[];
  source_urls: string[];
  warning_count: number;
};

export type LearningEvalArtifactDto = {
  artifact_version: string;
  ecosystem_id: string;
  topic?: string | null;
  learning_profile?: string | null;
  learning_intents: string[];
  request_hash: string;
  provider: AiProviderMetadataDto;
  module_title: string;
  lesson_count: number;
  validation: LearningModuleValidationStateDto;
  lesson_reports: LearningLessonEvalReportDto[];
  warnings: string[];
  generated_at: string;
};

export type LearningOptionDto = {
  label: string;
  feedback: string;
};

export type LearningCheckpointDto = {
  question: string;
  options: LearningOptionDto[];
  correct_index: number;
  explanation: string;
  follow_up_question: string;
};

export type LearningSubmoduleDto = {
  id: string;
  title: string;
  summary: string;
  children: LearningSubmoduleDto[];
};

export type LearningLessonDto = {
  id: string;
  title: string;
  why_it_matters: string;
  explanation: string;
  concepts: string[];
  submodules?: LearningSubmoduleDto[];
  resources?: LearningResourceDto[];
  evidence_map?: LearningEvidenceDto[];
  quality_score?: LearningQualityScoreDto;
  checkpoint: LearningCheckpointDto;
  quest_bridge: string;
};

export type LearningModuleDto = {
  title: string;
  learner_profile: string;
  outcome: string;
  lessons: LearningLessonDto[];
  capstone_quest_prompt: string;
  resources: LearningResourceDto[];
};

export type GenerateLearningModuleRequest = {
  ecosystem_id: EcosystemId;
  path_id: string;
  topic: string;
  learning_profile: string;
  learning_intents: string[];
  interests: string[];
  learner_goal: string;
  background: string;
  pace: string;
};

export type GenerateLearningModuleResponse = {
  module_id: string;
  source: QuestSource;
  provider: AiProviderMetadataDto;
  module: LearningModuleDto;
  eval_artifact: LearningEvalArtifactDto;
  warning: string | null;
  persistence: PersistenceStatus;
};

export type PriorLearningLessonRequest = {
  title: string;
  checkpoint_question: string;
  summary: string;
  code_lens: string;
};

export type GenerateLearningLessonRequest = GenerateLearningModuleRequest & {
  lesson_index: number;
  prior_lessons?: PriorLearningLessonRequest[];
};

export type GenerateLearningLessonResponse = {
  source: QuestSource;
  provider: AiProviderMetadataDto;
  module_title: string;
  learner_profile: string;
  outcome: string;
  capstone_quest_prompt: string;
  resources: LearningResourceDto[];
  lesson: LearningLessonDto;
  lesson_index: number;
  module_status: LearningModuleGenerationStateDto;
  eval_artifact: LearningEvalArtifactDto;
  warning: string | null;
};

export type TutorMessageDto = {
  id: string;
  role: "learner" | "mentor";
  text: string;
  why?: string | null;
  follow_up?: string | null;
  module_id?: string | null;
  module_title?: string | null;
  lesson_id?: string | null;
  lesson_title?: string | null;
  created_at: string;
};

export type LearningSessionRecord = {
  module_id: string;
  user_id: string;
  status: string;
  provider: string;
  email: string | null;
  name: string | null;
  source: QuestSource;
  module: LearningModuleDto;
  module_statuses: LearningModuleGenerationStateDto[];
  eval_artifacts: LearningEvalArtifactDto[];
  ecosystem_id: EcosystemId | string | null;
  topic: string | null;
  learning_profile: string | null;
  learning_intents: string[];
  selected_interests: string[];
  learner_goal: string;
  background: string;
  pace: string;
  active_lesson_index: number;
  checkpoint_answers: Record<string, number>;
  tutor_messages: TutorMessageDto[];
  created_at: string;
  updated_at: string;
};

export type LearningSessionResponse = {
  session: LearningSessionRecord | null;
  persistence: PersistenceStatus;
};

export type LearningSessionsResponse = {
  sessions: LearningSessionRecord[];
  persistence: PersistenceStatus;
};

export type SaveLearningSessionRequest = {
  module_id: string;
  source: QuestSource;
  module: LearningModuleDto;
  module_statuses: LearningModuleGenerationStateDto[];
  eval_artifacts: LearningEvalArtifactDto[];
  ecosystem_id: EcosystemId;
  topic: string;
  learning_profile: string;
  learning_intents: string[];
  selected_interests: string[];
  learner_goal: string;
  background: string;
  pace: string;
  active_lesson_index: number;
  checkpoint_answers: Record<string, number>;
  tutor_messages: TutorMessageDto[];
};

export type SaveLearningSessionResponse = {
  session: LearningSessionRecord | null;
  persistence: PersistenceStatus;
};

export type LearningSessionMutationResponse = {
  module_id: string;
  archived: boolean;
  deleted: boolean;
  persistence: PersistenceStatus;
};

export type LearningEventRequest = {
  event_type: string;
  module_id?: string;
  lesson_id?: string;
  ecosystem_id?: string;
  course_title?: string;
  metadata?: Record<string, string>;
};

export type LearningEventRecord = {
  event_id: string;
  event_type: string;
  module_id?: string | null;
  lesson_id?: string | null;
  ecosystem_id?: string | null;
  course_title?: string | null;
  metadata: Record<string, string>;
  created_at: string;
};

export type LearningMetricsSummary = {
  total_events: number;
  courses_generated: number;
  modules_opened: number;
  checkpoints_attempted: number;
  checkpoints_passed: number;
  courses_completed: number;
  tutor_used: number;
  generation_failures: number;
  by_event: Record<string, number>;
  by_ecosystem: Record<string, number>;
};

export type LearningMetricsResponse = {
  summary: LearningMetricsSummary;
  recent_events: LearningEventRecord[];
  persistence: PersistenceStatus;
};

export type LearningSessionExportResponse = {
  session: LearningSessionRecord | null;
  markdown: string;
  json: unknown;
  persistence: PersistenceStatus;
};

export type LearningAdminReviewResponse = {
  sessions: LearningSessionRecord[];
  metrics: LearningMetricsSummary;
  recent_events: LearningEventRecord[];
  persistence: PersistenceStatus;
};

export type LearningTutorResponse = {
  source: QuestSource;
  answer: string;
  why_it_matters: string;
  follow_up_question: string;
  references: LearningResourceDto[];
};

export type TutorRequest = {
  module_id?: string;
  module_title: string;
  lesson_title: string;
  lesson_context: string;
  question: string;
};

export type SavedTutorExchangeResponse = {
  answer: LearningTutorResponse;
  session: LearningSessionRecord | null;
  persistence: PersistenceStatus;
};

export type ChallengeWrongAnswer = {
  label: string;
  feedback: string;
};

export type QuestChallengeBrief = {
  question: string;
  correct_answer: string;
  wrong_answers: ChallengeWrongAnswer[];
  invariant: string;
  attack_scenario: string;
  code_focus: string;
  test_focus: string;
  hint: string;
  follow_up_question: string;
  resources: LearningResourceDto[];
};

export type QuestCodeExplainer = {
  primary_invariant: string;
  denial_path: string;
  proof_label: string;
  proof_artifact: string;
  network_label: string;
  network_boundary: string;
  risk_focus: string;
  inspect_steps: string[];
  mentor_prompts: string[];
  resources: LearningResourceDto[];
};

export type WorkbenchFileDto = {
  path: string;
  language: string;
  content: string;
};

export type QuestBlueprintDto = {
  title: string;
  premise: string;
  build_objective: string;
  comprehension_gates: string[];
  boss_fight: string;
  challenge_brief?: QuestChallengeBrief | null;
  code_explainer: QuestCodeExplainer;
  reward_logic: string;
  ckb_fiber_hooks: string[];
  workbench_files: WorkbenchFileDto[];
};

export type LearningQuestLinkDto = {
  module_id: string;
  lesson_id: string;
  module_title: string;
  lesson_title: string;
  checkpoint_question: string;
  quest_bridge: string;
  concepts: string[];
  correct_answer: string;
  misunderstanding: string;
  lesson_summary: string;
};

export type LearningQuestRunnerState = {
  enabled: boolean;
  ecosystem_supported: boolean;
  scenario_id: string;
  scenario_manifest_version: string;
  runner_version: string;
};

export type GenerateLearningQuestRequest = {
  module_id: string;
  ecosystem_id: EcosystemId;
  topic: string;
  module_title: string;
  learner_profile: string;
  outcome: string;
  lesson: LearningLessonDto;
};

export type GenerateLearningQuestResponse = {
  run_id: string;
  source: QuestSource;
  learning_context: LearningQuestLinkDto;
  quest: QuestBlueprintDto;
  runner: LearningQuestRunnerState;
  persistence: PersistenceStatus;
  warning: string | null;
};

export type RunnerSubmissionView = {
  submission_id: string;
  scenario_id: string;
  scenario_manifest_version: string;
  runner_version: string;
  source_digest: string;
  test_bundle_digest: string;
  state: "queued" | "running" | "passed" | "failed" | "cancelled" | "error";
  classification: string | null;
  public_cases: { case_id: string; status: "passed" | "failed" }[];
  hidden_passed: number;
  hidden_failed: number;
  result_digest: string | null;
  diagnostic_code: string | null;
  output_truncated: boolean;
  created_at: string;
  updated_at: string;
};

export async function generateLearningModule(
  request: GenerateLearningModuleRequest,
): Promise<GenerateLearningModuleResponse> {
  const response = await fetch("/api/core/ai/learning/module", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<GenerateLearningModuleResponse>(response);
}

export async function generateLearningLesson(
  request: GenerateLearningLessonRequest,
): Promise<GenerateLearningLessonResponse> {
  const response = await fetch("/api/core/ai/learning/lesson", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<GenerateLearningLessonResponse>(response);
}

export async function loadLearningSession(): Promise<LearningSessionResponse> {
  const response = await fetch("/api/core/ai/learning/session", {
    method: "GET",
    headers: { accept: "application/json" },
  });

  return parseJsonResponse<LearningSessionResponse>(response);
}

export async function loadLearningSessions(): Promise<LearningSessionsResponse> {
  const response = await fetch("/api/core/ai/learning/sessions", {
    method: "GET",
    headers: { accept: "application/json" },
  });

  return parseJsonResponse<LearningSessionsResponse>(response);
}

export async function archiveLearningSession(moduleId: string): Promise<LearningSessionMutationResponse> {
  const response = await fetch(`/api/core/ai/learning/sessions/${encodeURIComponent(moduleId)}/archive`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: "{}",
  });

  return parseJsonResponse<LearningSessionMutationResponse>(response);
}

export async function deleteLearningSession(moduleId: string): Promise<LearningSessionMutationResponse> {
  const response = await fetch(`/api/core/ai/learning/sessions/${encodeURIComponent(moduleId)}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
  });

  return parseJsonResponse<LearningSessionMutationResponse>(response);
}

export async function trackLearningEvent(request: LearningEventRequest): Promise<PersistenceStatus> {
  const response = await fetch("/api/core/ai/learning/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  const parsed = await parseJsonResponse<{ saved: boolean; persistence: PersistenceStatus }>(response);
  return parsed.persistence;
}

export async function loadLearningMetrics(): Promise<LearningMetricsResponse> {
  const response = await fetch("/api/core/ai/learning/events", {
    method: "GET",
    headers: { accept: "application/json" },
  });
  return parseJsonResponse<LearningMetricsResponse>(response);
}

export async function exportLearningSession(moduleId: string): Promise<LearningSessionExportResponse> {
  const response = await fetch(`/api/core/ai/learning/sessions/${encodeURIComponent(moduleId)}/export`, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  return parseJsonResponse<LearningSessionExportResponse>(response);
}

export async function loadLearningAdminReview(): Promise<LearningAdminReviewResponse> {
  const response = await fetch("/api/core/ai/learning/admin/review", {
    method: "GET",
    headers: { accept: "application/json" },
  });
  return parseJsonResponse<LearningAdminReviewResponse>(response);
}

export async function saveLearningSession(
  request: SaveLearningSessionRequest,
): Promise<SaveLearningSessionResponse> {
  const response = await fetch("/api/core/ai/learning/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<SaveLearningSessionResponse>(response);
}

export async function askLearningTutor(
  request: TutorRequest,
): Promise<LearningTutorResponse> {
  const response = await fetch("/api/core/ai/learning/tutor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<LearningTutorResponse>(response);
}

export async function askAndSaveLearningTutor(
  request: TutorRequest,
): Promise<SavedTutorExchangeResponse> {
  const response = await fetch("/api/core/ai/learning/tutor/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<SavedTutorExchangeResponse>(response);
}

export async function generateLearningQuest(
  request: GenerateLearningQuestRequest,
): Promise<GenerateLearningQuestResponse> {
  const response = await fetch("/api/core/ai/learning/quest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<GenerateLearningQuestResponse>(response);
}

export async function submitRunnerSource({
  scenarioId,
  scenarioManifestVersion,
  source,
}: {
  scenarioId: string;
  scenarioManifestVersion: string;
  source: string;
}): Promise<RunnerSubmissionView> {
  const response = await fetch("/api/core/v3/submissions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      scenario_id: scenarioId,
      scenario_manifest_version: scenarioManifestVersion,
      source,
    }),
  });

  return parseJsonResponse<RunnerSubmissionView>(response);
}

export async function getRunnerSubmission(
  submissionId: string,
): Promise<RunnerSubmissionView> {
  const response = await fetch(`/api/core/v3/submissions/${encodeURIComponent(submissionId)}`, {
    method: "GET",
    headers: { accept: "application/json" },
  });

  return parseJsonResponse<RunnerSubmissionView>(response);
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: unknown }
    | T
    | null;

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "The request failed.";
    throw new Error(message);
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Core returned an invalid response.");
  }

  return payload as T;
}
