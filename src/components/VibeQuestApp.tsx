
"use client";

import {
  Archive,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  Code2,
  Copy,
  Cpu,
  GraduationCap,
  Hexagon,
  LoaderCircle,
  LockKeyhole,
  MessageSquare,
  Network,
  Play,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getSession } from "next-auth/react";

import {
  AccountControl,
  type AccountSummary,
} from "@/components/AccountControl";
import {
  archiveLearningSession,
  askAndSaveLearningTutor,
  deleteLearningSession,
  generateLearningLesson,
  generateLearningQuest,
  getRunnerSubmission,
  loadLearningSession,
  loadLearningSessions,
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

type TabId = "landing" | "dashboard" | "learn" | "workbench";
type SyncState = "idle" | "loading" | "saving" | "saved" | "local-only";
type LearnScreenMode = "select" | "module";
type GenerationState = "idle" | "loading" | "background";
type SessionCheckState = "checking" | "resolved";
type CourseGenerationStatus = "ready" | "generating" | "complete" | "error";

type EcosystemOption = {
  id: EcosystemId;
  label: string;
  pathId: string;
  accent: string;
  detail: string;
  defaultTopic: string;
  interests: string[];
  questLabel: string;
  suggestedTopics: string[];
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
  generationStatus: CourseGenerationStatus;
  totalLessons: number;
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

const TOTAL_LEARNING_MODULES = 5;

const ECOSYSTEMS: EcosystemOption[] = [
  {
    id: "basics",
    label: "Web3 + Blockchain",
    pathId: "basics-web3-blockchain",
    accent: "text-electric-blue border-electric-blue/40 bg-electric-blue/10",
    detail: "A true beginner path: what blockchains are, why wallets exist, what transactions do, and how Web3 apps connect to networks.",
    defaultTopic: "Absolute beginner Web3 and blockchain fundamentals",
    interests: ["What Blockchains Are", "Wallets as Accounts", "Transactions Step by Step", "Reading Block Explorers"],
    questLabel: "Beginner Web3 foundations quest",
    suggestedTopics: [
      "What is a blockchain: blocks, shared history, validators or miners, and why people trust the ledger",
      "What is a wallet: accounts, addresses, recovery phrases, and what signing means in plain language",
      "What is a transaction: sending value, paying fees, waiting for confirmation, and reading status",
      "How Web3 apps work: connecting a wallet, approving actions, and spotting what the website cannot prove",
      "How to stay safe as a beginner: phishing, seed phrases, wrong networks, fake popups, and irreversible mistakes",
    ],
  },
  {
    id: "ckb",
    label: "CKB",
    pathId: "ckb-cells",
    accent: "text-electric-blue border-electric-blue/40 bg-electric-blue/10",
    detail: "Cells, scripts, witnesses, transaction state, and verifier proof boundaries.",
    defaultTopic: "Cells, scripts, witnesses, and replay-safe verifier code",
    interests: ["CKB Cell Model", "CKB Scripts", "Witness Verification", "Transaction Proof Boundaries"],
    questLabel: "CKB verifier quest",
    suggestedTopics: [
      "CKB cell model: capacity, data, lock scripts, type scripts, and live-cell state",
      "OutPoint lineage, witnesses, inputs, outputs, and transaction proof boundaries",
      "Generated CKB verifier code: trusted fields, script groups, and denial tests",
      "xUDT transfer validation, supply assumptions, and reward-safe ship gates",
      "Replay-safe CKB backend design with nonce, cell, and witness mismatch tests",
    ],
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
    suggestedTopics: [
      "Fiber payment channels: invoices, channel state, settlement assumptions, and routing",
      "PTLC/preimage evidence boundaries and replay-resistant paid access",
      "Generated Fiber receipt verification with amount, route, and channel mismatch tests",
      "Multi-hop payment UX and what the backend must verify before unlocking content",
      "CKB settlement boundaries for Fiber apps and reward-safe proof handling",
    ],
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
    suggestedTopics: [
      "Zcash privacy model: transparent vs shielded transactions, threat models, and metadata leaks",
      "Sapling and Orchard fundamentals: notes, commitments, nullifiers, keys, and viewing boundaries",
      "ZIP-321 payment requests: URI structure, wallet interoperability, validation, and denial cases",
      "Memos and user privacy safety: memo handling, sender/receiver risks, and data minimization",
      "Shielded wallet sync and confirmations: scanning, note commitment trees, reorg safety, and UX tradeoffs",
    ],
  },
  {
    id: "stacks",
    label: "Stacks",
    pathId: "stacks-bitcoin-apps",
    accent: "text-electric-blue border-electric-blue/40 bg-electric-blue/10",
    detail: "Bitcoin-secured apps, Clarity contracts, sBTC, BNS, wallet authorization, and safe product flows.",
    defaultTopic: "Stacks and Bitcoin app fundamentals with Clarity, sBTC, BNS, and safe authorization",
    interests: ["Stacks and Bitcoin", "Clarity Smart Contracts", "sBTC Basics", "BNS Product Identity", "Wallet Authorization"],
    questLabel: "Stacks Clarity learning quest",
    suggestedTopics: [
      "Stacks and Bitcoin mental model: blocks, settlement assumptions, Proof of Transfer, and application scope",
      "Clarity smart contract basics: principals, public functions, maps, asserts, and predictable execution",
      "Wallets, transactions, post-conditions, signatures, and what a frontend must not claim as proof",
      "sBTC basics: Bitcoin-backed app flows, custody assumptions, deposits, withdrawals, and user trust boundaries",
      "BNS and product identity: names, ownership, app UX, and safe resolution assumptions",
      "Safe Stacks app flow: user authorization, transaction status, explorer evidence, and denial tests",
    ],
  },
];

const PROFILES = ["Vibecoder", "Backend dev", "Frontend dev", "Security auditor", "Product / community"];
const PACES = ["Focused", "Deep dive", "Fast practical", "Audit-heavy"];
const LEARNING_INTENT_OPTIONS = [
  "Understand the trust boundary",
  "Read generated verifier code",
  "Design denial tests before shipping",
];
const CODE_SNIPPET_INTENT = "Include interactive code snippets";
const TABS: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "learn", label: "Learn" },
  { id: "workbench", label: "Workbench" },
];

