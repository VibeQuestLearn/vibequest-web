
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
  Hexagon,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  MessageSquare,
  Network,
  Play,
  RefreshCw,
  ShieldCheck,
  Ship,
  Terminal,
  X,
  Zap,
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
type LearnScreenMode = "select" | "module";

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
const LEARNING_INTENT_OPTIONS = [
  "Understand the trust boundary",
  "Read generated verifier code",
  "Design denial tests before shipping",
];
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
  const [learnScreenMode, setLearnScreenMode] = useState<LearnScreenMode>("select");
  const [ecosystemId, setEcosystemId] = useState<EcosystemId>("zcash");
  const selectedEcosystem = ecosystemById(ecosystemId);
  const [topic, setTopic] = useState(selectedEcosystem.defaultTopic);
  const [profile, setProfile] = useState("Vibecoder");
  const [pace, setPace] = useState("Focused");
  const [intentText, setIntentText] = useState("Understand the trust boundary");
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
    setLearnScreenMode("module");
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
    setLearnScreenMode("module");

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
      setLearnScreenMode("module");
      setActiveTab("learn");
    } catch (error) {
      setLearnScreenMode("select");
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

  const immersiveLearnFlow =
    activeTab === "learn" &&
    (generationState === "loading" || (learnScreenMode === "module" && Boolean(moduleState)));

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#030d0b] font-sans text-on-surface">
      {!immersiveLearnFlow ? (
        <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#030b0a]/96 backdrop-blur-md">
          <div className="mx-auto grid h-[70px] max-w-none grid-cols-[1fr_auto_1fr] items-center gap-4 px-6">
            <button
              type="button"
              onClick={() => setActiveTab("landing")}
              className="flex min-w-0 items-center gap-3 text-left"
            >
              <Hexagon className="h-8 w-8 shrink-0 text-electric-blue" strokeWidth={2.5} aria-hidden="true" />
              <span className="block truncate text-[22px] font-black tracking-[-0.03em] text-white">VibeQuest</span>
            </button>

            <nav className="hidden items-center gap-8 md:flex" aria-label="VibeQuest workspace">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    activeTab === tab.id
                      ? "text-sm font-semibold text-electric-blue"
                      : "text-sm font-medium text-white/62 transition-colors hover:text-white"
                  }
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex justify-end">
              <AccountControl account={account} authConfigured={authConfigured} />
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto border-t border-white/[0.06] bg-[#030b0a]/80 px-4 py-2 md:hidden">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={
                  activeTab === tab.id
                    ? "whitespace-nowrap rounded-md bg-electric-blue/10 px-3 py-1.5 text-xs font-medium text-electric-blue"
                    : "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-white/55 hover:bg-white/5 hover:text-white"
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>
      ) : null}

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
          learnScreenMode={learnScreenMode}
          onBackToSelect={() => setLearnScreenMode("select")}
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
  const architectureCards = [
    {
      icon: <ShieldCheck className="h-5 w-5" aria-hidden="true" />,
      title: "CKB (Nervos)",
      copy: "Master RGB++ based smart contracts, cell model architecture, and state-channel fundamentals on the Common Knowledge Base.",
      meta: "CKB retained",
      tone: "text-cyber-green",
    },
    {
      icon: <Network className="h-5 w-5" aria-hidden="true" />,
      title: "Fiber Network",
      copy: "Build next-generation Lightning-style payment channels. Learn HTLCs, routing protocols, and multi-hop channel management.",
      meta: "Fiber retained",
      tone: "text-warning-amber",
    },
    {
      icon: <LockKeyhole className="h-5 w-5" aria-hidden="true" />,
      title: "Zcash",
      copy: "Deep dive into privacy-preserving protocols. Implement zk-SNARKs, shielded transactions, and zero-knowledge proofs.",
      meta: "Zcash active",
      tone: "text-electric-blue",
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07100f] font-sans text-white selection:bg-electric-blue/30">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#06100f]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8">
          <button type="button" onClick={onEnter} className="group flex items-center gap-3 text-left">
            <span className="flex h-7 w-7 items-center justify-center bg-electric-blue text-black shadow-[0_0_18px_rgba(0,240,255,0.35)] transition-transform group-hover:translate-x-0.5">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-mono text-[11px] font-black uppercase tracking-[-0.02em] text-white">
              VibeQuest
            </span>
          </button>

          <nav className="hidden items-center gap-12 font-mono text-[9px] font-bold uppercase tracking-[0.34em] text-white/55 md:flex" aria-label="Landing sections">
            <a className="transition hover:text-electric-blue" href="#chains">Chains</a>
            <a className="transition hover:text-electric-blue" href="#workflow">Workflow</a>
            <a className="transition hover:text-electric-blue" href="#quests">Quests</a>
          </nav>

          <button
            type="button"
            onClick={onEnter}
            title={account ? "Open your workbench" : "Open the workbench and sign in when ready"}
            className="inline-flex h-9 items-center justify-center gap-2 bg-electric-blue px-4 font-mono text-[9px] font-black uppercase tracking-[0.22em] text-black shadow-[0_0_24px_rgba(0,240,255,0.18)] transition hover:brightness-110"
          >
            Open Workbench
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main>
        <section
          className="relative flex min-h-[780px] items-center justify-center overflow-hidden px-5 pt-28 text-center"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(3,10,10,0.62) 0%, rgba(3,10,10,0.84) 55%, #07100f 100%), url('/images/vibequest/protocol-network.png')",
            backgroundPosition: "center top",
            backgroundSize: "cover",
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.16),transparent_34%),linear-gradient(90deg,rgba(7,16,15,0.86),transparent_18%,transparent_82%,rgba(7,16,15,0.86))]" />
          <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center">
            <div className="mb-9 inline-flex items-center gap-2 rounded-full border border-electric-blue/40 bg-[#061615]/80 px-4 py-1.5 shadow-[0_0_24px_rgba(0,240,255,0.12)]">
              <span className="h-1.5 w-1.5 rounded-full bg-electric-blue shadow-[0_0_12px_rgba(0,240,255,0.9)]" />
              <span className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-electric-blue">
                System online · Protocol v3.6.1
              </span>
            </div>

            <h1 className="max-w-4xl text-balance text-[42px] font-black uppercase leading-[0.95] tracking-[-0.055em] text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.75)] sm:text-6xl lg:text-[76px]">
              The AI Workbench
              <span className="block">For</span>
              <span className="block text-electric-blue drop-shadow-[0_3px_0_rgba(0,0,0,0.95)]">
                Protocol Builders.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-balance text-sm leading-7 text-white/66 sm:text-base">
              Choose the chain, generate the lesson, prove the code. Master the bleeding edge of cryptographic proofs and payment channels.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={onLearn}
                className="inline-flex h-12 min-w-56 items-center justify-center gap-3 bg-electric-blue px-6 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-black shadow-[0_0_32px_rgba(0,240,255,0.2)] transition hover:-translate-y-0.5 hover:brightness-110"
              >
                Start Learning
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onEnter}
                className="inline-flex h-12 min-w-56 items-center justify-center gap-3 border border-white/22 bg-black/35 px-6 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white transition hover:border-electric-blue/60 hover:text-electric-blue"
              >
                <Terminal className="h-4 w-4" aria-hidden="true" />
                Explore Quests
              </button>
            </div>

            {!authConfigured ? (
              <p className="mt-5 max-w-xl border border-warning-amber/35 bg-warning-amber/10 px-4 py-3 text-xs leading-6 text-warning-amber">
                Google auth is not configured in this running web process. Add the Google variables and restart before testing sign-in.
              </p>
            ) : null}

            <TerminalWindow className="mt-14 w-full max-w-[860px]" title="vibequest.init.rs">
              <pre className="overflow-x-auto p-6 text-left font-mono text-[11px] leading-6 text-white/90 sm:text-xs">
                <code>
                  <span className="text-cyber-green">fn</span> verify_proof(proof: <span className="text-warning-amber">ZkProof</span>, public_input: <span className="text-electric-blue">Bytes</span>) -&gt; <span className="text-cyber-green">Result</span>&lt;(), Error&gt; &#123;{"\n"}
                  <span className="text-white/60">    let verifier = </span><span className="text-electric-blue">Verifier</span>::new(VK_HASH);{"\n"}
                  <span className="text-white/60">    </span><span className="text-cyber-green">if</span><span className="text-white/60"> !verifier.verify(proof, public_input)? &#123;</span>{"\n"}
                  <span className="text-white/60">        </span><span className="text-cyber-green">return</span><span className="text-white/60"> Err(Error::InvalidProof);</span>{"\n"}
                  <span className="text-white/60">    &#125;</span>{"\n"}
                  <span className="text-white/60">    Ok(())</span>{"\n"}
                  <span className="text-white/60">&#125;</span>
                </code>
              </pre>
            </TerminalWindow>
          </div>
        </section>

        <section id="chains" className="relative mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:py-32">
          <div className="text-center">
            <h2 className="text-2xl font-black uppercase tracking-[-0.04em] drop-shadow-[0_3px_0_rgba(0,0,0,0.8)] sm:text-3xl">
              Target Architectures
            </h2>
            <p className="mt-4 text-xs text-white/42 sm:text-sm">
              Select your protocol. Generate intent-driven learning modules.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {architectureCards.map((card) => (
              <article key={card.title} className="group border border-white/[0.055] bg-[#040b0b]/82 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.28)] transition hover:-translate-y-1 hover:border-electric-blue/30 hover:bg-[#061111]">
                <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-md bg-electric-blue/10 text-electric-blue shadow-[0_0_24px_rgba(0,240,255,0.12)]">
                  {card.icon}
                </div>
                <h3 className="text-lg font-black text-white">{card.title}</h3>
                <p className="mt-5 min-h-24 text-sm leading-7 text-white/58">{card.copy}</p>
                <p className={`mt-7 font-mono text-[9px] font-black uppercase tracking-[0.2em] ${card.tone}`}>
                  {card.meta}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="workflow" className="border-y border-white/[0.06] bg-[#0a1514] px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto grid max-w-[1440px] gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-[-0.05em] drop-shadow-[0_3px_0_rgba(0,0,0,0.8)] sm:text-4xl">
                The Learning Loop
              </h2>
              <p className="mt-6 max-w-xl text-sm leading-7 text-white/62">
                VibeQuest does not offer static tutorials. You declare your intent, our AI models synthesize a custom learning module, then real-time protocol documentation, code, and runner evidence keep the work grounded.
              </p>

              <div className="mt-12 space-y-9">
                <LoopStep number="01" title="Declare Intent">
                  “I want to build a HTLC contract on CKB.” The engine parses your intent and cross-references protocol capabilities.
                </LoopStep>
                <LoopStep number="02" title="Module Synthesis">
                  AI generates a tailored learning path, complete with architectural diagrams, prerequisite concepts, and sandboxed environments.
                </LoopStep>
                <LoopStep number="03" title="Prove the Code">
                  Complete the generated quest. Your code is compiled, tested against the protocol node, and verified cryptographically.
                </LoopStep>
              </div>
            </div>

            <TerminalWindow title="ENGINE_OUTPUT.LOG" action="✦">
              <div className="p-7 font-mono text-[11px] leading-7 text-white/68 sm:text-xs">
                <p>&gt; Initializing module synthesis...</p>
                <p>&gt; Target: CKB / Fiber / Zcash</p>
                <p>&gt; Intent: Shielded checkout validation</p>
                <p className="mt-4 text-cyber-green">[SUCCESS] Found relevant protocol specs v1.2</p>
                <ol className="mt-3 space-y-1 text-white/72">
                  <li>✓ 1. Cell Model Basics</li>
                  <li>✓ 2. Lock Script Fundamentals</li>
                  <li>✓ 3. Time-lock constraints...</li>
                </ol>
                <div className="mt-8 border border-electric-blue/35 bg-electric-blue/[0.055] p-5">
                  <p className="text-electric-blue">{"// Quest Generated:"}</p>
                  <p className="mt-2 italic text-white/80">
                    Implement a script that verifies the timelock condition before allowing cell consumption.
                  </p>
                </div>
              </div>
            </TerminalWindow>
          </div>
        </section>

        <section id="quests" className="border-b border-white/[0.06] bg-[#050c0c] px-5 py-10 sm:px-8">
          <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-0 text-center md:grid-cols-4">
            <LandingStat value="3" label="Protocol targets" />
            <LandingStat value="5" label="AI lessons/module" />
            <LandingStat value="1" label="Reviewed Zcash runner" />
            <LandingStat value="0" label="Fake placeholders" />
          </div>
        </section>

        <section
          className="relative overflow-hidden px-5 py-28 text-center sm:px-8 lg:py-40"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(5,12,12,0.78) 0%, rgba(5,12,12,0.62) 42%, rgba(5,12,12,0.9) 100%), url('/images/vibequest/workbench-lab.png')",
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.16),transparent_28%)]" />
          <div className="relative z-10 mx-auto max-w-4xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center border border-electric-blue/45 bg-electric-blue/10 text-electric-blue shadow-[0_0_34px_rgba(0,240,255,0.24)]">
              <Cpu className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="mt-9 text-4xl font-black uppercase leading-none tracking-[-0.06em] drop-shadow-[0_4px_0_rgba(0,0,0,0.8)] sm:text-6xl">
              Enter the Workbench.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
              Stop reading documentation. Start proving code. The next generation of global settlement layers will build themselves.
            </p>
            <button
              type="button"
              onClick={onEnter}
              className="mt-10 inline-flex h-12 items-center justify-center gap-3 bg-electric-blue px-8 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-black transition hover:-translate-y-0.5 hover:brightness-110"
            >
              Initialize Environment
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] bg-[#050909] px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 text-[10px] uppercase tracking-[0.22em] text-white/38 md:flex-row md:items-center md:justify-between">
          <button type="button" onClick={onEnter} className="flex items-center gap-2 font-mono font-black text-electric-blue">
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            VibeQuest
          </button>
          <div className="flex flex-wrap gap-7 font-mono">
            <a href="#workflow" className="hover:text-electric-blue">Documentation</a>
            <a href="https://github.com/VibeQuestLearn" className="hover:text-electric-blue">GitHub</a>
            <button type="button" onClick={onLearn} className="uppercase tracking-[0.22em] hover:text-electric-blue">Start Learning</button>
          </div>
          <p>© 2026 VibeQuest. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function TerminalWindow({
  title,
  action,
  className = "",
  children,
}: {
  title: string;
  action?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`overflow-hidden rounded-md border border-white/14 bg-[#030909]/88 shadow-[0_22px_90px_rgba(0,0,0,0.46)] backdrop-blur-sm ${className}`}>
      <div className="flex h-8 items-center justify-between border-b border-white/[0.07] bg-white/[0.045] px-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff4d4d]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffcc33]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#37d67a]" />
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/28">{title}</span>
        <span className="w-10 text-right font-mono text-[10px] text-electric-blue">{action ?? ""}</span>
      </div>
      {children}
    </div>
  );
}

