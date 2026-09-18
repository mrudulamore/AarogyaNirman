# Site workflow additions

- Dashboard: role-scoped pending approvals, milestone work, inspections, defects, certificate renewals and missing handover certificates link to the corresponding project view.
- Daily diary: project Progress tab records date, manpower, completed work, weather, materials, unverified measurement notes, delays and evidence. Save draft persists the form and file bytes in IndexedDB, scoped by account/project. Resume restores those files. Retrying a submission uses a stable submission ID to avoid duplicate reports.
- Offline behavior: installed Android assets and device-local records work without internet. Drafts can be saved and submitted to the local register offline. There is no backend upload endpoint, server queue or background synchronization; the interface states this explicitly. Drafts are manually saved, not automatically saved on every keystroke.
- Photos: upload actual JPEG/PNG files, grouped by building/floor/activity; compare before and later photos within the same group. Images are resized to limit local storage use. File uploads retain upload time and registered site coordinates as unverified/manual metadata, not fabricated camera GPS.
- Drawings: submit a Document of type Drawing in Contract controls, with drawing number/version and evidence. An independent reviewer verifies it. New revisions must supersede the current approved version; old evidence remains retrievable. Progress reports and inspections can reference a revision; superseded revisions produce warnings.
- Bills: existing previous/current/cumulative measurements and submission checks remain; entry forms now flag excess authorized quantities and duplicate location/reference claims immediately.
- Certificates: register supports responsible role/officer, evidence, validity dates and approved replacements. Renewals appear in pending work. Handover shows all blockers and calculates readiness using all required certificates, defects, inspections, commissioning and sign-off steps.
- Escalations: Commissioner dashboard configures approval age, two delay thresholds and recipient roles. While the app is open, scoped overdue tasks create deduplicated in-app reminders, evaluated once per minute. These are not emails, OS push notifications or server-side scheduled jobs.
- Mobile/PDF: touch controls use at least 44-pixel targets. Diary submission shows saving stages and inline errors. Hindi/Marathi PDF rendering uses browser text shaping and rasterized pages, so exported Devanagari does not depend on the viewer's fonts. Such PDFs are image-based rather than selectable/searchable text.

## Validation

`node tests/siteOperations.mjs` checks task scope, escalation authorization and deduplication, drawing revision rules and handover blockers.

`node tests/browserWorkflows.mjs` uses installed Edge and real IndexedDB to check attachment persistence, owner isolation, submission retry idempotency, Unicode PDF generation, and the mobile diary layout/form. It creates an isolated temporary browser profile. It needs permission to launch headless Edge.

Existing project-control, billing, login, localization and PDF checks also apply. Physical Android device acceptance testing and server-sync integration remain separate work.