export function VibeQuestApp({
  account: initialAccount,
  authConfigured,
  initialPath = "/",
}: {
  account: AccountSummary | null;
  authConfigured: boolean;
  initialPath?: string;
}) {
  const initialRoute = currentAppRoute(initialPath);
  const [account, setAccount] = useState<AccountSummary | null>(initialAccount);
  const [sessionCheckState, setSessionCheckState] = useState<SessionCheckState>(
    initialAccount ? "resolved" : "checking",
  );
  const [activeTab, setActiveTab] = useState<TabId>(initialRoute.tab);
  const [requestedCourseId, setRequestedCourseId] = useState<string | null>(initialRoute.courseId);
  const [requestedLessonId, setRequestedLessonId] = useState<string | null>(initialRoute.lessonId);
  const [learnScreenMode, setLearnScreenMode] = useState<LearnScreenMode>(initialRoute.courseId ? "module" : "select");
  const [ecosystemId, setEcosystemId] = useState<EcosystemId>("zcash");
  const selectedEcosystem = ecosystemById(ecosystemId);
  const [topic, setTopic] = useState(selectedEcosystem.defaultTopic);
  const [profile, setProfile] = useState("Vibecoder");
  const [pace, setPace] = useState("Focused");
  const [intentText, setIntentText] = useState("Understand the trust boundary");
  const [codeSnippetsEnabled, setCodeSnippetsEnabled] = useState(false);
  const [courseLibrary, setCourseLibrary] = useState<LearningSessionRecord[]>([]);
  const [libraryState, setLibraryState] = useState<SyncState>("idle");
  const [moduleState, setModuleState] = useState<ModuleState | null>(null);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState>("idle");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [tutorQuestion, setTutorQuestion] = useState("");
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([]);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const [questState, setQuestState] = useState<QuestState | null>(null);
  const [questGenerationState, setQuestGenerationState] = useState<"idle" | "loading">("idle");
  const [questError, setQuestError] = useState<string | null>(null);
  const [runnerSubmitting, setRunnerSubmitting] = useState(false);
  const generationRunRef = useRef<string | null>(null);
  const answersRef = useRef(answers);
  const tutorMessagesRef = useRef(tutorMessages);
  const activeLessonIndexRef = useRef(activeLessonIndex);

  const generatedModule = moduleState?.module ?? null;
  const activeLesson = generatedModule?.lessons[activeLessonIndex] ?? null;
  const intentList = useMemo(() => parseIntents(intentText), [intentText]);
  const completedLessons = useMemo(() => completedLessonCount(generatedModule, answers), [answers, generatedModule]);
  const activeLessonPassed = Boolean(
    activeLesson && answers[activeLesson.id] === activeLesson.checkpoint.correct_index,
  );

  useEffect(() => {
    setAccount(initialAccount);
    if (initialAccount) {
      setSessionCheckState("resolved");
    }
  }, [initialAccount]);

  useEffect(() => {
    let cancelled = false;

    async function refreshAccount() {
      try {
        const session = await getSession();
        if (!cancelled) {
          setAccount(accountSummaryFromSession(session));
          setSessionCheckState("resolved");
        }
      } catch {
        if (!cancelled) {
          setSessionCheckState("resolved");
        }
        // Keep the last known server-provided account if the client refresh fails.
      }
    }

    void refreshAccount();
    const refreshOnFocus = () => void refreshAccount();
    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshAccount();
      }
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
    };
  }, []);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    tutorMessagesRef.current = tutorMessages;
  }, [tutorMessages]);

  useEffect(() => {
    activeLessonIndexRef.current = activeLessonIndex;
  }, [activeLessonIndex]);

  useEffect(() => {
    function syncRoute() {
      const route = currentAppRoute();
      setActiveTab(route.tab);
      setRequestedCourseId(route.courseId);
      setRequestedLessonId(route.lessonId);
      if (route.tab === "learn" && !route.courseId) {
        setLearnScreenMode("select");
      }
    }

    syncRoute();
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSessions() {
      if (!account) {
        setCourseLibrary([]);
        setLibraryState("idle");
        setSyncState("idle");
        return;
      }

      setLibraryState("loading");
      setSyncState((state) => (state === "idle" ? "loading" : state));
      setSyncWarning(null);
      try {
        const response = await loadLearningSessions();
        if (cancelled) return;
        setCourseLibrary(response.sessions);
        setLibraryState(response.persistence.saved ? "saved" : "local-only");
        setSyncState(response.persistence.saved ? "saved" : "local-only");
        if (response.persistence.warning) {
          setSyncWarning(response.persistence.warning);
        }
        if (response.sessions.length === 0) {
          const fallback = await loadLearningSession().catch(() => null);
          if (cancelled || !fallback?.session) return;
          setCourseLibrary([fallback.session]);
          setLibraryState(fallback.persistence.saved ? "saved" : "local-only");
          setSyncState(fallback.persistence.saved ? "saved" : "local-only");
        }
      } catch (error) {
        if (cancelled) return;
        setSyncWarning(error instanceof Error ? error.message : "Learning resume failed.");
        setLibraryState("local-only");
        setSyncState("local-only");
      }
    }

    void restoreSessions();
    return () => {
      cancelled = true;
    };
  }, [account]);

  useEffect(() => {
    if (!account || courseLibrary.length === 0) return;

    if (requestedCourseId) {
      const requestedCourseIsActiveGeneration =
        moduleState?.id === requestedCourseId || generationRunRef.current === requestedCourseId;
      if (requestedCourseIsActiveGeneration) {
        setLearnScreenMode("module");
        return;
      }

      const requested = courseLibrary.find((course) => course.module_id === requestedCourseId);
      if (requested) {
        applySessionRecord(requested, { openModule: true, lessonId: requestedLessonId });
      } else if (libraryState !== "loading") {
        setSyncWarning("That course could not be found for this Google account. Choose a saved course or generate a new one.");
        setRequestedCourseId(null);
        setRequestedLessonId(null);
        setLearnScreenMode("select");
        replaceAppPath("/learn");
      }
      return;
    }

    if (!moduleState && activeTab !== "landing") {
      applySessionRecord(courseLibrary[0], { openModule: activeTab !== "learn" });
    }
  }, [account, activeTab, courseLibrary, libraryState, moduleState, requestedCourseId, requestedLessonId]);

  function navigateToTab(tab: TabId) {
    const path = tabPath(tab);
    pushAppPath(path);
    setActiveTab(tab);
    setRequestedCourseId(null);
    setRequestedLessonId(null);
    if (tab === "learn") {
      setLearnScreenMode("select");
    }
  }

  function navigateToCourse(courseId: string, lessonId?: string | null, options: { replace?: boolean } = {}) {
    const safeCourseId = encodeURIComponent(courseId);
    const lessonPath = lessonId ? `/lessons/${encodeURIComponent(lessonId)}` : "";
    const coursePath = `/courses/${safeCourseId}${lessonPath}`;
    if (options.replace) {
      replaceAppPath(coursePath);
    } else {
      pushAppPath(coursePath);
    }
    setActiveTab("learn");
    setRequestedCourseId(courseId);
    setRequestedLessonId(lessonId ?? null);
    setLearnScreenMode("module");
    scrollLearningViewToTop();
  }

  function applySessionRecord(
    record: LearningSessionRecord,
    options: { openModule?: boolean; lessonId?: string | null } = {},
  ) {
    const ecosystem = ecosystemById(asEcosystemId(record.ecosystem_id) ?? "zcash");
    const intents = record.learning_intents.length > 0 ? record.learning_intents : parseIntents(record.learner_goal);
    const requestedLessonIndex = options.lessonId
      ? record.module.lessons.findIndex((lesson) => lesson.id === options.lessonId)
      : -1;
    const requestedLessonMissing = Boolean(options.lessonId && requestedLessonIndex < 0);
    const nextLessonIndex = options.lessonId
      ? Math.max(0, requestedLessonIndex)
      : Math.min(record.active_lesson_index, Math.max(record.module.lessons.length - 1, 0));
    setEcosystemId(ecosystem.id);
    setTopic(record.topic || ecosystem.defaultTopic);
    setProfile(record.learning_profile || record.background || "Vibecoder");
    setPace(record.pace || "Focused");
    setIntentText(intents.filter((intent) => intent !== CODE_SNIPPET_INTENT).join("\n"));
    setCodeSnippetsEnabled(record.learning_intents.includes(CODE_SNIPPET_INTENT));
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
      generationStatus: record.module.lessons.length >= TOTAL_LEARNING_MODULES ? "complete" : "ready",
      totalLessons: TOTAL_LEARNING_MODULES,
    });
    if (options.openModule) {
      setLearnScreenMode("module");
    }
    if (requestedLessonMissing) {
      const fallbackLesson = record.module.lessons[nextLessonIndex] ?? record.module.lessons[0] ?? null;
      setSyncWarning("That lesson could not be found in this course. Opening the nearest available module.");
      setRequestedLessonId(fallbackLesson?.id ?? null);
      if (fallbackLesson) {
        replaceAppPath(`/courses/${encodeURIComponent(record.module_id)}/lessons/${encodeURIComponent(fallbackLesson.id)}`);
      }
    }
    setActiveLessonIndex(nextLessonIndex < 0 ? 0 : nextLessonIndex);
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
      navigateToTab("learn");
      return;
    }
    const trimmedTopic = topic.trim();
    if (trimmedTopic.length < 8) {
      setGenerationError("Choose a concrete topic before generating lessons.");
      return;
    }

    const runId = createCourseId();
    generationRunRef.current = runId;
    setGenerationState("loading");
    setGenerationError(null);
    setSyncWarning(null);
    setTutorMessages([]);
    setTutorQuestion("");
    setTutorError(null);
    setQuestState(null);
    setAnswers({});
    setActiveLessonIndex(0);
    setLearnScreenMode("module");
    pushAppPath("/learn");
    setActiveTab("learn");
    setRequestedCourseId(null);
    setRequestedLessonId(null);
    scrollLearningViewToTop();

    const generationIntents = codeSnippetsEnabled ? [...intentList, CODE_SNIPPET_INTENT] : intentList;
    const generationInterests = codeSnippetsEnabled
      ? [...selectedEcosystem.interests, "Interactive code samples"]
      : selectedEcosystem.interests;
    const request = {
      ecosystem_id: selectedEcosystem.id,
      path_id: selectedEcosystem.pathId,
      topic: trimmedTopic,
      learning_profile: profile,
      learning_intents: generationIntents,
      interests: generationInterests,
      learner_goal: buildLearnerGoal(selectedEcosystem, trimmedTopic, generationIntents),
      background: profile,
      pace,
    };

    try {
      const first = await generateLearningLesson({ ...request, lesson_index: 0 });
      if (generationRunRef.current !== runId) return;

      const firstModuleState: ModuleState = {
        id: runId,
        source: first.source,
        warning: first.warning,
        ecosystem: selectedEcosystem,
        topic: trimmedTopic,
        profile,
        pace,
        intents: generationIntents,
        interests: generationInterests,
        learnerGoal: request.learner_goal,
        module: moduleFromGeneratedLesson(first),
        generationStatus: "generating",
        totalLessons: TOTAL_LEARNING_MODULES,
      };

      setModuleState(firstModuleState);
      setGenerationState("background");
      setLearnScreenMode("module");
      navigateToCourse(firstModuleState.id, first.lesson.id, { replace: true });
      await persistLearningState(firstModuleState, {}, 0, []);
      void continueProgressiveGeneration(runId, firstModuleState, request, 1);
    } catch (error) {
      if (generationRunRef.current === runId) {
        setLearnScreenMode("select");
        setGenerationError(error instanceof Error ? error.message : "Lesson generation failed.");
        setGenerationState("idle");
      }
    }
  }

  async function continueProgressiveGeneration(
    runId: string,
    initialState: ModuleState,
    request: Omit<Parameters<typeof generateLearningLesson>[0], "lesson_index">,
    startIndex: number,
  ) {
    let currentState = initialState;
    try {
      for (let lessonIndex = startIndex; lessonIndex < TOTAL_LEARNING_MODULES; lessonIndex += 1) {
        const response = await generateLearningLesson({
          ...request,
          lesson_index: lessonIndex,
          prior_lessons: priorLearningLessonsForRequest(currentState.module.lessons),
        });
        if (generationRunRef.current !== runId) return;
        currentState = appendGeneratedLesson(currentState, response.lesson, response.warning);
        setModuleState((existing) => (existing?.id === runId ? currentState : existing));
        await persistLearningState(
          currentState,
          answersRef.current,
          activeLessonIndexRef.current,
          tutorMessagesRef.current,
        );
      }
      if (generationRunRef.current !== runId) return;
      const completeState = { ...currentState, generationStatus: "complete" as const };
      setModuleState((existing) => (existing?.id === runId ? completeState : existing));
      setGenerationState("idle");
      await persistLearningState(
        completeState,
        answersRef.current,
        activeLessonIndexRef.current,
        tutorMessagesRef.current,
      );
    } catch (error) {
      if (generationRunRef.current !== runId) return;
      setGenerationState("idle");
      setModuleState((existing) => existing?.id === runId ? { ...existing, generationStatus: "error" } : existing);
      setGenerationError(error instanceof Error ? error.message : "Some modules could not be generated yet.");
    }
  }

  async function resumeCourseGeneration() {
    if (!account || !moduleState) return;
    const nextStartIndex = moduleState.module.lessons.length;
    if (nextStartIndex >= moduleState.totalLessons || moduleState.generationStatus === "generating") return;

    const runId = moduleState.id;
    generationRunRef.current = runId;
    setGenerationState("background");
    setGenerationError(null);
    setSyncWarning(null);

    const activeState: ModuleState = { ...moduleState, generationStatus: "generating" };
    setModuleState(activeState);
    await persistLearningState(activeState, answersRef.current, activeLessonIndexRef.current, tutorMessagesRef.current);

    const request = {
      ecosystem_id: activeState.ecosystem.id,
      path_id: activeState.ecosystem.pathId,
      topic: activeState.topic,
      learning_profile: activeState.profile,
      learning_intents: activeState.intents,
      interests: activeState.interests,
      learner_goal: activeState.learnerGoal,
      background: activeState.profile,
      pace: activeState.pace,
    };

    void continueProgressiveGeneration(runId, activeState, request, nextStartIndex);
  }

  async function persistLearningState(
    nextModuleState = moduleState,
    nextAnswers = answers,
    nextLessonIndex = activeLessonIndex,
    nextTutorMessages = tutorMessages,
  ) {
    if (!account || !nextModuleState) return null;
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
      const savedSession = response.session;
      if (savedSession) {
        setCourseLibrary((courses) => upsertCourse(courses, savedSession));
      }
      return savedSession;
    } catch (error) {
      setSyncState("local-only");
      setSyncWarning(error instanceof Error ? error.message : "Learning save failed.");
      return null;
    }
  }

  function openCourse(record: LearningSessionRecord) {
    applySessionRecord(record, { openModule: true });
    navigateToCourse(record.module_id, record.module.lessons[record.active_lesson_index]?.id ?? record.module.lessons[0]?.id ?? null);
  }

  function clearOpenedCourseIfNeeded(moduleId: string) {
    if (moduleState?.id !== moduleId) return;
    generationRunRef.current = null;
    setModuleState(null);
    setAnswers({});
    setTutorMessages([]);
    setTutorQuestion("");
    setTutorError(null);
    setQuestState(null);
    setQuestError(null);
    setActiveLessonIndex(0);
    setLearnScreenMode("select");
    setRequestedCourseId(null);
    setRequestedLessonId(null);
    setActiveTab("learn");
    replaceAppPath("/learn");
  }

  async function archiveCourse(record: LearningSessionRecord) {
    setSyncState("saving");
    setSyncWarning(null);
    try {
      const response = await archiveLearningSession(record.module_id);
      const archiveConfirmed = response.archived || !response.persistence.warning;
      if (archiveConfirmed) {
        setCourseLibrary((courses) => courses.filter((course) => course.module_id !== record.module_id));
        clearOpenedCourseIfNeeded(record.module_id);
      }
      setSyncState(archiveConfirmed ? "saved" : "local-only");
      setSyncWarning(response.persistence.warning ?? (archiveConfirmed ? null : "Course archive could not be confirmed."));
    } catch (error) {
      setSyncState("local-only");
      setSyncWarning(error instanceof Error ? error.message : "Course archive failed.");
    }
  }

  async function deleteCourse(record: LearningSessionRecord) {
    const shouldDelete = typeof window === "undefined" || window.confirm(`Delete “${record.module.title}” from your saved courses?`);
    if (!shouldDelete) return;

    setSyncState("saving");
    setSyncWarning(null);
    try {
      const response = await deleteLearningSession(record.module_id);
      const deleteConfirmed = response.deleted || !response.persistence.warning;
      if (deleteConfirmed) {
        setCourseLibrary((courses) => courses.filter((course) => course.module_id !== record.module_id));
        clearOpenedCourseIfNeeded(record.module_id);
      }
      setSyncState(deleteConfirmed ? "saved" : "local-only");
      setSyncWarning(response.persistence.warning ?? (deleteConfirmed ? null : "Course delete could not be confirmed."));
    } catch (error) {
      setSyncState("local-only");
      setSyncWarning(error instanceof Error ? error.message : "Course delete failed.");
    }
  }

  function chooseLesson(index: number) {
    if (!moduleState) return;
    const lesson = moduleState.module.lessons[index];
    if (!lesson) return;
    setActiveLessonIndex(index);
    navigateToCourse(moduleState.id, lesson.id);
    void persistLearningState(moduleState, answers, index, tutorMessages);
  }

  function chooseAnswer(lesson: LearningLessonDto, answerIndex: number) {
    const nextAnswers = { ...answers, [lesson.id]: answerIndex };
    setAnswers(nextAnswers);
    void persistLearningState(moduleState, nextAnswers, activeLessonIndex, tutorMessages);
  }

  async function askTutor(questionOverride?: string) {
    if (!account || !moduleState || !generatedModule || !activeLesson) return;
    const question = (questionOverride ?? tutorQuestion).trim();
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
      const savedSession = response.session;
      if (savedSession) {
        setCourseLibrary((courses) => upsertCourse(courses, savedSession));
      }
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
      navigateToTab("workbench");
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
        onEnter={() => navigateToTab(account ? "dashboard" : "learn")}
        onLearn={() => navigateToTab("learn")}
      />
    );
  }

  if (!account && sessionCheckState === "checking") {
    return (
      <ProtectedShell account={account} authConfigured={authConfigured} onLogo={() => navigateToTab("landing")}>
        <SessionRestoreView />
      </ProtectedShell>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[#030d0b] font-sans text-on-surface">
        <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#030b0a]/96 backdrop-blur-md">
          <div className="mx-auto flex h-[70px] items-center justify-between gap-4 px-6">
            <button type="button" onClick={() => navigateToTab("landing")} className="flex min-w-0 items-center gap-3 text-left">
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center" aria-hidden="true">
                <span className="absolute top-1 h-3.5 w-5 rotate-45 rounded-[2px] bg-electric-blue shadow-[0_0_18px_rgba(0,240,255,0.28)]" />
                <span className="absolute top-3 h-3.5 w-5 rotate-45 rounded-[2px] bg-electric-blue/85" />
                <span className="absolute top-5 h-3.5 w-5 rotate-45 rounded-[2px] bg-electric-blue/65" />
              </span>
              <span className="block truncate text-[22px] font-black tracking-[-0.03em] text-white">VibeQuest</span>
            </button>
            <AccountControl account={account} authConfigured={authConfigured} />
          </div>
        </header>
        <ProtectedLoginView authConfigured={authConfigured} />
      </div>
    );
  }

  const immersiveLearnFlow = activeTab === "learn" && generationState === "loading";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#030d0b] font-sans text-on-surface">
      {!immersiveLearnFlow ? (
        <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#030b0a]/96 backdrop-blur-md">
          <div className="mx-auto grid h-[70px] max-w-none grid-cols-[1fr_auto_1fr] items-center gap-4 px-6">
            <button
              type="button"
              onClick={() => navigateToTab("landing")}
              className="flex min-w-0 items-center gap-3 text-left"
            >
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center" aria-hidden="true">
                <span className="absolute top-1 h-3.5 w-5 rotate-45 rounded-[2px] bg-electric-blue shadow-[0_0_18px_rgba(0,240,255,0.28)]" />
                <span className="absolute top-3 h-3.5 w-5 rotate-45 rounded-[2px] bg-electric-blue/85" />
                <span className="absolute top-5 h-3.5 w-5 rotate-45 rounded-[2px] bg-electric-blue/65" />
              </span>
              <span className="block truncate text-[22px] font-black tracking-[-0.03em] text-white">VibeQuest</span>
            </button>

            <nav className="hidden items-center gap-8 md:flex" aria-label="VibeQuest workspace">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => navigateToTab(tab.id)}
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
              <AccountControl account={account} authConfigured={authConfigured} showIdentity={activeTab === "dashboard"} />
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto border-t border-white/[0.06] bg-[#030b0a]/80 px-4 py-2 md:hidden">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigateToTab(tab.id)}
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
          courseLibrary={courseLibrary}
          completedLessons={completedLessons}
          syncState={syncState}
          syncWarning={syncWarning}
          questState={questState}
          activeLessonPassed={activeLessonPassed}
          activeLessonIndex={activeLessonIndex}
          answers={answers}
          onLearn={() => navigateToTab("learn")}
          onWorkbench={() => navigateToTab("workbench")}
          onOpenCourse={openCourse}
        />
      ) : null}
      {activeTab === "learn" ? (
        <LearnView
          account={account}
          authConfigured={authConfigured}
          learnScreenMode={learnScreenMode}
          onBackToSelect={() => {
            setLearnScreenMode("select");
            navigateToTab("learn");
          }}
          courseLibrary={courseLibrary}
          libraryState={libraryState}
          onOpenCourse={openCourse}
          onArchiveCourse={(course) => void archiveCourse(course)}
          onDeleteCourse={(course) => void deleteCourse(course)}
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
          codeSnippetsEnabled={codeSnippetsEnabled}
          setCodeSnippetsEnabled={setCodeSnippetsEnabled}
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
          questError={questError}
          onStartQuest={() => void startLessonQuest()}
          questGenerationState={questGenerationState}
          activeLessonPassed={activeLessonPassed}
          onResumeGeneration={() => void resumeCourseGeneration()}
        />
      ) : null}
      {activeTab === "workbench" ? (
        <WorkbenchView
          moduleState={moduleState}
          questState={questState}
          setQuestState={setQuestState}
          onOpenLearn={() => navigateToTab("learn")}
          onVerifyWorkspace={verifyWorkspace}
          onSubmitRunner={() => void submitSelectedFileToRunner()}
          onRefreshRunner={() => void refreshRunnerSubmission()}
          runnerSubmitting={runnerSubmitting}
        />
      ) : null}
    </div>
  );
}


