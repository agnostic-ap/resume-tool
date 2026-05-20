# Resume Tool TODO

Last reviewed: 2026-05-21

This is the active product and engineering backlog after reviewing the current frontend, store, backend, templates, and test surface. Completed historical items are intentionally omitted so this file stays useful while iterating.

## P0 - Broken Or Incomplete User Flows

- [ ] Restore the JD-tailoring flow in the editor.
  - Current issue: `WorkspacePanel.vue` still contains the real JD draft flow (`generateJdDraft`, section review, apply selected sections, create application from draft), but the entire panel is hidden behind `v-if="false"`. The workspace CTA navigates to the editor, where the visible AI assistant only creates local text suggestions and appends them to the summary.
  - Acceptance: the editor right panel has JD/company/role inputs, calls `backendApi.generateAssistantResumeDraft`, shows before/after section review, applies selected sections, and can create a linked pipeline record with tailoring metadata.

- [ ] Turn Growth Log into a persistent career memory, not a resettable checklist.
  - Current issue: `CareerUpdateChecklist` stores only the latest checklist and notes. `markCareerUpdated` resets the checklist, so older growth notes disappear and AI cannot use longitudinal career history.
  - Acceptance: add append-only growth entries with date, type, content, metrics, skills, project/company links, and source resume id. The growth page should list/edit entries and JD tailoring should be able to include them.

- [ ] Make backend sync state truthful and recoverable.
  - Current issue: the topbar “saved” indicator watches resume content only, while documents, applications, metadata, settings, and backend sync failures can change independently. Optimistic writes have no retry queue, conflict handling, or per-operation status.
  - Acceptance: track local dirty operations, show pending/failed sync states per document/application, retry failed writes, and prevent “saved” from appearing when backend writes are still pending or failed.

- [ ] Add a real pre-export validation flow.
  - Current issue: preview shows page count and page break lines, but export still rasterizes the entire resume and slices it into pages without section-level overflow warnings or fit suggestions.
  - Acceptance: before export, detect sections that cross page boundaries, flag long bullets/contact overflow, provide “compact / hide / reduce font” quick fixes, and block or warn before exporting broken PDFs.

- [ ] Add confirmation and undo for destructive actions everywhere.
  - Current issue: document delete has a confirm dialog, but settings can reset demo data directly, pipeline delete is immediate, and imported backups replace state without a review step.
  - Acceptance: destructive actions require confirmation, show exactly what will change, and provide a short-lived undo where possible.

## P1 - Product Flow Gaps

- [ ] Make the pipeline feel like a lifecycle, not only a table.
  - Current issue: stages exist and progress notes render, but users cannot edit individual progress events, set event dates/stages manually, schedule reminders, or see a clear Kanban/stepper journey from saved role to offer/closed.
  - Acceptance: add a stage board or detail drawer, editable timeline events, explicit reminder/follow-up states, next-action ownership, and overdue highlighting.

- [ ] Improve the resume library workflow.
  - Current issue: the document list supports filters, metadata, archive, favorite, copy, and rename, but lacks search, bulk actions, clear source lineage, and a dedicated “choose this resume for current edit/JD/application” flow.
  - Acceptance: add document search, sort, bulk archive/delete, lineage view, and clear selection actions from editor, templates, JD tailoring, and pipeline.

- [ ] Make the 10 templates truly distinguishable and testable.
  - Current issue: only Classic, Modern, and Sidebar have dedicated components. The other templates share `TemplateAdaptive.vue` variants, which helps, but still needs visual QA to prove each template is meaningfully different and thumbnail previews match the exported result.
  - Acceptance: every template has a documented layout intent, a visible difference in preview/PDF, matching thumbnail, and visual regression coverage.

- [ ] Finish separating website style from resume style in the UX.
  - Current issue: website style is in Settings and resume style is in the editor, but users still need clearer live previews and labels explaining which surface is affected.
  - Acceptance: Settings shows live app preview cards; editor resume style shows a mini PDF preview; both panels explicitly say “does not affect resume PDF” or “affects resume/PDF”.

- [ ] Make command palette data-aware.
  - Current issue: command palette only searches static commands. It cannot open recent resumes, jump to a company/application, start JD tailoring, or run context actions.
  - Acceptance: include recent documents, applications, growth entries, template actions, and direct “tailor from JD” action.

- [ ] Add useful empty states.
  - Current issue: some empty states exist, but Documents, Pipeline, Growth, History, and editor AI need stronger first-use guidance and next actions.
  - Acceptance: each empty state has a clear primary action, optional sample/import action, and does not rely on demo data to look complete.

- [ ] Audit narrow-screen behavior.
  - Current issue: `.studio-shell` has a desktop-oriented minimum width and the editor grid assumes wide screens.
  - Acceptance: define supported breakpoints, add tablet/mobile layouts or an explicit unsupported-state, and verify text/buttons do not overlap.

- [ ] Finish non-resume-content localization.
  - Current issue: resume content can intentionally stay language-specific, but UI still contains hardcoded strings such as `LIVE`, `Tw`, `preview.pdf`, some labels, and default English stage titles in normalized progress.
  - Acceptance: all UI chrome, status text, action labels, progress titles, and empty states use the locale layer or `useLocaleText`.

