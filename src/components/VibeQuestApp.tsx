
"use client";

import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  Code2,
  Cpu,
  GraduationCap,
  LayoutDashboard,
  LoaderCircle,
  MessageSquare,
  Network,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  Ship,
  Sparkles,
  Target,
  Terminal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  AccountControl,
  type AccountSummary,
} from "@/components/AccountControl";
import {
  askAndSaveLearningTutor,
  generateLearningModule,
  generateLearningQuest,
  getRunnerSubmission,
  loadLearningSession,
  saveLearningSession,
  submitRunnerSource,
  type EcosystemId,
  type GenerateLearningQuestResponse,
  type LearningLessonDto,
  type LearningModuleDto,
  type LearningSessionRecord,
  type LearningTutorResponse,
  type QuestSource,
  type RunnerSubmissionView,
  type TutorMessageDto,
  type WorkbenchFileDto,
} from "@/lib/ai-learning";

type TabId = "landing" | "dashboard" | "learn" | "quest-run" | "workbench" | "ship-gate";
type SyncState = "idle" | "loading" | "saving" | "saved" | "local-only";

type EcosystemOption = {
  id: EcosystemId;
  label: string;
  pathId: string;
  accent: string;
  detail: string;
  defaultTopic: string;
  interests: string[];
  questLabel: string;
};

type TutorMessage = {
  id: string;
  role: "learner" | "mentor";
  text: string;
  why?: string;
  followUp?: string;
  moduleId?: string;
  moduleTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  createdAt: string;
};

type ModuleState = {
  id: string;
  source: QuestSource;
  warning: string | null;
  ecosystem: EcosystemOption;
  topic: string;
  profile: string;
  pace: string;
  intents: string[];
  interests: string[];
  learnerGoal: string;
  module: LearningModuleDto;
};

type QuestState = {
  runId: string;
  response: GenerateLearningQuestResponse;
  selectedFilePath: string | null;
  workspaceVerified: boolean;
  verificationLog: string[];
  runnerSubmission: RunnerSubmissionView | null;
  runnerError: string | null;
};

const ECOSYSTEMS: EcosystemOption[] = [
  {
    id: "ckb",
    label: "CKB",
    pathId: "ckb-cells",
    accent: "text-electric-blue border-electric-blue/40 bg-electric-blue/10",
    detail: "Cells, scripts, witnesses, transaction state, and verifier proof boundaries.",
    defaultTopic: "Cells, scripts, witnesses, and replay-safe verifier code",
    interests: ["CKB Cell Model", "CKB Scripts", "Witness Verification", "Transaction Proof Boundaries"],
    questLabel: "CKB verifier quest",
  },
  {
    id: "fiber",
    label: "Fiber",
    pathId: "fiber-payments",
    accent: "text-warning-amber border-warning-amber/40 bg-warning-amber/10",
    detail: "Payment channels, invoices, PTLC/preimage evidence, routing, and replay defense.",
    defaultTopic: "Fiber invoices, PTLC proof boundaries, and paid-access receipt checks",
    interests: ["Fiber Payments", "Payment Channels", "PTLC Proofs", "Receipt Replay Defense"],
    questLabel: "Fiber payment proof quest",
  },
  {
    id: "zcash",
    label: "Zcash",
    pathId: "zcash-shielded-payments",
    accent: "text-cyber-green border-cyber-green/40 bg-cyber-green/10",
    detail: "Shielded checkout, ZIP-321 payment requests, viewing keys, memos, and privacy safety.",
    defaultTopic: "Shielded checkout with ZIP-321 payment request validation and privacy denial cases",
    interests: ["Zcash Shielded Payments", "ZIP-321 Payment Requests", "Viewing-Key Boundaries", "Privacy-Preserving Checkout"],
    questLabel: "Zcash shielded checkout quest",
  },
];

const PROFILES = ["Vibecoder", "Backend dev", "Frontend dev", "Security auditor", "Product / community"];
const PACES = ["Focused", "Deep dive", "Fast practical", "Audit-heavy"];
const TABS: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "learn", label: "Learn" },
  { id: "quest-run", label: "Quest Run" },
  { id: "workbench", label: "Workbench" },
  { id: "ship-gate", label: "Ship Gate" },
];

