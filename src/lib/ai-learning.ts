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
  module: LearningModuleDto;
  warning: string | null;
  persistence: PersistenceStatus;
};

export type GenerateLearningLessonRequest = GenerateLearningModuleRequest & {
  lesson_index: number;
};

export type GenerateLearningLessonResponse = {
  source: QuestSource;
  module_title: string;
  learner_profile: string;
  outcome: string;
  capstone_quest_prompt: string;
  resources: LearningResourceDto[];
  lesson: LearningLessonDto;
  lesson_index: number;
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
  provider: string;
  email: string | null;
  name: string | null;
  source: QuestSource;
  module: LearningModuleDto;
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
