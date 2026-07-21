import { useMemo, type ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  Code2,
  GraduationCap,
  LayoutDashboard,
  PenLine,
  ReceiptText,
} from "lucide-react";

import type { HealthResponse, LearningModuleDto, QuestRunRecord, RewardClaimRecord, UserQuestCounts } from "@/lib/legacy-api";
import type { NotebookEntry, PracticeRecord, ProofLog, QuestData, VerificationGate } from "@/lib/workbench-types";
import type { TutorMessage } from "@/components/LearningModeView";

interface DashboardViewProps {
  walletBound: boolean;
  walletLabel?: string;
  proofLogs: ProofLog[];
  health: HealthResponse | null;
  questData: QuestData | null;
  learningModule: LearningModuleDto | null;
  activeLessonIndex: number;
  checkpointAnswers: Record<string, number>;
  tutorMessages: TutorMessage[];
  notebookEntries: NotebookEntry[];
  reflectionDraft: string;
  setReflectionDraft: (value: string) => void;
  onSaveReflection: () => void;
  onOpenLearningLesson: (index: number) => void;
  gates: VerificationGate[];
  bossFightSolved: boolean;
  shipped: boolean;
  onConnectWallet: () => void;
  onOpenQuestRun: () => void;
  onOpenLearn: () => void;
  onGenerateActiveLessonQuest: () => void;
  onOpenWorkbench: () => void;
  onOpenShipGate: () => void;
  onOpenQuestRunRecord: (run: QuestRunRecord) => void;
  onOpenPracticeRecord: (record: PracticeRecord) => void;
  onRedoQuestRun: (run: QuestRunRecord) => void;
  onRedoPracticeRecord: (record: PracticeRecord) => void;
  questRuns: QuestRunRecord[];
  questStats: UserQuestCounts;
  rewardClaims: RewardClaimRecord[];
  practiceRecords: PracticeRecord[];
  historyLoading: boolean;
  historyError: string | null;
  historyPersistenceMessage: string | null;
}

type SavedWorkItem =
  | {
      kind: "cloud";
      id: string;
      title: string;
      subtitle: string;
      status: string;
      updatedAt: string;
      item: QuestRunRecord;
    }
  | {
      kind: "local";
      id: string;
      title: string;
      subtitle: string;
      status: string;
      updatedAt: string;
      item: PracticeRecord;
    };

