# Frontend action plan

Scope: website and Capacitor Android application. Backend identity, APIs, central storage, server audit trails and payment integrations are intentionally deferred.

## 21 September implementation status

- Website routes and project tabs load on demand. The production entry bundle is now about 285 KiB, down from about 1,925 KiB before the route split. A bundle budget test guards this change.
- Assigned engineers and project managers can confirm the actual hospital site coordinates; demo coordinates are clearly flagged and new capture remains `UNCERTAIN` until confirmation. Site polygons must be simple, within 2 km, and surround the confirmed marker.
- Project photos show device-local media availability, missing originals, stamped copies, and central verification pending. A storage panel reports usage and can remove only unlinked captures older than seven days.
- The field screen and storage panel count captured evidence awaiting central synchronization, and the field capture form records building, floor and activity. Site-coordinate confirmation requires an explicit checked acknowledgement.
- A persistent workspace banner identifies demonstration records. Offline status, lazy route loading, a recoverable page error, text alternatives for photo maps, certificate details, and links from handover blockers to their resolution screens are present.
- A GitHub Actions workflow template for build, lint, localization, role, control, geotagging, photo review, PDF and bundle budget checks is ready at `docs/frontend-ci-template.yml`. It needs a GitHub credential with workflow scope before it can be installed under `.github/workflows/`.

Still dependent on external work: physical Android device testing, a server endpoint for real evidence synchronization and identity, production signing keys and official deployment approval. The device-local queue intentionally does not claim successful central upload.

## Completed in the current geotagging phase

- Require a fresh high-accuracy GPS fix before the camera opens; gallery selection is unavailable for evidence capture.
- Classify evidence as inside, outside or uncertain by considering both location and reported GPS accuracy.
- Support a project-specific polygon drawn over street/satellite imagery, with a configurable circular fallback radius.
- Restrict boundary editing to assigned engineering/project-management roles and require the polygon to contain the registered site.
- Require a written exception for evidence outside or uncertain at the boundary.
- Store the full original and a separately stamped export in IndexedDB while keeping only a compact thumbnail in application state.
- Show numbered evidence, accuracy circles, site boundaries and direct photo links on the evidence map.
- Preserve capture time, GPS fix time/age, coordinate, accuracy, geofence decision and distance in the evidence record.

## Verified as already implemented

- Operational handover no longer forces progress to 100%. It is blocked by the existing handover-gap rules, including incomplete commissioning, defects, steps and required verified controls.
- Commissioning certificates support evidence attachments, issue/expiry dates, verification and renewal/expiry warnings through Contract Controls.
- Fictional portfolio records are named and labelled as demonstration data on the portfolio screen.

## P0 — finish field-device acceptance

1. Test camera, precise-location permission, denial/retry, offline capture and app restart on representative Android 8, 11, 13 and 15 devices.
2. Add an evidence storage screen showing local originals, storage consumption, missing media and safe cleanup of orphan files.
3. Add a device-local pending-sync state and retry queue UI. It will remain local until backend endpoints exist, but the interface and state transitions can be completed now.
4. Add explicit evidence integrity labels: locally captured, local original available, stamped export available and pending server verification.
5. Test boundary drawing and evidence capture at actual sites, including weak GPS, boundary-edge fixes and location permission changes during capture.

Acceptance: no gallery path; no submission without a recent GPS fix; uncertain fixes cannot silently become inside; original survives app restart; deleting evidence removes associated media; all map/photo links identify the same record.

## P1 — performance and field usability

1. Lazy-load application routes and heavy project tabs to reduce the current roughly 1.97 MB main JavaScript chunk.
2. Lazy-load mapping and PDF code only where needed; measure cold start and first interaction on a low-memory Android device.
3. Add skeleton, empty, offline and recoverable-error states to each field workflow.
4. Improve long evidence-detail layouts on small screens with a sticky action footer and grouped capture, location and approval sections.
5. Add accessible map alternatives: evidence list, coordinates, status and distance must remain usable without interacting with the map.

Acceptance: meaningful field screen visible quickly on a throttled connection; no horizontal overflow at 360 px; primary actions remain reachable with large text; every map fact is also available as text.

## P1 — multilingual reports and governance clarity

1. Add Devanagari-capable embedded PDF fonts and verify Hindi/Marathi shaping, line breaking and table pagination.
2. Put a persistent demonstration-data banner on every workspace route, not only the portfolio, until real data is connected.
3. Show certificate type, issuing authority, issue date, expiry date, evidence availability and verification state together on commissioning readiness screens.
4. Add a read-only handover blockers panel beside the operationalize action so the user can see and open each unresolved dependency.

Acceptance: bilingual sample PDFs render without missing glyphs; demo records cannot be mistaken for official live records; every blocked handover item links to the screen where it can be resolved.

## P2 — maintainability and release readiness

1. Split the large Zustand store into domain slices while preserving one centralized scope/authorization layer.
2. Add CI for production build, localization, authorization, project controls, geotagging, PDFs and browser smoke tests.
3. Remove obsolete Android manifest settings, configure release shrinking, and prepare release signing outside source control.
4. Add automated bundle budgets and responsive checks to prevent regressions.

Release signing, official hosting, real identity, tamper-proof audit and synchronized evidence remain dependent on later backend and deployment work.