## P1 - AI And Platform Capability

- [ ] Connect editor AI to a real draft/diff model contract.
  - Current issue: visible editor AI is local string generation; backend assistant draft is rule-based JD matching. There is no structured diff model for individual summary/bullet/skill changes.
  - Acceptance: AI returns structured operations with target field, before/after, rationale, confidence, and apply/reject controls.

- [ ] Surface platform API usage inside the product.
  - Current issue: backend stores platform request metadata, but the frontend has no page for request logs, generated document ids, API client, request id, latency, or failures.
  - Acceptance: add an API usage/log page with filters, request detail, generated resume link, idempotency status, and failure reason.

- [ ] Publish and test the external API contract.
  - Current issue: `/api/v1/resume-drafts` exists, but there is no OpenAPI spec, public examples, SDK sample, or schema drift guard between frontend/backend types.
  - Acceptance: add OpenAPI docs, request/response examples, curl examples, API key instructions, and contract tests.

- [ ] Add platform auth management and quotas.
  - Current issue: platform API key is environment-based only; there are no per-client keys, scopes, rate limits, or usage caps.
  - Acceptance: add client identity, scoped API keys, rate limiting, per-client usage counters, and audit logging.

## P1 - Data Model And Backend

- [ ] Move beyond single JSON-file persistence for production.
  - Current issue: backend storage is a local JSON file with serialized writes. Good for MVP, weak for users, teams, history, and concurrent edits.
  - Acceptance: choose database storage, add migrations, user/workspace ownership, and durable indexes for resumes, applications, growth entries, activities, and platform requests.

- [ ] Add user/workspace ownership across all entities.
  - Current issue: documents, applications, activities, and platform requests are global in the local backend.
  - Acceptance: every API route scopes reads/writes by authenticated user/workspace, and tests cover cross-user isolation.

- [ ] Add conflict handling for multi-device edits.
  - Current issue: frontend and backend accept last-write-wins updates without revision checks.
  - Acceptance: add revision/version fields, reject stale updates, and provide merge or reload guidance.

- [ ] Version backup/import schemas.
  - Current issue: import accepts several historical shapes but has no explicit schema version, preview, validation report, or migration log.
  - Acceptance: add `schemaVersion`, import preview, validation errors, migration summary, and rollback safety.

- [ ] Make activity history useful instead of noisy.
  - Current issue: autosave and metadata updates can produce generic activity entries, but there are no version snapshots, undo points, or meaningful diffs.
  - Acceptance: group noisy edits, store key snapshots/diffs, filter by entity type, and link activities back to documents/applications/growth entries.

## P2 - Testing And Quality

- [ ] Add Playwright E2E coverage.
  - Target flows: create resume, edit sections, switch template, generate JD draft, apply selected draft sections, create pipeline record, log progress, record growth entry, export PDF.

- [ ] Add component tests for key panels.
  - Target components: `WorkspacePanel`, `TopBar`, `EditorPanel`, `PreviewPanel`, `CommandPalette`, `TweaksPanel`.

- [ ] Add visual regression tests for templates and app themes.
  - Target: all 10 templates, desktop editor, settings style controls, pipeline table/detail view, and PDF page-break overlays.

- [ ] Add coverage thresholds and CI.
  - Current issue: tests exist but there is no visible coverage threshold or CI gate in the repository.
  - Acceptance: add coverage reporting, minimum thresholds for store/backend logic, and CI jobs for test/build/typecheck.

- [ ] Address known build warnings.
  - Current warnings: frontend build runs on Node `20.15.1` while Vite recommends `20.19+` or `22.12+`; PDF-related chunks exceed 500 kB.
  - Acceptance: update runtime/tooling guidance and code-split heavy export dependencies where practical.

## P2 - Frontend Architecture

- [ ] Split `WorkspacePanel.vue` into route-level panels.
  - Current issue: one component owns workspace home, documents, templates, growth, pipeline, hidden AI/JD, history, and settings.
  - Acceptance: split into `WorkspaceHome`, `DocumentsPanel`, `TemplatesPanel`, `GrowthPanel`, `PipelinePanel`, `HistoryPanel`, and `SettingsPanel`.

- [ ] Move business logic into composables/store modules.
  - Current issue: JD tailoring, pipeline filtering/sorting, document metadata editing, and growth checklist logic are embedded in the view component.
  - Acceptance: extract `useJdTailoring`, `usePipeline`, `useDocumentLibrary`, and `useGrowthLog` with tests.

- [ ] Share types between frontend and backend.
  - Current issue: frontend API types and backend Zod schemas can drift.
  - Acceptance: generate shared TypeScript types from Zod/OpenAPI or move canonical schemas into a shared package.

- [ ] Replace symbolic text buttons with accessible icon buttons where appropriate.
  - Current issue: rail/topbar/editor controls use text glyphs (`§`, `◇`, `Tw`, etc.) without consistent icon semantics or tooltips.
  - Acceptance: use a consistent icon system, accessible labels, keyboard states, and visible tooltips for unfamiliar icons.