export default function DashboardView({
  walletBound,
  questData,
  learningModule,
  activeLessonIndex,
  checkpointAnswers,
  notebookEntries,
  reflectionDraft,
  setReflectionDraft,
  onSaveReflection,
  onOpenLearningLesson,
  bossFightSolved,
  shipped,
  onConnectWallet,
  onOpenQuestRun,
  onOpenLearn,
  onGenerateActiveLessonQuest,
  onOpenWorkbench,
  onOpenShipGate,
  onOpenQuestRunRecord,
  onOpenPracticeRecord,
  questRuns,
  questStats,
  rewardClaims,
  practiceRecords,
  historyLoading,
  historyError,
  historyPersistenceMessage,
}: DashboardViewProps) {
  const activeLesson = learningModule?.lessons[activeLessonIndex] ?? null;
  const lessonRows = useMemo(() => {
    return learningModule?.lessons.map((lesson, index) => {
      const answer = checkpointAnswers[lesson.id];
      const completed = answer === lesson.checkpoint.correct_index;
      return { lesson, index, completed, attempted: answer !== undefined };
    }) ?? [];
  }, [checkpointAnswers, learningModule]);

  const completedLessons = lessonRows.filter((row) => row.completed).length;
  const lessonCount = learningModule?.lessons.length ?? 0;
  const moduleProgress = lessonCount > 0 ? Math.round((completedLessons / lessonCount) * 100) : 0;
  const activeLessonPassed = Boolean(activeLesson && checkpointAnswers[activeLesson.id] === activeLesson.checkpoint.correct_index);
  const passedGates = questData?.gates.filter((gate) => gate.isCompleted).length ?? 0;
  const gateCount = questData?.gates.length ?? 0;
  const latestReward = rewardClaims[0] ?? null;
  const latestNote = notebookEntries[0] ?? null;

  const savedWork = useMemo<SavedWorkItem[]>(() => {
    const cloudIds = new Set(questRuns.map((run) => run.run_id));
    const cloud = questRuns.map((run) => ({
      kind: "cloud" as const,
      id: run.run_id,
      title: run.quest.title,
      subtitle: run.learning_context?.lesson_title ?? run.skill_track,
      status: run.status,
      updatedAt: run.updated_at,
      item: run,
    }));
    const local = practiceRecords
      .filter((record) => !cloudIds.has(record.runId))
      .map((record) => ({
        kind: "local" as const,
        id: record.runId,
        title: record.title,
        subtitle: record.questSnapshot?.learningContext?.lesson_title ?? record.source ?? "local practice",
        status: record.status,
        updatedAt: record.updatedAt,
        item: record,
      }));

    return [...cloud, ...local]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6);
  }, [practiceRecords, questRuns]);

  const cloudCompletedIds = new Set(questRuns.filter((run) => run.status === "completed").map((run) => run.run_id));
  const localCompletedQuests = practiceRecords.filter((record) => (record.status === "completed" || record.status === "shipped") && !cloudCompletedIds.has(record.runId)).length;
  const completedQuestCount = Math.max(questStats.completed, cloudCompletedIds.size) + localCompletedQuests;
  const learnerScore = completedLessons * 20 + completedQuestCount * 35 + Math.min(savedWork.length, 6) * 5 + rewardClaims.length * 15;
  const currentRank = getLearnerRank(learnerScore);
  const nextRank = getNextLearnerRank(learnerScore);
  const rankProgress = nextRank ? Math.min(100, Math.round(((learnerScore - currentRank.min) / (nextRank.min - currentRank.min)) * 100)) : 100;

  const nextStep = !walletBound
    ? {
        label: "Connect JoyID",
        detail: "Connect once so generated lessons, quests, notes, and rewards stay attached to your account.",
        action: onConnectWallet,
      }
    : !learningModule
      ? {
          label: "Start Learning",
          detail: "Generate a focused module first. VibeQuest should teach before it asks you to ship code.",
          action: onOpenLearn,
        }
      : activeLesson && !activeLessonPassed
        ? {
            label: "Continue Lesson",
            detail: `Finish the checkpoint for ${activeLesson.title}, then unlock its practice quest.`,
            action: () => onOpenLearningLesson(activeLessonIndex),
          }
        : !questData
          ? {
              label: "Generate Code Quest",
              detail: "Turn the completed lesson into files, tests, a code explainer, and a boss challenge.",
              action: onGenerateActiveLessonQuest,
            }
          : !bossFightSolved
            ? {
                label: "Open Workbench",
                detail: "Read the generated code, run checks, and answer the boss question tied to the files.",
                action: onOpenWorkbench,
              }
            : {
                label: shipped ? "Review Shipped Badge" : "Ship Badge",
                detail: shipped ? "The latest completed quest is recorded." : "Record the completed quest and prepare the reward claim.",
                action: onOpenShipGate,
              };

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 bg-[#0B0C0E] p-4 font-sans text-on-surface md:p-8">
      <header className="rounded-2xl border border-electric-blue/20 bg-[#10151C] p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <LayoutDashboard className="h-7 w-7 text-electric-blue" />
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-electric-blue">Dashboard</p>
            </div>
            <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-white md:text-4xl">Learn it, inspect it, then ship it.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant">The dashboard now stays focused on learning progress, the active quest, saved work, notes, and reward state. Wallet proof logs, system logs, and run checklists belong outside this screen.</p>
          </div>
          <button
            onClick={nextStep.action}
            className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-electric-blue px-5 py-3 text-sm font-black uppercase tracking-wider text-black transition-all hover:brightness-110"
          >
            {nextStep.label}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-glass-border bg-[#15181F] p-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyber-green">Next best action</span>
            <h2 className="mt-2 text-2xl font-black text-white">{nextStep.label}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-on-surface-variant">{nextStep.detail}</p>
          </div>
          <div className="grid gap-2 sm:min-w-[420px]">
            <RankCard rank={currentRank.label} score={learnerScore} progress={rankProgress} nextRank={nextRank?.label ?? "Max rank"} />
            <div className="grid grid-cols-3 gap-2">
              <ProgressChip label="Learn" value={learningModule ? `${moduleProgress}%` : "Start"} ready={Boolean(learningModule)} />
              <ProgressChip label="Quest" value={questData ? (bossFightSolved ? "Solved" : "Open") : "None"} ready={Boolean(questData)} />
              <ProgressChip label="Reward" value={latestReward?.status ?? (shipped ? "Ready" : "Later")} ready={Boolean(latestReward || shipped)} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel
          icon={<BookOpen className="h-5 w-5 text-electric-blue" />}
          title="Current Lesson"
          action={learningModule ? "Open" : "Start"}
          onAction={onOpenLearn}
        >
          {learningModule && activeLesson ? (
            <div className="grid gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">{completedLessons}/{lessonCount} modules complete</p>
                <h3 className="mt-2 text-xl font-black text-white">{activeLesson.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-on-surface-variant">{activeLesson.why_it_matters}</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#0B0C0E]">
                <div className="h-full rounded-full bg-cyber-green transition-all" style={{ width: `${moduleProgress}%` }} />
              </div>
              <div className="grid gap-2 sm:grid-cols-5">
                {lessonRows.slice(0, 5).map((row) => (
                  <button
                    key={row.lesson.id}
                    onClick={() => onOpenLearningLesson(row.index)}
                    className={"min-h-16 rounded-lg border p-2 text-left transition-colors " + (row.completed ? "border-cyber-green/25 bg-cyber-green/5" : row.index === activeLessonIndex ? "border-electric-blue/45 bg-electric-blue/10" : "border-glass-border bg-[#0B0C0E]/70 hover:border-electric-blue/30")}
                  >
                    <span className="font-mono text-[10px] uppercase text-on-surface-variant">{row.index + 1}</span>
                    <p className="mt-1 line-clamp-2 text-[11px] font-bold text-white">{row.completed ? "Done" : row.lesson.title}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState text="Generate a role-based learning path first. This card will then show the active module and checkpoint progress." action="Start Learning" onClick={onOpenLearn} />
          )}
        </Panel>

        <Panel
          icon={<Code2 className="h-5 w-5 text-cyber-green" />}
          title="Active Quest"
          action={questData ? "Open" : activeLessonPassed ? "Generate" : "Quest"}
          onAction={questData ? onOpenWorkbench : activeLessonPassed ? onGenerateActiveLessonQuest : onOpenQuestRun}
        >
          {questData ? (
            <div className="grid gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">{questData.learningContext?.lesson_title ?? "Practice quest"}</p>
                <h3 className="mt-2 text-xl font-black text-white">{questData.questName}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-on-surface-variant">{questData.description}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <MiniStat label="Files" value={String(questData.files.length)} />
                <MiniStat label="Review" value={passedGates === gateCount && gateCount > 0 ? "Checked" : "Pending"} />
                <MiniStat label="Boss" value={bossFightSolved ? "Solved" : "Open"} />
              </div>
            </div>
          ) : (
            <EmptyState
              text={activeLessonPassed ? "Your checkpoint is passed. Generate a quest from this lesson's exact proof boundary." : "Pass a lesson checkpoint before opening a code quest."}
              action={activeLessonPassed ? "Generate Quest" : "Open Learn"}
              onClick={activeLessonPassed ? onGenerateActiveLessonQuest : onOpenLearn}
            />
          )}
        </Panel>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel icon={<GraduationCap className="h-5 w-5 text-electric-blue" />} title="Saved Work" action="All Quests" onAction={onOpenQuestRun}>
          <div className="grid gap-2">
            {historyError ? <p className="rounded-lg border border-warning-amber/20 bg-warning-amber/5 p-3 text-xs text-warning-amber">Cloud history is syncing. Local saved work remains available.</p> : null}
            {historyLoading && savedWork.length === 0 ? <p className="text-xs text-on-surface-variant">Loading saved quests...</p> : null}
            {savedWork.length > 0 ? (
              savedWork.map((work) => (
                <button
                  key={`${work.kind}-${work.id}`}
                  onClick={() => work.kind === "cloud" ? onOpenQuestRunRecord(work.item) : onOpenPracticeRecord(work.item)}
                  className="grid gap-1 rounded-xl border border-glass-border bg-[#0B0C0E] p-4 text-left transition-colors hover:border-electric-blue/35 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">{work.kind === "cloud" ? "Saved" : "Local"} / {formatDate(work.updatedAt)}</span>
                    <span className="mt-1 block line-clamp-1 text-sm font-black text-white">{work.title}</span>
                    <span className="mt-1 block line-clamp-1 text-xs text-electric-blue">{work.subtitle}</span>
                  </span>
                  <span className="font-mono text-[10px] font-bold uppercase text-cyber-green">{work.status}</span>
                </button>
              ))
            ) : (
              <EmptyState text={historyPersistenceMessage ?? "Saved quests will appear here after you generate or complete a run."} action="Generate Quest" onClick={onOpenQuestRun} />
            )}
          </div>
        </Panel>

        <div className="grid gap-6">
          <Panel icon={<PenLine className="h-5 w-5 text-cyber-green" />} title="Notebook" action="Save" onAction={onSaveReflection}>
            {activeLesson ? (
              <div className="grid gap-3">
                <p className="line-clamp-2 text-sm font-bold text-white">{activeLesson.title}</p>
                {latestNote ? <p className="rounded-lg border border-glass-border bg-[#0B0C0E]/70 p-3 text-xs leading-relaxed text-on-surface-variant">Latest: {latestNote.text}</p> : null}
                <textarea
                  value={reflectionDraft}
                  onChange={(event) => setReflectionDraft(event.target.value)}
                  rows={5}
                  placeholder="Write what the code trusts, what can be attacked, and the denial test you would run."
                  className="resize-y rounded-lg border border-glass-border bg-[#0B0C0E] p-3 text-xs leading-relaxed text-white outline-none placeholder:text-on-surface-variant focus:border-electric-blue/50"
                />
              </div>
            ) : (
              <EmptyState text="Start a learning path to keep lesson reflections here." action="Open Learn" onClick={onOpenLearn} />
            )}
          </Panel>

          <Panel icon={<ReceiptText className="h-5 w-5 text-warning-amber" />} title="Ship And Reward" action="Open" onAction={onOpenShipGate}>
            <button onClick={onOpenShipGate} className="w-full rounded-xl border border-glass-border bg-[#0B0C0E] p-4 text-left transition-colors hover:border-electric-blue/35">
              <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">Latest status</p>
              <h3 className="mt-2 text-lg font-black text-white">{latestReward ? latestReward.status : shipped ? "Badge ready" : bossFightSolved ? "Ready to ship" : "Finish quest first"}</h3>
              <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                {latestReward ? `${latestReward.amount_shannons} ${latestReward.currency}` : "Completed quests can be recorded here when the boss challenge is solved."}
              </p>
            </button>
          </Panel>
        </div>
      </section>
    </div>
  );
}

const LEARNER_RANKS = [
  { label: "Explorer", min: 0 },
  { label: "Boundary Scout", min: 40 },
  { label: "Proof Builder", min: 100 },
  { label: "Cell Architect", min: 180 },
  { label: "Protocol Defender", min: 280 },
];

function getLearnerRank(score: number) {
  return [...LEARNER_RANKS].reverse().find((rank) => score >= rank.min) ?? LEARNER_RANKS[0];
}

function getNextLearnerRank(score: number) {
  return LEARNER_RANKS.find((rank) => score < rank.min) ?? null;
}

function RankCard({ rank, score, progress, nextRank }: { rank: string; score: number; progress: number; nextRank: string }) {
  return (
    <div className="rounded-xl border border-electric-blue/25 bg-[#0B0C0E] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">Learner rank</p>
          <p className="mt-1 text-sm font-black uppercase text-white">{rank}</p>
        </div>
        <div className="text-right font-mono text-[10px] uppercase text-electric-blue">
          <p>{score} XP</p>
          <p>Next: {nextRank}</p>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#15181F]">
        <div className="h-full rounded-full bg-electric-blue transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function ProgressChip({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <div className="rounded-lg border border-glass-border bg-[#0B0C0E] p-3 text-center">
      <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className={"mt-1 truncate text-xs font-black uppercase " + (ready ? "text-cyber-green" : "text-warning-amber")}>{value}</p>
    </div>
  );
}

function Panel({
  icon,
  title,
  action,
  onAction,
  children,
}: {
  icon: ReactNode;
  title: string;
  action: string;
  onAction: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-glass-border bg-[#15181F] p-5">
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-glass-border pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-white">{title}</h2>
        </div>
        <button onClick={onAction} className="rounded border border-electric-blue/30 px-3 py-2 font-mono text-[10px] font-bold uppercase text-electric-blue hover:bg-electric-blue/10">
          {action}
        </button>
      </div>
      {children}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-glass-border bg-[#0B0C0E]/70 p-3">
      <p className="font-mono text-[10px] uppercase text-on-surface-variant">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function EmptyState({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-glass-border p-5 text-center">
      <p className="text-xs leading-relaxed text-on-surface-variant">{text}</p>
      <button onClick={onClick} className="mt-4 rounded border border-electric-blue/30 px-3 py-2 font-mono text-[10px] font-bold uppercase text-electric-blue hover:bg-electric-blue/10">
        {action}
      </button>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recent";
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
