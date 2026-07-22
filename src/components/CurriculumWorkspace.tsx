"use client";

import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Code2,
  FileCheck2,
  FlaskConical,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import type { PublicCurriculum } from "@/lib/platform";

export function CurriculumWorkspace({
  curriculum,
}: {
  curriculum: PublicCurriculum | null;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!curriculum) {
    return (
      <section className="px-4 py-8 sm:px-8">
        <div className="border border-dashed border-black/15 px-5 py-8">
          <div className="flex items-center gap-2 text-sm font-bold">
            <LockKeyhole className="h-4 w-4 text-black/35" aria-hidden="true" />
            Curriculum unavailable
          </div>
        </div>
      </section>
    );
  }

  const lesson =
    curriculum.lessons[
      Math.min(selectedIndex, curriculum.lessons.length - 1)
    ];
  const sourceById = new Map(
    curriculum.sources.map((source) => [source.source_id, source]),
  );

  return (
    <section>
      <div className="flex flex-col justify-between gap-3 border-b border-black/10 px-4 py-5 sm:flex-row sm:items-center sm:px-8">
        <div>
          <div className="flex items-center gap-2 text-sm font-black">
            <ShieldCheck className="h-4 w-4 text-[#8a6500]" aria-hidden="true" />
            Reviewed curriculum
          </div>
          <p className="mt-1 text-xs text-black/45">
            Content {curriculum.content_version} | Scenario{" "}
            {curriculum.scenario_manifest_version} | Runner{" "}
            {curriculum.runner_manifest_version}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-black/50">
          <span>{curriculum.lessons.length} lessons</span>
          <span className="h-3 w-px bg-black/15" aria-hidden="true" />
          <span>{curriculum.sources.length} reviewed sources</span>
        </div>
      </div>

      <div className="grid min-w-0 xl:grid-cols-[340px_minmax(0,1fr)]">
        <nav
          className="border-b border-black/10 bg-[#f7f8f8] xl:border-b-0 xl:border-r"
          aria-label="Zcash lessons"
        >
          {curriculum.lessons.map((entry, index) => {
            const active = entry.lesson_id === lesson.lesson_id;
            return (
              <button
                key={entry.lesson_id}
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-pressed={active}
                className={
                  active
                    ? "grid min-h-24 w-full grid-cols-[32px_minmax(0,1fr)_20px] items-start gap-3 border-b border-black/10 border-l-2 border-l-[#d99b00] bg-white px-4 py-4 text-left"
                    : "grid min-h-24 w-full grid-cols-[32px_minmax(0,1fr)_20px] items-start gap-3 border-b border-black/10 border-l-2 border-l-transparent px-4 py-4 text-left hover:bg-white"
                }
              >
                <span
                  className={
                    active
                      ? "text-xs font-black text-[#8a6500]"
                      : "text-xs font-black text-black/30"
                  }
                >
                  {String(entry.sequence).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black leading-5">
                    {entry.title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-black/45">
                    {entry.valid_case_count} valid / {entry.denial_case_count}{" "}
                    denial cases
                  </span>
                </span>
                <ChevronRight
                  className={
                    active
                      ? "mt-0.5 h-4 w-4 text-[#8a6500]"
                      : "mt-0.5 h-4 w-4 text-black/20"
                  }
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </nav>

        <article className="min-w-0">
          <header className="border-b border-black/10 px-4 py-6 sm:px-8">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-black/45">
              <span>Lesson {String(lesson.sequence).padStart(2, "0")}</span>
              <span className="h-3 w-px bg-black/15" aria-hidden="true" />
              <span className="inline-flex items-center gap-1 text-[#587553]">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {lesson.reviewer_status}
              </span>
            </div>
            <h2 className="mt-3 text-xl font-black sm:text-2xl">
              {lesson.title}
            </h2>
            <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-black/65">
              {lesson.learner_outcome}
            </p>
          </header>

          <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 border-b border-black/10 px-4 py-7 sm:px-8 lg:border-b-0 lg:border-r">
              <h3 className="text-xs font-black uppercase text-black/40">
                Core idea
              </h3>
              <div className="mt-4 max-w-3xl space-y-4">
                {lesson.explainer.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-sm leading-7 text-black/70"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="mt-7 border-y border-black/10 bg-[#15181c] text-white">
                <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Code2
                      className="h-4 w-4 shrink-0 text-[#f4b728]"
                      aria-hidden="true"
                    />
                    <span className="truncate font-mono text-xs font-bold">
                      {lesson.code_lens.symbol}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-white/40">
                    {lesson.code_lens.language}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap break-words px-4 py-5 font-mono text-xs leading-6 text-white/80">
                  <code>{lesson.code_lens.snippet}</code>
                </pre>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="border-l-2 border-[#c64b3c] pl-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-[#8d2d22]">
                    <CircleAlert className="h-4 w-4" aria-hidden="true" />
                    Misconception
                  </div>
                  <p className="mt-2 text-sm leading-6 text-black/65">
                    {lesson.misconception}
                  </p>
                </div>
                <div className="border-l-2 border-[#4f7750] pl-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-[#3f613f]">
                    <FlaskConical className="h-4 w-4" aria-hidden="true" />
                    Lab bridge
                  </div>
                  <p className="mt-2 text-sm leading-6 text-black/65">
                    {lesson.lab_bridge}
                  </p>
                </div>
              </div>
            </div>

            <aside className="min-w-0 bg-[#fafafa]">
              <div className="border-b border-black/10 px-4 py-6 sm:px-6">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-black/40">
                  <FileCheck2 className="h-4 w-4" aria-hidden="true" />
                  Checkpoint
                </div>
                <p className="mt-3 text-sm font-bold leading-6">
                  {lesson.checkpoint.prompt}
                </p>
                <div className="mt-4 space-y-2">
                  {lesson.checkpoint.options.map((option, index) => (
                    <div
                      key={option.option_id}
                      className="grid grid-cols-[24px_minmax(0,1fr)] gap-2 border border-black/10 bg-white px-3 py-3"
                    >
                      <span className="text-xs font-black text-black/35">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="text-xs leading-5 text-black/65">
                        {option.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-4 py-6 sm:px-6">
                <h3 className="text-xs font-black uppercase text-black/40">
                  Source trail
                </h3>
                <div className="mt-3 divide-y divide-black/10 border-y border-black/10">
                  {lesson.source_references.map((sourceId) => {
                    const source = sourceById.get(sourceId);
                    if (!source) return null;
                    return (
                      <a
                        key={sourceId}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="grid grid-cols-[minmax(0,1fr)_20px] items-start gap-3 py-3 text-xs"
                      >
                        <span className="min-w-0">
                          <span className="block font-bold leading-5">
                            {source.title}
                          </span>
                          <span className="mt-0.5 block text-black/40">
                            {source.version}
                          </span>
                        </span>
                        <ArrowUpRight
                          className="mt-0.5 h-4 w-4 text-black/30"
                          aria-hidden="true"
                        />
                      </a>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        </article>
      </div>

      <div className="grid border-t border-black/10 bg-[#f4f1e9] md:grid-cols-[minmax(0,1fr)_160px_160px]">
        <div className="px-4 py-6 sm:px-8">
          <p className="text-xs font-black uppercase text-black/40">Capstone</p>
          <h2 className="mt-2 text-base font-black">
            {curriculum.capstone.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/60">
            {curriculum.capstone.objective}
          </p>
        </div>
        <CapstoneMetric
          label="Code repairs"
          value={curriculum.capstone.repair_count}
        />
        <CapstoneMetric
          label="Explanations"
          value={curriculum.capstone.explanation_count}
        />
      </div>
    </section>
  );
}

function CapstoneMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-t border-black/10 px-4 py-6 md:border-l md:border-t-0 sm:px-6">
      <p className="text-xs font-black uppercase text-black/40">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}
