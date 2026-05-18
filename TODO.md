# Resume Tool TODO

This file tracks product and engineering work that should not get lost while iterating.

## P0 - Next

- [x] JD tailoring: save the pasted JD, target company, target role, match score, and generated draft metadata with an application or resume version.
- [x] JD tailoring: replace one-click overwrite with a review flow for summary, experience, skills, and projects so users can apply sections one by one.
- [x] Platform API: add `/api/v1` route shape and keep the current route as a compatibility alias or document it as local-only.
- [x] Platform API: make `requestId` idempotent when `persist: true` so repeated external calls do not create duplicate resumes.
- [x] Platform API: add call log metadata for request id, user id, generated document id, match score, and timestamp.
- [x] Frontend/backend auth: avoid calling the server-to-server platform endpoint directly from the browser when `RESUME_PLATFORM_API_KEY` is enabled. Add a user-facing assistant endpoint or proxy flow.

## P1 - Product Flow

- [x] Application pipeline: add next action, follow-up date, recruiter/contact, job post URL, and JD archive fields.
- [x] Application pipeline: add quick action from a generated JD draft to create or update an application record.
- [ ] Resume documents: add tags or folders for target role/company so multiple resumes remain manageable.
- [ ] Resume documents: show generated-from relationship, for example `Base Resume -> Stripe JD Draft`.
- [ ] Resume documents: add archive/favorite states instead of only delete/copy.
- [ ] Career update: turn the biweekly update into an actionable checklist for new projects, metrics, role changes, interview feedback, and skills.
- [ ] Export: improve page-break warnings and overflow detection before PDF export.

## P1 - UX Polish

- [ ] Empty states: improve first-use states for Documents, Pipeline, AI Studio, and History.
- [ ] AI Studio: show a clearer before/after comparison for generated summaries and bullets.
- [ ] Settings: split workspace theme and resume export appearance into explicit tabs.
- [ ] Settings: add live preview cards for theme and density choices.
- [ ] Command palette: include recent documents, recent applications, and direct navigation to JD tailoring.
- [ ] Mobile/narrow screen: audit layout behavior below the current desktop-oriented minimum width.

## P1 - Backend

- [ ] Replace JSON file storage with a database-backed store when moving beyond local MVP.
- [ ] Add user/workspace ownership to documents, applications, activities, and platform requests.
- [ ] Add auth for regular CRUD APIs, not just platform API key auth.
- [ ] Add conflict handling for multi-device edits.
- [ ] Add rate limiting and per-client quotas for external platform calls.
- [ ] Publish OpenAPI documentation for backend routes.
- [ ] Add request/response examples for platform generation.

## P2 - Testing

- [ ] Add Playwright E2E for: create resume, edit content, generate JD draft, apply draft, log application, export PDF.
- [ ] Add Vue component tests for WorkspacePanel, TopBar, EditorPanel, and PreviewPanel.
- [ ] Add API contract tests for platform generation and idempotency.
- [ ] Add visual regression coverage for templates and PDF layout.
- [ ] Add test coverage thresholds to CI once CI exists.

## P2 - Architecture

- [ ] Split `WorkspacePanel.vue` into smaller route panels: WorkspaceHome, DocumentsPanel, PipelinePanel, AssistantPanel, HistoryPanel, SettingsPanel.
- [ ] Move JD tailoring logic from WorkspacePanel into a composable or store action.
- [ ] Move pipeline filtering/sorting into a composable with tests.
- [ ] Decide whether workspace theme is global user preference or per-resume setting.
- [ ] Add shared frontend/backend types for platform generation to reduce schema drift.

## Known Warnings

- [ ] Frontend build warns that current Node.js `20.15.1` is below Vite's recommended `20.19+`.
- [ ] Frontend build warns that the PDF chunk is larger than 500 kB.
