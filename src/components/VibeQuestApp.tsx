"use client";

import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  Code2,
  GraduationCap,
  LayoutDashboard,
  LoaderCircle,
  MessageSquare,
  Network,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  AccountControl,
  type AccountSummary,
} from "@/components/AccountControl";
import {
  askLearningTutor,
  generateLearningModule,
  type EcosystemId,
  type LearningLessonDto,
  type LearningModuleDto,
  type LearningTutorResponse,
} from "@/lib/ai-learning";

type TabId = "landing" | "dashboard" | "learn" | "workbench" | "quest-run" | "ship-gate";

type EcosystemOption = {
  id: EcosystemId;
  label: string;
  pathId: string;
  accent: string;
  detail: string;
  defaultTopic: string;
  interests: string[];
};

type TutorMessage = {
  id: string;
  role: "learner" | "mentor";
  text: string;
  why?: string;
  followUp?: string;
};

type ModuleState = {
  id: string;
  source: string;
  warning: string | null;
  ecosystem: EcosystemOption;
  topic: string;
  profile: string;
  intents: string[];
  module: LearningModuleDto;
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
  },
  {
    id: "fiber",
    label: "Fiber",
    pathId: "fiber-payments",
    accent: "text-warning-amber border-warning-amber/40 bg-warning-amber/10",
    detail: "Payment channels, invoices, PTLC/preimage evidence, routing, and replay defense.",
    defaultTopic: "Fiber invoices, PTLC proof boundaries, and paid-access receipt checks",
    interests: ["Fiber Payments", "Payment Channels", "PTLC Proofs", "Receipt Replay Defense"],
  },
  {
    id: "zcash",
    label: "Zcash",
    pathId: "zcash-shielded-payments",
    accent: "text-cyber-green border-cyber-green/40 bg-cyber-green/10",
    detail: "Shielded checkout, ZIP-321 payment requests, viewing keys, memos, and privacy safety.",
    defaultTopic: "Shielded checkout with ZIP-321 payment request validation and privacy denial cases",
    interests: ["Zcash Shielded Payments", "ZIP-321 Payment Requests", "Viewing-Key Boundaries", "Privacy-Preserving Checkout"],
  },
];

