import { useMemo } from "react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle,
  ExternalLink,
  GraduationCap,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";

import type { LearningModuleDto, LearningTutorResponse } from "@/lib/legacy-api";

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
  createdAt?: string;
};

interface LearningModeViewProps {
  module: LearningModuleDto | null;
  generating: boolean;
  tutorLoading: boolean;
  syncState: "idle" | "loading" | "saving" | "saved" | "local-only";
  error: string | null;
  warning: string | null;
  generationStatus: string | null;
  selectedInterests: string[];
  setSelectedInterests: (interests: string[]) => void;
  background: string;
  setBackground: (background: string) => void;
  activeLessonIndex: number;
  setActiveLessonIndex: (index: number) => void;
  checkpointAnswers: Record<string, number>;
  setCheckpointAnswers: (answers: Record<string, number>) => void;
  tutorMessages: TutorMessage[];
  setTutorMessages: (messages: TutorMessage[]) => void;
  tutorQuestion: string;
  setTutorQuestion: (question: string) => void;
  onGenerateModule: (pathId?: string) => Promise<void>;
  onAskTutor: (question?: string) => Promise<LearningTutorResponse | null>;
  onStartLessonQuest: (prompt: string) => void | Promise<void>;
  canStartLessonQuest: boolean;
}

const LESSON_THEMES = [
  {
    id: "ckb-cells",
    label: "CKB Cell Model",
    detail: "Cells, OutPoints, scripts, witnesses",
    interests: ["CKB Cell Model", "CKB Foundations"],
  },
  {
    id: "fiber-payments",
    label: "Fiber Payments",
    detail: "Channels, invoices, PTLC/payment receipts",
    interests: ["Fiber Payments", "Fiber Channels"],
  },
  {
    id: "security-audits",
    label: "Proof Security",
    detail: "Replay, mismatch, payout denial paths",
    interests: ["Security Audits", "CKB/Fiber Proof Security"],
  },
];

const SPECIALITIES = ["Vibecoder", "Backend dev", "Frontend dev", "Security auditor", "Product / community"];