function LoopStep({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[44px_1fr] gap-5">
      <div className="relative flex justify-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-electric-blue bg-[#07100f] font-mono text-[10px] font-black text-electric-blue shadow-[0_0_18px_rgba(0,240,255,0.16)]">
          {number}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-black text-white">{title}</h3>
        <p className="mt-2 max-w-xl text-xs leading-6 text-white/52">{children}</p>
      </div>
    </div>
  );
}

function LandingStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-white/[0.07] px-4 py-4 md:border-r md:last:border-r-0">
      <p className="font-mono text-3xl font-black text-electric-blue sm:text-4xl">{value}</p>
      <p className="mt-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/42">{label}</p>
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
  learnScreenMode: LearnScreenMode;
  onBackToSelect: () => void;
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

  if (props.generationState === "loading") {
    return <LearningGenerationLoader />;
  }

  if (props.learnScreenMode === "module" && props.moduleState && learningModule && activeLesson) {
    return (
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
        onBackToSelect={props.onBackToSelect}
      />
    );
  }

  return (
    <LearningSelectView
      account={props.account}
      authConfigured={props.authConfigured}
      ecosystems={props.ecosystems}
      selectedEcosystem={props.selectedEcosystem}
      chooseEcosystem={props.chooseEcosystem}
      topic={props.topic}
      setTopic={props.setTopic}
      profile={props.profile}
      setProfile={props.setProfile}
      pace={props.pace}
      setPace={props.setPace}
      intentList={props.intentList}
      setIntentText={props.setIntentText}
      generationError={props.generationError}
      onGenerate={props.onGenerate}
      syncWarning={props.syncWarning}
    />
  );
}