const PROFILES = ["Vibecoder", "Backend dev", "Frontend dev", "Security auditor", "Product / community"];
const PACES = ["Focused", "Deep dive", "Fast practical", "Audit-heavy"];
const TABS: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "learn", label: "Learn" },
  { id: "workbench", label: "Workbench" },
  { id: "quest-run", label: "Quest Run" },
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
  const selectedEcosystem = ECOSYSTEMS.find((item) => item.id === ecosystemId) ?? ECOSYSTEMS[2];
  const [topic, setTopic] = useState(selectedEcosystem.defaultTopic);
  const [profile, setProfile] = useState("Vibecoder");
  const [pace, setPace] = useState("Focused");
  const [intentText, setIntentText] = useState(
    "Understand the trust boundary\nRead generated verifier code\nDesign denial tests before shipping",
  );
  const [moduleState, setModuleState] = useState<ModuleState | null>(null);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [generationState, setGenerationState] = useState<"idle" | "loading">("idle");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [tutorQuestion, setTutorQuestion] = useState("");
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([]);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);

  const generatedModule = moduleState?.module ?? null;
  const activeLesson = generatedModule?.lessons[activeLessonIndex] ?? null;
  const intentList = useMemo(() => parseIntents(intentText), [intentText]);
  const completedLessons = useMemo(() => {
    if (!generatedModule) return 0;
    return generatedModule.lessons.filter(
      (lesson) => answers[lesson.id] === lesson.checkpoint.correct_index,
    ).length;
  }, [answers, generatedModule]);

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
    setTutorMessages([]);
    setTutorQuestion("");
    setTutorError(null);

    try {
      const response = await generateLearningModule({
        ecosystem_id: selectedEcosystem.id,
        path_id: selectedEcosystem.pathId,
        topic: trimmedTopic,
        learning_profile: profile,
        learning_intents: intentList,
        interests: selectedEcosystem.interests,
        learner_goal: buildLearnerGoal(selectedEcosystem, trimmedTopic, intentList),
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
        intents: intentList,
        module: response.module,
      });
      setActiveLessonIndex(0);
      setAnswers({});
      setActiveTab("learn");
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Lesson generation failed.");
    } finally {
      setGenerationState("idle");
    }
  }

  async function askTutor() {
    if (!generatedModule || !activeLesson) return;
    const question = tutorQuestion.trim();
    if (!question) return;

    setTutorLoading(true);
    setTutorError(null);
    try {
      const response = await askLearningTutor({
        module_title: generatedModule.title,
        lesson_title: activeLesson.title,
        lesson_context: lessonContext(generatedModule, activeLesson, answers[activeLesson.id]),
        question,
      });
      appendTutorAnswer(question, response);
      setTutorQuestion("");
    } catch (error) {
      setTutorError(error instanceof Error ? error.message : "Tutor request failed.");
    } finally {
      setTutorLoading(false);
    }
  }

  function appendTutorAnswer(question: string, response: LearningTutorResponse) {
    setTutorMessages((current) => [
      ...current,
      { id: `learner-${Date.now()}`, role: "learner", text: question },
      {
        id: `mentor-${Date.now()}`,
        role: "mentor",
        text: response.answer,
        why: response.why_it_matters,
        followUp: response.follow_up_question,
      },
    ]);
  }

  if (activeTab === "landing") {
    return (
      <LandingView
        account={account}
        authConfigured={authConfigured}
        onEnter={() => setActiveTab(account ? "learn" : "dashboard")}
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
                {activeTab === tab.id ? (
                  <span className="absolute bottom-1 left-4 right-4 h-[2px] rounded-full bg-electric-blue" />
                ) : null}
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
          onLearn={() => setActiveTab("learn")}
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
          setActiveLessonIndex={setActiveLessonIndex}
          answers={answers}
          setAnswers={setAnswers}
          completedLessons={completedLessons}
          tutorQuestion={tutorQuestion}
          setTutorQuestion={setTutorQuestion}
          tutorMessages={tutorMessages}
          tutorLoading={tutorLoading}
          tutorError={tutorError}
          onAskTutor={askTutor}
        />
      ) : null}
      {activeTab === "workbench" || activeTab === "quest-run" || activeTab === "ship-gate" ? (
        <EvidenceBoundaryView
          tab={activeTab}
          moduleState={moduleState}
          completedLessons={completedLessons}
          onLearn={() => setActiveTab("learn")}
        />
      ) : null}
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
              CKB / Fiber retained, Zcash added
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
            VibeQuest is the AI learning workbench for protocol builders. Sign in with Google, choose CKB, Fiber, or Zcash, then generate a deep module tied to your intent.
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
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {ECOSYSTEMS.map((ecosystem) => (
            <div key={ecosystem.id} className="rounded-2xl border border-glass-border bg-[#16181D] p-6">
              <div className={`mb-5 inline-flex rounded-lg border px-3 py-1 text-xs font-black uppercase tracking-wider ${ecosystem.accent}`}>
                {ecosystem.label}
              </div>
              <h2 className="text-2xl font-bold text-white">{ecosystem.defaultTopic}</h2>
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
  onLearn,
}: {
  account: AccountSummary | null;
  moduleState: ModuleState | null;
  completedLessons: number;
  onLearn: () => void;
}) {
  const lessonCount = moduleState?.module.lessons.length ?? 0;
  const progress = lessonCount ? Math.round((completedLessons / lessonCount) * 100) : 0;

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
              Your Google account owns generated learning state. CKB and Fiber stay in the product, and Zcash is now the focused grant-facing track.
            </p>
          </div>
          <button
            type="button"
            onClick={onLearn}
            className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-electric-blue px-5 py-3 text-sm font-black uppercase tracking-wider text-black transition-all hover:brightness-110"
          >
            {moduleState ? "Continue Learning" : "Generate Learning"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Account" value={account ? "Google signed in" : "Sign in required"} />
        <MetricCard label="Active ecosystem" value={moduleState?.ecosystem.label ?? "Choose in Learn"} />
        <MetricCard label="Module progress" value={moduleState ? `${progress}%` : "No module yet"} />
      </section>

      {moduleState ? (
        <section className="rounded-2xl border border-glass-border bg-[#15181F] p-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyber-green">Active module</p>
          <h2 className="mt-2 text-2xl font-black text-white">{moduleState.module.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-on-surface-variant">{moduleState.module.outcome}</p>
        </section>
      ) : null}
    </main>
  );
}

function LearnView({
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
  intentText,
  setIntentText,
  intentList,
  generationState,
  generationError,
  onGenerate,
  moduleState,
  activeLessonIndex,
  setActiveLessonIndex,
  answers,
  setAnswers,
  completedLessons,
  tutorQuestion,
  setTutorQuestion,
  tutorMessages,
  tutorLoading,
  tutorError,
  onAskTutor,
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
  intentText: string;
  setIntentText: (value: string) => void;
  intentList: string[];
  generationState: "idle" | "loading";
  generationError: string | null;
  onGenerate: () => Promise<void>;
  moduleState: ModuleState | null;
  activeLessonIndex: number;
  setActiveLessonIndex: (index: number) => void;
  answers: Record<string, number>;
  setAnswers: (answers: Record<string, number>) => void;
  completedLessons: number;
  tutorQuestion: string;
  setTutorQuestion: (value: string) => void;
  tutorMessages: TutorMessage[];
  tutorLoading: boolean;
  tutorError: string | null;
  onAskTutor: () => Promise<void>;
}) {
  const learningModule = moduleState?.module ?? null;
  const activeLesson = learningModule?.lessons[activeLessonIndex] ?? null;
  const selectedAnswer = activeLesson ? answers[activeLesson.id] : undefined;
  const progress = learningModule ? Math.round((completedLessons / learningModule.lessons.length) * 100) : 0;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[1440px] flex-col gap-8 p-4 md:p-8">
      <div className="flex flex-col gap-4 border-b border-glass-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white">
            <GraduationCap className="h-8 w-8 text-electric-blue" />
            Learning Mode
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-on-surface-variant">
            Choose an ecosystem, name the topic, set your learning intent, then let Core generate the module with the configured AI provider.
          </p>
        </div>
        {moduleState && learningModule ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <StatusPill label="Ecosystem" value={moduleState.ecosystem.label} tone="green" />
            <StatusPill label="Progress" value={`${progress}%`} tone="blue" />
            <StatusPill label="Source" value={moduleState.source} tone="amber" />
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
              {ecosystems.map((ecosystem) => {
                const selected = ecosystem.id === selectedEcosystem.id;
                return (
                  <button
                    key={ecosystem.id}
                    type="button"
                    onClick={() => chooseEcosystem(ecosystem)}
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
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
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
                    onClick={() => setProfile(item)}
                    className={
                      profile === item
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
                    onClick={() => setPace(item)}
                    className={
                      pace === item
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
                value={intentText}
                onChange={(event) => setIntentText(event.target.value)}
                rows={4}
                className="rounded-lg border border-glass-border bg-[#0B0C0E] p-3 text-sm leading-relaxed text-white outline-none transition-colors focus:border-electric-blue/60"
              />
            </label>

            <button
              type="button"
              onClick={onGenerate}
              disabled={generationState === "loading"}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-electric-blue px-5 py-3 text-sm font-black uppercase tracking-wider text-black transition-all hover:brightness-110 disabled:brightness-50"
            >
              {generationState === "loading" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generationState === "loading" ? "Generating Module" : "Generate Module"}
            </button>

            {!account ? (
              <div className="mt-3 rounded-lg border border-warning-amber/30 bg-warning-amber/10 p-3 text-xs leading-relaxed text-warning-amber">
                Google sign-in is required before Core can generate and bind learning state.
              </div>
            ) : null}
            {!authConfigured ? (
              <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs leading-relaxed text-red-300">
                Google authentication configuration is incomplete.
              </div>
            ) : null}
            {generationError ? (
              <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs leading-relaxed text-red-300">
                {generationError}
              </div>
            ) : null}
          </section>
        </aside>

        <section className="min-w-0">
          {moduleState && learningModule && activeLesson ? (
            <GeneratedModuleView
              moduleState={moduleState}
              activeLesson={activeLesson}
              activeLessonIndex={activeLessonIndex}
              setActiveLessonIndex={setActiveLessonIndex}
              selectedAnswer={selectedAnswer}
              answers={answers}
              setAnswers={setAnswers}
              tutorQuestion={tutorQuestion}
              setTutorQuestion={setTutorQuestion}
              tutorMessages={tutorMessages}
              tutorLoading={tutorLoading}
              tutorError={tutorError}
              onAskTutor={onAskTutor}
            />
          ) : (
            <EmptyLearningState selectedEcosystem={selectedEcosystem} intentList={intentList} />
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
  setActiveLessonIndex,
  selectedAnswer,
  answers,
  setAnswers,
  tutorQuestion,
  setTutorQuestion,
  tutorMessages,
  tutorLoading,
  tutorError,
  onAskTutor,
}: {
  moduleState: ModuleState;
  activeLesson: LearningLessonDto;
  activeLessonIndex: number;
  setActiveLessonIndex: (index: number) => void;
  selectedAnswer: number | undefined;
  answers: Record<string, number>;
  setAnswers: (answers: Record<string, number>) => void;
  tutorQuestion: string;
  setTutorQuestion: (value: string) => void;
  tutorMessages: TutorMessage[];
  tutorLoading: boolean;
  tutorError: string | null;
  onAskTutor: () => Promise<void>;
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
                onClick={() => setActiveLessonIndex(index)}
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
                      <div
                        key={message.id}
                        className={message.role === "mentor" ? "rounded-lg bg-electric-blue/10 p-3" : "rounded-lg bg-white/5 p-3"}
                      >
                        <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
                          {message.role === "mentor" ? "Tutor" : "You"}
                        </p>
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
                      onClick={() => setAnswers({ ...answers, [activeLesson.id]: index })}
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
                  <p className="mt-2 text-sm leading-6 text-on-surface">
                    {activeLesson.checkpoint.options[selectedAnswer]?.feedback}
                  </p>
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

function EmptyLearningState({
  selectedEcosystem,
  intentList,
}: {
  selectedEcosystem: EcosystemOption;
  intentList: string[];
}) {
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

function EvidenceBoundaryView({
  tab,
  moduleState,
  completedLessons,
  onLearn,
}: {
  tab: TabId;
  moduleState: ModuleState | null;
  completedLessons: number;
  onLearn: () => void;
}) {
  const complete = moduleState ? completedLessons === moduleState.module.lessons.length : false;
  const title = tab === "workbench" ? "Workbench" : tab === "quest-run" ? "Quest Run" : "Ship Gate";
  const detail = moduleState
    ? complete
      ? "The generated learning module is complete. The next implementation chunk reconnects this lesson evidence to server-owned generated quests and runner evidence."
      : "Finish the generated learning checkpoints before opening quest evidence."
    : "Generate an AI learning module first so this surface has real lesson evidence to work from.";

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl items-center justify-center p-4 md:p-8">
      <section className="w-full rounded-2xl border border-glass-border bg-[#11161D] p-6 text-center md:p-10">
        <Code2 className="mx-auto h-12 w-12 text-electric-blue" />
        <h1 className="mt-4 text-3xl font-black text-white">{title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant">{detail}</p>
        <button
          type="button"
          onClick={onLearn}
          className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-electric-blue px-5 text-sm font-black uppercase tracking-wider text-black transition-all hover:brightness-110"
        >
          Open Learn
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </main>
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

function parseIntents(value: string): string[] {
  const intents = value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);

  return intents.length > 0
    ? intents
    : ["Understand generated code", "Name the trust boundary", "Design denial tests"];
}

function buildLearnerGoal(ecosystem: EcosystemOption, topic: string, intents: string[]): string {
  return `Teach me ${ecosystem.label} through ${topic}. I want to ${intents.join(", ")}.`;
}

function lessonContext(
  generatedModule: LearningModuleDto,
  lesson: LearningLessonDto,
  selectedAnswer: number | undefined,
): string {
  const selected = selectedAnswer === undefined ? "not answered" : String.fromCharCode(65 + selectedAnswer);
  return [
    `Module: `,
    `Outcome: `,
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
