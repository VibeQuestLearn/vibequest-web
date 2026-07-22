export type EcosystemId = "ckb" | "fiber" | "zcash";
export type QuestSource = "open-ai";

export type LearningResourceDto = {
  title: string;
  url: string;
  reason: string;
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

export type LearningLessonDto = {
  id: string;
  title: string;
  why_it_matters: string;
  explanation: string;
  concepts: string[];
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
};

export type LearningTutorResponse = {
  source: QuestSource;
  answer: string;
  why_it_matters: string;
  follow_up_question: string;
  references: LearningResourceDto[];
};

export type TutorRequest = {
  module_title: string;
  lesson_title: string;
  lesson_context: string;
  question: string;
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