function LearningSelectView({
  account,
  authConfigured,
  ecosystems,
  selectedEcosystem,
  chooseEcosystem,
  topic,
  setTopic,
  profile,
  setProfile,
  pace,
  setPace,
  intentList,
  setIntentText,
  generationError,
  onGenerate,
  syncWarning,
}: {
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
  intentList: string[];
  setIntentText: (value: string) => void;
  generationError: string | null;
  onGenerate: () => Promise<void>;
  syncWarning: string | null;
}) {
  const [configuringEcosystemId, setConfiguringEcosystemId] = useState<EcosystemId | null>(null);
  const configuringEcosystem = configuringEcosystemId
    ? ecosystems.find((ecosystem) => ecosystem.id === configuringEcosystemId) ?? selectedEcosystem
    : null;

  function openConfigurator(ecosystem: EcosystemOption) {
    chooseEcosystem(ecosystem);
    setConfiguringEcosystemId(ecosystem.id);
  }

  function toggleIntent(intent: string) {
    const current = intentList.filter(Boolean);
    const exists = current.includes(intent);
    const next = exists ? current.filter((item) => item !== intent) : [...current, intent];
    if (next.length === 0) return;
    setIntentText(next.join("\n"));
  }

  return (
    <main className="relative min-h-[calc(100vh-70px)] bg-[#03100e] px-6 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-70px)] max-w-[1140px] flex-col items-center justify-center pb-24 pt-14">
        <div className="text-center">
          <div className="mx-auto mb-7 flex h-[58px] w-[58px] items-center justify-center rounded-2xl border border-electric-blue/10 bg-electric-blue/[0.035] shadow-[0_0_40px_rgba(0,240,255,0.05)]">
            <GraduationCap className="h-8 w-8 text-electric-blue" strokeWidth={2.2} aria-hidden="true" />
          </div>
          <h1 className="text-[48px] font-black leading-none tracking-[-0.055em] text-white md:text-[50px]">
            Learning Mode
          </h1>
          <p className="mx-auto mt-8 max-w-[680px] text-center text-[19px] leading-8 text-white/48">
            Choose an ecosystem, name the topic, set your learning intent, then let Core
            <span className="block">generate lessons.</span>
          </p>
        </div>

        <div className="mt-16 grid w-full gap-6 md:grid-cols-3">
          {ecosystems.map((ecosystem) => (
            <button
              key={ecosystem.id}
              type="button"
              onClick={() => openConfigurator(ecosystem)}
              className="group min-h-[258px] rounded-2xl border border-white/[0.075] bg-[#071410] p-8 text-left transition hover:-translate-y-0.5 hover:border-electric-blue/35 hover:bg-[#081915] hover:shadow-[0_0_42px_rgba(0,240,255,0.06)]"
            >
              <span className="flex h-[54px] w-[54px] items-center justify-center rounded-xl border border-white/[0.035] bg-[#020b0a] text-xl font-black text-electric-blue shadow-[0_0_24px_rgba(0,240,255,0.04)]">
                {ecosystem.label.charAt(0)}
              </span>
              <span className="mt-7 block text-2xl font-black tracking-[-0.04em] text-white">{ecosystem.label}</span>
              <span className="mt-4 block max-w-[290px] text-[15px] leading-6 text-white/48">{ecosystem.detail}</span>
            </button>
          ))}
        </div>
      </section>

      {configuringEcosystem ? (
        <SessionConfigModal
          account={account}
          authConfigured={authConfigured}
          ecosystem={configuringEcosystem}
          topic={topic}
          setTopic={setTopic}
          profile={profile}
          setProfile={setProfile}
          pace={pace}
          setPace={setPace}
          intentList={intentList}
          toggleIntent={toggleIntent}
          generationError={generationError}
          syncWarning={syncWarning}
          onGenerate={onGenerate}
          onClose={() => setConfiguringEcosystemId(null)}
        />
      ) : null}
    </main>
  );
}