function ProtectedShell({
  account,
  authConfigured,
  onLogo,
  children,
}: {
  account: AccountSummary | null;
  authConfigured: boolean;
  onLogo: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#030d0b] font-sans text-on-surface">
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#030b0a]/96 backdrop-blur-md">
        <div className="mx-auto flex h-[70px] items-center justify-between gap-4 px-6">
          <button type="button" onClick={onLogo} className="flex min-w-0 items-center gap-3 text-left">
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center" aria-hidden="true">
              <span className="absolute top-1 h-3.5 w-5 rotate-45 rounded-[2px] bg-electric-blue shadow-[0_0_18px_rgba(0,240,255,0.28)]" />
              <span className="absolute top-3 h-3.5 w-5 rotate-45 rounded-[2px] bg-electric-blue/85" />
              <span className="absolute top-5 h-3.5 w-5 rotate-45 rounded-[2px] bg-electric-blue/65" />
            </span>
            <span className="block truncate text-[22px] font-black tracking-[-0.03em] text-white">VibeQuest</span>
          </button>
          <AccountControl account={account} authConfigured={authConfigured} />
        </div>
      </header>
      {children}
    </div>
  );
}

function SessionRestoreView() {
  return (
    <main className="flex min-h-[calc(100vh-70px)] items-center justify-center bg-[#03100e] px-5 py-12 text-white">
      <section className="w-full max-w-xl rounded-2xl border border-electric-blue/20 bg-[#071410] p-8 text-center shadow-[0_0_60px_rgba(0,240,255,0.06)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-electric-blue/25 bg-electric-blue/10 text-electric-blue">
          <LoaderCircle className="h-7 w-7 animate-spin" aria-hidden="true" />
        </div>
        <p className="mt-6 font-mono text-xs font-black uppercase tracking-[0.16em] text-electric-blue">Restoring session</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl">Checking your Google login</h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-white/58">
          If your session is still valid, VibeQuest will return you to this protected page without asking you to sign in again.
        </p>
      </section>
    </main>
  );
}

