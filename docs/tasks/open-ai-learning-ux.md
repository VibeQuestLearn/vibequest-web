# Open AI Learning UX — Web Task Plan

Status: proposed implementation plan  
Scope owner: vibequest-web  
Primary goal: expose open-AI quality, validation, and privacy improvements without making the learner flow complex.

## Product Guardrail

The learner should still experience VibeQuest as a clean edtech product:

`choose ecosystem -> set learning intent -> generate course/modules -> learn -> checkpoint/quest -> dashboard progress`

Open-model support and eval reports must be visible when useful, but they should not turn the app into a developer settings dashboard for normal learners.

## Why This Exists

Sentient-aligned work requires the product to show that AI-generated learning is not a black box. The web app should communicate source grounding, lesson quality, privacy posture, and learner progress in a way that improves trust without adding friction.

## Task 1 — Quality-Aware Generation States

Update generation UI states so learners understand what is happening after they request a course.

Implementation tasks:

- Keep progressive generation: show the first module as soon as it is usable.
- Add subtle validation states: generating, validating, ready, retrying, needs review.
- Avoid exposing raw eval jargon in the main learner path.
- Use simple labels like "source check", "quality check", and "ready".

Acceptance criteria:

- A learner can begin the first ready module while later modules continue generating/validating.
- Failed validation creates a clear retry/review state, not a generic error.
- The UI does not block existing successful generation flows.

## Task 2 — Lesson Validation Summary UI

Add a compact validation summary for generated lessons and official tracks.

Display fields:

- source grounding status
- repetition check status
- checkpoint quality status
- resource coverage status
- last validation timestamp

Implementation tasks:

- Add a minimal validation badge near the lesson title or lesson metadata.
- Add an optional "View quality report" action for users who want detail.
- Keep detailed reports out of the primary reading flow.
- Use warnings for issues that matter: unsupported claims, unrelated sources, repeated modules, weak checkpoints.

Acceptance criteria:

- Learners can see whether a lesson passed source/quality checks.
- Detailed reports are accessible but not visually dominant.
- Existing lessons without validation data still render cleanly.

## Task 3 — Public Eval Artifact Viewer

Create a simple viewer for public eval artifacts produced by core.

Implementation tasks:

- Render artifact metadata: ecosystem, topic, source ids, validation scores, warnings, generated timestamp.
- Link source ids to official resources where possible.
- Hide secrets and private user fields by design.
- Add copy/download JSON actions only where appropriate.

Acceptance criteria:

- A public or shareable report can be viewed without exposing account identity.
- Source ids and warnings are readable by non-core contributors.
- Artifact viewer works on mobile.

## Task 4 — Source-Grounded Resource UX

Improve resource display so citations support learning instead of creating clutter.

Implementation tasks:

- Keep resources inline with the lesson context instead of dumping every ecosystem source everywhere.
- Show only resources relevant to the active lesson/module.
- Group resources by purpose: official docs, protocol specs, repositories, standards.
- Add short "why this matters" descriptions only when they help the learner.

Acceptance criteria:

- Related resources no longer consume excessive space.
- Learners can identify which sources support the current lesson.
- Resource links remain accessible on mobile.

## Task 5 — Privacy-Safe Tutor UX

Make the tutor experience visibly privacy-aware without scaring users.

Implementation tasks:

- Add concise tutor copy explaining what context is used.
- Add a "clear tutor session" action when tutor history exists.
- Avoid showing email/account identity inside tutor logs or exported reports.
- Make highlighted-text tutor actions explicit: copy, ask tutor, explain deeper.

Acceptance criteria:

- Learners can ask about highlighted lesson text from the reading flow.
- Tutor session controls are reachable on mobile.
- Privacy copy is short, direct, and not legalistic.

## Task 6 — Provider Status for Builders/Admins

Expose provider status without confusing normal learners.

Implementation tasks:

- Add a non-primary provider status surface for admins/builders: current provider kind, model name, validation enabled, artifact export enabled.
- Do not show API keys, base URLs with sensitive tokens, or raw headers.
- Hide provider detail from normal learning cards unless needed for debugging.

Acceptance criteria:

- Builder/admin users can confirm whether hosted/open/local-compatible mode is active.
- Normal learners do not see distracting provider internals.
- Provider metadata is redacted.

## Task 7 — Open-AI Product Copy Pass

Add product language that explains VibeQuest's open-AI direction clearly.

Implementation tasks:

- Update relevant docs/product copy to describe VibeQuest as AI-powered protocol education with auditable learning quality.
- Avoid overusing AI buzzwords.
- Make the value clear: faster learning, stronger structure, source grounding, checkpoints, and proof.
- Keep multi-ecosystem positioning intact.

Acceptance criteria:

- Landing/product docs explain the open-AI quality layer without sounding like a pivot.
- No copy claims that all inference is local unless that is actually implemented.
- No copy claims that generated lessons are guaranteed correct.

## Task 8 — Mobile-First Quality Report Layout

Make all new validation and artifact views usable on phones.

Implementation tasks:

- Use collapsible sections for detailed warnings.
- Keep primary actions sticky only where they improve navigation.
- Avoid wide tables for artifact metadata.
- Test small-width layouts for lesson reports, source lists, and tutor actions.

Acceptance criteria:

- Validation summary, artifact viewer, and tutor actions are usable on phone screens.
- No horizontal scrolling for core reading/report flows.
- Reports remain readable in installed PWA mode.

## Non-Goals for This Phase

- Do not redesign the entire UI again.
- Do not expose full prompt/debug internals to normal learners.
- Do not add provider configuration forms that write secrets from the browser.
- Do not add fake "open model" claims before backend support exists.
- Do not make quality reports louder than the lesson content.

## Implementation Order

1. Add validation summary data types and empty-state UI.
2. Add compact lesson validation badge.
3. Add quality report drawer/view.
4. Improve related-resource layout.
5. Add tutor privacy and highlight actions.
6. Add artifact viewer.
7. Add admin/builder provider status.
8. Run mobile polish pass across the new surfaces.