function SessionConfigModal({
  account,
  authConfigured,
  ecosystem,
  topic,
  setTopic,
  profile,
  setProfile,
  pace,
  setPace,
  intentList,
  toggleIntent,
  generationError,
  syncWarning,
  onGenerate,
  onClose,
}: {
  account: AccountSummary | null;
  authConfigured: boolean;
  ecosystem: EcosystemOption;
  topic: string;
  setTopic: (topic: string) => void;
  profile: string;
  setProfile: (profile: string) => void;
  pace: string;
  setPace: (pace: string) => void;
  intentList: string[];
  toggleIntent: (intent: string) => void;
  generationError: string | null;
  syncWarning: string | null;
  onGenerate: () => Promise<void>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-[#010807]/72 px-5 pt-[60px] text-white backdrop-blur-[10px]">
      <section className="w-full max-w-[672px] overflow-hidden rounded-2xl border border-white/[0.085] bg-[#071410] shadow-[0_32px_90px_rgba(0,0,0,0.55)]">
        <header className="flex h-[86px] items-center justify-between border-b border-white/[0.075] px-6">
          <div className="flex items-center gap-4">
            <span className="rounded-md border border-electric-blue/25 bg-electric-blue/10 px-4 py-2 font-mono text-xs font-black uppercase tracking-[0.14em] text-electric-blue">
              {ecosystem.label}
            </span>
            <h2 className="text-xl font-black tracking-[-0.035em] text-white">Configure Your Session</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close session configuration"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/45 transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="px-8 py-8">
          <label className="grid gap-3">
            <span className="text-sm font-black text-white">Topic</span>
            <textarea
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              rows={3}
              className="min-h-[96px] resize-none rounded-xl border border-white/[0.07] bg-[#030b0a] px-4 py-4 text-[15px] leading-6 text-white/72 outline-none transition focus:border-electric-blue/45"
            />
          </label>

          <div className="mt-8">
            <span className="text-sm font-black text-white">Profile</span>
            <div className="mt-3 flex flex-wrap gap-2">
              {PROFILES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setProfile(item)}
                  className={
                    profile === item
                      ? "rounded-xl bg-electric-blue px-4 py-3 text-sm font-black text-black shadow-[0_0_28px_rgba(0,240,255,0.18)]"
                      : "rounded-xl border border-white/[0.075] bg-electric-blue/[0.035] px-4 py-3 text-sm font-semibold text-white/50 transition hover:border-electric-blue/25 hover:text-white"
                  }
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <span className="text-sm font-black text-white">Pace</span>
            <div className="mt-3 flex flex-wrap gap-2">
              {PACES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPace(item)}
                  className={
                    pace === item
                      ? "rounded-xl bg-electric-blue px-4 py-3 text-sm font-black text-black shadow-[0_0_28px_rgba(0,240,255,0.18)]"
                      : "rounded-xl border border-white/[0.075] bg-electric-blue/[0.035] px-4 py-3 text-sm font-semibold text-white/50 transition hover:border-electric-blue/25 hover:text-white"
                  }
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <span className="text-sm font-black text-white">Learning Intents</span>
            <div className="mt-3 flex flex-wrap gap-3">
              {LEARNING_INTENT_OPTIONS.map((intent) => {
                const selected = intentList.includes(intent);
                return (
                  <button
                    key={intent}
                    type="button"
                    onClick={() => toggleIntent(intent)}
                    className={
                      selected
                        ? "inline-flex items-center gap-3 rounded-full border border-electric-blue bg-electric-blue/10 px-4 py-3 text-sm text-electric-blue shadow-[0_0_24px_rgba(0,240,255,0.14)]"
                        : "inline-flex items-center gap-3 rounded-full border border-white/[0.065] bg-[#020b0a] px-4 py-3 text-sm text-white/46 transition hover:border-electric-blue/25 hover:text-white"
                    }
                  >
                    <span className={selected ? "h-2 w-2 rounded-full bg-electric-blue shadow-[0_0_12px_rgba(0,240,255,0.8)]" : "h-2 w-2 rounded-full bg-white/10"} />
                    {intent}
                  </button>
                );
              })}
            </div>
          </div>

          {!account ? <Notice tone="amber" text="Google sign-in is required before Core can generate and bind learning state." /> : null}
          {!authConfigured ? <Notice tone="red" text="Google authentication configuration is incomplete in the running web process." /> : null}
          {generationError ? <Notice tone="red" text={generationError} /> : null}
          {syncWarning ? <Notice tone="amber" text={syncWarning} /> : null}
        </div>

        <footer className="border-t border-white/[0.065] bg-[#081512] px-6 py-6">
          <button
            type="button"
            onClick={() => void onGenerate()}
            className="flex h-[60px] w-full items-center justify-center gap-3 rounded-xl bg-electric-blue text-lg font-black text-black shadow-[0_0_32px_rgba(0,240,255,0.14)] transition hover:brightness-110"
          >
            <Zap className="h-5 w-5 fill-black" aria-hidden="true" />
            Generate Module
          </button>
        </footer>
      </section>
    </div>
  );
}

function LearningGenerationLoader() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#03100e] px-6 text-electric-blue">
      <div className="flex flex-col items-center">
        <div className="relative flex h-[128px] w-[128px] items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-electric-blue/5" />
          <span className="absolute inset-[8px] rounded-full border border-electric-blue/16 border-t-electric-blue animate-spin" />
          <span className="absolute inset-[20px] rounded-full border border-electric-blue/10 border-r-electric-blue/70 animate-spin-slow" />
          <Hexagon className="h-[70px] w-[70px] text-electric-blue drop-shadow-[0_0_24px_rgba(0,240,255,0.45)]" strokeWidth={3} aria-hidden="true" />
        </div>
        <p className="mt-7 font-mono text-[19px] tracking-[0.16em] text-electric-blue">
          Generating your learning modules...
        </p>
        <div className="mt-20 h-px w-[190px] overflow-hidden bg-electric-blue/8">
          <span className="block h-full w-1/2 animate-pulse bg-electric-blue/45" />
        </div>
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
  onBackToSelect,
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
  onBackToSelect: () => void;
}) {
  const learningModule = moduleState.module;
  const [draftAnswer, setDraftAnswer] = useState<number | undefined>(selectedAnswer);
  const lessonTutorMessages = tutorMessages.filter((message) => !message.lessonId || message.lessonId === activeLesson.id);

  useEffect(() => {
    setDraftAnswer(selectedAnswer);
  }, [activeLesson.id, selectedAnswer]);

  function lessonPassed(lesson: LearningLessonDto) {
    return answers[lesson.id] === lesson.checkpoint.correct_index;
  }

  function lessonUnlocked(index: number) {
    if (index === 0) return true;
    if (index <= activeLessonIndex) return true;
    return lessonPassed(learningModule.lessons[index - 1]);
  }

  const paragraphs = [activeLesson.why_it_matters, ...activeLesson.explanation.split(/\n{2,}/)]
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .slice(0, 4);

  return (
    <main className="min-h-screen bg-[#03100e] text-white lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="border-b border-white/[0.07] bg-[#061410] lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="px-4 py-5">
          <button
            type="button"
            onClick={onBackToSelect}
            className="mb-4 font-mono text-[11px] font-black uppercase tracking-[0.14em] text-white/45 transition hover:text-electric-blue"
          >
            ‹ Back to select
          </button>
          <p className="line-clamp-2 font-mono text-[10px] font-black uppercase leading-4 tracking-[0.14em] text-electric-blue">
            {moduleState.ecosystem.label} · {moduleState.topic}
          </p>
          <h2 className="mt-3 text-base font-black text-white">Module Pathway</h2>
        </div>

        <nav className="space-y-3 px-3 pb-6" aria-label="Module pathway">
          {learningModule.lessons.map((lesson, index) => {
            const active = index === activeLessonIndex;
            const passed = lessonPassed(lesson);
            const locked = !lessonUnlocked(index);
            const status = locked ? "Locked" : active ? "In progress" : passed ? "Checkpoint passed" : "Checkpoint open";
            return (
              <button
                key={lesson.id}
                type="button"
                onClick={() => {
                  if (!locked) chooseLesson(index);
                }}
                disabled={locked}
                className={
                  active
                    ? "grid min-h-[82px] w-full grid-cols-[30px_minmax(0,1fr)_20px] gap-3 rounded-lg border border-electric-blue/60 bg-electric-blue/10 px-4 py-4 text-left shadow-[0_0_24px_rgba(0,240,255,0.08)]"
                    : locked
                      ? "grid min-h-[82px] w-full grid-cols-[30px_minmax(0,1fr)_20px] gap-3 rounded-lg border border-transparent bg-[#06110e]/45 px-4 py-4 text-left opacity-35"
                      : "grid min-h-[82px] w-full grid-cols-[30px_minmax(0,1fr)_20px] gap-3 rounded-lg border border-white/[0.055] bg-[#030b0a] px-4 py-4 text-left transition hover:border-electric-blue/25"
                }
              >
                <span className="font-mono text-sm font-semibold text-white/42">{String(index + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <span className="line-clamp-2 text-sm font-semibold leading-5 text-white/78">{lesson.title}</span>
                  <span className={passed ? "mt-2 block font-mono text-[10px] font-black uppercase tracking-[0.12em] text-cyber-green" : active ? "mt-2 block font-mono text-[10px] font-black uppercase tracking-[0.12em] text-warning-amber" : "mt-2 block font-mono text-[10px] font-black uppercase tracking-[0.12em] text-white/35"}>
                    {status}
                  </span>
                </span>
                {passed ? <CheckCircle2 className="h-5 w-5 text-cyber-green" aria-hidden="true" /> : locked ? <LockKeyhole className="h-5 w-5 text-white/30" aria-hidden="true" /> : <ChevronRight className="h-5 w-5 text-electric-blue" aria-hidden="true" />}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="min-w-0 px-6 py-10 lg:px-0">
        <div className="mx-auto w-full max-w-[820px]">
          <article>
            <h1 className="text-3xl font-black leading-tight tracking-[-0.045em] text-white md:text-[36px]">
              {activeLesson.title}
            </h1>
            <div className="mt-6 space-y-6 text-base leading-8 text-white/68">
              {paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <div className="mt-8 overflow-hidden rounded-md border border-white/[0.075] bg-[#020b0a]">
              <div className="flex h-8 items-center gap-2 border-b border-white/[0.06] bg-white/[0.035] px-3">
                <ChevronRight className="h-5 w-5 text-electric-blue" aria-hidden="true" />
                <span className="font-mono text-[11px] font-black uppercase tracking-[0.16em] text-white/40">lesson_manifest.json</span>
              </div>
              <pre className="max-h-[360px] overflow-auto p-5 font-mono text-[13px] leading-6 text-white/78 scrollbar-none">
                <code>{formatLessonManifest(moduleState, activeLesson)}</code>
              </pre>
            </div>
          </article>

          <div className="my-8 h-px bg-white/[0.075]" />

          <section className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-md border border-electric-blue/35 bg-[#071410] p-5 shadow-[0_-1px_0_0_rgba(0,240,255,0.7)]">
              <div className="flex items-center gap-2 font-mono text-[11px] font-black uppercase tracking-[0.16em] text-electric-blue">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Checkpoint
              </div>
              <p className="mt-5 text-[15px] font-semibold leading-6 text-white">
                {activeLesson.checkpoint.question}
              </p>
              <div className="mt-5 space-y-3">
                {activeLesson.checkpoint.options.map((option, index) => {
                  const selected = draftAnswer === index;
                  const submitted = selectedAnswer === index;
                  const correct = index === activeLesson.checkpoint.correct_index;
                  return (
                    <button
                      key={`${activeLesson.id}-${option.label}`}
                      type="button"
                      onClick={() => setDraftAnswer(index)}
                      className={
                        submitted && correct
                          ? "grid w-full grid-cols-[20px_minmax(0,1fr)] gap-3 rounded-md border border-cyber-green/40 bg-cyber-green/10 px-3 py-3 text-left"
                          : submitted && !correct
                            ? "grid w-full grid-cols-[20px_minmax(0,1fr)] gap-3 rounded-md border border-red-400/45 bg-red-500/10 px-3 py-3 text-left"
                            : selected
                              ? "grid w-full grid-cols-[20px_minmax(0,1fr)] gap-3 rounded-md border border-electric-blue/45 bg-electric-blue/10 px-3 py-3 text-left"
                              : "grid w-full grid-cols-[20px_minmax(0,1fr)] gap-3 rounded-md border border-white/[0.055] bg-[#020b0a] px-3 py-3 text-left transition hover:border-electric-blue/25"
                      }
                    >
                      <span className="font-mono text-sm font-black text-electric-blue">{String.fromCharCode(65 + index)}</span>
                      <span className="text-sm leading-6 text-white/70">{option.label}</span>
                    </button>
                  );
                })}
              </div>
              {selectedAnswer !== undefined ? (
                <div className="mt-4 rounded-md border border-white/[0.06] bg-[#020b0a] p-3">
                  <p className="font-mono text-[11px] font-black uppercase tracking-[0.14em] text-white/42">
                    {activeLessonPassed ? "Checkpoint passed" : "Review answer"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/66">
                    {activeLesson.checkpoint.options[selectedAnswer]?.feedback}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-electric-blue/80">
                    {activeLesson.checkpoint.follow_up_question}
                  </p>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (draftAnswer !== undefined) chooseAnswer(activeLesson, draftAnswer);
                }}
                disabled={draftAnswer === undefined}
                className="mt-5 h-12 w-full rounded-md bg-white/[0.04] font-mono text-[11px] font-black uppercase tracking-[0.14em] text-white/50 transition hover:bg-electric-blue hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                {activeLessonPassed ? "Checkpoint passed" : "Submit answer"}
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-md border border-warning-amber/25 bg-[#071410] p-4 shadow-[0_-1px_0_0_rgba(255,184,0,0.55)]">
                <div className="flex items-center gap-2 font-mono text-[11px] font-black uppercase tracking-[0.16em] text-warning-amber">
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  Quest Mentor
                </div>
                <p className="mt-4 text-sm leading-6 text-white/50">
                  Ask about the generated lesson, its code, checkpoint, or deeper questions.
                </p>
                <textarea
                  value={tutorQuestion}
                  onChange={(event) => setTutorQuestion(event.target.value)}
                  rows={3}
                  placeholder="e.g. What happens if the user pays twice?"
                  className="mt-3 min-h-[86px] w-full resize-none rounded-md border border-white/[0.055] bg-[#020b0a] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/30 focus:border-electric-blue/35"
                />
                <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                  <button
                    type="button"
                    onClick={onStartQuest}
                    disabled={!activeLessonPassed || questGenerationState === "loading"}
                    className="flex h-10 items-center justify-center gap-2 rounded-md bg-electric-blue text-xs font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:brightness-50"
                  >
                    {questGenerationState === "loading" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Zap className="h-3.5 w-3.5 fill-black" aria-hidden="true" />}
                    Generate Quest
                  </button>
                  <button
                    type="button"
                    onClick={() => void onAskTutor()}
                    disabled={tutorLoading || tutorQuestion.trim().length === 0}
                    className="h-10 rounded-md bg-white/[0.06] px-5 text-xs font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {tutorLoading ? "..." : "Ask"}
                  </button>
                </div>
                {tutorError ? <p className="mt-3 text-xs leading-5 text-red-300">{tutorError}</p> : null}
              </div>

              <div className="rounded-md border border-white/[0.075] bg-[#071410]">
                <div className="flex h-10 items-center gap-2 border-b border-white/[0.06] px-4 font-mono text-[11px] font-black uppercase tracking-[0.16em] text-white/45">
                  <Brain className="h-3 w-3" aria-hidden="true" />
                  Tutor
                </div>
                <div className="max-h-[220px] space-y-3 overflow-y-auto p-4 scrollbar-none">
                  {lessonTutorMessages.length === 0 ? (
                    <p className="rounded-md border border-white/[0.055] bg-[#020b0a] p-4 text-sm leading-6 text-white/50">
                      Ask a question above to start the tutor session for this lesson.
                    </p>
                  ) : (
                    lessonTutorMessages.map((message) => (
                      <div key={message.id} className={message.role === "mentor" ? "rounded-md border border-electric-blue/25 bg-electric-blue/10 p-3" : "rounded-md border border-white/[0.055] bg-[#020b0a] p-3"}>
                        <p className="font-mono text-[11px] font-black uppercase tracking-[0.12em] text-white/40">
                          {message.role === "mentor" ? "Tutor" : "Me"}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white/72">{message.text}</p>
                        {message.why ? <p className="mt-2 text-xs leading-5 text-cyber-green/75">{message.why}</p> : null}
                        {message.followUp ? <p className="mt-2 text-xs leading-5 text-electric-blue/75">{message.followUp}</p> : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function formatLessonManifest(moduleState: ModuleState, lesson: LearningLessonDto) {
  return JSON.stringify(
    {
      ecosystem: moduleState.ecosystem.id,
      module: moduleState.module.title,
      lesson: lesson.title,
      concepts: lesson.concepts,
      checkpoint: lesson.checkpoint.question,
      quest_bridge: lesson.quest_bridge,
    },
    null,
    2,
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