function ProtectedLoginView({ authConfigured }: { authConfigured: boolean }) {
  const path = typeof window === "undefined" ? "/dashboard" : `${window.location.pathname}${window.location.search}`;
  return (
    <main className="flex min-h-[calc(100vh-70px)] items-center justify-center bg-[#03100e] px-5 py-12 text-white">
      <section className="w-full max-w-2xl rounded-2xl border border-electric-blue/20 bg-[#071410] p-8 text-center shadow-[0_0_60px_rgba(0,240,255,0.06)] sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-electric-blue/25 bg-electric-blue/10 text-electric-blue">
          <LockKeyhole className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="mt-6 font-mono text-xs font-black uppercase tracking-[0.16em] text-electric-blue">Protected learning workspace</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl">Sign in with Google to continue</h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/58">
          Dashboard, Learn, and Workbench are private learner surfaces. After login, VibeQuest returns you to <span className="text-electric-blue">{path}</span>.
        </p>
        <div className="mt-7 flex justify-center">
          <AccountControl account={null} authConfigured={authConfigured} />
        </div>
        {!authConfigured ? <Notice tone="red" text="Google authentication is not configured in this deployment." /> : null}
      </section>
    </main>
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
    {
      icon: <Code2 className="h-5 w-5" aria-hidden="true" />,
      title: "Stacks",
      copy: "Learn Bitcoin-secured app flows, Clarity contract basics, sBTC, BNS identity, and wallet authorization boundaries.",
      meta: "Stacks added",
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
            <button type="button" onClick={onLearn} className="transition hover:text-electric-blue">Learn</button>
            <a className="transition hover:text-electric-blue" href="#workflow">Workflow</a>
            <a className="transition hover:text-electric-blue" href="#quests">Quests</a>
          </nav>

          <div className="flex items-center justify-end gap-3">
            {account ? <AccountControl account={account} authConfigured={authConfigured} showIdentity /> : null}
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

          <div className="mt-14 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
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
            <LandingStat value="4" label="Protocol targets" />
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
  children: ReactNode;
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

function LoopStep({ number, title, children }: { number: string; title: string; children: ReactNode }) {
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
  courseLibrary,
  completedLessons,
  syncState,
  syncWarning,
  questState,
  activeLessonPassed,
  activeLessonIndex,
  answers,
  onLearn,
  onWorkbench,
  onOpenCourse,
}: {
  account: AccountSummary | null;
  moduleState: ModuleState | null;
  courseLibrary: LearningSessionRecord[];
  completedLessons: number;
  syncState: SyncState;
  syncWarning: string | null;
  questState: QuestState | null;
  activeLessonPassed: boolean;
  activeLessonIndex: number;
  answers: Record<string, number>;
  onLearn: () => void;
  onWorkbench: () => void;
  onOpenCourse: (course: LearningSessionRecord) => void;
}) {
  const lessonCount = moduleState?.module.lessons.length ?? 0;
  const libraryProgress = courseLibraryProgress(courseLibrary);
  const latestCourse = courseLibrary[0] ?? null;
  const [dailyGoal, setDailyGoal] = useState(1);
  const [weeklyTarget, setWeeklyTarget] = useState(5);
  const streak = courseLibraryStreak(courseLibrary);
  const checkpointValue = libraryProgress.totalGenerated ? `${libraryProgress.totalCompleted} / ${libraryProgress.totalGenerated}` : "0 / 0";
  const activeTrackId = moduleState?.ecosystem.id ?? asEcosystemId(latestCourse?.ecosystem_id) ?? "zcash";
  const questProgressSteps = questState
    ? 1 + (questState.workspaceVerified ? 1 : 0) + (questState.runnerSubmission ? 1 : 0)
    : 0;
  const questProgress = questState ? Math.round((questProgressSteps / 3) * 100) : 0;
  const nextAction = !account
    ? { label: "Continue Learning", detail: "Sign in with Google, then generate or resume an AI learning module.", action: onLearn }
    : latestCourse && !moduleState
      ? { label: "Resume Course", detail: "Open the most recently active saved course.", action: () => onOpenCourse(latestCourse) }
    : !moduleState
      ? { label: "Continue Learning", detail: "Choose Basics, CKB, Fiber, Zcash, or Stacks and let Core generate the first module.", action: onLearn }
      : !activeLessonPassed
        ? { label: "Continue Learning", detail: "Resume the active lesson and pass its checkpoint.", action: onLearn }
        : !questState
          ? { label: "Open Learn", detail: "Generate the implementation quest from the passed lesson.", action: onLearn }
          : { label: "Open Workbench", detail: "Inspect generated files, checks, and runner evidence.", action: onWorkbench };

  const tracks = ECOSYSTEMS.map((ecosystem) => {
    const ecosystemCourses = courseLibrary.filter((course) => asEcosystemId(course.ecosystem_id) === ecosystem.id);
    const aggregate = courseLibraryProgress(ecosystemCourses);
    const active = ecosystem.id === activeTrackId;
    const trackProgress = aggregate.totalGenerated ? Math.round((aggregate.totalCompleted / aggregate.totalGenerated) * 100) : 0;
    return {
      ecosystem,
      active,
      completed: aggregate.totalCompleted,
      total: aggregate.totalGenerated,
      progress: trackProgress,
      status: active ? "Active" : ecosystemCourses.length ? `${ecosystemCourses.length} course${ecosystemCourses.length === 1 ? "" : "s"}` : "Open",
      action: ecosystemCourses[0] ? "Resume" : "Open Learn",
      course: ecosystemCourses[0] ?? null,
    };
  });

  const activities = [
    questState
      ? {
          tone: "bg-warning-amber",
          title: "Quest generated",
          detail: questState.response.quest.title,
          time: "Current session",
        }
      : null,
    questState?.workspaceVerified
      ? {
          tone: "bg-cyber-green",
          title: "Workspace verified",
          detail: "Generated files passed local checks",
          time: "Current session",
        }
      : null,
    completedLessons > 0
      ? {
          tone: "bg-cyber-green",
          title: `${completedLessons} checkpoint${completedLessons === 1 ? "" : "s"} passed`,
          detail: moduleState?.module.title ?? "Active module",
          time: "Current session",
        }
      : null,
    moduleState
      ? {
          tone: "bg-electric-blue",
          title: "Active course loaded",
          detail: moduleState.module.title,
          time: syncStateLabel(syncState),
        }
      : null,
    ...courseLibrary.slice(0, 4).map((course) => {
      const ecosystem = ecosystemById(asEcosystemId(course.ecosystem_id) ?? "zcash");
      const progress = courseProgress(course);
      return {
        tone: progress.completed > 0 ? "bg-cyber-green" : "bg-electric-blue",
        title: `${ecosystem.label} course saved`,
        detail: `${course.module.title} · ${progress.completed}/${progress.total} complete`,
        time: relativeActivityTime(course.updated_at),
      };
    }),
  ].filter(Boolean) as { tone: string; title: string; detail: string; time: string }[];

  return (
    <main className="min-h-[calc(100vh-70px)] bg-[#030d0b] px-6 py-10 text-white md:px-8 lg:px-10">
      <section className="mx-auto max-w-[1440px]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.16em] text-electric-blue">Dashboard</p>
            <h1 className="mt-5 max-w-4xl text-[44px] font-black leading-[0.98] tracking-[-0.06em] text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.85)] md:text-[56px]">
              Learn it, inspect it, <span className="text-electric-blue">then ship it.</span>
            </h1>
            <p className="mt-6 text-xl leading-8 text-white/58">
              Web3 + Blockchain, CKB, Fiber, Zcash, and Stacks. One AI learning system.
            </p>
          </div>
          <button
            type="button"
            onClick={nextAction.action}
            className="inline-flex h-14 min-w-[250px] items-center justify-center gap-3 rounded-xl bg-electric-blue px-7 text-base font-black text-black shadow-[0_0_34px_rgba(0,240,255,0.18)] transition hover:-translate-y-0.5 hover:brightness-110"
          >
            <Play className="h-4 w-4 fill-black" aria-hidden="true" />
            {nextAction.label}
          </button>
        </div>

        <section className="mt-14 grid gap-7 md:grid-cols-3">
          <DashboardStatCard
            title="Lessons Done"
            value={String(completedLessons)}
            detail={`${libraryProgress.totalGenerated} generated across saved courses`}
            icon={<BookOpen className="h-5 w-5 text-electric-blue" aria-hidden="true" />}
          />
          <DashboardStatCard
            title="Active Streak"
            value={`${streak.current} day${streak.current === 1 ? "" : "s"}`}
            detail={`Longest ${streak.longest} day${streak.longest === 1 ? "" : "s"} from saved activity`}
            icon={<Zap className="h-5 w-5 text-warning-amber" aria-hidden="true" />}
            outlined
          />
          <DashboardStatCard
            title="Checkpoints"
            value={checkpointValue}
            detail={libraryProgress.totalGenerated ? "passed across saved courses" : "generate a course to begin"}
            icon={<CheckCircle2 className="h-5 w-5 text-cyber-green" aria-hidden="true" />}
            outlined
          />
        </section>

        {syncWarning ? <Notice tone="amber" text={syncWarning} /> : null}

        <section className="mt-7 rounded-2xl border border-white/[0.075] bg-[#111d1b] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.16em] text-electric-blue">Streak Options</p>
              <p className="mt-2 text-sm leading-6 text-white/55">Set the goal VibeQuest should use when judging your weekly learning rhythm. Current progress uses saved course activity only.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.06] bg-[#020b0a] p-3">
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-white/40">Daily goal</span>
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3].map((goal) => (
                    <button key={goal} type="button" onClick={() => setDailyGoal(goal)} className={dailyGoal === goal ? "rounded-md bg-electric-blue px-3 py-2 text-xs font-black text-black" : "rounded-md border border-white/[0.08] px-3 py-2 text-xs font-bold text-white/55"}>
                      {goal} lesson{goal === 1 ? "" : "s"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-[#020b0a] p-3">
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-white/40">Weekly target</span>
                <div className="mt-2 flex gap-2">
                  {[3, 5, 7].map((goal) => (
                    <button key={goal} type="button" onClick={() => setWeeklyTarget(goal)} className={weeklyTarget === goal ? "rounded-md bg-electric-blue px-3 py-2 text-xs font-black text-black" : "rounded-md border border-white/[0.08] px-3 py-2 text-xs font-bold text-white/55"}>
                      {goal} days
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <div className="mb-7 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black tracking-[-0.04em] text-white">Ecosystem Tracks</h2>
            <button type="button" onClick={onLearn} className="inline-flex items-center gap-2 text-sm font-black text-electric-blue transition hover:brightness-125">
              Open Learn <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-4">
            {tracks.map((track) => (
              <DashboardTrackCard
                key={track.ecosystem.id}
                ecosystem={track.ecosystem}
                active={track.active}
                completed={track.completed}
                total={track.total}
                progress={track.progress}
                status={track.status}
                action={track.action}
                onOpen={track.course ? () => onOpenCourse(track.course) : onLearn}
              />
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-7 xl:grid-cols-[1fr_1fr]">
          <div className="flex min-h-[620px] flex-col rounded-2xl border border-electric-blue/35 bg-[#111d1b] p-7 shadow-[0_0_45px_rgba(0,240,255,0.04)]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 font-mono text-xs font-black uppercase tracking-[0.14em] text-electric-blue">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Active Module
              </div>
              <button type="button" onClick={onLearn} className="inline-flex items-center gap-2 text-sm font-medium text-white/55 transition hover:text-electric-blue">
                Open <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {moduleState ? (
              <>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <span className="rounded-md bg-cyber-green/15 px-3 py-1 font-mono text-xs font-black uppercase tracking-[0.12em] text-cyber-green">
                    {moduleState.ecosystem.label}
                  </span>
                  <span className="text-sm text-white/55">Module {activeLessonIndex + 1} of {lessonCount || 1}</span>
                </div>
                <h3 className="mt-4 text-[26px] font-black leading-tight tracking-[-0.04em] text-white">
                  {moduleState.module.title}
                </h3>
                <p className="mt-4 text-base leading-7 text-white/58">{moduleState.module.outcome}</p>

                <div className="mt-8 space-y-2">
                  {moduleState.module.lessons.slice(0, 5).map((lesson, index) => {
                    const passed = answers[lesson.id] === lesson.checkpoint.correct_index;
                    const active = index === activeLessonIndex;
                    const locked = index > activeLessonIndex && !passed;
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={onLearn}
                        className={
                          active
                            ? "grid w-full grid-cols-[34px_minmax(0,1fr)_24px] items-center gap-3 rounded-md bg-electric-blue/10 px-3 py-3 text-left"
                            : "grid w-full grid-cols-[34px_minmax(0,1fr)_24px] items-center gap-3 rounded-md px-3 py-3 text-left transition hover:bg-white/[0.035]"
                        }
                      >
                        <span className={active ? "font-mono text-sm text-electric-blue" : "font-mono text-sm text-white/32"}>{String(index + 1).padStart(2, "0")}</span>
                        <span className={locked ? "line-clamp-1 text-base text-white/35" : active ? "line-clamp-1 text-base font-semibold text-white" : "line-clamp-1 text-base text-white/64"}>
                          {lesson.title}
                        </span>
                        {passed ? (
                          <CheckCircle2 className="h-4 w-4 text-cyber-green" aria-hidden="true" />
                        ) : active ? (
                          <span className="h-2 w-2 rounded-full bg-warning-amber" />
                        ) : locked ? (
                          <LockKeyhole className="h-4 w-4 text-white/22" aria-hidden="true" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-[#06110f] p-8 text-center">
                <div>
                  <BookOpen className="mx-auto h-10 w-10 text-electric-blue" aria-hidden="true" />
                  <h3 className="mt-4 text-2xl font-black text-white">No active module yet</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/55">Open Learn, choose an ecosystem, and generate a module with Core.</p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onLearn}
              className="mt-auto inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-electric-blue text-base font-black text-black shadow-[0_0_30px_rgba(0,240,255,0.13)] transition hover:brightness-110"
            >
              <Play className="h-4 w-4 fill-black" aria-hidden="true" />
              {moduleState ? "Resume Lesson" : "Start Learning"}
            </button>
          </div>

          <div className="space-y-7">
            <div className="rounded-2xl border border-warning-amber/45 bg-[#111d1b] p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 font-mono text-xs font-black uppercase tracking-[0.14em] text-warning-amber">
                  <Zap className="h-4 w-4 fill-warning-amber" aria-hidden="true" />
                  Active Workbench
                </div>
                {questState ? (
                  <span className="rounded-full border border-warning-amber/40 bg-warning-amber/10 px-4 py-1.5 font-mono text-xs font-black text-warning-amber">
                    {questProgress}% complete
                  </span>
                ) : null}
              </div>

              {questState ? (
                <>
                  <h3 className="mt-8 text-2xl font-black tracking-[-0.04em] text-white">{questState.response.quest.title}</h3>
                  <p className="mt-4 text-base leading-7 text-white/58">{questState.response.quest.build_objective}</p>
                  <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/[0.08]">
                    <span className="block h-full rounded-full bg-warning-amber" style={{ width: `${questProgress}%` }} />
                  </div>
                  <button
                    type="button"
                    onClick={onWorkbench}
                    className="mt-7 h-12 w-full rounded-lg border border-white/[0.08] bg-[#071210] text-base font-black text-white transition hover:border-electric-blue/40 hover:text-electric-blue"
                  >
                    Open Workbench
                  </button>
                </>
              ) : (
                <div className="mt-8 rounded-xl border border-dashed border-white/[0.08] bg-[#071210] p-6 text-center">
                  <h3 className="text-xl font-black text-white">No active quest yet</h3>
                  <p className="mt-3 text-sm leading-6 text-white/55">Pass a lesson checkpoint, then generate the implementation quest.</p>
                  <button
                    type="button"
                    onClick={onLearn}
                    className="mt-5 h-11 rounded-lg bg-electric-blue px-6 text-sm font-black text-black transition hover:brightness-110"
                  >
                    Open Learn
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-[#111d1b] p-7">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 font-mono text-xs font-black uppercase tracking-[0.14em] text-white/55">
                  <Network className="h-4 w-4" aria-hidden="true" />
                  Recent Activity
                </div>
                <span className="text-sm text-white/45">Current</span>
              </div>

              <div className="mt-8 space-y-6">
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <div key={`${activity.title}-${activity.detail}`} className="grid grid-cols-[12px_minmax(0,1fr)] gap-5">
                      <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${activity.tone}`} />
                      <div>
                        <h4 className="text-base font-black text-white">{activity.title}</h4>
                        <p className="mt-1 text-sm leading-5 text-white/50">{activity.detail}</p>
                        <p className="mt-1 text-sm text-white/42">{activity.time}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-white/[0.08] bg-[#071210] p-6 text-center">
                    <p className="text-base font-semibold text-white/70">No learning activity yet.</p>
                    <p className="mt-2 text-sm leading-6 text-white/50">Generate a module and activity will appear here from real session state.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function DashboardStatCard({
  title,
  value,
  detail,
  icon,
  outlined = false,
}: {
  title: string;
  value: string;
  detail: string;
  icon: ReactNode;
  outlined?: boolean;
}) {
  return (
    <article className={outlined ? "rounded-xl border border-white/55 bg-[#111d1b] p-7" : "rounded-xl border border-white/[0.04] bg-[#111d1b] p-7"}>
      <div className="flex items-start justify-between gap-4">
        <p className="font-mono text-xs font-black uppercase tracking-[0.14em] text-white/50">{title}</p>
        {icon}
      </div>
      <p className="mt-9 text-[38px] font-black leading-none tracking-[-0.04em] text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.85)]">{value}</p>
      <p className="mt-3 text-base text-white/55">{detail}</p>
    </article>
  );
}

function DashboardTrackCard({
  ecosystem,
  active,
  completed,
  total,
  progress,
  status,
  action,
  onOpen,
}: {
  ecosystem: EcosystemOption;
  active: boolean;
  completed: number;
  total: number;
  progress: number;
  status: string;
  action: string;
  onOpen: () => void;
}) {
  const tone = ecosystem.id === "fiber" ? "amber" : ecosystem.id === "ckb" ? "green" : "blue";
  const progressColor = tone === "amber" ? "bg-warning-amber" : tone === "green" ? "bg-cyber-green" : "bg-electric-blue";
  const borderColor = active
    ? "border-electric-blue/45 shadow-[0_0_45px_rgba(0,240,255,0.05)]"
    : tone === "amber"
      ? "border-warning-amber/35"
      : "border-white/55";
  const textColor = tone === "amber" ? "text-warning-amber" : tone === "green" ? "text-cyber-green" : "text-electric-blue";
  const iconTone = tone === "amber"
    ? "border-warning-amber/30 bg-warning-amber/10 text-warning-amber"
    : tone === "green"
      ? "border-cyber-green/30 bg-cyber-green/10 text-cyber-green"
      : "border-electric-blue/30 bg-electric-blue/10 text-electric-blue";

  return (
    <article className={`rounded-xl border bg-[#111d1b] p-7 ${borderColor}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className={`flex h-12 w-12 items-center justify-center rounded-lg border text-xl font-black ${iconTone}`}>
            {ecosystem.label.charAt(0)}
          </span>
          <div>
            <h3 className="text-2xl font-black text-white">{ecosystem.label}</h3>
            <p className="mt-1 text-base text-white/52">{total ? `${completed} / ${total} lessons` : "No generated module"}</p>
          </div>
        </div>
        {active ? (
          <span className="rounded-full border border-electric-blue/40 bg-electric-blue/10 px-4 py-1.5 text-sm font-medium text-electric-blue">{status}</span>
        ) : null}
      </div>
      <p className="mt-8 min-h-[56px] text-base leading-7 text-white/54">{ecosystem.detail}</p>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/[0.08]">
        <span className={`block h-full rounded-full ${progressColor}`} style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 text-sm">
        <span className="text-white/45">{total ? `${completed}/${total} complete` : "Generate in Learn"}</span>
        <span className={textColor}>{progress}%</span>
      </div>
      <div className="mt-7 flex items-center justify-between gap-4">
        <span className="text-sm text-white/45">Current session</span>
        <button type="button" onClick={onOpen} className={`inline-flex items-center gap-2 text-base font-black ${textColor} transition hover:brightness-125`}>
          {action} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
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
  codeSnippetsEnabled: boolean;
  setCodeSnippetsEnabled: (enabled: boolean) => void;
  courseLibrary: LearningSessionRecord[];
  libraryState: SyncState;
  onOpenCourse: (course: LearningSessionRecord) => void;
  onArchiveCourse: (course: LearningSessionRecord) => void;
  onDeleteCourse: (course: LearningSessionRecord) => void;
  generationState: GenerationState;
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
  onAskTutor: (questionOverride?: string) => Promise<void>;
  syncState: SyncState;
  syncWarning: string | null;
  questError: string | null;
  onStartQuest: () => void;
  questGenerationState: "idle" | "loading";
  activeLessonPassed: boolean;
  onResumeGeneration: () => void;
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
        questError={props.questError}
        questGenerationState={props.questGenerationState}
        activeLessonPassed={props.activeLessonPassed}
        onBackToSelect={props.onBackToSelect}
        onResumeGeneration={props.onResumeGeneration}
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
      codeSnippetsEnabled={props.codeSnippetsEnabled}
      setCodeSnippetsEnabled={props.setCodeSnippetsEnabled}
      setIntentText={props.setIntentText}
      courseLibrary={props.courseLibrary}
      libraryState={props.libraryState}
      onOpenCourse={props.onOpenCourse}
      onArchiveCourse={props.onArchiveCourse}
      onDeleteCourse={props.onDeleteCourse}
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
  codeSnippetsEnabled,
  setCodeSnippetsEnabled,
  setIntentText,
  courseLibrary,
  libraryState,
  onOpenCourse,
  onArchiveCourse,
  onDeleteCourse,
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
  codeSnippetsEnabled: boolean;
  setCodeSnippetsEnabled: (enabled: boolean) => void;
  setIntentText: (value: string) => void;
  courseLibrary: LearningSessionRecord[];
  libraryState: SyncState;
  onOpenCourse: (course: LearningSessionRecord) => void;
  onArchiveCourse: (course: LearningSessionRecord) => void;
  onDeleteCourse: (course: LearningSessionRecord) => void;
  generationError: string | null;
  onGenerate: () => Promise<void>;
  syncWarning: string | null;
}) {
  const [configuringEcosystemId, setConfiguringEcosystemId] = useState<EcosystemId | null>(null);
  const configuringEcosystem = configuringEcosystemId
    ? ecosystems.find((ecosystem) => ecosystem.id === configuringEcosystemId) ?? selectedEcosystem
    : null;
  const [libraryFilter, setLibraryFilter] = useState<EcosystemId | "all">("all");
  const activeCourses = courseLibrary.filter((course) => course.status !== "archived");
  const visibleCourses = activeCourses.filter((course) => {
    if (libraryFilter === "all") return true;
    return asEcosystemId(course.ecosystem_id) === libraryFilter;
  });

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
          <p className="mx-auto mt-8 max-w-[760px] text-center text-[19px] leading-8 text-white/48">
            Choose a learning path, resume saved courses, or generate a new AI course. The first module appears as soon as it is ready while the rest keeps generating.
          </p>
        </div>

        {activeCourses.length > 0 ? (
          <section className="mt-12 w-full rounded-2xl border border-electric-blue/20 bg-[#071410] p-5 text-left shadow-[0_0_42px_rgba(0,240,255,0.035)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="font-mono text-xs font-black uppercase tracking-[0.16em] text-electric-blue">My Courses</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">Resume or manage saved learning</h2>
                <p className="mt-2 max-w-[680px] text-sm leading-6 text-white/48">
                  Open any generated course, continue partially generated tracks, or archive/delete old sessions so your learning path stays clear.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-white/[0.07] bg-[#020b0a] px-3 py-1.5 text-xs font-semibold text-white/45">
                {syncStateLabel(libraryState)} · {activeCourses.length} saved
              </span>
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setLibraryFilter("all")}
                className={
                  libraryFilter === "all"
                    ? "whitespace-nowrap rounded-full bg-electric-blue px-3.5 py-2 text-xs font-black text-black"
                    : "whitespace-nowrap rounded-full border border-white/[0.075] bg-[#020b0a] px-3.5 py-2 text-xs font-bold text-white/55 hover:border-electric-blue/35 hover:text-white"
                }
              >
                All courses · {activeCourses.length}
              </button>
              {ecosystems.map((ecosystem) => {
                const count = activeCourses.filter((course) => asEcosystemId(course.ecosystem_id) === ecosystem.id).length;
                return (
                  <button
                    key={ecosystem.id}
                    type="button"
                    onClick={() => setLibraryFilter(ecosystem.id)}
                    className={
                      libraryFilter === ecosystem.id
                        ? "whitespace-nowrap rounded-full bg-electric-blue px-3.5 py-2 text-xs font-black text-black"
                        : "whitespace-nowrap rounded-full border border-white/[0.075] bg-[#020b0a] px-3.5 py-2 text-xs font-bold text-white/55 hover:border-electric-blue/35 hover:text-white"
                    }
                  >
                    {ecosystem.label} · {count}
                  </button>
                );
              })}
            </div>

            {visibleCourses.length > 0 ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {visibleCourses.map((course) => {
                  const ecosystem = ecosystemById(asEcosystemId(course.ecosystem_id) ?? "zcash");
                  const progress = courseProgress(course);
                  const generatedCount = course.module.lessons.length;
                  const generatedPercent = Math.min(100, Math.round((generatedCount / TOTAL_LEARNING_MODULES) * 100));
                  const isFullyGenerated = generatedCount >= TOTAL_LEARNING_MODULES;
                  return (
                    <article
                      key={course.module_id}
                      className="rounded-2xl border border-white/[0.075] bg-[#020b0a] p-4 transition hover:border-electric-blue/35 hover:bg-electric-blue/[0.025]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="rounded-md bg-electric-blue/10 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-electric-blue">
                          {ecosystem.label}
                        </span>
                        <span className={isFullyGenerated ? "text-xs font-bold text-green-300" : "text-xs font-bold text-yellow-300"}>
                          {isFullyGenerated ? "Course ready" : `${generatedCount}/${TOTAL_LEARNING_MODULES} modules ready`}
                        </span>
                      </div>
                      <h3 className="mt-3 line-clamp-2 text-lg font-black leading-6 text-white">{course.module.title}</h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/50">{course.topic || course.module.outcome}</p>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs text-white/42">
                          <span>{progress.completed}/{progress.total} checkpoints passed</span>
                          <span>{generatedPercent}% generated</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                          <div className="h-full rounded-full bg-electric-blue" style={{ width: `${generatedPercent}%` }} />
                        </div>
                      </div>
                      <div className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs text-white/38">Last activity · {relativeActivityTime(course.updated_at)}</span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenCourse(course)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-electric-blue px-3 py-2 text-xs font-black text-black shadow-[0_0_18px_rgba(0,240,255,0.16)]"
                          >
                            Open <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onArchiveCourse(course)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-xs font-bold text-white/62 hover:border-electric-blue/35 hover:text-white"
                          >
                            <Archive className="h-3.5 w-3.5" aria-hidden="true" /> Archive
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteCourse(course)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300/15 bg-red-400/[0.035] px-3 py-2 text-xs font-bold text-red-200/75 hover:border-red-300/30 hover:text-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-white/[0.07] bg-[#020b0a] p-5 text-sm text-white/50">
                No saved courses in this learning path yet. Choose {ecosystemById(libraryFilter === "all" ? selectedEcosystem.id : libraryFilter).label} below to generate one.
              </div>
            )}
          </section>
        ) : null}

        <div className="mt-12 grid w-full gap-6 md:grid-cols-2 xl:grid-cols-4">
          {ecosystems.map((ecosystem) => {
            const count = activeCourses.filter((course) => asEcosystemId(course.ecosystem_id) === ecosystem.id).length;
            return (
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
                <span className="mt-7 inline-flex rounded-full border border-electric-blue/25 px-3 py-1 text-xs font-black text-electric-blue">
                  {count ? `Generate new · ${count} saved` : "Generate new course"}
                </span>
              </button>
            );
          })}
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
          codeSnippetsEnabled={codeSnippetsEnabled}
          setCodeSnippetsEnabled={setCodeSnippetsEnabled}
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
  codeSnippetsEnabled,
  setCodeSnippetsEnabled,
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
  codeSnippetsEnabled: boolean;
  setCodeSnippetsEnabled: (enabled: boolean) => void;
  generationError: string | null;
  syncWarning: string | null;
  onGenerate: () => Promise<void>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#010807]/72 px-4 py-6 text-white backdrop-blur-[10px] sm:px-5 sm:pt-[60px]">
      <section className="w-full max-w-[760px] overflow-hidden rounded-2xl border border-white/[0.085] bg-[#071410] shadow-[0_32px_90px_rgba(0,0,0,0.55)]">
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
            <div className="grid gap-2 sm:grid-cols-2">
              {ecosystem.suggestedTopics.map((suggestedTopic) => (
                <button
                  key={suggestedTopic}
                  type="button"
                  onClick={() => setTopic(suggestedTopic)}
                  className={
                    topic === suggestedTopic
                      ? "rounded-lg border border-electric-blue bg-electric-blue/10 p-3 text-left text-sm leading-5 text-electric-blue"
                      : "rounded-lg border border-white/[0.06] bg-[#020b0a] p-3 text-left text-sm leading-5 text-white/55 transition hover:border-electric-blue/30 hover:text-white"
                  }
                >
                  {suggestedTopic}
                </button>
              ))}
            </div>
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

          <div className="mt-8 rounded-xl border border-electric-blue/20 bg-electric-blue/[0.035] p-4">
            <button
              type="button"
              onClick={() => setCodeSnippetsEnabled(!codeSnippetsEnabled)}
              className="flex w-full items-start gap-4 text-left"
            >
              <span className={codeSnippetsEnabled ? "mt-1 flex h-5 w-5 items-center justify-center rounded-md bg-electric-blue text-black" : "mt-1 flex h-5 w-5 items-center justify-center rounded-md border border-white/20 bg-[#020b0a]"}>
                {codeSnippetsEnabled ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              </span>
              <span>
                <span className="block text-sm font-black text-white">Include interactive code samples</span>
                <span className="mt-1 block text-sm leading-6 text-white/50">
                  Core will generate lessons with short TypeScript or Rust snippets, and the lesson page will show an editable code sample lab with copy and tutor actions.
                </span>
              </span>
            </button>
          </div>

          {!account ? <Notice tone="amber" text="Google sign-in is required before Core can generate and bind learning state." /> : null}
          {!authConfigured ? <Notice tone="red" text="Google authentication configuration is incomplete in the running web process." /> : null}
          {generationError ? <Notice tone="red" text={generationError} /> : null}
          {syncWarning ? <Notice tone="amber" text={syncWarning} /> : null}
          <p className="mt-5 rounded-xl border border-electric-blue/15 bg-electric-blue/[0.035] p-4 text-sm leading-6 text-white/55">
            Generation is progressive: the first usable module opens as soon as Core finishes it. The remaining modules continue generating and appear in the pathway as they are saved.
          </p>
        </div>

        <footer className="border-t border-white/[0.065] bg-[#081512] px-6 py-6">
          <button
            type="button"
            onClick={() => void onGenerate()}
            className="flex h-[60px] w-full items-center justify-center gap-3 rounded-xl bg-electric-blue text-lg font-black text-black shadow-[0_0_32px_rgba(0,240,255,0.14)] transition hover:brightness-110"
          >
            <Zap className="h-5 w-5 fill-black" aria-hidden="true" />
            Generate Course
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
          Generating module 1 so you can start...
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
  questError,
  questGenerationState,
  activeLessonPassed,
  onBackToSelect,
  onResumeGeneration,
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
  onAskTutor: (questionOverride?: string) => Promise<void>;
  onStartQuest: () => void;
  questError: string | null;
  questGenerationState: "idle" | "loading";
  activeLessonPassed: boolean;
  onBackToSelect: () => void;
  onResumeGeneration: () => void;
}) {
  const learningModule = moduleState.module;
  const [draftAnswer, setDraftAnswer] = useState<number | undefined>(selectedAnswer);
  const [tutorPanelOpen, setTutorPanelOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [showFireworks, setShowFireworks] = useState(false);
  const lessonArticleRef = useRef<HTMLElement | null>(null);
  const fireworksTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lessonTutorMessages = tutorMessages.filter((message) => !message.lessonId || message.lessonId === activeLesson.id);

  useEffect(() => {
    setDraftAnswer(selectedAnswer);
    setSelectedText("");
  }, [activeLesson.id, selectedAnswer]);

  useEffect(() => {
    return () => {
      if (fireworksTimeoutRef.current) {
        clearTimeout(fireworksTimeoutRef.current);
      }
    };
  }, []);

  function lessonPassed(lesson: LearningLessonDto) {
    return answers[lesson.id] === lesson.checkpoint.correct_index;
  }

  function lessonUnlocked(index: number) {
    if (index === 0) return true;
    if (index <= activeLessonIndex) return true;
    return lessonPassed(learningModule.lessons[index - 1]);
  }

  const lessonContent = splitLessonContent(activeLesson.explanation);
  const paragraphs = [activeLesson.why_it_matters, ...lessonContent.body.split(/\n{2,}/)]
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const pendingLessonCount = Math.max(moduleState.totalLessons - learningModule.lessons.length, 0);
  const lessonResources = criticalLearningResources(
    activeLesson.resources && activeLesson.resources.length > 0 ? activeLesson.resources : learningModule.resources,
    activeLesson,
    moduleState.ecosystem.id,
  );
  const previousLesson = learningModule.lessons[activeLessonIndex - 1] ?? null;
  const nextLesson = learningModule.lessons[activeLessonIndex + 1] ?? null;
  const canOpenNextLesson = Boolean(nextLesson && activeLessonPassed);
  const canResumeGeneration =
    pendingLessonCount > 0 &&
    (moduleState.generationStatus === "ready" || moduleState.generationStatus === "error");

  function captureSelection() {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    const anchorNode = selection?.anchorNode ?? null;
    if (!text || text.length < 12 || !anchorNode || !lessonArticleRef.current?.contains(anchorNode)) {
      setSelectedText("");
      return;
    }
    setSelectedText(clampUiText(text.replace(/\s+/g, " "), 900));
  }

  function copySelectedText() {
    if (!selectedText) return;
    void navigator.clipboard?.writeText(selectedText);
  }

  function askTutorAboutSelection() {
    if (!selectedText) return;
    const question = highlightedTutorQuestion(selectedText);
    setTutorPanelOpen(true);
    setSelectedText("");
    void onAskTutor(question);
  }

  function triggerFireworks() {
    setShowFireworks(true);
    if (fireworksTimeoutRef.current) {
      clearTimeout(fireworksTimeoutRef.current);
    }
    fireworksTimeoutRef.current = setTimeout(() => setShowFireworks(false), 2200);
  }

  return (
    <main className="min-h-screen bg-[#03100e] text-white lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="border-b border-white/[0.07] bg-[#061410] lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="px-4 py-5">
          <button
            type="button"
            onClick={onBackToSelect}
            className="mb-4 font-mono text-[11px] font-black uppercase tracking-[0.14em] text-white/45 transition hover:text-electric-blue"
          >
            Learning Home
          </button>
          <p className="line-clamp-2 font-mono text-[10px] font-black uppercase leading-4 tracking-[0.14em] text-electric-blue">
            {moduleState.ecosystem.label} · {moduleState.topic}
          </p>
          <h2 className="mt-3 text-base font-black text-white">Course Pathway</h2>
        </div>

        <nav className="space-y-3 px-3 pb-6" aria-label="Module pathway">
          {learningModule.lessons.map((lesson, index) => {
            const active = index === activeLessonIndex;
            const passed = lessonPassed(lesson);
            const locked = !lessonUnlocked(index);
            const status = locked ? "Locked" : active ? "In progress" : passed ? "Checkpoint passed" : "Checkpoint open";
            const submodules = lesson.submodules ?? [];
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
                  {active && submodules.length > 0 ? (
                    <span className="mt-3 block space-y-2 border-t border-white/[0.07] pt-3">
                      <span className="block font-mono text-[10px] font-black uppercase tracking-[0.14em] text-electric-blue">Submodules</span>
                      {submodules.slice(0, 4).map((submodule) => (
                        <span key={submodule.id} className="block rounded-md border border-white/[0.055] bg-[#020b0a] px-3 py-2">
                          <span className="block text-xs font-black leading-4 text-white/78">{submodule.title}</span>
                          <span className="mt-1 block text-[11px] leading-4 text-white/45">{submodule.summary}</span>
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
                {passed ? <CheckCircle2 className="h-5 w-5 text-cyber-green" aria-hidden="true" /> : locked ? <LockKeyhole className="h-5 w-5 text-white/30" aria-hidden="true" /> : <ChevronRight className="h-5 w-5 text-electric-blue" aria-hidden="true" />}
              </button>
            );
          })}
          {pendingLessonCount > 0 ? (
            <div className="rounded-lg border border-dashed border-electric-blue/25 bg-electric-blue/[0.035] px-4 py-4">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-electric-blue">
                {pendingLessonCount} module{pendingLessonCount === 1 ? "" : "s"} still generating
              </p>
              <p className="mt-2 text-xs leading-5 text-white/45">
                {canResumeGeneration
                  ? "This partial course was restored from saved state. Generate the remaining modules when you are ready."
                  : "You can keep learning while Core saves the remaining modules."}
              </p>
              {canResumeGeneration ? (
                <button
                  type="button"
                  onClick={onResumeGeneration}
                  className="mt-3 w-full rounded-lg bg-electric-blue px-3 py-2 text-xs font-black text-black transition hover:brightness-110"
                >
                  Generate remaining modules
                </button>
              ) : null}
            </div>
          ) : null}
        </nav>
      </aside>

      <section className="min-w-0 px-6 py-10 lg:px-0">
        <div className="mx-auto w-full max-w-[920px]">
          <article ref={lessonArticleRef} onMouseUp={captureSelection} onKeyUp={captureSelection}>
            <h1 className="text-3xl font-black leading-tight tracking-[-0.045em] text-white md:text-[36px]">
              {activeLesson.title}
            </h1>
            <LessonValidationBadge lesson={activeLesson} />
            {moduleState.generationStatus === "generating" ? (
              <div className="mt-5 rounded-xl border border-electric-blue/25 bg-electric-blue/[0.045] p-4 text-sm leading-6 text-electric-blue">
                Module 1 is ready. {pendingLessonCount > 0 ? `${pendingLessonCount} more module${pendingLessonCount === 1 ? "" : "s"} are still being generated and will appear in the pathway.` : "Final save is completing."}
              </div>
            ) : moduleState.generationStatus === "error" ? (
              <div className="mt-5 flex flex-col gap-3 rounded-xl border border-warning-amber/30 bg-warning-amber/10 p-4 text-sm leading-6 text-warning-amber sm:flex-row sm:items-center sm:justify-between">
                <span>This course is usable, but some remaining modules did not finish generating. Continue now or generate the remaining modules.</span>
                {canResumeGeneration ? (
                  <button
                    type="button"
                    onClick={onResumeGeneration}
                    className="h-10 shrink-0 rounded-lg bg-warning-amber px-4 text-xs font-black text-black transition hover:brightness-110"
                  >
                    Resume generation
                  </button>
                ) : null}
              </div>
            ) : canResumeGeneration ? (
              <div className="mt-5 flex flex-col gap-3 rounded-xl border border-electric-blue/25 bg-electric-blue/[0.045] p-4 text-sm leading-6 text-electric-blue sm:flex-row sm:items-center sm:justify-between">
                <span>This saved course has {pendingLessonCount} remaining module{pendingLessonCount === 1 ? "" : "s"} not generated yet.</span>
                <button
                  type="button"
                  onClick={onResumeGeneration}
                  className="h-10 shrink-0 rounded-lg bg-electric-blue px-4 text-xs font-black text-black transition hover:brightness-110"
                >
                  Generate remaining modules
                </button>
              </div>
            ) : null}
            <div className="mt-6 space-y-6 text-base leading-8 text-white/68">
              {paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            {lessonResources.length > 0 ? (
              <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/[0.07] pt-5">
                <span className="font-mono text-[11px] font-black uppercase tracking-[0.14em] text-white/38">Related resources</span>
                {lessonResources.map((resource) => (
                  <a
                    key={`${resource.title}-${resource.url}`}
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    title={resource.reason}
                    className="rounded-full border border-electric-blue/25 bg-electric-blue/[0.035] px-3 py-1.5 text-sm font-semibold text-electric-blue transition hover:border-electric-blue/55 hover:bg-electric-blue/10"
                  >
                    {resource.title}
                  </a>
                ))}
              </div>
            ) : null}

            {shouldShowCodeLens(lessonContent.codeLens) ? (
              <CodeSampleLab
                lessonId={activeLesson.id}
                code={lessonContent.codeLens}
                onAskTutor={(question) => {
                  setTutorPanelOpen(true);
                  void onAskTutor(question);
                }}
              />
            ) : null}
          </article>

          <div className="my-8 h-px bg-white/[0.075]" />

          <section className="rounded-2xl border border-electric-blue/45 bg-[#071410] p-5 shadow-[0_0_50px_rgba(0,240,255,0.05)] sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 font-mono text-[11px] font-black uppercase tracking-[0.16em] text-electric-blue">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Final Checkpoint
                </div>
                <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-white">Prove you understand this module</h2>
              </div>
              <span className={activeLessonPassed ? "rounded-full border border-cyber-green/35 bg-cyber-green/10 px-4 py-2 font-mono text-xs font-black uppercase tracking-[0.12em] text-cyber-green" : "rounded-full border border-warning-amber/35 bg-warning-amber/10 px-4 py-2 font-mono text-xs font-black uppercase tracking-[0.12em] text-warning-amber"}>
                {activeLessonPassed ? "Checkpoint passed" : "Answer required"}
              </span>
            </div>
            <p className="mt-6 text-lg font-semibold leading-8 text-white">
              {activeLesson.checkpoint.question}
            </p>
            <div className="mt-6 grid gap-3">
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
                        ? "grid w-full grid-cols-[34px_minmax(0,1fr)] gap-4 rounded-xl border border-cyber-green/45 bg-cyber-green/10 px-4 py-4 text-left"
                        : submitted && !correct
                          ? "grid w-full grid-cols-[34px_minmax(0,1fr)] gap-4 rounded-xl border border-red-400/45 bg-red-500/10 px-4 py-4 text-left"
                          : selected
                            ? "grid w-full grid-cols-[34px_minmax(0,1fr)] gap-4 rounded-xl border border-electric-blue/55 bg-electric-blue/10 px-4 py-4 text-left"
                            : "grid w-full grid-cols-[34px_minmax(0,1fr)] gap-4 rounded-xl border border-white/[0.07] bg-[#020b0a] px-4 py-4 text-left transition hover:border-electric-blue/30"
                    }
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-electric-blue/30 font-mono text-sm font-black text-electric-blue">{String.fromCharCode(65 + index)}</span>
                    <span className="text-base leading-7 text-white/76">{option.label}</span>
                  </button>
                );
              })}
            </div>
            {selectedAnswer !== undefined ? (
              <div className="mt-5 rounded-xl border border-white/[0.07] bg-[#020b0a] p-4">
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
                if (draftAnswer !== undefined) {
                  chooseAnswer(activeLesson, draftAnswer);
                  if (draftAnswer === activeLesson.checkpoint.correct_index) {
                    triggerFireworks();
                  }
                }
              }}
              disabled={draftAnswer === undefined}
              className="mt-6 h-13 min-h-13 w-full rounded-xl bg-electric-blue text-base font-black text-black shadow-[0_0_28px_rgba(0,240,255,0.12)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {activeLessonPassed ? "Checkpoint passed" : "Submit checkpoint answer"}
            </button>
          </section>

          {questError ? <Notice tone="red" text={questError} /> : null}

          <LessonBottomNavigation
            previousLesson={previousLesson}
            nextLesson={nextLesson}
            nextPending={pendingLessonCount > 0 && !nextLesson}
            canOpenNextLesson={canOpenNextLesson}
            activeLessonPassed={activeLessonPassed}
            onPrevious={() => chooseLesson(activeLessonIndex - 1)}
            onNext={() => chooseLesson(activeLessonIndex + 1)}
            onStartQuest={onStartQuest}
            questGenerationState={questGenerationState}
          />

          <TutorFloatingDock
            open={tutorPanelOpen}
            setOpen={setTutorPanelOpen}
            tutorQuestion={tutorQuestion}
            setTutorQuestion={setTutorQuestion}
            tutorMessages={lessonTutorMessages}
            tutorLoading={tutorLoading}
            tutorError={tutorError}
            onAskTutor={onAskTutor}
            onStartQuest={onStartQuest}
            questGenerationState={questGenerationState}
            activeLessonPassed={activeLessonPassed}
          />

          <SelectedTextToolbar
            selectedText={selectedText}
            onCopy={copySelectedText}
            onAskTutor={askTutorAboutSelection}
            onClear={() => setSelectedText("")}
          />

          <CheckpointFireworks show={showFireworks} />
        </div>
      </section>
    </main>
  );
}


function LessonValidationBadge({ lesson }: { lesson: LearningLessonDto }) {
  const quality = lesson.quality_score;
  const evidenceCount = lesson.evidence_map?.length ?? 0;
  const passed = quality?.passed ?? evidenceCount > 0;

  return (
    <div className={passed ? "mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-cyber-green/25 bg-cyber-green/[0.045] p-4 text-sm text-cyber-green" : "mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-warning-amber/30 bg-warning-amber/10 p-4 text-sm text-warning-amber"}>
      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
      <span className="font-black">{passed ? "Validated lesson" : "Validation needs review"}</span>
      <span className="text-white/52">
        {evidenceCount} source-pack evidence link{evidenceCount === 1 ? "" : "s"}
        {quality ? ` · depth ${quality.technical_depth}% · checkpoint ${quality.checkpoint_quality}%` : ""}
      </span>
    </div>
  );
}

function CodeSampleLab({
  lessonId,
  code,
  onAskTutor,
}: {
  lessonId: string;
  code: string;
  onAskTutor: (question: string) => void;
}) {
  const [draft, setDraft] = useState(code);

  useEffect(() => {
    setDraft(code);
  }, [code, lessonId]);

  function copyCode() {
    void navigator.clipboard?.writeText(draft);
  }

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-electric-blue/25 bg-[#020b0a]">
      <div className="flex flex-col gap-3 border-b border-white/[0.06] bg-white/[0.035] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-electric-blue" aria-hidden="true" />
          <span className="font-mono text-[11px] font-black uppercase tracking-[0.16em] text-white/45">Interactive code sample</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copyCode} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-xs font-black text-white/65 transition hover:border-electric-blue/35 hover:text-electric-blue">
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Copy
          </button>
          <button type="button" onClick={() => setDraft(code)} className="h-9 rounded-lg border border-white/[0.08] px-3 text-xs font-black text-white/65 transition hover:border-electric-blue/35 hover:text-electric-blue">
            Reset
          </button>
          <button
            type="button"
            onClick={() => onAskTutor(`Walk me through this code sample line by line, explain the trust boundary, and suggest one safe edit I can try:\n\n${draft}`)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-electric-blue px-3 text-xs font-black text-black transition hover:brightness-110"
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            Ask Tutor
          </button>
        </div>
      </div>
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        spellCheck={false}
        className="min-h-[220px] w-full resize-y bg-[#020b0a] p-5 font-mono text-[13px] leading-6 text-white/78 outline-none scrollbar-none"
      />
      <p className="border-t border-white/[0.06] px-4 py-3 text-xs leading-5 text-white/42">
        Edit locally to test your mental model. This is a learning scratchpad; changes are not submitted until you generate a workbench quest.
      </p>
    </section>
  );
}

function LessonBottomNavigation({
  previousLesson,
  nextLesson,
  nextPending,
  canOpenNextLesson,
  activeLessonPassed,
  onPrevious,
  onNext,
  onStartQuest,
  questGenerationState,
}: {
  previousLesson: LearningLessonDto | null;
  nextLesson: LearningLessonDto | null;
  nextPending: boolean;
  canOpenNextLesson: boolean;
  activeLessonPassed: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onStartQuest: () => void;
  questGenerationState: "idle" | "loading";
}) {
  return (
    <nav className="mt-6 grid gap-3 rounded-2xl border border-white/[0.07] bg-[#071410] p-4 sm:grid-cols-3" aria-label="Lesson module navigation">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!previousLesson}
        className="rounded-xl border border-white/[0.07] bg-[#020b0a] px-4 py-4 text-left transition hover:border-electric-blue/30 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <span className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-white/38">Previous module</span>
        <span className="mt-2 line-clamp-1 block text-sm font-black text-white">{previousLesson?.title ?? "No previous module"}</span>
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={!canOpenNextLesson}
        className="rounded-xl border border-electric-blue/25 bg-electric-blue/[0.045] px-4 py-4 text-left transition hover:border-electric-blue/55 disabled:cursor-not-allowed disabled:border-white/[0.07] disabled:bg-[#020b0a] disabled:opacity-55"
      >
        <span className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-electric-blue">Next module</span>
        <span className="mt-2 line-clamp-1 block text-sm font-black text-white">
          {nextLesson ? nextLesson.title : nextPending ? "Still generating" : "End of course"}
        </span>
        {!activeLessonPassed && nextLesson ? <span className="mt-1 block text-xs text-warning-amber">Pass this checkpoint to unlock it.</span> : null}
      </button>

      <button
        type="button"
        onClick={onStartQuest}
        disabled={!activeLessonPassed || questGenerationState === "loading"}
        className="rounded-xl bg-electric-blue px-4 py-4 text-left text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:brightness-50"
      >
        <span className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-black/55">After checkpoint</span>
        <span className="mt-2 flex items-center gap-2 text-sm font-black">
          {questGenerationState === "loading" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Zap className="h-4 w-4 fill-black" aria-hidden="true" />}
          Generate Quest
        </span>
      </button>
    </nav>
  );
}

function TutorFloatingDock({
  open,
  setOpen,
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
  open: boolean;
  setOpen: (open: boolean) => void;
  tutorQuestion: string;
  setTutorQuestion: (value: string) => void;
  tutorMessages: TutorMessage[];
  tutorLoading: boolean;
  tutorError: string | null;
  onAskTutor: (questionOverride?: string) => Promise<void>;
  onStartQuest: () => void;
  questGenerationState: "idle" | "loading";
  activeLessonPassed: boolean;
}) {
  return (
    <>
      <div className="fixed bottom-4 right-4 z-[85] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-electric-blue/35 bg-[#071410] px-5 text-sm font-black text-electric-blue shadow-[0_18px_50px_rgba(0,0,0,0.45)] transition hover:bg-electric-blue hover:text-black"
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Ask QuestVibe Tutor
        </button>
        <button
          type="button"
          onClick={onStartQuest}
          disabled={!activeLessonPassed || questGenerationState === "loading"}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-electric-blue px-5 text-sm font-black text-black shadow-[0_18px_50px_rgba(0,240,255,0.16)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:brightness-50"
        >
          {questGenerationState === "loading" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Zap className="h-4 w-4 fill-black" aria-hidden="true" />}
          Generate Quest
        </button>
      </div>

      {open ? (
        <aside className="fixed bottom-20 right-4 top-24 z-[84] flex w-[min(calc(100vw-2rem),440px)] flex-col overflow-hidden rounded-2xl border border-electric-blue/25 bg-[#071410] text-white shadow-[0_24px_90px_rgba(0,0,0,0.62)]">
          <header className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
            <div className="flex items-center gap-2 font-mono text-[11px] font-black uppercase tracking-[0.16em] text-electric-blue">
              <Brain className="h-4 w-4" aria-hidden="true" />
              QuestVibe Tutor
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-white/45 transition hover:bg-white/5 hover:text-white" aria-label="Close tutor">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-none">
            {tutorMessages.length === 0 ? (
              <p className="rounded-xl border border-white/[0.06] bg-[#020b0a] p-4 text-sm leading-6 text-white/52">
                Ask about the lesson, checkpoint, generated code lens, or highlight text in the lesson and send it here.
              </p>
            ) : (
              tutorMessages.map((message) => (
                <div key={message.id} className={message.role === "mentor" ? "rounded-xl border border-electric-blue/25 bg-electric-blue/10 p-3" : "rounded-xl border border-white/[0.06] bg-[#020b0a] p-3"}>
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
          <footer className="border-t border-white/[0.07] p-3">
            <textarea
              value={tutorQuestion}
              onChange={(event) => setTutorQuestion(event.target.value)}
              rows={3}
              placeholder="Ask a specific question about this lesson..."
              className="min-h-[88px] w-full resize-none rounded-xl border border-white/[0.07] bg-[#020b0a] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/30 focus:border-electric-blue/35"
            />
            <button
              type="button"
              onClick={() => void onAskTutor()}
              disabled={tutorLoading || tutorQuestion.trim().length === 0}
              className="mt-3 h-11 w-full rounded-xl bg-electric-blue text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {tutorLoading ? "Asking..." : "Ask Tutor"}
            </button>
            {tutorError ? <p className="mt-3 text-xs leading-5 text-red-300">{tutorError}</p> : null}
          </footer>
        </aside>
      ) : null}
    </>
  );
}

function SelectedTextToolbar({
  selectedText,
  onCopy,
  onAskTutor,
  onClear,
}: {
  selectedText: string;
  onCopy: () => void;
  onAskTutor: () => void;
  onClear: () => void;
}) {
  if (!selectedText) return null;
  return (
    <div className="fixed bottom-32 right-4 z-[86] w-[min(calc(100vw-2rem),420px)] rounded-2xl border border-electric-blue/30 bg-[#071410] p-3 text-white shadow-[0_24px_80px_rgba(0,0,0,0.58)]">
      <p className="line-clamp-2 text-xs leading-5 text-white/55">“{selectedText}”</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onCopy} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-[#020b0a] px-3 text-xs font-black text-white/72 transition hover:border-electric-blue/35 hover:text-electric-blue">
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          Copy
        </button>
        <button type="button" onClick={onAskTutor} className="inline-flex h-9 items-center gap-2 rounded-lg bg-electric-blue px-3 text-xs font-black text-black transition hover:brightness-110">
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          Ask QuestVibe Tutor
        </button>
        <button type="button" onClick={onClear} className="h-9 rounded-lg px-3 text-xs font-black text-white/42 transition hover:text-white">
          Clear
        </button>
      </div>
    </div>
  );
}

function CheckpointFireworks({ show }: { show: boolean }) {
  if (!show) return null;
  const sparks = Array.from({ length: 22 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 22;
    const radius = index % 2 === 0 ? 150 : 95;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const color = index % 3 === 0 ? "#39ff88" : index % 3 === 1 ? "#00f0ff" : "#ffb800";
    return (
      <span
        key={index}
        className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full animate-vq-firework"
        style={{
          "--vq-firework-x": `${x}px`,
          "--vq-firework-y": `${y}px`,
          backgroundColor: color,
          boxShadow: `0 0 18px ${color}`,
          animationDelay: `${index * 18}ms`,
        } as React.CSSProperties}
      />
    );
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-[95] flex items-center justify-center bg-[#00110d]/15">
      <div className="relative h-[340px] w-[340px]">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-electric-blue/45 bg-electric-blue/15 px-5 py-3 text-center font-mono text-xs font-black uppercase tracking-[0.16em] text-electric-blue shadow-[0_0_50px_rgba(0,240,255,0.25)]">
          Checkpoint passed
        </div>
        {sparks}
      </div>
    </div>
  );
}

function splitLessonContent(explanation: string) {
  const match = explanation.match(/([\s\S]*?)\n\nCode lens:\n([\s\S]*)$/);
  if (!match) {
    return { body: explanation, codeLens: "" };
  }
  return {
    body: match[1].trim(),
    codeLens: match[2].trim(),
  };
}

function shouldShowCodeLens(codeLens: string): boolean {
  const trimmed = codeLens.trim();
  if (trimmed.length < 18) return false;
  return /[{}`;=()]|function|const|let|struct|impl|verify|validate|assert|expect|return/i.test(trimmed);
}

function criticalLearningResources(
  resources: LearningModuleDto["resources"],
  lesson: LearningLessonDto,
  ecosystemId: EcosystemId,
) {
  const filtered = resources.filter((resource) => resourceMatchesLesson(resource, lesson, ecosystemId));
  return (filtered.length > 0 ? filtered : resources.slice(0, ecosystemId === "basics" ? 2 : 1)).slice(0, 3);
}

function resourceMatchesLesson(
  resource: LearningModuleDto["resources"][number],
  lesson: LearningLessonDto,
  ecosystemId: EcosystemId,
) {
  const haystack = `${lesson.title} ${lesson.why_it_matters} ${lesson.explanation} ${lesson.concepts.join(" ")}`.toLowerCase();
  const resourceText = `${resource.title} ${resource.url} ${resource.reason}`.toLowerCase();
  if (ecosystemId === "zcash") return /zcash|zip-?321|shielded|orchard|sapling|memo|viewing/.test(resourceText);
  if (ecosystemId === "fiber") return /fiber|ptlc|payment channel|invoice|nervos/.test(resourceText);
  if (ecosystemId === "ckb") return /ckb|nervos|cell|script|witness/.test(resourceText);
  if (ecosystemId === "basics") return /web3|blockchain|ethereum|bitcoin|wallet|signature|transaction|consensus/.test(resourceText);
  return resource.title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 4)
    .some((term) => haystack.includes(term));
}

function highlightedTutorQuestion(selectedText: string): string {
  return `Explain this highlighted lesson passage in detail, connect it to the current checkpoint, and give one concrete denial-test habit:\n\n"${selectedText}"`;
}

function clampUiText(value: string, maxChars: number): string {
  return value.length <= maxChars ? value : `${value.slice(0, maxChars).trim()}...`;
}

function accountSummaryFromSession(session: { user?: { id?: string | null; name?: string | null; email?: string | null } } | null): AccountSummary | null {
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
  };
}

function WorkbenchView({
  moduleState,
  questState,
  setQuestState,
  onOpenLearn,
  onVerifyWorkspace,
  onSubmitRunner,
  onRefreshRunner,
  runnerSubmitting,
}: {
  moduleState: ModuleState | null;
  questState: QuestState | null;
  setQuestState: (state: QuestState) => void;
  onOpenLearn: () => void;
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
          <button type="button" onClick={onOpenLearn} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-electric-blue px-5 text-sm font-black uppercase tracking-wider text-black transition-all hover:brightness-110">
            Open Learn
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

function Panel({ title, icon, action, onAction, children }: { title: string; icon: ReactNode; action?: string; onAction?: () => void; children: ReactNode }) {
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-glass-border bg-[#0B0C0E] p-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function Notice({ tone, text }: { tone: "amber" | "red"; text: string }) {
  const classes = tone === "amber" ? "border-warning-amber/30 bg-warning-amber/10 text-warning-amber" : "border-red-500/30 bg-red-500/10 text-red-300";
  return <div className={`mt-3 rounded-lg border p-3 text-xs leading-relaxed ${classes}`}>{text}</div>;
}

function ExplainerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-glass-border bg-[#0B0C0E] p-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-electric-blue">{label}</p>
      <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{value}</p>
    </div>
  );
}


function currentAppRoute(pathOverride?: string | null): { tab: TabId; courseId: string | null; lessonId: string | null } {
  const rawPath = pathOverride ?? (typeof window === "undefined" ? "/" : window.location.pathname);
  const pathname = rawPath.replace(/\/+$/, "") || "/";
  const parts = pathname.split("/").filter(Boolean);

  if (pathname === "/") return { tab: "landing", courseId: null, lessonId: null };
  if (parts[0] === "dashboard") return { tab: "dashboard", courseId: null, lessonId: null };
  if (parts[0] === "workbench") return { tab: "workbench", courseId: null, lessonId: null };
  if (parts[0] === "courses" && parts[1]) {
    const lessonMarker = parts.indexOf("lessons");
    return {
      tab: "learn",
      courseId: decodeURIComponent(parts[1]),
      lessonId: lessonMarker >= 0 && parts[lessonMarker + 1] ? decodeURIComponent(parts[lessonMarker + 1]) : null,
    };
  }
  if (parts[0] === "learn") return { tab: "learn", courseId: null, lessonId: null };

  return { tab: "landing", courseId: null, lessonId: null };
}

function tabPath(tab: TabId): string {
  if (tab === "landing") return "/";
  return `/${tab}`;
}

function pushAppPath(path: string) {
  if (typeof window === "undefined") return;
  if (window.location.pathname === path) return;
  window.history.pushState({}, "", path);
}

function replaceAppPath(path: string) {
  if (typeof window === "undefined") return;
  if (window.location.pathname === path) return;
  window.history.replaceState({}, "", path);
}

function scrollLearningViewToTop() {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  });
}

function createCourseId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `course-${crypto.randomUUID()}`;
  }
  return `course-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function priorLearningLessonsForRequest(lessons: LearningLessonDto[]) {
  return lessons.slice(0, 4).map((lesson) => ({
    title: lesson.title,
    checkpoint_question: lesson.checkpoint.question,
    summary: lesson.explanation.slice(0, 1600),
    code_lens: lessonCodeLens(lesson.explanation).slice(0, 700),
  }));
}

function lessonCodeLens(explanation: string) {
  const marker = "Code lens:";
  const markerIndex = explanation.indexOf(marker);
  if (markerIndex < 0) return "";
  return explanation.slice(markerIndex + marker.length).trim();
}

function moduleFromGeneratedLesson(response: Awaited<ReturnType<typeof generateLearningLesson>>): LearningModuleDto {
  return {
    title: response.module_title,
    learner_profile: response.learner_profile,
    outcome: response.outcome,
    lessons: [response.lesson],
    capstone_quest_prompt: response.capstone_quest_prompt,
    resources: response.resources,
  };
}

function appendGeneratedLesson(
  moduleState: ModuleState,
  lesson: LearningLessonDto,
  warning: string | null,
): ModuleState {
  const lessons = [...moduleState.module.lessons.filter((item) => item.id !== lesson.id), lesson]
    .sort((a, b) => lessonOrder(a.id) - lessonOrder(b.id));
  return {
    ...moduleState,
    warning,
    module: {
      ...moduleState.module,
      lessons,
    },
    generationStatus: lessons.length >= moduleState.totalLessons ? "complete" : "generating",
  };
}

function lessonOrder(lessonId: string): number {
  const match = lessonId.match(/module-(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function upsertCourse(courses: LearningSessionRecord[], course: LearningSessionRecord): LearningSessionRecord[] {
  return [course, ...courses.filter((item) => item.module_id !== course.module_id)]
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
}

function courseProgress(course: LearningSessionRecord) {
  const total = course.module.lessons.length;
  const completed = completedLessonCount(course.module, course.checkpoint_answers ?? {});
  return { total, completed, percent: total ? Math.round((completed / total) * 100) : 0 };
}



function relativeActivityTime(value: string | null | undefined): string {
  if (!value) return "Saved activity";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved activity";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "Just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function courseLibraryStreak(courses: LearningSessionRecord[]) {
  const daySet = new Set<string>();
  for (const course of courses) {
    const updated = dateKey(course.updated_at);
    const created = dateKey(course.created_at);
    if (updated) daySet.add(updated);
    if (created) daySet.add(created);
  }

  const today = startOfLocalDay(new Date());
  let current = 0;
  for (let offset = 0; offset < 365; offset += 1) {
    const key = dateKeyFromDate(addDays(today, -offset));
    if (!daySet.has(key)) break;
    current += 1;
  }

  const sorted = [...daySet].sort();
  let longest = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const key of sorted) {
    const date = new Date(`${key}T00:00:00`);
    if (previous && date.getTime() - previous.getTime() === 86_400_000) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    previous = date;
  }

  return { current, longest };
}

function dateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return dateKeyFromDate(date);
}

function dateKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function courseLibraryProgress(courses: LearningSessionRecord[]) {
  return courses.reduce(
    (acc, course) => {
      const progress = courseProgress(course);
      return {
        totalGenerated: acc.totalGenerated + progress.total,
        totalCompleted: acc.totalCompleted + progress.completed,
      };
    },
    { totalGenerated: 0, totalCompleted: 0 },
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
  return ECOSYSTEMS.find((item) => item.id === id) ?? ECOSYSTEMS.find((item) => item.id === "zcash") ?? ECOSYSTEMS[0];
}

function asEcosystemId(value: string | null | undefined): EcosystemId | null {
  return value === "basics" || value === "ckb" || value === "fiber" || value === "zcash" ? value : null;
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
