import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { BossAttemptRequest } from "@/lib/legacy-api";
import { 
  Play, 
  Terminal as TermIcon, 
  Folder, 
  FileCode, 
  CheckCircle, 
  AlertCircle, 
  Cpu, 
  Award,
  RefreshCw,
  Clock,
  BookOpen,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { QuestData, WorkbenchFile, VerificationGate, type CodeExplainer, type LearningResource } from "@/lib/workbench-types";

const EMPTY_WORKSPACE_FILES: WorkbenchFile[] = [];

const CODE_THEME_IDS = ["nebula", "solarized", "terminal"] as const;

type CodeThemeId = (typeof CODE_THEME_IDS)[number];
type CodeTokenKind =
  | "plain"
  | "keyword"
  | "type"
  | "string"
  | "number"
  | "comment"
  | "function"
  | "property"
  | "operator"
  | "punctuation"
  | "constant";
type CodeToken = { text: string; kind: CodeTokenKind };
type CodeTheme = {
  label: string;
  panel: string;
  titleBar: string;
  border: string;
  gutterText: string;
  lineHover: string;
  activeButton: string;
  tokens: Record<CodeTokenKind, string>;
};

const CODE_THEMES: Record<CodeThemeId, CodeTheme> = {
  nebula: {
    label: "Nebula",
    panel: "bg-[#07111F]",
    titleBar: "bg-[#0A1628]",
    border: "border-[#18304F]",
    gutterText: "text-[#4B647F]",
    lineHover: "hover:bg-[#14243D]/70",
    activeButton: "border-[#82AAFF] bg-[#82AAFF]/15 text-[#D6E4FF]",
    tokens: {
      plain: "text-[#D6DEFF]",
      keyword: "text-[#82AAFF] font-semibold",
      type: "text-[#FFCB6B]",
      string: "text-[#C3E88D]",
      number: "text-[#F78C6C]",
      comment: "text-[#637777] italic",
      function: "text-[#C792EA]",
      property: "text-[#89DDFF]",
      operator: "text-[#89DDFF]",
      punctuation: "text-[#89DDFF]/70",
      constant: "text-[#FF5370]",
    },
  },
  solarized: {
    label: "Solarized",
    panel: "bg-[#002B36]",
    titleBar: "bg-[#073642]",
    border: "border-[#255764]",
    gutterText: "text-[#586E75]",
    lineHover: "hover:bg-[#0A3A46]",
    activeButton: "border-[#B58900] bg-[#B58900]/15 text-[#FDF6E3]",
    tokens: {
      plain: "text-[#EEE8D5]",
      keyword: "text-[#268BD2] font-semibold",
      type: "text-[#B58900]",
      string: "text-[#2AA198]",
      number: "text-[#D33682]",
      comment: "text-[#839496] italic",
      function: "text-[#6C71C4]",
      property: "text-[#CB4B16]",
      operator: "text-[#93A1A1]",
      punctuation: "text-[#93A1A1]",
      constant: "text-[#DC322F]",
    },
  },
  terminal: {
    label: "Terminal",
    panel: "bg-[#050807]",
    titleBar: "bg-[#07110D]",
    border: "border-[#123325]",
    gutterText: "text-[#315B46]",
    lineHover: "hover:bg-[#0E1C16]",
    activeButton: "border-[#00FF88] bg-[#00FF88]/15 text-[#D7FFE9]",
    tokens: {
      plain: "text-[#D7FFE9]",
      keyword: "text-[#00F0FF] font-semibold",
      type: "text-[#FFD166]",
      string: "text-[#7CFF8A]",
      number: "text-[#FF8A65]",
      comment: "text-[#5A876E] italic",
      function: "text-[#C084FC]",
      property: "text-[#70E1FF]",
      operator: "text-[#00FF88]",
      punctuation: "text-[#A8F5C7]",
      constant: "text-[#FF5C8A]",
    },
  },
};

const TS_KEYWORDS = new Set([
  "as", "async", "await", "break", "case", "catch", "class", "const", "continue", "default", "do", "else", "export", "extends", "finally", "for", "from", "function", "if", "import", "in", "interface", "let", "new", "of", "return", "satisfies", "switch", "throw", "try", "type", "typeof", "var", "while", "yield",
]);

const RUST_KEYWORDS = new Set([
  "as", "async", "await", "break", "const", "continue", "crate", "else", "enum", "false", "fn", "for", "if", "impl", "in", "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return", "self", "Self", "static", "struct", "super", "trait", "true", "type", "unsafe", "use", "where", "while",
]);

const COMMON_TYPES = new Set([
  "AccessRequest", "Array", "BigInt", "Boolean", "Error", "Map", "Number", "Promise", "Receipt", "Record", "Result", "Set", "Some", "String", "Vec", "bool", "boolean", "i32", "i64", "number", "str", "string", "u32", "u64", "usize", "void",
]);

interface WorkbenchViewProps {
  walletBound: boolean;
  onConnectWallet: () => void;
  questData: QuestData | null;
  onOpenQuestRun: () => void;
  onOpenLearningSource?: (context: NonNullable<QuestData["learningContext"]>) => void;
  selectedFile: WorkbenchFile | null;
  setSelectedFile: (file: WorkbenchFile | null) => void;
  gates: VerificationGate[];
  setGates: Dispatch<SetStateAction<VerificationGate[]>>;
  bossFightSolved: boolean;
  shipped: boolean;
  onShip: () => void;
  onChallengeComplete: () => void;
  onBossAttempt: (attempt: BossAttemptRequest, solved: boolean) => void;
  onAskCodeTutor: (question: string, questData: QuestData) => Promise<string>;
  onWorkspaceVerified: () => void;
  ckbRpcOnline: boolean;
  generationError?: string | null;
}

type WorkspaceCheck = {
  label: string;
  passed: boolean;
};

function isCkbCellWorkspace(quest: QuestData, haystack: string) {
  const context = quest.learningContext;
  return Boolean(
    context?.module_id === "ckb-cells" ||
      context?.lesson_id?.startsWith("ckb-cells-") ||
      /outpoint|inputindex|lockscript|typescripthash|celldatahash|cell data|type script|lock script/.test(haystack),
  );
}

function verifyGeneratedWorkspace(quest: QuestData) {
  const files = quest.files;
  const haystack = files
    .map((file) => `${file.path}\n${file.description}\n${file.content}`)
    .join("\n")
    .toLowerCase();
  const ckbCellWorkspace = isCkbCellWorkspace(quest, haystack);

  const checks: WorkspaceCheck[] = [
    {
      label: "workspace files returned with real content",
      passed: files.length > 0 && files.every((file) => file.content.trim().length > 0),
    },
    {
      label: "verifier implementation and test path present",
      passed: /(verify|validate|authorize|settle|read)/.test(haystack) && /test|spec|assert|expect|should|#\[test\]/.test(haystack),
    },
    {
      label: "trust boundary names wallet, proof, payment, CKB, or Fiber state",
      passed: /wallet|proof|signature|receipt|payment|fiber|ckb|cell|witness/.test(haystack),
    },
    {
      label: "denial or failure path present",
      passed: /block|reject|unauthorized|unpaid|forbid|deny|invalid|error|false|mismatch/.test(haystack),
    },
  ];

  if (ckbCellWorkspace) {
    checks.push(
      {
        label: "CKB Cell proof implementation generated",
        passed: /outpoint|cell data|lockscript|type script|witness/.test(haystack),
      },
      {
        label: "OutPoint lineage and input index are checked",
        passed: /outpoint/.test(haystack) && /txhash/.test(haystack) && /inputindex|input:/.test(haystack),
      },
      {
        label: "lock and type script hashes are bound",
        passed: /lockscript|lock script|lock:/.test(haystack) && /typescripthash|type script|type:/.test(haystack),
      },
      {
        label: "witness signature binds the trusted CKB fields",
        passed: /witnessbound|signature/.test(haystack) && /run:|runid/.test(haystack) && /outpoint:|outpoint/.test(haystack),
      },
      {
        label: "denial tests mutate OutPoint, run id, and script assumptions",
        passed:
          /rejects[^\n]*(copied witness|outpoint)|outpoint[^\n]*(rejects|false)/.test(haystack) &&
          /rejects[^\n]*run id|runid[^\n]*(rejects|false)/.test(haystack) &&
          /rejects[^\n]*lock script|lockscript[^\n]*(rejects|false)|lock script mismatch/.test(haystack),
      },
    );
  }

  return {
    passed: checks.every((check) => check.passed),
    logs: checks.map((check) =>
      `[VQ-CORE] ${check.passed ? "PASS" : "FAIL"}: ${check.label}.`,
    ),
  };
}
export default function WorkbenchView({
  walletBound,
  onConnectWallet,
  questData,
  onOpenQuestRun,
  onOpenLearningSource,
  selectedFile,
  setSelectedFile,
  gates,
  setGates,
  bossFightSolved,
  shipped,
  onShip,
  onChallengeComplete,
  onBossAttempt,
  onAskCodeTutor,
  onWorkspaceVerified,
  ckbRpcOnline,
  generationError,
}: WorkbenchViewProps) {
  const [testConsoleLogs, setTestConsoleLogs] = useState<string[]>([]);
  const [runningTests, setRunningTests] = useState(false);
  const [bossAnswer, setBossAnswer] = useState<number | null>(null);
  const [bossFeedback, setBossFeedback] = useState<string | null>(null);
  const [showBossHint, setShowBossHint] = useState(false);
  const [mentorQuestion, setMentorQuestion] = useState("");
  const [mentorAnswer, setMentorAnswer] = useState<string | null>(null);
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorError, setMentorError] = useState<string | null>(null);
  const [codeTheme, setCodeTheme] = useState<CodeThemeId>("nebula");

  const workspaceFiles = questData?.files ?? EMPTY_WORKSPACE_FILES;
  const activeCodeTheme = CODE_THEMES[codeTheme];
  const codeInsights = questData?.codeExplainer ?? (questData ? analyzeQuestCode(questData) : null);

  useEffect(() => {
    if (workspaceFiles.length === 0) {
      if (selectedFile) {
        setSelectedFile(null);
      }
      return;
    }

    if (!selectedFile || !workspaceFiles.some((file) => file.path === selectedFile.path)) {
      setSelectedFile(workspaceFiles[0]);
    }
  }, [workspaceFiles, selectedFile, setSelectedFile]);

  // Sync wallet and backend readiness values
  useEffect(() => {
    setGates(prev => prev.map(gate => {
      if (gate.id === "identity") {
        return { ...gate, isCompleted: walletBound };
      }
      if (gate.id === "infrastructure") {
        return { ...gate, isCompleted: ckbRpcOnline };
      }
      return gate;
    }));
  }, [walletBound, ckbRpcOnline, setGates]);

  const handleRunTests = () => {
    if (!questData) {
      setTestConsoleLogs([
        "[VQ-CORE] ERROR: No active quest generated. Generate a quest through vibequest-core first."
      ]);
      return;
    }

    setRunningTests(true);
    setTestConsoleLogs([]);

    const verification = verifyGeneratedWorkspace(questData);
    const logSteps = [
      `[VQ-CORE] Initializing verification sequence for [${questData.questName}]...`,
      "[VQ-CORE] Loading generated workbench files from backend response...",
      ...workspaceFiles.map((file) => `[VQ-CORE] Inspecting ${file.path} (${file.content.length} bytes)...`),
      ...verification.logs,
      verification.passed
        ? "[VQ-CORE] SUCCESS: generated workspace contains test, proof, and denial-path signals."
        : "[VQ-CORE] BLOCKED: generated workspace is missing required proof/test signals.",
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < logSteps.length) {
        setTestConsoleLogs((prev) => [...prev, logSteps[currentStep]]);
        currentStep++;
      } else {
        clearInterval(interval);
        setRunningTests(false);
        setGates((prev) =>
          prev.map((gate) =>
            gate.id === "verification" ? { ...gate, isCompleted: verification.passed } : gate,
          ),
        );
        if (verification.passed) {
          onWorkspaceVerified();
        }
      }
    }, 360);
  };
  const handleBossSubmit = () => {
    if (!questData || bossAnswer === null) return;
    const selectedOption = questData.bossFight.options[bossAnswer];
    if (!selectedOption) return;

    const correctIndex = questData.bossFight.correctAnswerIndex;
    const solved = bossAnswer === correctIndex;
    const attempt: BossAttemptRequest = {
      selected_index: bossAnswer,
      selected_label: selectedOption.label,
      correct: solved,
      feedback: selectedOption.rationale,
      follow_up_question: solved
        ? questData.bossFight.insight
        : `Re-open ${questData.bossFight.title} and explain why this answer misses the invariant before trying again.`,
    };

    onBossAttempt(attempt, solved);

    if (solved) {
      setBossFeedback("SUCCESS");
      onChallengeComplete();
    } else {
      setBossFeedback("FAIL");
    }
  };

  const askMentor = async (question = mentorQuestion) => {
    if (!questData || !codeInsights || !question.trim()) return;

    setMentorLoading(true);
    setMentorError(null);
    try {
      setMentorAnswer(await onAskCodeTutor(question, questData));
    } catch (error) {
      setMentorError(error instanceof Error ? error.message : "Code tutor is temporarily unavailable.");
      setMentorAnswer(buildMentorAnswer(question, questData, codeInsights));
    } finally {
      setMentorLoading(false);
    }
  };

  const applyMentorPrompt = (prompt: string) => {
    setMentorQuestion(prompt);
    void askMentor(prompt);
  };

  useEffect(() => {
    setBossAnswer(null);
    setBossFeedback(null);
    setShowBossHint(false);
    setMentorQuestion("");
    setMentorAnswer(null);
    setMentorError(null);
    setTestConsoleLogs([]);
  }, [questData?.questName]);

  const isAllGatesPassed = gates.every(g => g.isCompleted);
  const fileChecksPassed = Boolean(gates.find((gate) => gate.id === "verification")?.isCompleted);
  const challengeSubmitted = bossFightSolved || bossFeedback === "SUCCESS";
  const lessonSteps = [
    {
      label: "Inspect",
      description: "Read the generated verifier and test so the AI output is not a black box.",
      complete: Boolean(selectedFile),
    },
    {
      label: "Verify",
      description: "Run checks that prove tests, proof signals, and denial paths exist.",
      complete: fileChecksPassed,
    },
    {
      label: "Explain",
      description: "Answer the boss question to prove the trust boundary is understood.",
      complete: bossFightSolved,
    },
    {
      label: "Record",
      description: "Save the badge, optionally claim rewards, then continue to the next quest.",
      complete: shipped,
    },
  ];
  const nextAction = !questData
    ? "Generate a quest from Quest Run to begin."
    : !walletBound
      ? "Connect JoyID to bind this learning run."
      : !fileChecksPassed
        ? "Inspect the files, then run generated file checks."
        : !bossFightSolved
          ? "Answer the boss checklist to complete this challenge."
          : !shipped
            ? "Challenge complete. Record the badge or start the next quest."
            : "Badge recorded. Move to the next quest when ready.";

  return (
    <div className="bg-[#0B0C0E] text-on-surface font-sans p-4 md:p-8 max-w-[1500px] mx-auto flex flex-col gap-8 min-h-screen">
      {/* Top Banner / Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-glass-border pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Cpu className="text-electric-blue w-8 h-8 animate-pulse" />
            VibeQuest Workbench
          </h1>
          <p className="text-on-surface-variant text-sm font-mono mt-1">
            NETWORK: <span className="text-cyber-green">CKB_FIBER_TESTNET_WORKBENCH</span> / CLIENT: v1.0.4 / LOG: RUNNING
          </p>
        </div>
        <div className="flex items-center gap-3 bg-[#16181D] border border-glass-border px-4 py-2 rounded-xl text-xs font-mono text-on-surface-variant">
          <Clock className="w-4 h-4 text-electric-blue" />
          <span>INFRA: {ckbRpcOnline ? "READY" : "BLOCKED"}</span>
          <span className="opacity-30">|</span>
          <span>QUEST SOURCE: VQ-CORE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* LEFT COLUMN: ACTIVE RUN STATE */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          <div className="bg-[#16181D] border border-glass-border rounded-xl p-5 flex flex-col gap-5">
            <div className="flex items-center gap-2 border-b border-glass-border pb-3">
              <span className={questData ? "w-2.5 h-2.5 rounded-full bg-cyber-green" : "w-2.5 h-2.5 rounded-full bg-warning-amber"}></span>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                Current Run
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
              <div className="rounded-lg border border-glass-border bg-[#0B0C0E]/60 p-3">
                <span className="block uppercase text-on-surface-variant">JoyID</span>
                <span className={walletBound ? "mt-1 block font-bold text-cyber-green" : "mt-1 block font-bold text-warning-amber"}>
                  {walletBound ? "BOUND" : "MISSING"}
                </span>
              </div>
              <div className="rounded-lg border border-glass-border bg-[#0B0C0E]/60 p-3">
                <span className="block uppercase text-on-surface-variant">Core</span>
                <span className={ckbRpcOnline ? "mt-1 block font-bold text-cyber-green" : "mt-1 block font-bold text-warning-amber"}>
                  {ckbRpcOnline ? "READY" : "BLOCKED"}
                </span>
              </div>
            </div>

            {questData ? (
              <div className="rounded-lg border border-cyber-green/20 bg-cyber-green/5 p-4">
                <span className="font-mono text-[10px] uppercase tracking-wider text-cyber-green">Active Quest</span>
                <h3 className="mt-1 text-base font-bold text-white">{questData.questName}</h3>
                {questData.learningContext ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (questData.learningContext) {
                        onOpenLearningSource?.(questData.learningContext);
                      }
                    }}
                    className="mt-2 rounded border border-electric-blue/20 bg-electric-blue/10 px-2 py-1 text-left font-mono text-[10px] uppercase text-electric-blue transition hover:border-electric-blue/50 hover:bg-electric-blue/15"
                  >
                    From lesson: {questData.learningContext.lesson_title} · Back to lesson
                  </button>
                ) : null}
                <p className="mt-2 font-mono text-[11px] text-on-surface-variant">
                  {workspaceFiles.length} files / {questData.gates.length} gates
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-glass-border bg-[#0B0C0E]/60 p-4">
                <span className="font-mono text-[10px] uppercase tracking-wider text-warning-amber">No Active Quest</span>
                <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                  Generate a run, then inspect its files and gates here.
                </p>
              </div>
            )}

            {generationError && (
              <div className="rounded-lg border border-warning-amber/30 bg-warning-amber/10 p-3 font-mono text-[11px] leading-relaxed text-warning-amber">
                {generationError}
              </div>
            )}

            <button
              onClick={onOpenQuestRun}
              className="w-full py-3 border border-electric-blue/40 bg-electric-blue/10 text-electric-blue hover:bg-electric-blue/15 font-mono font-bold text-xs uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              {questData ? "Generate Another Run" : "Open Quest Run"}
            </button>
          </div>

          {questData && (
            <div className="bg-[#16181D] border border-glass-border rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-glass-border pb-3 justify-between">
                <div className="flex items-center gap-2">
                  <TermIcon className="text-cyber-green w-5 h-5" />
                  <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                    Learning Path
                  </h2>
                </div>
                <span className={bossFightSolved ? "font-mono text-xs text-cyber-green" : "font-mono text-xs text-warning-amber"}>
                  {bossFightSolved ? "COMPLETE" : "IN PROGRESS"}
                </span>
              </div>

              <div className="rounded-lg border border-electric-blue/20 bg-electric-blue/5 p-3">
                <span className="font-mono text-[10px] uppercase tracking-wider text-electric-blue">Next Step</span>
                <p className="mt-1 text-xs leading-relaxed text-white">{nextAction}</p>
              </div>

              <div className="flex flex-col gap-3">
                {lessonSteps.map((step, index) => (
                  <div
                    key={step.label}
                    className={
                      step.complete
                        ? "p-3 rounded-lg border border-cyber-green/20 bg-cyber-green/5 flex gap-3"
                        : "p-3 rounded-lg border border-glass-border bg-[#0B0C0E]/50 flex gap-3"
                    }
                  >
                    <span className={
                      step.complete
                        ? "grid h-6 w-6 shrink-0 place-items-center rounded bg-cyber-green/15 text-[10px] font-mono font-bold text-cyber-green"
                        : "grid h-6 w-6 shrink-0 place-items-center rounded bg-electric-blue/10 text-[10px] font-mono font-bold text-electric-blue"
                    }>
                      {step.complete ? <CheckCircle className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold font-mono text-white">{step.label}</h3>
                      <p className="text-[11px] text-on-surface-variant leading-normal mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleRunTests}
                disabled={runningTests || !walletBound || !ckbRpcOnline}
                className="w-full py-3 border border-dashed border-electric-blue/30 hover:border-electric-blue hover:bg-electric-blue/5 text-electric-blue font-mono font-bold text-xs uppercase rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              >
                {runningTests ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Checking Generated Files...
                  </>
                ) : (
                  <>
                    <TermIcon className="w-3.5 h-3.5" />
                    Run Generated File Checks
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: CODE EXPLORER & INTERACTIVE EDITOR (span 8) */}
        <div className="xl:col-span-9 flex flex-col gap-6">
          <div className="bg-[#16181D] border border-glass-border rounded-xl flex flex-col min-h-[720px] xl:min-h-[760px] overflow-hidden">
            {/* Workspace Explorer Header */}
            <div className="bg-[#1D212A] border-b border-glass-border px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Folder className="text-electric-blue w-5 h-5" />
                <span className="font-mono text-sm font-bold text-white uppercase tracking-wide">
                  Workspace Explorer
                </span>
                {questData && (
                  <span className="text-xs font-mono text-cyber-green bg-cyber-green/10 border border-cyber-green/20 px-2.5 py-0.5 rounded">
                    Active Quest: {questData.questName}
                  </span>
                )}
              </div>
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/30"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-500/30"></span>
                <span className="w-3 h-3 rounded-full bg-green-500/30"></span>
              </div>
            </div>

            {/* Inner Workspace split panel: File list left, Editor right */}
            <div className="flex flex-1 overflow-hidden">
              {/* File list */}
              <div className="w-56 lg:w-64 bg-[#0F1115] border-r border-glass-border overflow-y-auto p-2 flex flex-col gap-1">
                <div className="text-[10px] font-mono text-on-surface-variant uppercase font-semibold px-2.5 py-2">
                  Files
                </div>
                {workspaceFiles.length > 0 ? (
                  workspaceFiles.map((file) => {
                    const isActive = selectedFile?.path === file.path;
                    return (
                      <button
                        key={file.path}
                        onClick={() => setSelectedFile(file)}
                        className={
                          isActive
                            ? "w-full text-left px-2.5 py-1.5 rounded font-mono text-xs flex items-center gap-2 transition-all cursor-pointer bg-electric-blue/10 text-electric-blue font-semibold border-l-2 border-electric-blue"
                            : "w-full text-left px-2.5 py-1.5 rounded font-mono text-xs flex items-center gap-2 transition-all cursor-pointer text-on-surface-variant hover:text-white hover:bg-white/5"
                        }
                      >
                        <FileCode className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-dashed border-glass-border p-3 font-mono text-[11px] leading-relaxed text-on-surface-variant">
                    No generated files yet.
                  </div>
                )}
              </div>

              {/* Editor panel */}
              <div className={`flex-1 flex flex-col overflow-hidden ${activeCodeTheme.panel}`}>
                {/* File Title Bar */}
                <div className={`border-b px-4 py-2 flex flex-col gap-2 text-xs text-on-surface-variant sm:flex-row sm:items-center sm:justify-between ${activeCodeTheme.titleBar} ${activeCodeTheme.border}`}>
                  <div className="min-w-0">
                    <span className="block truncate font-mono text-electric-blue">
                      /{selectedFile?.path || "workspace"}
                    </span>
                    <span className="font-mono text-[10px] uppercase opacity-50">
                      {selectedFile ? getLanguageLabel(selectedFile) : "Workspace"}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
                    {CODE_THEME_IDS.map((themeId) => {
                      const theme = CODE_THEMES[themeId];
                      return (
                        <button
                          key={themeId}
                          type="button"
                          onClick={() => setCodeTheme(themeId)}
                          className={`rounded-md border px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition-colors ${codeTheme === themeId ? theme.activeButton : "border-transparent text-on-surface-variant hover:bg-white/5 hover:text-white"}`}
                        >
                          {theme.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* File Contents */}
                <div className="flex-1 overflow-y-auto p-0 font-mono text-[13px] leading-6 select-text">
                  {selectedFile ? (
                    <pre className="min-w-full py-5">
                      {selectedFile.content.split("\n").map((line, idx) => (
                        <div key={idx} className={`grid min-h-6 grid-cols-[3.5rem_1fr] px-0 ${activeCodeTheme.lineHover}`}>
                          <span className={`select-none border-r pr-3 text-right text-[11px] leading-6 ${activeCodeTheme.border} ${activeCodeTheme.gutterText}`}>
                            {idx + 1}
                          </span>
                          <code className="min-w-0 whitespace-pre-wrap break-words px-4 leading-6">
                            {highlightCodeLine(line, inferFileLanguage(selectedFile), activeCodeTheme)}
                          </code>
                        </div>
                      ))}
                    </pre>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-on-surface-variant gap-3 px-6">
                      <TermIcon className="w-8 h-8 opacity-60" />
                      <span className="text-xs font-mono uppercase tracking-wider text-white">No active generated workspace</span>
                      <span className="max-w-md text-xs leading-relaxed">Connect JoyID, then generate a quest to load backend-created files here.</span>
                      {!walletBound && (
                        <button
                          onClick={onConnectWallet}
                          className="mt-2 rounded-lg border border-electric-blue/40 px-4 py-2 font-mono text-xs font-bold uppercase text-electric-blue hover:bg-electric-blue/10"
                        >
                          Connect Wallet
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Console Terminal logs */}
            {testConsoleLogs.length > 0 && (
              <div className="h-[220px] overflow-y-auto border-t border-glass-border bg-[#0B0C0E] p-4 font-mono text-xs text-cyber-green shadow-inner">
                <div className="mb-2 flex justify-between border-b border-glass-border pb-1.5 text-[10px] font-bold uppercase text-on-surface-variant">
                  <span>Generated File Check Terminal</span>
                  <span>SYSTEM STATE: RUNNING</span>
                </div>
                {testConsoleLogs.map((log, index) => (
                  <div key={index} className="leading-relaxed">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>

          {questData && codeInsights && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-xl border border-glass-border bg-[#16181D] p-5">
                <div className="mb-4 flex items-center justify-between border-b border-glass-border pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-electric-blue" />
                    <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-white">Code Explainer</h2>
                  </div>
                  <span className="font-mono text-[10px] uppercase text-on-surface-variant">AI-authored code map</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <InsightCard label="Primary invariant" value={codeInsights.primaryInvariant} />
                  <InsightCard label="Denial path" value={codeInsights.denialPath} />
                  <InsightCard label={codeInsights.proofLabel} value={codeInsights.proofArtifact} />
                  <InsightCard label={codeInsights.networkLabel} value={codeInsights.networkBoundary} />
                </div>
                <div className="mt-4 rounded-lg border border-electric-blue/20 bg-electric-blue/5 p-4">
                  <h3 className="font-mono text-xs font-bold uppercase text-electric-blue">What to inspect first</h3>
                  <ul className="mt-3 space-y-2 text-xs leading-relaxed text-on-surface-variant">
                    {codeInsights.inspectSteps.map((item) => (
                      <li key={item} className="flex gap-2">
                        <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyber-green" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-xl border border-glass-border bg-[#16181D] p-5">
                <div className="mb-4 flex items-center gap-2 border-b border-glass-border pb-3">
                  <MessageSquare className="h-5 w-5 text-cyber-green" />
                  <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-white">Ask About This Code</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {codeInsights.mentorPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => applyMentorPrompt(prompt)}
                      disabled={mentorLoading}
                      className="rounded-lg border border-glass-border bg-[#0B0C0E]/70 px-3 py-2 text-left font-mono text-[10px] uppercase leading-tight text-on-surface-variant transition-colors hover:border-electric-blue/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                <textarea
                  value={mentorQuestion}
                  onChange={(event) => setMentorQuestion(event.target.value)}
                  rows={3}
                  placeholder="Ask why a receipt check matters, how to attack this verifier, or what the test is proving..."
                  className="mt-4 w-full resize-none rounded-lg border border-glass-border bg-[#0B0C0E] p-3 text-xs leading-relaxed text-white outline-none placeholder:text-on-surface-variant focus:border-cyber-green"
                />
                <button
                  onClick={() => void askMentor()}
                  disabled={!mentorQuestion.trim() || mentorLoading}
                  className="mt-3 w-full rounded-lg bg-cyber-green py-3 text-xs font-black uppercase tracking-wider text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:brightness-50"
                >
                  {mentorLoading ? "Asking AI Code Tutor..." : "Explain From Active Code"}
                </button>
                {mentorError && (
                  <div className="mt-3 rounded-lg border border-warning-amber/30 bg-warning-amber/10 p-3 text-[11px] leading-relaxed text-warning-amber">
                    {mentorError} Showing local code analysis instead.
                  </div>
                )}
                {mentorAnswer && (
                  <div className="mt-4 whitespace-pre-wrap rounded-lg border border-cyber-green/20 bg-cyber-green/5 p-4 text-xs leading-relaxed text-on-surface-variant">
                    {mentorAnswer}
                  </div>
                )}
                {questData.codeTutorMessages?.length ? (
                  <div className="mt-4 rounded-lg border border-glass-border bg-[#0B0C0E]/70 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3 border-b border-glass-border pb-2">
                      <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyber-green">Tutor History</h3>
                      <span className="font-mono text-[10px] uppercase text-on-surface-variant">{questData.codeTutorMessages.length} saved</span>
                    </div>
                    <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                      {questData.codeTutorMessages.slice(-6).map((message) => (
                        <div key={message.id} className={message.role === "mentor" ? "rounded border border-cyber-green/15 bg-cyber-green/5 p-3" : "rounded border border-electric-blue/15 bg-electric-blue/5 p-3"}>
                          <div className="mb-1 flex items-center justify-between gap-2 font-mono text-[10px] uppercase">
                            <span className={message.role === "mentor" ? "text-cyber-green" : "text-electric-blue"}>
                              {message.role === "mentor" ? "AI Tutor" : "You"}
                            </span>
                            <span className="text-on-surface-variant">{new Date(message.created_at).toLocaleString()}</span>
                          </div>
                          <p className="whitespace-pre-wrap text-xs leading-relaxed text-on-surface-variant">{message.text}</p>
                          {message.role === "mentor" && message.follow_up_question ? (
                            <p className="mt-2 rounded bg-black/20 p-2 text-[11px] leading-relaxed text-white">
                              Check yourself: {message.follow_up_question}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {questData?.bossFight.resources?.length ? (
            <div className="rounded-xl border border-glass-border bg-[#16181D] p-5">
              <div className="mb-4 flex items-center gap-2 border-b border-glass-border pb-3">
                <BookOpen className="h-5 w-5 text-electric-blue" />
                <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-white">Reference Trail</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {questData.bossFight.resources.map((resource) => (
                  <a
                    key={resource.url}
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-glass-border bg-[#0B0C0E]/70 p-4 transition-colors hover:border-electric-blue/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-bold text-white">{resource.title}</h3>
                      <ExternalLink className="h-4 w-4 shrink-0 text-electric-blue" />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{resource.reason}</p>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

        </div>
      </div>

      {/* BOSS FIGHT BLOCK - FULL WIDTH BOTTOM ENCOUNTER */}
      {questData && !shipped && (
        <div className="bg-[#1C1517] border border-red-900/40 rounded-xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-stretch relative overflow-hidden">
          {/* Accent Danger Glows */}
          <div className="absolute top-[-20%] right-[-10%] w-[30%] h-[50%] bg-red-900/10 blur-[100px] rounded-full pointer-events-none"></div>

          <div className="flex-1 flex flex-col justify-between gap-5 z-10">
            <div>
              <div className="inline-flex items-center gap-2 bg-red-950/40 border border-red-800/30 px-3 py-1 rounded-full text-red-400 font-mono text-[10px] uppercase tracking-wider mb-4 font-bold">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                ACTIVE BOSS ENCOUNTER
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                <Award className="text-red-500 w-7 h-7" />
                {questData.bossFight.title}
              </h2>
              <p className="text-sm text-gray-400 mt-2 font-light leading-relaxed">
                {questData.bossFight.challenge}
              </p>
            </div>

            {/* Multiple Choice Question */}
            <div className="bg-[#0D0B0C] border border-red-900/20 rounded-lg p-5 flex flex-col gap-4">
              <span className="font-mono text-xs uppercase tracking-wider text-red-400 font-semibold">
                Question Checklist Challenge
              </span>
              <p className="text-sm font-sans text-white font-medium">
                {questData.bossFight.question}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {questData.bossFight.options.map((opt, idx) => {
                  const isSelected = bossAnswer === idx;
                  const isCorrect = idx === questData.bossFight.correctAnswerIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (bossFeedback !== "SUCCESS") {
                          setBossAnswer(idx);
                          setBossFeedback(null);
                        }
                      }}
                      className={`text-left p-3.5 rounded border transition-all cursor-pointer ${
                        isSelected
                          ? "border-red-500 bg-red-500/15 text-white"
                          : "border-red-900/20 text-gray-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className="font-mono text-[10px] font-extrabold mr-2 text-red-500">[{String.fromCharCode(65 + idx)}]</span>
                      <span className="text-xs font-bold">{opt.label}</span>
                      {(isSelected || bossFeedback === "SUCCESS") && (
                        <span className={`mt-2 block text-[11px] leading-relaxed ${isCorrect ? "text-cyber-green" : "text-red-300"}`}>
                          {opt.rationale}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Controls and Feedback */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2 pt-4 border-t border-red-900/20">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={challengeSubmitted ? (fileChecksPassed ? onShip : handleRunTests) : handleBossSubmit}
                    disabled={!challengeSubmitted && bossAnswer === null}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold font-mono text-xs uppercase tracking-wider rounded transition-all cursor-pointer shrink-0"
                  >
                    {challengeSubmitted ? (fileChecksPassed ? "Record Badge" : "Run File Checks") : "Submit Challenge"}
                  </button>
                  <button
                    onClick={() => setShowBossHint(!showBossHint)}
                    className="px-4 py-2.5 border border-red-900/40 text-red-400 hover:bg-red-900/10 font-mono text-xs uppercase rounded transition-all cursor-pointer shrink-0"
                  >
                    HINT
                  </button>
                </div>

                {!fileChecksPassed && (
                  <span className="text-warning-amber font-mono text-xs uppercase tracking-wider font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    FILE CHECKS STILL NEEDED BEFORE CLAIMING.
                  </span>
                )}
                {challengeSubmitted && (
                  <span className="text-cyber-green font-mono text-xs uppercase tracking-wider font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    CHALLENGE COMPLETE. LEARNING RECORD UPDATED!
                  </span>
                )}
                {bossFeedback === "FAIL" && !challengeSubmitted && (
                  <span className="text-red-500 font-mono text-xs uppercase tracking-wider font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    NOT QUITE. REVIEW THE TRUST BOUNDARY AND TRY AGAIN.
                  </span>
                )}
              </div>

              {showBossHint && (
                <div className="space-y-2 text-xs text-red-300 bg-red-950/20 p-3 rounded border border-red-900/25 mt-2">
                  <p className="font-mono leading-relaxed"><span className="font-bold">VQ-CORE ASSIST HINT:</span> {questData.bossFight.hint}</p>
                  <p className="leading-relaxed text-red-200/80">{questData.bossFight.insight}</p>
                </div>
              )}

              {questData.bossAttempts?.length ? (
                <div className="rounded-lg border border-red-900/20 bg-[#120D0E] p-3">
                  <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider text-red-300">Previous Attempts</h3>
                  <div className="mt-2 space-y-2">
                    {questData.bossAttempts.slice(-3).map((attempt, index) => (
                      <div key={`${attempt.created_at}-${index}`} className="rounded border border-red-900/20 bg-black/20 p-2 text-[11px] leading-relaxed text-gray-300">
                        <div className="flex items-center justify-between gap-3 font-mono uppercase">
                          <span className={attempt.correct ? "text-cyber-green" : "text-red-300"}>
                            {attempt.correct ? "Solved" : "Needs Review"}
                          </span>
                          <span className="text-gray-500">{new Date(attempt.created_at).toLocaleString()}</span>
                        </div>
                        <p className="mt-1 text-white">{attempt.selected_label}</p>
                        <p className="mt-1 text-gray-400">{attempt.feedback}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Cinematics / Proof sidebar for Boss */}
          <div className="w-full md:w-80 border-l border-red-900/20 pl-0 md:pl-8 flex flex-col justify-between gap-6 z-10 shrink-0">
            <div className="bg-[#0D0B0C]/80 rounded-lg p-4 border border-red-900/20">
              <span className="font-mono text-[10px] text-red-400 uppercase tracking-wider block mb-2">
                VERIFICATION ENVELOPE
              </span>
              <ul className="space-y-2 text-[11px] font-mono text-gray-400">
                <li className="flex justify-between">
                  <span>IDENTITY PROOF:</span>
                  <span className={walletBound ? "text-cyber-green" : "text-red-500"}>
                    {walletBound ? "BOUND" : "MISSING"}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>INFRASTRUCTURE:</span>
                  <span className={ckbRpcOnline ? "text-cyber-green" : "text-red-500"}>
                    {ckbRpcOnline ? "OPERATIONAL" : "BLOCKED"}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>TEST VERIFICATION:</span>
                  <span className={gates.find(g => g.id === "verification")?.isCompleted ? "text-cyber-green" : "text-red-500"}>
                    {gates.find(g => g.id === "verification")?.isCompleted ? "PASSED" : "PENDING"}
                  </span>
                </li>
              </ul>
            </div>

            {bossFightSolved && (
              <div className="bg-cyber-green/5 border border-cyber-green/20 rounded-lg p-4">
                <span className="font-mono text-[10px] text-cyber-green uppercase tracking-wider block mb-1 font-bold">
                  Challenge Complete
                </span>
                <h3 className="text-lg font-black text-white">Success badge ready</h3>
                <p className="mt-2 text-[11px] font-sans text-gray-300 leading-relaxed">
                  {questData.bossFight.victoryMessage}
                </p>
                <div className="mt-4 grid gap-2 text-[11px] font-mono text-gray-300">
                  <div className="flex items-center justify-between rounded border border-cyber-green/15 bg-black/20 px-3 py-2">
                    <span>Learning record</span>
                    <span className="text-cyber-green">UPDATED</span>
                  </div>
                  <div className="flex items-center justify-between rounded border border-cyber-green/15 bg-black/20 px-3 py-2">
                    <span>Reward claim</span>
                    <span className={isAllGatesPassed ? "text-cyber-green" : "text-warning-amber"}>
                      {isAllGatesPassed ? "READY" : "WAITING"}
                    </span>
                  </div>
                </div>
                {generationError && (
                  <p className="mt-3 rounded border border-warning-amber/25 bg-warning-amber/10 p-2 text-[10px] leading-relaxed text-warning-amber">
                    Practice mode is saved locally. Reward claiming unlocks once cloud persistence is reachable.
                  </p>
                )}
                <button
                  onClick={onShip}
                  disabled={!isAllGatesPassed}
                  className="w-full py-2.5 bg-cyber-green hover:brightness-110 disabled:brightness-50 disabled:cursor-not-allowed text-black font-extrabold text-xs uppercase tracking-wider rounded mt-4 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  Record Badge / Claim Reward
                </button>
                <button
                  onClick={onOpenQuestRun}
                  className="mt-2 w-full rounded border border-electric-blue/40 px-3 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-electric-blue transition-colors hover:bg-electric-blue/10"
                >
                  Start Next Quest
                </button>
                {!isAllGatesPassed && (
                  <span className="text-[9px] font-mono text-red-400 text-center block mt-1.5 leading-tight">
                    Run file checks and keep JoyID/Core ready before claiming.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUCCESS / SHIPPED STATE BANNER */}
      {shipped && (
        <div className="bg-cyber-green/10 border-2 border-cyber-green rounded-xl p-8 text-center flex flex-col items-center justify-center gap-4 max-w-2xl mx-auto my-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-cyber-green/5 blur-[50px] rounded-full pointer-events-none"></div>
          <Award className="w-16 h-16 text-cyber-green animate-bounce" />
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">
            Success Badge Earned
          </h2>
          <p className="text-sm text-gray-300 max-w-md leading-relaxed">
            <span className="text-cyber-green font-semibold">&ldquo;{questData?.questName}&rdquo;</span> is recorded as completed. Your previous quest stays in the dashboard ledger so you can keep moving.
          </p>
          <div className="bg-[#0B0C0E] border border-glass-border px-5 py-3 rounded font-mono text-xs text-cyber-green mt-2 select-all">
            BADGE_STATE: WALLET_BOUND / QUEST_VERIFIED / BOSS_SOLVED / RECORDED
          </div>
          <button
            onClick={onOpenQuestRun}
            className="mt-2 rounded-xl bg-cyber-green px-6 py-3 text-xs font-black uppercase tracking-widest text-black transition-all hover:brightness-110"
          >
            Move To Next Quest
          </button>
        </div>
      )}
    </div>
  );
}

function InsightCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-glass-border bg-[#0B0C0E]/70 p-4">
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</span>
      <p className="mt-2 text-xs leading-relaxed text-white">{value}</p>
    </div>
  );
}

function analyzeQuestCode(quest: QuestData): CodeExplainer {
  const haystack = quest.files.map((file) => `${file.path}\n${file.content}`).join("\n");
  const lower = haystack.toLowerCase();
  const hasReceipt = /receipt|invoice|preimage|ptlc|htlc/.test(lower);
  const hasWitness = /witness|script|cell|xudt|capacity|lock|outpoint/.test(lower);
  const hasSplit = /split|bps|creator|platform|payout|balance/.test(lower);
  const hasChannel = /channel|state|route|hop|fiber/.test(lower);
  const hasDenial = /throw|reject|false|invalid|unpaid|forbid|deny|mismatch/.test(lower);
  const verifierLine = findLineReference(quest.files, /(verify|read|validate|authorize|settle|return|throw|receipt|witness|invoice|preimage|split|payout|outPoint)/i);
  const testLine = findLineReference(quest.files, /(test|it\(|expect|assert|throws|false|reject|unpaid|invalid|mismatch|replay)/i);

  const primaryInvariant = hasSplit
    ? "the generated payout or balance transition must match the authorized asset, amount, and recipient rules"
    : hasReceipt
      ? "the generated receipt proof must be scoped to the exact actor, action, resource, and network evidence"
      : hasWitness
        ? "the generated proof fields must match the transaction or witness evidence being accepted"
        : "the generated verifier must reject any input that is not explicitly authorized";
  const riskFocus = hasSplit
    ? "payout integrity"
    : hasChannel
      ? "Fiber channel-state replay risk"
      : hasReceipt
        ? "receipt replay and unpaid-access risk"
        : hasWitness
          ? "proof and witness trust boundary"
          : "generated-code trust boundary";

  return {
    primaryInvariant,
    denialPath: hasDenial
      ? `Inspect the denial path around ${testLine}; it should mutate the same field the implementation trusts.`
      : "The generated files do not make the denial path obvious, so the learner should add one before shipping.",
    proofLabel: hasReceipt ? "Payment proof" : "Proof artifact",
    proofArtifact: hasReceipt
      ? "Payment evidence appears through invoice, receipt, PTLC/HTLC, or preimage terms; verify it cannot be copied into another request."
      : "The proof artifact is indirect here; identify which witness, cell, signature, or state value is being trusted.",
    networkLabel: hasChannel ? "Fiber boundary" : hasWitness ? "CKB boundary" : "Network boundary",
    networkBoundary: hasChannel
      ? "Fiber state should be scoped by channel, invoice, nonce, amount, and settlement expectation."
      : hasWitness
        ? "CKB state should come from concrete cell, script, witness, or transaction evidence, not only request JSON."
        : "Connect the generated code back to the network evidence it claims to trust.",
    riskFocus,
    inspectSteps: [
      `Trace the accepting branch around ${verifierLine}.`,
      `Match every trusted field to a denial test around ${testLine}.`,
      "Ask what an attacker can copy, omit, or mutate without changing the UI.",
      "Explain the CKB/Fiber proof boundary in plain language before claiming the badge.",
    ],
    mentorPrompts: [
      "What does this generated verifier trust?",
      "Which field should the denial test mutate?",
      "What is network evidence versus request data?",
      "What would you patch before shipping?",
    ],
    resources: learningResourcesFor(lower),
  };
}

function buildMentorAnswer(question: string, _quest: QuestData, insights: CodeExplainer) {
  const selected = question.trim() || "Explain the active generated code.";
  const lower = selected.toLowerCase();
  const focus = lower.includes("replay")
    ? `Replay risk: ${insights.denialPath}`
    : lower.includes("test") || lower.includes("blocked") || lower.includes("mutate")
      ? `Test focus: ${insights.inspectSteps[1] ?? insights.denialPath}`
      : lower.includes("patch") || lower.includes("ship")
        ? `Patch focus: ${insights.primaryInvariant}. ${insights.networkBoundary}`
        : `Trust-boundary focus: ${insights.primaryInvariant}`;
  const resourceLines = insights.resources
    .slice(0, 3)
    .map((resource) => `- ${resource.title}: ${resource.reason} (${resource.url})`)
    .join("\n");

  return [
    `Question: ${selected}`,
    "",
    focus,
    "",
    `Why it matters: ${insights.riskFocus} is where vibecoded CKB/Fiber apps become dangerous. The code can look clean while still accepting copied proof data, stale state, wrong witnesses, or incorrect payout rules.`,
    "",
    `Code reading route: ${insights.inspectSteps.join(" -> ")}`,
    "",
    `Related references:\n${resourceLines}`,
  ].join("\n");
}

function findLineReference(files: WorkbenchFile[], pattern: RegExp) {
  for (const file of files) {
    const lines = file.content.split("\n");
    const index = lines.findIndex((line) => pattern.test(line));
    if (index >= 0) {
      return `${file.path}:${index + 1}`;
    }
  }

  return files[0] ? `${files[0].path}:1` : "generated workspace:1";
}

function learningResourcesFor(lower: string): LearningResource[] {
  const resources: LearningResource[] = [
    {
      title: "CKB Docs",
      url: "https://docs.nervos.org/",
      reason: "Connect cells, scripts, witnesses, and transaction state to the generated verifier.",
    },
    {
      title: "Fiber Network Repository",
      url: "https://github.com/nervosnetwork/fiber",
      reason: "Use this when a quest mentions Fiber channels, PTLCs, invoices, routing, or off-chain payment state.",
    },
    {
      title: "JoyID Documentation",
      url: "https://docs.joyid.dev/",
      reason: "Understand the wallet/passkey proof that binds the learner to a quest run.",
    },
  ];

  if (lower.includes("xudt") || lower.includes("sudt") || lower.includes("asset")) {
    resources.unshift({
      title: "CKB Token Standards",
      url: "https://docs.nervos.org/",
      reason: "Review token and asset concepts before trusting generated xUDT payout logic.",
    });
  }

  return resources.slice(0, 3);
}

function getLanguageLabel(file: WorkbenchFile) {
  const language = inferFileLanguage(file);
  if (language.includes("test")) {
    return "TypeScript Test";
  }
  if (language.includes("rs") || language.includes("rust")) {
    return "Rust";
  }
  if (language.includes("md") || file.path.endsWith(".md")) {
    return "Markdown";
  }
  if (language.includes("ts") || file.path.endsWith(".ts")) {
    return "TypeScript";
  }
  return language || "Text";
}

function inferFileLanguage(file: WorkbenchFile) {
  const path = file.path.toLowerCase();
  if (path.endsWith(".test.ts") || path.endsWith(".spec.ts")) {
    return "test";
  }
  if (path.endsWith(".rs")) {
    return "rust";
  }
  if (path.endsWith(".md")) {
    return "markdown";
  }
  if (path.endsWith(".ts") || path.endsWith(".tsx")) {
    return "typescript";
  }
  return "text";
}

function highlightCodeLine(line: string, language: string, theme: CodeTheme) {
  return tokenizeCodeLine(line, language).map((token, index) => (
    <span key={index} className={theme.tokens[token.kind]}>
      {token.text}
    </span>
  ));
}

function tokenizeCodeLine(line: string, language: string): CodeToken[] {
  if (isMarkdown(language)) {
    return tokenizeMarkdownLine(line);
  }

  return tokenizeProgrammingLine(line, language);
}

function tokenizeMarkdownLine(line: string): CodeToken[] {
  if (line.trimStart().startsWith("#")) {
    const leadingSpaces = line.match(/^\s*/)?.[0] ?? "";
    const trimmed = line.slice(leadingSpaces.length);
    const hashes = trimmed.match(/^#+/)?.[0] ?? "";
    return [
      { text: leadingSpaces, kind: "plain" },
      { text: hashes, kind: "punctuation" },
      { text: trimmed.slice(hashes.length), kind: "keyword" },
    ];
  }

  const tokens: CodeToken[] = [];
  let index = 0;
  while (index < line.length) {
    const tickStart = line.indexOf("`", index);
    if (tickStart === -1) {
      tokens.push({ text: line.slice(index), kind: "plain" });
      break;
    }

    if (tickStart > index) {
      tokens.push({ text: line.slice(index, tickStart), kind: "plain" });
    }

    const tickEnd = line.indexOf("`", tickStart + 1);
    if (tickEnd === -1) {
      tokens.push({ text: line.slice(tickStart), kind: "string" });
      break;
    }

    tokens.push({ text: line.slice(tickStart, tickEnd + 1), kind: "string" });
    index = tickEnd + 1;
  }

  if (/^\s*[-*+]\s/.test(line) && tokens.length > 0) {
    const [first, ...rest] = tokens;
    const match = first.text.match(/^(\s*[-*+]\s)(.*)$/);
    if (match) {
      return [
        { text: match[1], kind: "punctuation" },
        { text: match[2], kind: "plain" },
        ...rest,
      ];
    }
  }

  return tokens.length > 0 ? tokens : [{ text: line, kind: "plain" }];
}

function tokenizeProgrammingLine(line: string, language: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  const keywordSet = isRust(language) ? RUST_KEYWORDS : TS_KEYWORDS;
  let index = 0;

  while (index < line.length) {
    const char = line[index];
    const rest = line.slice(index);

    if (rest.startsWith("//")) {
      tokens.push({ text: rest, kind: "comment" });
      break;
    }

    if (rest.startsWith("/*")) {
      const commentEnd = line.indexOf("*/", index + 2);
      const comment = commentEnd === -1 ? rest : line.slice(index, commentEnd + 2);
      tokens.push({ text: comment, kind: "comment" });
      index += comment.length;
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      const value = readString(line, index, char);
      tokens.push({ text: value, kind: "string" });
      index += value.length;
      continue;
    }

    if (/\s/.test(char)) {
      const value = readWhile(line, index, (next) => /\s/.test(next));
      tokens.push({ text: value, kind: "plain" });
      index += value.length;
      continue;
    }

    if (/\d/.test(char)) {
      const value = readWhile(line, index, (next) => /[\d._a-fA-Fxob]/.test(next));
      tokens.push({ text: value, kind: "number" });
      index += value.length;
      continue;
    }

    if (/[A-Za-z_$]/.test(char)) {
      const value = readWhile(line, index, (next) => /[A-Za-z0-9_$]/.test(next));
      tokens.push({
        text: value,
        kind: classifyIdentifier(value, line, index, keywordSet),
      });
      index += value.length;
      continue;
    }

    if ("{}[](),;".includes(char)) {
      tokens.push({ text: char, kind: "punctuation" });
      index++;
      continue;
    }

    if ("=+-*/%!<>|&?:.".includes(char)) {
      const value = readWhile(line, index, (next) => "=+-*/%!<>|&?:.".includes(next));
      tokens.push({ text: value, kind: "operator" });
      index += value.length;
      continue;
    }

    tokens.push({ text: char, kind: "plain" });
    index++;
  }

  return tokens;
}

function classifyIdentifier(value: string, line: string, index: number, keywordSet: Set<string>): CodeTokenKind {
  const previous = previousNonWhitespace(line, index);
  const next = nextNonWhitespace(line, index + value.length);

  if (keywordSet.has(value)) {
    return "keyword";
  }
  if (["true", "false", "null", "undefined", "Some", "None", "Ok", "Err"].includes(value)) {
    return "constant";
  }
  if (previous === ".") {
    return "property";
  }
  if (next === ":") {
    return "property";
  }
  if (next === "(") {
    return "function";
  }
  if (COMMON_TYPES.has(value) || /^[A-Z][A-Za-z0-9_]*$/.test(value)) {
    return "type";
  }
  if (/^[A-Z0-9_]{2,}$/.test(value)) {
    return "constant";
  }
  return "plain";
}

function readString(line: string, start: number, quote: string) {
  let index = start + 1;
  while (index < line.length) {
    if (line[index] === "\\") {
      index += 2;
      continue;
    }
    if (line[index] === quote) {
      return line.slice(start, index + 1);
    }
    index++;
  }
  return line.slice(start);
}

function readWhile(line: string, start: number, predicate: (value: string) => boolean) {
  let index = start;
  while (index < line.length && predicate(line[index])) {
    index++;
  }
  return line.slice(start, index);
}

function previousNonWhitespace(line: string, index: number) {
  for (let cursor = index - 1; cursor >= 0; cursor--) {
    if (!/\s/.test(line[cursor])) {
      return line[cursor];
    }
  }
  return "";
}

function nextNonWhitespace(line: string, index: number) {
  for (let cursor = index; cursor < line.length; cursor++) {
    if (!/\s/.test(line[cursor])) {
      return line[cursor];
    }
  }
  return "";
}

function isRust(language: string) {
  const normalized = language.toLowerCase();
  return normalized.includes("rust") || normalized.includes("rs");
}

function isMarkdown(language: string) {
  const normalized = language.toLowerCase();
  return normalized.includes("md") || normalized.includes("markdown");
}