export function VibeQuestApp({
  account,
  authConfigured,
}: {
  account: AccountSummary | null;
  authConfigured: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("landing");
  const [ecosystemId, setEcosystemId] = useState<EcosystemId>("zcash");
  const selectedEcosystem = ecosystemById(ecosystemId);
  const [topic, setTopic] = useState(selectedEcosystem.defaultTopic);
  const [profile, setProfile] = useState("Vibecoder");
  const [pace, setPace] = useState("Focused");
  const [intentText, setIntentText] = useState(
    "Understand the trust boundary\nRead generated verifier code\nDesign denial tests before shipping",
  );
  const [moduleState, setModuleState] = useState<ModuleState | null>(null);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [generationState, setGenerationState] = useState<"idle" | "loading">("idle");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [tutorQuestion, setTutorQuestion] = useState("");
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([]);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const [questState, setQuestState] = useState<QuestState | null>(null);
  const [questGenerationState, setQuestGenerationState] = useState<"idle" | "loading">("idle");
  const [questError, setQuestError] = useState<string | null>(null);
  const [runnerSubmitting, setRunnerSubmitting] = useState(false);

  const generatedModule = moduleState?.module ?? null;
  const activeLesson = generatedModule?.lessons[activeLessonIndex] ?? null;
  const intentList = useMemo(() => parseIntents(intentText), [intentText]);
  const completedLessons = useMemo(() => completedLessonCount(generatedModule, answers), [answers, generatedModule]);
  const activeLessonPassed = Boolean(
    activeLesson && answers[activeLesson.id] === activeLesson.checkpoint.correct_index,
  );

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!account) {
        setSyncState("idle");
        return;
      }
      setSyncState("loading");
      setSyncWarning(null);
      try {
        const response = await loadLearningSession();
        if (cancelled) return;
        if (response.persistence.warning) {
          setSyncWarning(response.persistence.warning);
        }
        if (response.session) {
          applySessionRecord(response.session);
          setSyncState(response.persistence.saved ? "saved" : "local-only");
        } else {
          setSyncState(response.persistence.warning ? "local-only" : "idle");
        }
      } catch (error) {
        if (cancelled) return;
        setSyncWarning(error instanceof Error ? error.message : "Learning resume failed.");
        setSyncState("local-only");
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, [account]);

  function applySessionRecord(record: LearningSessionRecord) {
    const ecosystem = ecosystemById(asEcosystemId(record.ecosystem_id) ?? "zcash");
    const intents = record.learning_intents.length > 0 ? record.learning_intents : parseIntents(record.learner_goal);
    setEcosystemId(ecosystem.id);
    setTopic(record.topic || ecosystem.defaultTopic);
    setProfile(record.learning_profile || record.background || "Vibecoder");
    setPace(record.pace || "Focused");
    setIntentText(intents.join("\n"));
    setModuleState({
      id: record.module_id,
      source: record.source,
      warning: null,
      ecosystem,
      topic: record.topic || ecosystem.defaultTopic,
      profile: record.learning_profile || record.background || "Vibecoder",
      pace: record.pace || "Focused",
      intents,
      interests: record.selected_interests,
      learnerGoal: record.learner_goal,
      module: record.module,
    });
    setActiveLessonIndex(Math.min(record.active_lesson_index, Math.max(record.module.lessons.length - 1, 0)));
    setAnswers(record.checkpoint_answers ?? {});
    setTutorMessages(record.tutor_messages.map(tutorMessageFromDto));
  }

  function chooseEcosystem(next: EcosystemOption) {
    setEcosystemId(next.id);
    setTopic(next.defaultTopic);
    setGenerationError(null);
  }

  async function startGeneration() {
    if (!account) {
      setGenerationError("Sign in with Google before generating lessons.");
      return;
    }
    const trimmedTopic = topic.trim();
    if (trimmedTopic.length < 8) {
      setGenerationError("Choose a concrete topic before generating lessons.");
      return;
    }

    setGenerationState("loading");
    setGenerationError(null);
    setSyncWarning(null);
    setTutorMessages([]);
    setTutorQuestion("");
    setTutorError(null);
    setQuestState(null);

    try {
      const learnerGoal = buildLearnerGoal(selectedEcosystem, trimmedTopic, intentList);
      const response = await generateLearningModule({
        ecosystem_id: selectedEcosystem.id,
        path_id: selectedEcosystem.pathId,
        topic: trimmedTopic,
        learning_profile: profile,
        learning_intents: intentList,
        interests: selectedEcosystem.interests,
        learner_goal: learnerGoal,
        background: profile,
        pace,
      });

      setModuleState({
        id: response.module_id,
        source: response.source,
        warning: response.warning,
        ecosystem: selectedEcosystem,
        topic: trimmedTopic,
        profile,
        pace,
        intents: intentList,
        interests: selectedEcosystem.interests,
        learnerGoal,
        module: response.module,
      });
      setActiveLessonIndex(0);
      setAnswers({});
      setSyncState(response.persistence.saved ? "saved" : "local-only");
      setSyncWarning(response.persistence.warning ?? response.warning);
      setActiveTab("learn");
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Lesson generation failed.");
    } finally {
      setGenerationState("idle");
    }
  }

  async function persistLearningState(
    nextModuleState = moduleState,
    nextAnswers = answers,
    nextLessonIndex = activeLessonIndex,
    nextTutorMessages = tutorMessages,
  ) {
    if (!account || !nextModuleState) return;
    setSyncState("saving");
    try {
      const response = await saveLearningSession({
        module_id: nextModuleState.id,
        source: nextModuleState.source,
        module: nextModuleState.module,
        ecosystem_id: nextModuleState.ecosystem.id,
        topic: nextModuleState.topic,
        learning_profile: nextModuleState.profile,
        learning_intents: nextModuleState.intents,
        selected_interests: nextModuleState.interests,
        learner_goal: nextModuleState.learnerGoal,
        background: nextModuleState.profile,
        pace: nextModuleState.pace,
        active_lesson_index: nextLessonIndex,
        checkpoint_answers: nextAnswers,
        tutor_messages: nextTutorMessages.map(tutorMessageToDto),
      });
      setSyncState(response.persistence.saved ? "saved" : "local-only");
      setSyncWarning(response.persistence.warning);
    } catch (error) {
      setSyncState("local-only");
      setSyncWarning(error instanceof Error ? error.message : "Learning save failed.");
    }
  }

  function chooseLesson(index: number) {
    setActiveLessonIndex(index);
    void persistLearningState(moduleState, answers, index, tutorMessages);
  }

  function chooseAnswer(lesson: LearningLessonDto, answerIndex: number) {
    const nextAnswers = { ...answers, [lesson.id]: answerIndex };
    setAnswers(nextAnswers);
    void persistLearningState(moduleState, nextAnswers, activeLessonIndex, tutorMessages);
  }

  async function askTutor() {
    if (!account || !moduleState || !generatedModule || !activeLesson) return;
    const question = tutorQuestion.trim();
    if (!question) return;

    setTutorLoading(true);
    setTutorError(null);
    try {
      const response = await askAndSaveLearningTutor({
        module_id: moduleState.id,
        module_title: generatedModule.title,
        lesson_title: activeLesson.title,
        lesson_context: lessonContext(generatedModule, activeLesson, answers[activeLesson.id]),
        question,
      });
      appendTutorAnswer(question, response.answer);
      setSyncState(response.persistence.saved ? "saved" : "local-only");
      setSyncWarning(response.persistence.warning);
      setTutorQuestion("");
    } catch (error) {
      setTutorError(error instanceof Error ? error.message : "Tutor request failed.");
    } finally {
      setTutorLoading(false);
    }
  }

  function appendTutorAnswer(question: string, response: LearningTutorResponse) {
    if (!moduleState || !activeLesson) return;
    const createdAt = new Date().toISOString();
    const nextMessages: TutorMessage[] = [
      ...tutorMessages,
      {
        id: `learner-${Date.now()}`,
        role: "learner",
        text: question,
        moduleId: moduleState.id,
        moduleTitle: moduleState.module.title,
        lessonId: activeLesson.id,
        lessonTitle: activeLesson.title,
        createdAt,
      },
      {
        id: `mentor-${Date.now()}`,
        role: "mentor",
        text: response.answer,
        why: response.why_it_matters,
        followUp: response.follow_up_question,
        moduleId: moduleState.id,
        moduleTitle: moduleState.module.title,
        lessonId: activeLesson.id,
        lessonTitle: activeLesson.title,
        createdAt,
      },
    ];
    setTutorMessages(nextMessages);
  }

  async function startLessonQuest() {
    if (!account) {
      setQuestError("Sign in with Google before generating a quest.");
      return;
    }
    if (!moduleState || !activeLesson) {
      setQuestError("Generate and open a lesson before creating a quest.");
      return;
    }
    if (!activeLessonPassed) {
      setQuestError("Pass the active lesson checkpoint before generating its quest.");
      return;
    }

    setQuestGenerationState("loading");
    setQuestError(null);
    try {
      const response = await generateLearningQuest({
        module_id: moduleState.id,
        ecosystem_id: moduleState.ecosystem.id,
        topic: moduleState.topic,
        module_title: moduleState.module.title,
        learner_profile: moduleState.profile,
        outcome: moduleState.module.outcome,
        lesson: activeLesson,
      });
      setQuestState({
        runId: response.run_id,
        response,
        selectedFilePath: response.quest.workbench_files[0]?.path ?? null,
        workspaceVerified: false,
        verificationLog: [],
        runnerSubmission: null,
        runnerError: null,
      });
      setActiveTab("workbench");
    } catch (error) {
      setQuestError(error instanceof Error ? error.message : "Quest generation failed.");
    } finally {
      setQuestGenerationState("idle");
    }
  }

  function verifyWorkspace() {
    if (!questState) return;
    const verification = verifyGeneratedWorkspace(questState.response.quest.workbench_files, moduleState?.ecosystem.id ?? "zcash");
    setQuestState({
      ...questState,
      workspaceVerified: verification.passed,
      verificationLog: verification.logs,
    });
  }

  async function submitSelectedFileToRunner() {
    if (!questState) return;
    const selectedFile = selectedQuestFile(questState);
    if (!selectedFile) return;
    setRunnerSubmitting(true);
    setQuestState({ ...questState, runnerError: null });
    try {
      const submission = await submitRunnerSource({
        scenarioId: questState.response.runner.scenario_id,
        scenarioManifestVersion: questState.response.runner.scenario_manifest_version,
        source: selectedFile.content,
      });
      setQuestState({ ...questState, runnerSubmission: submission, runnerError: null });
    } catch (error) {
      setQuestState({
        ...questState,
        runnerError: error instanceof Error ? error.message : "Runner submission failed.",
      });
    } finally {
      setRunnerSubmitting(false);
    }
  }

  async function refreshRunnerSubmission() {
    if (!questState?.runnerSubmission) return;
    setRunnerSubmitting(true);
    try {
      const submission = await getRunnerSubmission(questState.runnerSubmission.submission_id);
      setQuestState({ ...questState, runnerSubmission: submission, runnerError: null });
    } catch (error) {
      setQuestState({
        ...questState,
        runnerError: error instanceof Error ? error.message : "Runner status refresh failed.",
      });
    } finally {
      setRunnerSubmitting(false);
    }
  }

  if (activeTab === "landing") {
    return (
      <LandingView
        account={account}
        authConfigured={authConfigured}
        onEnter={() => setActiveTab(account ? "dashboard" : "learn")}
        onLearn={() => setActiveTab("learn")}
      />
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0B0C0E] font-sans text-on-surface">
      <header className="sticky top-0 z-50 border-b border-glass-border bg-[#0B0C0E]/92 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
          <button
            type="button"
            onClick={() => setActiveTab("landing")}
            className="flex min-w-0 items-center gap-3 text-left"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gradient-to-tr from-electric-blue to-cyber-green font-mono font-bold text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              V
            </div>
            <div className="min-w-0">
              <span className="block truncate text-lg font-bold tracking-tight text-white">VibeQuest</span>
              <span className="block text-[10px] font-mono uppercase leading-none text-on-surface-variant">WORKBENCH</span>
            </div>
          </button>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="VibeQuest workspace">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={
                  activeTab === tab.id
                    ? "relative rounded-lg bg-white/5 px-4 py-2 text-sm font-semibold text-white"
                    : "rounded-lg px-4 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-white/5 hover:text-white"
                }
              >
                {tab.label}
                {activeTab === tab.id ? <span className="absolute bottom-1 left-4 right-4 h-[2px] rounded-full bg-electric-blue" /> : null}
              </button>
            ))}
          </nav>

          <div className="shrink-0 rounded-xl bg-white px-2 py-1 text-black shadow-panel-sm">
            <AccountControl account={account} authConfigured={authConfigured} />
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-t border-glass-border bg-[#0B0C0E]/55 px-4 py-2 lg:hidden">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={
                activeTab === tab.id
                  ? "whitespace-nowrap rounded-md bg-electric-blue/15 px-3 py-1.5 text-xs font-medium text-electric-blue"
                  : "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-white/5"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {activeTab === "dashboard" ? (
        <DashboardView
          account={account}
          moduleState={moduleState}
          completedLessons={completedLessons}
          syncState={syncState}
          syncWarning={syncWarning}
          questState={questState}
          activeLessonPassed={activeLessonPassed}
          onLearn={() => setActiveTab("learn")}
          onQuest={() => setActiveTab("quest-run")}
          onWorkbench={() => setActiveTab("workbench")}
          onShip={() => setActiveTab("ship-gate")}
        />
      ) : null}
      {activeTab === "learn" ? (
        <LearnView
          account={account}
          authConfigured={authConfigured}
          ecosystems={ECOSYSTEMS}
          selectedEcosystem={selectedEcosystem}
          chooseEcosystem={chooseEcosystem}
          topic={topic}
          setTopic={setTopic}
          profile={profile}
          setProfile={setProfile}
          pace={pace}
          setPace={setPace}
          intentText={intentText}
          setIntentText={setIntentText}
          intentList={intentList}
          generationState={generationState}
          generationError={generationError}
          onGenerate={startGeneration}
          moduleState={moduleState}
          activeLessonIndex={activeLessonIndex}
          chooseLesson={chooseLesson}
          answers={answers}
          chooseAnswer={chooseAnswer}
          completedLessons={completedLessons}
          tutorQuestion={tutorQuestion}
          setTutorQuestion={setTutorQuestion}
          tutorMessages={tutorMessages}
          tutorLoading={tutorLoading}
          tutorError={tutorError}
          onAskTutor={askTutor}
          syncState={syncState}
          syncWarning={syncWarning}
          onStartQuest={() => void startLessonQuest()}
          questGenerationState={questGenerationState}
          activeLessonPassed={activeLessonPassed}
        />
      ) : null}
      {activeTab === "quest-run" ? (
        <QuestRunView
          account={account}
          moduleState={moduleState}
          activeLessonIndex={activeLessonIndex}
          answers={answers}
          questState={questState}
          questError={questError}
          questGenerationState={questGenerationState}
          onGenerateQuest={() => void startLessonQuest()}
          onOpenLearn={() => setActiveTab("learn")}
          onOpenWorkbench={() => setActiveTab("workbench")}
        />
      ) : null}
      {activeTab === "workbench" ? (
        <WorkbenchView
          moduleState={moduleState}
          questState={questState}
          setQuestState={setQuestState}
          onOpenQuestRun={() => setActiveTab("quest-run")}
          onVerifyWorkspace={verifyWorkspace}
          onSubmitRunner={() => void submitSelectedFileToRunner()}
          onRefreshRunner={() => void refreshRunnerSubmission()}
          runnerSubmitting={runnerSubmitting}
        />
      ) : null}
      {activeTab === "ship-gate" ? <ShipGateView questState={questState} moduleState={moduleState} onOpenWorkbench={() => setActiveTab("workbench")} /> : null}
    </div>
  );
}