export default function LearningModeView({
  module,
  generating,
  tutorLoading,
  syncState,
  error,
  warning,
  generationStatus,
  selectedInterests,
  setSelectedInterests,
  background,
  setBackground,
  activeLessonIndex,
  setActiveLessonIndex,
  checkpointAnswers,
  setCheckpointAnswers,
  tutorMessages,
  setTutorMessages,
  tutorQuestion,
  setTutorQuestion,
  onGenerateModule,
  onAskTutor,
  onStartLessonQuest,
  canStartLessonQuest,
}: LearningModeViewProps) {
  const activeLesson = module?.lessons[activeLessonIndex] ?? null;
  const selectedCheckpointAnswer = activeLesson ? checkpointAnswers[activeLesson.id] : undefined;
  const checkpointAnswered = selectedCheckpointAnswer !== undefined;
  const checkpointPassed = Boolean(
    activeLesson && selectedCheckpointAnswer === activeLesson.checkpoint.correct_index,
  );
  const nextLessonIndex = module ? Math.min(activeLessonIndex + 1, module.lessons.length - 1) : 0;
  const previousLessonIndex = Math.max(activeLessonIndex - 1, 0);
  const completedLessons = useMemo(() => {
    if (!module) return 0;
    return module.lessons.filter((lesson) => checkpointAnswers[lesson.id] === lesson.checkpoint.correct_index).length;
  }, [checkpointAnswers, module]);
  const progress = module ? Math.round((completedLessons / module.lessons.length) * 100) : 0;
  const defaultTutorQuestion = activeLesson
    ? `Walk me through "${activeLesson.title}" from this generated lesson, explain the code lens, and check my understanding.`
    : "";

  const activeTheme = LESSON_THEMES.find((theme) =>
    selectedInterests.includes(theme.label) || theme.interests.some((interest) => selectedInterests.includes(interest)),
  ) ?? LESSON_THEMES[0];

  const chooseTheme = (theme: typeof LESSON_THEMES[number]) => {
    setSelectedInterests([theme.label, ...theme.interests.filter((interest) => interest !== theme.label)]);
  };

  const chooseAnswer = (lessonId: string, index: number) => {
    setCheckpointAnswers({ ...checkpointAnswers, [lessonId]: index });
  };

  const askTutor = async () => {
    const askedQuestion = tutorQuestion.trim() || defaultTutorQuestion;
    if (!askedQuestion || !activeLesson) return;

    const response = await onAskTutor(askedQuestion);
    if (!response) return;

    const createdAt = new Date().toISOString();
    const lessonMetadata = module && activeLesson ? {
      moduleTitle: module.title,
      lessonId: activeLesson.id,
      lessonTitle: activeLesson.title,
    } : {};
    setTutorMessages([
      ...tutorMessages,
      { id: `learner-${Date.now()}`, role: "learner", text: askedQuestion, createdAt, ...lessonMetadata },
      {
        id: `mentor-${Date.now()}`,
        role: "mentor",
        text: response.answer,
        why: response.why_it_matters,
        followUp: response.follow_up_question,
        createdAt,
        ...lessonMetadata,
      },
    ]);
    setTutorQuestion("");
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col gap-8 bg-[#0B0C0E] p-4 font-sans text-on-surface md:p-8">
      <div className="flex flex-col gap-4 border-b border-glass-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white">
            <GraduationCap className="h-8 w-8 text-electric-blue" />
            Learning Mode
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
            Pick the learner profile first. VibeQuest generates a module, teaches the concept, checks understanding, answers questions, then turns completed lessons into practical quests.
          </p>
        </div>
        {module ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-cyber-green/25 bg-cyber-green/5 px-5 py-3">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyber-green">Module progress</span>
              <p className="mt-1 text-xl font-black text-white">{progress}%</p>
            </div>
            <div className="rounded-xl border border-electric-blue/25 bg-electric-blue/5 px-5 py-3">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-electric-blue">Cloud sync</span>
              <p className="mt-1 text-sm font-black uppercase text-white">{syncStateLabel(syncState)}</p>
            </div>
            <div className="rounded-xl border border-warning-amber/25 bg-warning-amber/5 px-5 py-3">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-warning-amber">Next action</span>
              <p className="mt-1 text-sm font-black uppercase text-white">{checkpointPassed ? "practice quest" : checkpointAnswered ? "review answer" : "pass checkpoint"}</p>
            </div>
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
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-electric-blue">Choose Lesson</span>
              {LESSON_THEMES.map((theme) => {
                const selected = activeTheme.id === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => chooseTheme(theme)}
                    className={`rounded-lg border p-3 text-left transition-colors ${selected ? "border-electric-blue/50 bg-electric-blue/10" : "border-glass-border/70 bg-[#0B0C0E]/60 hover:border-electric-blue/30"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-white">{theme.label}</span>
                      {selected ? <CheckCircle className="h-4 w-4 text-electric-blue" /> : null}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">{theme.detail}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid gap-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-cyber-green" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyber-green">Speciality</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SPECIALITIES.map((item) => {
                  const selected = background === item;
                  return (
                    <button
                      key={item}
                      onClick={() => setBackground(item)}
                      className={`rounded-lg border px-3 py-2 text-left text-[11px] font-bold transition-colors ${selected ? "border-cyber-green/45 bg-cyber-green/10 text-white" : "border-glass-border bg-[#0B0C0E]/70 text-on-surface-variant hover:border-cyber-green/30 hover:text-white"}`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => onGenerateModule(activeTheme.id)}
              disabled={generating}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-electric-blue px-5 py-3 text-sm font-black uppercase tracking-wider text-black transition-all hover:brightness-110 disabled:brightness-50"
            >
              {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Generating Module" : "Generate Module"}
            </button>
            {generationStatus ? (
              <div className="mt-3 rounded-lg border border-electric-blue/30 bg-electric-blue/10 p-3 text-xs font-bold uppercase tracking-wide text-electric-blue">
                {generationStatus}
              </div>
            ) : null}
            {error ? (
              <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs leading-relaxed text-red-300">
                {error}
              </div>
            ) : null}
            {warning ? (
              <div className="mt-3 rounded-lg border border-warning-amber/30 bg-warning-amber/10 p-3 text-xs leading-relaxed text-warning-amber">
                {warning}
              </div>
            ) : null}
          </section>

          {module ? (
            <section className="rounded-xl border border-glass-border bg-[#16181D] p-5">
              <div className="mb-4 flex items-center justify-between border-b border-glass-border pb-3">
                <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-white">Table Of Contents</h2>
                <span className="font-mono text-xs text-cyber-green">{completedLessons}/{module.lessons.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {module.lessons.map((lesson, index) => {
                  const selected = index === activeLessonIndex;
                  const answer = checkpointAnswers[lesson.id];
                  const completed = answer === lesson.checkpoint.correct_index;
                  const attempted = answer !== undefined && !completed;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setActiveLessonIndex(index)}
                      className={`rounded-lg border p-3 text-left transition-colors ${selected ? "border-electric-blue/50 bg-electric-blue/10" : completed ? "border-cyber-green/25 bg-cyber-green/5" : attempted ? "border-warning-amber/25 bg-warning-amber/5" : "border-glass-border/70 bg-[#0B0C0E]/70 hover:border-electric-blue/30"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-white">{index + 1}. {lesson.title}</span>
                        <span className="font-mono text-[10px] uppercase text-on-surface-variant">{completed ? "passed" : attempted ? "needs proof" : selected ? "studying" : "up next"}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-on-surface-variant">{lesson.why_it_matters}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}
        </aside>

        <main className="flex flex-col gap-6">
          {module && activeLesson ? (
            <>
              <section className="rounded-xl border border-electric-blue/20 bg-[#121820] p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-electric-blue">{module.title}</span>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-white">{activeLesson.title}</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-on-surface-variant">{module.outcome}</p>
                  </div>
                  <button
                    onClick={() => onStartLessonQuest(activeLesson.quest_bridge || module.capstone_quest_prompt)}
                    disabled={!canStartLessonQuest}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-cyber-green/30 bg-cyber-green/10 px-4 py-3 text-xs font-black uppercase tracking-wider text-cyber-green hover:bg-cyber-green/15 disabled:border-warning-amber/25 disabled:bg-warning-amber/5 disabled:text-warning-amber disabled:hover:bg-warning-amber/5"
                  >
                    {canStartLessonQuest ? "Generate Quest" : "Pass Checkpoint First"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-xl border border-glass-border bg-[#16181D] p-5">
                  <div className="mb-4 flex items-center gap-2 border-b border-glass-border pb-3">
                    <BookOpen className="h-5 w-5 text-electric-blue" />
                    <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">Deep Explainer</h3>
                  </div>
                  <p className="text-sm leading-7 text-on-surface-variant whitespace-pre-line">{activeLesson.explanation}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {activeLesson.concepts.map((concept) => (
                      <span key={concept} className="rounded border border-electric-blue/20 bg-electric-blue/10 px-3 py-1 font-mono text-[10px] uppercase text-electric-blue">{concept}</span>
                    ))}
                  </div>
                  <div className="mt-5 rounded-lg border border-warning-amber/20 bg-warning-amber/5 p-4">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-warning-amber">Why this matters</span>
                    <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{activeLesson.why_it_matters}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-glass-border bg-[#16181D] p-5">
                  <div className="mb-4 flex items-center gap-2 border-b border-glass-border pb-3">
                    <Brain className="h-5 w-5 text-cyber-green" />
                    <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">Checkpoint</h3>
                  </div>
                  <p className="text-sm font-bold leading-relaxed text-white">{activeLesson.checkpoint.question}</p>
                  <div className="mt-4 grid gap-2">
                    {activeLesson.checkpoint.options.map((option, index) => {
                      const selected = checkpointAnswers[activeLesson.id] === index;
                      const correct = index === activeLesson.checkpoint.correct_index;
                      const answered = checkpointAnswers[activeLesson.id] !== undefined;
                      return (
                        <button
                          key={index}
                          onClick={() => chooseAnswer(activeLesson.id, index)}
                          className={`rounded-lg border p-3 text-left text-xs leading-relaxed transition-colors ${selected ? (correct ? "border-cyber-green/40 bg-cyber-green/10" : "border-red-500/40 bg-red-500/10") : "border-glass-border bg-[#0B0C0E]/70 hover:border-electric-blue/30"}`}
                        >
                          <span className="font-bold text-white">{String.fromCharCode(65 + index)}. {option.label}</span>
                          {answered && selected ? (
                            <span className="mt-2 flex items-start gap-2 text-on-surface-variant">
                              {correct ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyber-green" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />}
                              {option.feedback}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  {checkpointAnswered ? (
                    <div className={(checkpointPassed ? "mt-4 rounded-lg border border-cyber-green/20 bg-cyber-green/10" : "mt-4 rounded-lg border border-warning-amber/20 bg-warning-amber/10") + " p-4 text-xs leading-relaxed text-on-surface-variant"}>
                      <p className="font-bold text-white">{checkpointPassed ? "Correct. You can turn this lesson into a quest." : "Not yet. Read the feedback, ask the tutor, then answer again."}</p>
                      <p className="mt-2">{activeLesson.checkpoint.explanation}</p>
                      <p className="mt-2 text-electric-blue">Next check: {activeLesson.checkpoint.follow_up_question}</p>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-glass-border pt-4">
                    <button
                      onClick={() => setActiveLessonIndex(previousLessonIndex)}
                      disabled={activeLessonIndex === 0}
                      className="rounded border border-glass-border px-3 py-2 font-mono text-[10px] font-bold uppercase text-on-surface-variant hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous Lesson
                    </button>
                    <button
                      onClick={() => setActiveLessonIndex(nextLessonIndex)}
                      disabled={!module || activeLessonIndex >= module.lessons.length - 1}
                      className="rounded border border-electric-blue/30 px-3 py-2 font-mono text-[10px] font-bold uppercase text-electric-blue hover:bg-electric-blue/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next Lesson
                    </button>
                    <button
                      onClick={() => onStartLessonQuest(activeLesson.quest_bridge || module.capstone_quest_prompt)}
                      disabled={!checkpointPassed}
                      className="rounded border border-cyber-green/30 px-3 py-2 font-mono text-[10px] font-bold uppercase text-cyber-green hover:bg-cyber-green/10 disabled:cursor-not-allowed disabled:border-warning-amber/25 disabled:text-warning-amber"
                    >
                      Generate Module Quest
                    </button>
                  </div>
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
                <div className="rounded-xl border border-glass-border bg-[#16181D] p-5">
                  <div className="mb-4 flex items-center gap-2 border-b border-glass-border pb-3">
                    <MessageSquare className="h-5 w-5 text-electric-blue" />
                    <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">Ask The AI Tutor</h3>
                  </div>
                  <div className="flex max-h-[320px] flex-col gap-3 overflow-y-auto pr-1">
                    {tutorMessages.length > 0 ? tutorMessages.map((message) => (
                      <div key={message.id} className={`rounded-lg border p-3 ${message.role === "learner" ? "border-electric-blue/20 bg-electric-blue/10" : "border-glass-border bg-[#0B0C0E]/70"}`}>
                        <span className="font-mono text-[10px] uppercase text-on-surface-variant">{message.role === "learner" ? "You" : "VibeQuest Tutor"}</span>
                        <p className="mt-1 text-xs leading-relaxed text-white">{message.text}</p>
                        {message.why ? <p className="mt-2 text-[11px] leading-relaxed text-on-surface-variant">{message.why}</p> : null}
                        {message.followUp ? <p className="mt-2 text-[11px] leading-relaxed text-electric-blue">Try this: {message.followUp}</p> : null}
                      </div>
                    )) : (
                      <div className="rounded-lg border border-dashed border-glass-border p-5 text-center text-xs text-on-surface-variant">
                        Ask anything, or press Ask with an empty box for an active-lesson walkthrough. The tutor uses the generated explainer, code lens, checkpoint, and quest bridge.
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <input
                      value={tutorQuestion}
                      onChange={(event) => setTutorQuestion(event.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-glass-border bg-[#0B0C0E] px-3 py-2 text-xs text-white outline-none focus:border-electric-blue/40"
                      placeholder="Ask a question, or leave blank to explain the active lesson..."
                    />
                    <button
                      onClick={askTutor}
                      disabled={tutorLoading || !activeLesson}
                      className="flex items-center gap-2 rounded-lg bg-electric-blue px-4 py-2 text-xs font-black uppercase text-black disabled:brightness-50"
                    >
                      {tutorLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Ask
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-glass-border bg-[#16181D] p-5">
                  <div className="mb-4 flex items-center gap-2 border-b border-glass-border pb-3">
                    <ExternalLink className="h-5 w-5 text-cyber-green" />
                    <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">Reference Trail</h3>
                  </div>
                  <div className="flex flex-col gap-3">
                    {module.resources.map((resource) => (
                      <a key={resource.url} href={resource.url} target="_blank" rel="noreferrer" className="rounded-lg border border-glass-border/70 bg-[#0B0C0E]/70 p-3 hover:border-electric-blue/30">
                        <span className="text-xs font-bold text-white">{resource.title}</span>
                        <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">{resource.reason}</p>
                      </a>
                    ))}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <section className="flex min-h-[520px] flex-col items-center justify-center rounded-xl border border-dashed border-glass-border bg-[#16181D] p-8 text-center">
              <GraduationCap className="h-12 w-12 text-electric-blue" />
              <h2 className="mt-4 text-2xl font-black tracking-tight text-white">Generate a learning path first</h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-on-surface-variant">
                The module should teach before it asks you to code: concepts, examples, checkpoint questions, tutor support, then a quest built from what you actually learned.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export type { TutorMessage };

function syncStateLabel(value: "idle" | "loading" | "saving" | "saved" | "local-only") {
  if (value === "loading") return "loading";
  if (value === "saving") return "saving";
  if (value === "saved") return "saved";
  if (value === "local-only") return "local only";
  return "ready";
}