function LandingView({
  account,
  authConfigured,
  onEnter,
  onLearn,
}: {
  account: AccountSummary | null;
  authConfigured: boolean;
  onEnter: () => void;
  onLearn: () => void;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0B0C0E] font-sans text-on-surface selection:bg-electric-blue/30">
      <div className="pointer-events-none fixed inset-0 z-10 opacity-30">
        <div className="absolute right-[-10%] top-[-10%] h-[50%] w-[50%] rounded-full bg-electric-blue/10 blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[50%] w-[50%] rounded-full bg-cyber-green/5 blur-[150px]" />
      </div>

      <header className="relative z-20 mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
        <button type="button" onClick={onEnter} className="flex items-center gap-3 text-left">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-tr from-electric-blue to-cyber-green font-mono font-bold text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]">
            V
          </div>
          <div>
            <span className="block text-lg font-bold text-white">VibeQuest</span>
            <span className="block text-[10px] font-mono uppercase leading-none text-on-surface-variant">WORKBENCH</span>
          </div>
        </button>
        <div className="rounded-xl bg-white px-2 py-1 text-black shadow-panel-sm">
          <AccountControl account={account} authConfigured={authConfigured} />
        </div>
      </header>

      <main className="relative z-20 mx-auto max-w-7xl px-4 pb-16 md:px-8">
        <section className="mx-auto max-w-6xl py-20 text-center md:py-28">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyber-green/20 bg-cyber-green/10 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-cyber-green" />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-cyber-green">
              CKB / Fiber retained, Zcash grant track active
            </span>
          </div>

          <h1 className="mb-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-white md:text-7xl lg:text-8xl">
            Choose the chain,
            <br />
            <span className="text-electric-blue">generate the lesson,</span>
            <br />
            prove the code.
          </h1>

          <p className="mx-auto mb-10 max-w-3xl text-lg font-light leading-relaxed text-on-surface-variant md:text-2xl">
            VibeQuest is the AI learning workbench for protocol builders. Sign in with Google, choose CKB, Fiber, or Zcash, generate a deep module from your intent, then convert passed lessons into code quests.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={onLearn}
              className="w-full rounded-xl bg-electric-blue px-10 py-5 text-lg font-bold text-[#0B0C0E] shadow-[0_0_30px_rgba(0,240,255,0.3)] transition-all hover:brightness-110 active:scale-95 sm:w-auto"
            >
              Start Learning
            </button>
            <button
              type="button"
              onClick={onEnter}
              className="w-full rounded-xl border border-glass-border bg-transparent px-10 py-5 text-lg font-bold text-electric-blue transition-all hover:bg-electric-blue/5 active:scale-95 sm:w-auto"
            >
              Open Workbench
            </button>
          </div>

          {!authConfigured ? (
            <p className="mx-auto mt-5 max-w-xl rounded-xl border border-warning-amber/30 bg-warning-amber/10 p-3 text-xs leading-relaxed text-warning-amber">
              Google auth is not configured in the running web process. Restart after adding GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to `.env`.
            </p>
          ) : null}
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {ECOSYSTEMS.map((ecosystem) => (
            <div key={ecosystem.id} className="rounded-2xl border border-glass-border bg-[#16181D] p-6">
              <div className={`mb-5 inline-flex rounded-lg border px-3 py-1 text-xs font-black uppercase tracking-wider ${ecosystem.accent}`}>
                {ecosystem.label}
              </div>
              <h2 className="text-2xl font-bold text-white">{ecosystem.questLabel}</h2>
              <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{ecosystem.detail}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

function DashboardView({
  account,
  moduleState,
  completedLessons,
  syncState,
  syncWarning,
  questState,
  activeLessonPassed,
  onLearn,
  onQuest,
  onWorkbench,
  onShip,
}: {
  account: AccountSummary | null;
  moduleState: ModuleState | null;
  completedLessons: number;
  syncState: SyncState;
  syncWarning: string | null;
  questState: QuestState | null;
  activeLessonPassed: boolean;
  onLearn: () => void;
  onQuest: () => void;
  onWorkbench: () => void;
  onShip: () => void;
}) {
  const lessonCount = moduleState?.module.lessons.length ?? 0;
  const progress = lessonCount ? Math.round((completedLessons / lessonCount) * 100) : 0;
  const nextAction = !account
    ? { label: "Sign in with Google", detail: "Google identity is required before Core can bind generated learning state.", action: onLearn }
    : !moduleState
      ? { label: "Generate Learning", detail: "Choose an ecosystem, topic, profile, and intent; Core will generate the module.", action: onLearn }
      : !activeLessonPassed
        ? { label: "Continue Lesson", detail: "Pass the active checkpoint to unlock the lesson quest.", action: onLearn }
        : !questState
          ? { label: "Generate Quest", detail: "Convert the passed lesson into implementation files, denial tests, and a boss challenge.", action: onQuest }
          : !questState.workspaceVerified
            ? { label: "Open Workbench", detail: "Inspect the generated files and run the local workspace checks.", action: onWorkbench }
            : { label: "Review Ship Gate", detail: "Review the proof state and runner status before any claim flow is enabled.", action: onShip };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl flex-col gap-6 p-4 md:p-8">
      <section className="rounded-2xl border border-electric-blue/20 bg-[#10151C] p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <LayoutDashboard className="h-7 w-7 text-electric-blue" />
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-electric-blue">Dashboard</p>
            </div>
            <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-white md:text-4xl">
              Learn it, inspect it, then ship it.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
              Google owns the learning session. CKB and Fiber remain selectable, while Zcash is the current grant-facing execution track.
            </p>
          </div>
          <button
            type="button"
            onClick={nextAction.action}
            className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-electric-blue px-5 py-3 text-sm font-black uppercase tracking-wider text-black transition-all hover:brightness-110"
          >
            {nextAction.label}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-glass-border bg-[#15181F] p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyber-green">Next best action</p>
        <h2 className="mt-2 text-2xl font-black text-white">{nextAction.label}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-on-surface-variant">{nextAction.detail}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Account" value={account ? "Google signed in" : "Sign in required"} />
        <MetricCard label="Active ecosystem" value={moduleState?.ecosystem.label ?? "Choose in Learn"} />
        <MetricCard label="Module progress" value={moduleState ? `${progress}%` : "No module yet"} />
        <MetricCard label="Cloud sync" value={syncStateLabel(syncState)} />
      </section>

      {syncWarning ? <Notice tone="amber" text={syncWarning} /> : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Active module" icon={<BookOpen className="h-5 w-5 text-electric-blue" />} action="Open Learn" onAction={onLearn}>
          {moduleState ? (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">{completedLessons}/{lessonCount} checkpoints passed</p>
              <h3 className="mt-2 text-xl font-black text-white">{moduleState.module.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{moduleState.module.outcome}</p>
            </div>
          ) : (
            <ActionEmpty text="Generate the first AI module from the Learn screen." action="Open Learn" onClick={onLearn} />
          )}
        </Panel>
        <Panel title="Active quest" icon={<Code2 className="h-5 w-5 text-cyber-green" />} action={questState ? "Open Workbench" : "Quest Run"} onAction={questState ? onWorkbench : onQuest}>
          {questState ? (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">{questState.response.learning_context.lesson_title}</p>
              <h3 className="mt-2 text-xl font-black text-white">{questState.response.quest.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{questState.response.quest.build_objective}</p>
            </div>
          ) : (
            <ActionEmpty text="Pass a lesson checkpoint, then generate the implementation quest." action="Open Quest Run" onClick={onQuest} />
          )}
        </Panel>
      </section>
    </main>
  );
}

function LearnView(props: {
  account: AccountSummary | null;
  authConfigured: boolean;
  ecosystems: EcosystemOption[];
  selectedEcosystem: EcosystemOption;
  chooseEcosystem: (ecosystem: EcosystemOption) => void;
  topic: string;
  setTopic: (topic: string) => void;
  profile: string;
  setProfile: (profile: string) => void;
  pace: string;
  setPace: (pace: string) => void;
  intentText: string;
  setIntentText: (value: string) => void;
  intentList: string[];
  generationState: "idle" | "loading";
  generationError: string | null;
  onGenerate: () => Promise<void>;
  moduleState: ModuleState | null;
  activeLessonIndex: number;
  chooseLesson: (index: number) => void;
  answers: Record<string, number>;
  chooseAnswer: (lesson: LearningLessonDto, answerIndex: number) => void;
  completedLessons: number;
  tutorQuestion: string;
  setTutorQuestion: (value: string) => void;
  tutorMessages: TutorMessage[];
  tutorLoading: boolean;
  tutorError: string | null;
  onAskTutor: () => Promise<void>;
  syncState: SyncState;
  syncWarning: string | null;
  onStartQuest: () => void;
  questGenerationState: "idle" | "loading";
  activeLessonPassed: boolean;
}) {
  const learningModule = props.moduleState?.module ?? null;
  const activeLesson = learningModule?.lessons[props.activeLessonIndex] ?? null;
  const selectedAnswer = activeLesson ? props.answers[activeLesson.id] : undefined;
  const progress = learningModule ? Math.round((props.completedLessons / learningModule.lessons.length) * 100) : 0;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[1440px] flex-col gap-8 p-4 md:p-8">
      <div className="flex flex-col gap-4 border-b border-glass-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white">
            <GraduationCap className="h-8 w-8 text-electric-blue" />
            Learning Mode
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-on-surface-variant">
            Choose an ecosystem, name the topic, set your learning intent, then let Core generate lessons with the configured AI provider.
          </p>
        </div>
        {learningModule ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <StatusPill label="Ecosystem" value={props.moduleState?.ecosystem.label ?? "Ecosystem"} tone="green" />
            <StatusPill label="Progress" value={`${progress}%`} tone="blue" />
            <StatusPill label="Cloud sync" value={syncStateLabel(props.syncState)} tone="amber" />
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[420px_1fr]">
        <aside className="flex flex-col gap-6">
          <section className="rounded-xl border border-electric-blue/30 bg-[#121820] p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-glass-border pb-3">
              <BookOpen className="h-5 w-5 text-electric-blue" />
              <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-white">Lesson Setup</h2>
            </div>

            <div className="grid gap-3">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-electric-blue">Ecosystem</span>
              {props.ecosystems.map((ecosystem) => {
                const selected = ecosystem.id === props.selectedEcosystem.id;
                return (
                  <button
                    key={ecosystem.id}
                    type="button"
                    onClick={() => props.chooseEcosystem(ecosystem)}
                    className={
                      selected
                        ? `rounded-lg border p-3 text-left transition-colors ${ecosystem.accent}`
                        : "rounded-lg border border-glass-border/70 bg-[#0B0C0E]/60 p-3 text-left transition-colors hover:border-electric-blue/30"
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-white">{ecosystem.label}</span>
                      {selected ? <CheckCircle2 className="h-4 w-4" /> : null}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">{ecosystem.detail}</p>
                  </button>
                );
              })}
            </div>

            <label className="mt-5 grid gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyber-green">Topic</span>
              <textarea
                value={props.topic}
                onChange={(event) => props.setTopic(event.target.value)}
                rows={3}
                className="rounded-lg border border-glass-border bg-[#0B0C0E] p-3 text-sm leading-relaxed text-white outline-none transition-colors focus:border-cyber-green/60"
              />
            </label>

            <div className="mt-5 grid gap-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-cyber-green" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyber-green">Profile</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PROFILES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => props.setProfile(item)}
                    className={
                      props.profile === item
                        ? "rounded-lg border border-cyber-green/45 bg-cyber-green/10 px-3 py-2 text-left text-[11px] font-bold text-white"
                        : "rounded-lg border border-glass-border bg-[#0B0C0E]/70 px-3 py-2 text-left text-[11px] font-bold text-on-surface-variant hover:border-cyber-green/30 hover:text-white"
                    }
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-warning-amber">Pace</span>
              <div className="grid grid-cols-2 gap-2">
                {PACES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => props.setPace(item)}
                    className={
                      props.pace === item
                        ? "rounded-lg border border-warning-amber/45 bg-warning-amber/10 px-3 py-2 text-left text-[11px] font-bold text-white"
                        : "rounded-lg border border-glass-border bg-[#0B0C0E]/70 px-3 py-2 text-left text-[11px] font-bold text-on-surface-variant hover:border-warning-amber/30 hover:text-white"
                    }
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-5 grid gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-electric-blue">Learning intents</span>
              <textarea
                value={props.intentText}
                onChange={(event) => props.setIntentText(event.target.value)}
                rows={4}
                className="rounded-lg border border-glass-border bg-[#0B0C0E] p-3 text-sm leading-relaxed text-white outline-none transition-colors focus:border-electric-blue/60"
              />
            </label>

            <button
              type="button"
              onClick={() => void props.onGenerate()}
              disabled={props.generationState === "loading"}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-electric-blue px-5 py-3 text-sm font-black uppercase tracking-wider text-black transition-all hover:brightness-110 disabled:brightness-50"
            >
              {props.generationState === "loading" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {props.generationState === "loading" ? "Generating Module" : "Generate Module"}
            </button>

            {!props.account ? <Notice tone="amber" text="Google sign-in is required before Core can generate and bind learning state." /> : null}
            {!props.authConfigured ? <Notice tone="red" text="Google authentication configuration is incomplete in the running web process." /> : null}
            {props.generationError ? <Notice tone="red" text={props.generationError} /> : null}
            {props.syncWarning ? <Notice tone="amber" text={props.syncWarning} /> : null}
          </section>
        </aside>

        <section className="min-w-0">
          {props.moduleState && learningModule && activeLesson ? (
            <GeneratedModuleView
              moduleState={props.moduleState}
              activeLesson={activeLesson}
              activeLessonIndex={props.activeLessonIndex}
              chooseLesson={props.chooseLesson}
              selectedAnswer={selectedAnswer}
              answers={props.answers}
              chooseAnswer={props.chooseAnswer}
              tutorQuestion={props.tutorQuestion}
              setTutorQuestion={props.setTutorQuestion}
              tutorMessages={props.tutorMessages}
              tutorLoading={props.tutorLoading}
              tutorError={props.tutorError}
              onAskTutor={props.onAskTutor}
              onStartQuest={props.onStartQuest}
              questGenerationState={props.questGenerationState}
              activeLessonPassed={props.activeLessonPassed}
            />
          ) : (
            <EmptyLearningState selectedEcosystem={props.selectedEcosystem} intentList={props.intentList} />
          )}
        </section>
      </div>
    </main>
  );
}

function GeneratedModuleView({
  moduleState,
  activeLesson,
  activeLessonIndex,
  chooseLesson,
  selectedAnswer,
  answers,
  chooseAnswer,
  tutorQuestion,
  setTutorQuestion,
  tutorMessages,
  tutorLoading,
  tutorError,
  onAskTutor,
  onStartQuest,
  questGenerationState,
  activeLessonPassed,
}: {
  moduleState: ModuleState;
  activeLesson: LearningLessonDto;
  activeLessonIndex: number;
  chooseLesson: (index: number) => void;
  selectedAnswer: number | undefined;
  answers: Record<string, number>;
  chooseAnswer: (lesson: LearningLessonDto, answerIndex: number) => void;
  tutorQuestion: string;
  setTutorQuestion: (value: string) => void;
  tutorMessages: TutorMessage[];
  tutorLoading: boolean;
  tutorError: string | null;
  onAskTutor: () => Promise<void>;
  onStartQuest: () => void;
  questGenerationState: "idle" | "loading";
  activeLessonPassed: boolean;
}) {
  const learningModule = moduleState.module;

  return (
    <article className="overflow-hidden rounded-2xl border border-glass-border bg-[#11161D]">
      <header className="border-b border-glass-border p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyber-green">
          <Network className="h-4 w-4" />
          {moduleState.ecosystem.label}
          <ChevronRight className="h-4 w-4 text-on-surface-variant" />
          {moduleState.topic}
        </div>
        <h2 className="mt-3 text-2xl font-black text-white md:text-3xl">{learningModule.title}</h2>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-on-surface-variant">{learningModule.outcome}</p>
      </header>

      <div className="grid min-w-0 xl:grid-cols-[320px_minmax(0,1fr)]">
        <nav className="border-b border-glass-border bg-[#0B0C0E]/45 xl:border-b-0 xl:border-r" aria-label="Generated lessons">
          {learningModule.lessons.map((lesson, index) => {
            const active = index === activeLessonIndex;
            const passed = answers[lesson.id] === lesson.checkpoint.correct_index;
            return (
              <button
                key={lesson.id}
                type="button"
                onClick={() => chooseLesson(index)}
                className={
                  active
                    ? "grid min-h-24 w-full grid-cols-[32px_minmax(0,1fr)_20px] items-start gap-3 border-b border-glass-border border-l-2 border-l-electric-blue bg-white/5 px-4 py-4 text-left"
                    : "grid min-h-24 w-full grid-cols-[32px_minmax(0,1fr)_20px] items-start gap-3 border-b border-glass-border border-l-2 border-l-transparent px-4 py-4 text-left hover:bg-white/5"
                }
              >
                <span className={active ? "text-xs font-black text-electric-blue" : "text-xs font-black text-white/30"}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black leading-5 text-white">{lesson.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-on-surface-variant">
                    {passed ? "Checkpoint passed" : "Checkpoint open"}
                  </span>
                </span>
                <ChevronRight className={active ? "mt-0.5 h-4 w-4 text-electric-blue" : "mt-0.5 h-4 w-4 text-white/20"} />
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          <section className="border-b border-glass-border p-5 md:p-7">
            <div className="flex flex-wrap gap-2">
              {activeLesson.concepts.map((concept) => (
                <span key={concept} className="rounded-full border border-cyber-green/20 bg-cyber-green/10 px-3 py-1 text-xs font-bold text-cyber-green">
                  {concept}
                </span>
              ))}
            </div>
            <h3 className="mt-4 text-2xl font-black text-white">{activeLesson.title}</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-on-surface-variant">{activeLesson.why_it_matters}</p>
            <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-on-surface">{activeLesson.explanation}</div>
          </section>

          <section className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="border-b border-glass-border p-5 md:p-7 lg:border-b-0 lg:border-r">
              <div className="rounded-xl border border-electric-blue/20 bg-[#0B0C0E] p-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-electric-blue">
                  <Code2 className="h-4 w-4" />
                  Quest bridge
                </div>
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">{activeLesson.quest_bridge}</p>
                <button
                  type="button"
                  onClick={onStartQuest}
                  disabled={!activeLessonPassed || questGenerationState === "loading"}
                  className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cyber-green px-4 text-xs font-black uppercase tracking-wider text-black disabled:brightness-50"
                >
                  {questGenerationState === "loading" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {activeLessonPassed ? "Generate Lesson Quest" : "Pass Checkpoint First"}
                </button>
              </div>

              <div className="mt-5 rounded-xl border border-glass-border bg-[#0B0C0E] p-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-cyber-green">
                  <MessageSquare className="h-4 w-4" />
                  Tutor
                </div>
                <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
                  {tutorMessages.length === 0 ? (
                    <p className="text-sm leading-6 text-on-surface-variant">
                      Ask about the generated lesson, its code lens, checkpoint, or denial-test bridge.
                    </p>
                  ) : (
                    tutorMessages.map((message) => (
                      <div key={message.id} className={message.role === "mentor" ? "rounded-lg bg-electric-blue/10 p-3" : "rounded-lg bg-white/5 p-3"}>
                        <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">{message.role === "mentor" ? "Tutor" : "You"}</p>
                        <p className="mt-2 text-sm leading-6 text-on-surface">{message.text}</p>
                        {message.why ? <p className="mt-2 text-xs leading-5 text-cyber-green">{message.why}</p> : null}
                        {message.followUp ? <p className="mt-2 text-xs leading-5 text-electric-blue">{message.followUp}</p> : null}
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={tutorQuestion}
                    onChange={(event) => setTutorQuestion(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void onAskTutor();
                      }
                    }}
                    className="min-h-11 flex-1 rounded-lg border border-glass-border bg-[#11161D] px-3 text-sm text-white outline-none focus:border-electric-blue/60"
                    aria-label="Tutor question"
                  />
                  <button
                    type="button"
                    onClick={() => void onAskTutor()}
                    disabled={tutorLoading || tutorQuestion.trim().length === 0}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cyber-green px-4 text-sm font-black text-black disabled:brightness-50"
                  >
                    {tutorLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Ask
                  </button>
                </div>
                {tutorError ? <p className="mt-3 text-xs text-red-300">{tutorError}</p> : null}
              </div>
            </div>

            <aside className="bg-[#0D1117] p-5 md:p-6">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-warning-amber">
                <Brain className="h-4 w-4" />
                Checkpoint
              </div>
              <p className="mt-3 text-sm font-bold leading-6 text-white">{activeLesson.checkpoint.question}</p>
              <div className="mt-4 space-y-2">
                {activeLesson.checkpoint.options.map((option, index) => {
                  const selected = selectedAnswer === index;
                  const correct = index === activeLesson.checkpoint.correct_index;
                  return (
                    <button
                      key={`${activeLesson.id}-${option.label}`}
                      type="button"
                      onClick={() => chooseAnswer(activeLesson, index)}
                      className={
                        selected
                          ? correct
                            ? "grid w-full grid-cols-[24px_minmax(0,1fr)] gap-2 rounded-lg border border-cyber-green/50 bg-cyber-green/10 px-3 py-3 text-left"
                            : "grid w-full grid-cols-[24px_minmax(0,1fr)] gap-2 rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-3 text-left"
                          : "grid w-full grid-cols-[24px_minmax(0,1fr)] gap-2 rounded-lg border border-glass-border bg-[#0B0C0E] px-3 py-3 text-left hover:border-electric-blue/40"
                      }
                    >
                      <span className="text-xs font-black text-white/45">{String.fromCharCode(65 + index)}</span>
                      <span className="text-xs leading-5 text-on-surface">{option.label}</span>
                    </button>
                  );
                })}
              </div>
              {selectedAnswer !== undefined ? (
                <div className="mt-4 rounded-lg border border-glass-border bg-[#0B0C0E] p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    {selectedAnswer === activeLesson.checkpoint.correct_index ? "Passed" : "Review"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-on-surface">{activeLesson.checkpoint.options[selectedAnswer]?.feedback}</p>
                  <p className="mt-2 text-xs leading-5 text-electric-blue">{activeLesson.checkpoint.follow_up_question}</p>
                </div>
              ) : null}
            </aside>
          </section>
        </div>
      </div>
    </article>
  );
}

function EmptyLearningState({ selectedEcosystem, intentList }: { selectedEcosystem: EcosystemOption; intentList: string[] }) {
  return (
    <section className="flex min-h-[520px] items-center justify-center rounded-2xl border border-dashed border-glass-border bg-[#11161D] p-6">
      <div className="max-w-xl text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-electric-blue" />
        <h2 className="mt-4 text-2xl font-black text-white">Generate a {selectedEcosystem.label} module</h2>
        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
          Core will generate the lessons from the selected ecosystem, topic, profile, and intents. Lesson content appears here only after the AI response passes schema validation.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {intentList.map((intent) => (
            <span key={intent} className="rounded-full border border-electric-blue/20 bg-electric-blue/10 px-3 py-1 text-xs font-bold text-electric-blue">
              {intent}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuestRunView({
  account,
  moduleState,
  activeLessonIndex,
  answers,
  questState,
  questError,
  questGenerationState,
  onGenerateQuest,
  onOpenLearn,
  onOpenWorkbench,
}: {
  account: AccountSummary | null;
  moduleState: ModuleState | null;
  activeLessonIndex: number;
  answers: Record<string, number>;
  questState: QuestState | null;
  questError: string | null;
  questGenerationState: "idle" | "loading";
  onGenerateQuest: () => void;
  onOpenLearn: () => void;
  onOpenWorkbench: () => void;
}) {
  const lesson = moduleState?.module.lessons[activeLessonIndex] ?? null;
  const passed = Boolean(lesson && answers[lesson.id] === lesson.checkpoint.correct_index);
  const canGenerate = Boolean(account && moduleState && lesson && passed && questGenerationState !== "loading");

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl flex-col gap-7 p-4 md:p-8">
      <div className="border-b border-glass-border pb-6">
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white">
          <Cpu className="h-8 w-8 text-electric-blue" />
          Code Quest
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
          Turn a passed generated lesson into implementation files, denial tests, a code explainer, and a boss challenge tied to the checkpoint.
        </p>
      </div>

      <section className="rounded-xl border border-electric-blue/35 bg-electric-blue/10 p-5">
        {moduleState && lesson ? (
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-electric-blue">
                <BookOpen className="h-5 w-5" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider">{moduleState.ecosystem.label} lesson quest</span>
              </div>
              <h2 className="mt-2 text-xl font-black text-white">{lesson.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-on-surface-variant">{lesson.quest_bridge}</p>
            </div>
            <button
              type="button"
              onClick={onGenerateQuest}
              disabled={!canGenerate}
              className="flex min-w-[240px] items-center justify-center gap-2 rounded-xl bg-cyber-green px-5 py-3 text-sm font-extrabold uppercase tracking-wider text-black transition-all hover:brightness-110 disabled:brightness-50"
            >
              {questGenerationState === "loading" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {questGenerationState === "loading" ? "Generating" : passed ? "Generate Lesson Quest" : "Pass Checkpoint First"}
            </button>
          </div>
        ) : (
          <ActionEmpty text="Generate a lesson module first, then pass a checkpoint." action="Open Learn" onClick={onOpenLearn} />
        )}
      </section>

      {questError ? <Notice tone="red" text={questError} /> : null}

      {questState ? (
        <Panel title="Generated quest" icon={<Terminal className="h-5 w-5 text-cyber-green" />} action="Open Workbench" onAction={onOpenWorkbench}>
          <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">{questState.response.learning_context.lesson_title}</p>
          <h3 className="mt-2 text-xl font-black text-white">{questState.response.quest.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{questState.response.quest.premise}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <MiniStat label="Files" value={String(questState.response.quest.workbench_files.length)} />
            <MiniStat label="Runner" value={runnerStateLabel(questState)} />
            <MiniStat label="Save" value={questState.response.persistence.saved ? "Saved" : "Local"} />
          </div>
        </Panel>
      ) : null}
    </main>
  );
}

function WorkbenchView({
  moduleState,
  questState,
  setQuestState,
  onOpenQuestRun,
  onVerifyWorkspace,
  onSubmitRunner,
  onRefreshRunner,
  runnerSubmitting,
}: {
  moduleState: ModuleState | null;
  questState: QuestState | null;
  setQuestState: (state: QuestState) => void;
  onOpenQuestRun: () => void;
  onVerifyWorkspace: () => void;
  onSubmitRunner: () => void;
  onRefreshRunner: () => void;
  runnerSubmitting: boolean;
}) {
  if (!questState) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl items-center justify-center p-4 md:p-8">
        <section className="w-full rounded-2xl border border-glass-border bg-[#11161D] p-6 text-center md:p-10">
          <Code2 className="mx-auto h-12 w-12 text-electric-blue" />
          <h1 className="mt-4 text-3xl font-black text-white">Workbench</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
            Generate a lesson quest first. The Workbench opens only when Core returns real quest files.
          </p>
          <button type="button" onClick={onOpenQuestRun} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-electric-blue px-5 text-sm font-black uppercase tracking-wider text-black transition-all hover:brightness-110">
            Open Quest Run
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      </main>
    );
  }

  const quest = questState.response.quest;
  const selectedFile = selectedQuestFile(questState) ?? quest.workbench_files[0] ?? null;
  const runnerCanSubmit = Boolean(
    selectedFile &&
      questState.response.runner.enabled &&
      questState.response.runner.ecosystem_supported &&
      moduleState?.ecosystem.id === "zcash",
  );

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[1440px] flex-col gap-6 p-4 md:p-8">
      <div className="border-b border-glass-border pb-6">
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white">
          <Code2 className="h-8 w-8 text-electric-blue" />
          Workbench
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-on-surface-variant">{quest.build_objective}</p>
      </div>

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside className="rounded-xl border border-glass-border bg-[#11161D] p-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-electric-blue">Generated files</p>
          <div className="mt-4 grid gap-2">
            {quest.workbench_files.map((file) => (
              <button
                key={file.path}
                type="button"
                onClick={() => setQuestState({ ...questState, selectedFilePath: file.path })}
                className={
                  selectedFile?.path === file.path
                    ? "rounded-lg border border-electric-blue/45 bg-electric-blue/10 p-3 text-left"
                    : "rounded-lg border border-glass-border bg-[#0B0C0E] p-3 text-left hover:border-electric-blue/30"
                }
              >
                <span className="block text-xs font-black text-white">{file.path}</span>
                <span className="mt-1 block text-[10px] uppercase text-on-surface-variant">{file.language || "text"} / {file.content.length} bytes</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-xl border border-glass-border bg-[#07111F]">
          <div className="flex items-center justify-between border-b border-[#18304F] bg-[#0A1628] px-4 py-3">
            <span className="truncate font-mono text-xs font-bold text-electric-blue">{selectedFile?.path ?? "No file selected"}</span>
            <span className="font-mono text-[10px] uppercase text-on-surface-variant">{selectedFile?.language || "source"}</span>
          </div>
          <pre className="max-h-[640px] overflow-auto p-4 text-xs leading-6 text-[#D6DEFF]"><code>{selectedFile?.content ?? ""}</code></pre>
        </section>

        <aside className="flex flex-col gap-4">
          <Panel title="Code explainer" icon={<Brain className="h-5 w-5 text-cyber-green" />}>
            <div className="grid gap-3 text-sm leading-relaxed text-on-surface-variant">
              <ExplainerRow label="Invariant" value={quest.code_explainer.primary_invariant} />
              <ExplainerRow label="Denial path" value={quest.code_explainer.denial_path} />
              <ExplainerRow label="Risk focus" value={quest.code_explainer.risk_focus} />
            </div>
          </Panel>

          <Panel title="Workspace checks" icon={<ShieldCheck className="h-5 w-5 text-electric-blue" />} action="Run Checks" onAction={onVerifyWorkspace}>
            <div className="grid gap-2">
              <MiniStat label="Local check" value={questState.workspaceVerified ? "Passed" : "Open"} />
              {questState.verificationLog.map((line) => (
                <p key={line} className="rounded border border-glass-border bg-[#0B0C0E] p-2 font-mono text-[10px] text-on-surface-variant">{line}</p>
              ))}
            </div>
          </Panel>

          <Panel title="Runner evidence" icon={<Cpu className="h-5 w-5 text-warning-amber" />}>
            <div className="grid gap-3">
              <MiniStat label="API state" value={runnerStateLabel(questState)} />
              <MiniStat label="Scenario" value={questState.response.runner.scenario_id} />
              {runnerCanSubmit ? (
                <button
                  type="button"
                  onClick={onSubmitRunner}
                  disabled={runnerSubmitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cyber-green px-4 text-xs font-black uppercase tracking-wider text-black disabled:brightness-50"
                >
                  {runnerSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Submit Selected File
                </button>
              ) : (
                <p className="rounded-lg border border-warning-amber/25 bg-warning-amber/10 p-3 text-xs leading-relaxed text-warning-amber">
                  Runner submission is available only when Core reports the reviewed Zcash runner enabled. Current state: {runnerStateLabel(questState)}.
                </p>
              )}
              {questState.runnerSubmission ? (
                <div className="rounded-lg border border-glass-border bg-[#0B0C0E] p-3 text-xs leading-6 text-on-surface-variant">
                  <p><span className="font-bold text-white">Submission:</span> {questState.runnerSubmission.submission_id}</p>
                  <p><span className="font-bold text-white">State:</span> {questState.runnerSubmission.state}</p>
                  <p><span className="font-bold text-white">Digest:</span> {questState.runnerSubmission.result_digest ?? questState.runnerSubmission.source_digest}</p>
                  <button type="button" onClick={onRefreshRunner} disabled={runnerSubmitting} className="mt-3 inline-flex items-center gap-2 rounded border border-electric-blue/30 px-3 py-2 font-bold uppercase text-electric-blue disabled:opacity-50">
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh
                  </button>
                </div>
              ) : null}
              {questState.runnerError ? <Notice tone="red" text={questState.runnerError} /> : null}
            </div>
          </Panel>
        </aside>
      </section>
    </main>
  );
}

function ShipGateView({ questState, moduleState, onOpenWorkbench }: { questState: QuestState | null; moduleState: ModuleState | null; onOpenWorkbench: () => void }) {
  const runnerPassed = questState?.runnerSubmission?.state === "passed";
  const runnerEnabled = Boolean(questState?.response.runner.enabled);
  const canClaim = Boolean(questState && questState.workspaceVerified && (!runnerEnabled || runnerPassed));
  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-7xl flex-col gap-8 p-4 md:p-8">
      <div className="border-b border-glass-border pb-6">
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white">
          <Ship className="h-8 w-8 text-electric-blue" />
          Ship Gate
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">
          Review the generated quest evidence. Reward and grant evidence flows stay locked until real verification state exists.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <StatusCard label="Ecosystem" value={moduleState?.ecosystem.label ?? "None"} detail="Selected learning track" />
        <StatusCard label="Quest" value={questState ? "Generated" : "Empty"} detail="Core-authored implementation challenge" />
        <StatusCard label="Workspace" value={questState?.workspaceVerified ? "Checked" : "Open"} detail="Local proof/test/denial scan" />
        <StatusCard label="Runner" value={runnerEnabled ? (runnerPassed ? "Passed" : "Enabled") : "Disabled"} detail="Reviewed Zcash runner API" />
      </section>

      <section className="rounded-2xl border border-glass-border bg-[#11161D] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyber-green">Evidence decision</p>
            <h2 className="mt-2 text-2xl font-black text-white">{canClaim ? "Evidence is reviewable" : "Evidence is not complete"}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-on-surface-variant">
              {canClaim
                ? "The generated quest has concrete workspace evidence. If the reviewed runner is enabled, a passed runner receipt is required before this becomes claim evidence."
                : "Generate a quest, inspect the files, run workspace checks, and use runner evidence only when Core exposes the reviewed Zcash runner."}
            </p>
          </div>
          <button type="button" onClick={onOpenWorkbench} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-electric-blue px-5 text-sm font-black uppercase tracking-wider text-black transition-all hover:brightness-110">
            Open Workbench
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </main>
  );
}

function Panel({ title, icon, action, onAction, children }: { title: string; icon: React.ReactNode; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-glass-border bg-[#15181F] p-5">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-glass-border pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-white">{title}</h2>
        </div>
        {action && onAction ? (
          <button type="button" onClick={onAction} className="rounded border border-electric-blue/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-electric-blue hover:bg-electric-blue/10">
            {action}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function StatusPill({ label, value, tone }: { label: string; value: string; tone: "blue" | "green" | "amber" }) {
  const color = tone === "blue" ? "border-electric-blue/25 bg-electric-blue/5 text-electric-blue" : tone === "green" ? "border-cyber-green/25 bg-cyber-green/5 text-cyber-green" : "border-warning-amber/25 bg-warning-amber/5 text-warning-amber";
  return (
    <div className={`rounded-xl border px-5 py-3 ${color}`}>
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider">{label}</span>
      <p className="mt-1 text-sm font-black uppercase text-white">{value}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-glass-border bg-[#15181F] p-5">
      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-glass-border bg-[#0B0C0E] p-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function StatusCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex h-40 flex-col justify-between rounded-xl border border-glass-border bg-[#16181D] p-5">
      <span className="font-mono text-[10px] font-bold uppercase text-on-surface-variant">{label}</span>
      <div>
        <span className="font-mono text-2xl font-black text-white md:text-3xl">{value}</span>
        <span className="mt-1 block font-mono text-[10px] uppercase text-on-surface-variant">{detail}</span>
      </div>
    </div>
  );
}

function Notice({ tone, text }: { tone: "amber" | "red"; text: string }) {
  const classes = tone === "amber" ? "border-warning-amber/30 bg-warning-amber/10 text-warning-amber" : "border-red-500/30 bg-red-500/10 text-red-300";
  return <div className={`mt-3 rounded-lg border p-3 text-xs leading-relaxed ${classes}`}>{text}</div>;
}

function ActionEmpty({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-glass-border bg-[#0B0C0E] p-5 text-center">
      <p className="text-sm leading-relaxed text-on-surface-variant">{text}</p>
      <button type="button" onClick={onClick} className="mt-4 rounded-lg bg-electric-blue px-4 py-2 text-xs font-black uppercase tracking-wider text-black">
        {action}
      </button>
    </div>
  );
}

function ExplainerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-glass-border bg-[#0B0C0E] p-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-electric-blue">{label}</p>
      <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{value}</p>
    </div>
  );
}

function parseIntents(value: string): string[] {
  const intents = value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);

  return intents.length > 0 ? intents : ["Understand generated code", "Name the trust boundary", "Design denial tests"];
}

function buildLearnerGoal(ecosystem: EcosystemOption, topic: string, intents: string[]): string {
  return `Teach me ${ecosystem.label} through ${topic}. I want to ${intents.join(", ")}.`;
}

function lessonContext(generatedModule: LearningModuleDto, lesson: LearningLessonDto, selectedAnswer: number | undefined): string {
  const selected = selectedAnswer === undefined ? "not answered" : String.fromCharCode(65 + selectedAnswer);
  return [
    `Module: ${generatedModule.title}`,
    `Outcome: ${generatedModule.outcome}`,
    `Lesson: ${lesson.title}`,
    `Why it matters: ${lesson.why_it_matters}`,
    `Explanation: ${lesson.explanation}`,
    `Concepts: ${lesson.concepts.join(", ")}`,
    `Checkpoint: ${lesson.checkpoint.question}`,
    `Selected answer: ${selected}`,
    `Correct index: ${lesson.checkpoint.correct_index}`,
    `Checkpoint explanation: ${lesson.checkpoint.explanation}`,
    `Quest bridge: ${lesson.quest_bridge}`,
  ].join("\n");
}

function completedLessonCount(module: LearningModuleDto | null, answers: Record<string, number>) {
  if (!module) return 0;
  return module.lessons.filter((lesson) => answers[lesson.id] === lesson.checkpoint.correct_index).length;
}

function ecosystemById(id: EcosystemId): EcosystemOption {
  return ECOSYSTEMS.find((item) => item.id === id) ?? ECOSYSTEMS[2];
}

function asEcosystemId(value: string | null | undefined): EcosystemId | null {
  return value === "ckb" || value === "fiber" || value === "zcash" ? value : null;
}

function syncStateLabel(state: SyncState) {
  if (state === "loading") return "Loading";
  if (state === "saving") return "Saving";
  if (state === "saved") return "Saved";
  if (state === "local-only") return "Local";
  return "Idle";
}

function tutorMessageFromDto(message: TutorMessageDto): TutorMessage {
  return {
    id: message.id,
    role: message.role,
    text: message.text,
    why: message.why ?? undefined,
    followUp: message.follow_up ?? undefined,
    moduleId: message.module_id ?? undefined,
    moduleTitle: message.module_title ?? undefined,
    lessonId: message.lesson_id ?? undefined,
    lessonTitle: message.lesson_title ?? undefined,
    createdAt: message.created_at,
  };
}

function tutorMessageToDto(message: TutorMessage): TutorMessageDto {
  return {
    id: message.id,
    role: message.role,
    text: message.text,
    why: message.why ?? null,
    follow_up: message.followUp ?? null,
    module_id: message.moduleId ?? null,
    module_title: message.moduleTitle ?? null,
    lesson_id: message.lessonId ?? null,
    lesson_title: message.lessonTitle ?? null,
    created_at: message.createdAt,
  };
}

function selectedQuestFile(questState: QuestState): WorkbenchFileDto | null {
  return (
    questState.response.quest.workbench_files.find((file) => file.path === questState.selectedFilePath) ??
    questState.response.quest.workbench_files[0] ??
    null
  );
}

function verifyGeneratedWorkspace(files: WorkbenchFileDto[], ecosystemId: EcosystemId) {
  const haystack = files.map((file) => `${file.path}\n${file.language}\n${file.content}`).join("\n").toLowerCase();
  const checks = [
    { label: "workspace files returned with content", passed: files.length > 0 && files.every((file) => file.content.trim().length > 0) },
    { label: "implementation function and test path present", passed: /(verify|validate|authorize|settle|checkout|read)/.test(haystack) && /(test|spec|assert|expect|should|#\[test\])/.test(haystack) },
    { label: "trust boundary is named", passed: /proof|signature|receipt|payment|fiber|ckb|cell|witness|zcash|zip-321|shielded|viewing/.test(haystack) },
    { label: "denial or failure path present", passed: /block|reject|unauthorized|unpaid|forbid|deny|invalid|error|false|mismatch|wrong network|unsafe/.test(haystack) },
  ];

  if (ecosystemId === "zcash") {
    checks.push(
      { label: "Zcash shielded payment boundary present", passed: /zcash|zip-321|shielded|memo|viewing|orchard|recipient/.test(haystack) },
      { label: "privacy denial behavior present", passed: /viewing key|memo|privacy|unsafe recipient|wrong network|deny|reject/.test(haystack) },
    );
  }

  return {
    passed: checks.every((check) => check.passed),
    logs: checks.map((check) => `[VQ-CORE] ${check.passed ? "PASS" : "FAIL"}: ${check.label}.`),
  };
}

function runnerStateLabel(questState: QuestState) {
  if (!questState.response.runner.ecosystem_supported) return "Unsupported";
  if (!questState.response.runner.enabled) return "Disabled";
  return questState.runnerSubmission?.state ?? "Enabled";
}
