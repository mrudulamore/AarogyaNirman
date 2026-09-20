# Website and Android update

Implemented from the 18 September screenshot:

- Locally bundled Manrope typography and refreshed shared cards.
- Official landing-page portraits for Devendra Fadnavis, Eknath Shinde, Sunetra Ajit Pawar and Prakash Abitkar. Source URLs are recorded in `public/leadership/SOURCES.txt`.
- Draft tagline: “Building hospitals. Strengthening care.”
- Superadmin person creation with role, jurisdiction/project scope, contractor-firm association, and email sign-in within the existing demo authentication model.
- Pending/manual-verified/rejected identity states, reviewer identity, timestamp and internal reference. This is manual review, not integrated eKYC. No identity-document numbers or biometric data are collected.
- Project tabs follow governance → contracting → lifecycle → construction → evidence → people → quality → finance → closeout. The position strip was removed and arrow targets enlarged.
- Separate construction milestone timeline preserves existing milestone actions.
- Four explicitly fictional, linked demonstration projects bring the default portfolio to 24. Hydration adds missing demo records without resetting edited records. These are samples, not official hospital records.
- Field evidence uses photo cards and quantitative distance indicators.
- Browser capture uses a live video stream; Android uses the camera source. Both require device GPS and retain capture time/accuracy. No file picker or registered-site-coordinate fallback is offered for new site photos. Existing historical evidence remains available.

Validation: production build; Android debug assembly; localization, requested updates, project controls, contractor progress, site operations, workforce, fund disbursal and PDF suites; browser checks at 390px and 1440px; enrollment/review/email sign-in; simulated camera and GPS; camera-denial/cancel behavior.

Limits: physical Android camera/GPS still require device testing. Provider-backed eKYC, real 24-project records, and production authentication/backend persistence require supplied integration/data. Demo users and reviews persist locally in the current application.

## Handwritten-list follow-up

- Replaced the small orbit graphic with a large hospital illustration and readable labelled metrics.
- Increased metric labels to 13px, including native phone layouts, and refreshed card backgrounds.
- Zone cards now open the scoped project list with the selected region, including Nashik.
- Added custom named staff roles that inherit an existing authorization role; they do not define a separate permission tier.
- Field evidence is numbered chronologically, with large full-image viewing and previous/next controls; uploader role appears alongside the name.
- Assigned project managers and executive engineers can approve/reject actual captured photos with comments. Self-review and approval of illustrative samples are blocked. Decision history and audit entries persist locally.
- Real eKYC remains pending the user's provider/backend details. Manual-review badges are not eKYC results.

Validated with production build, native debug build, APK signature/assets, photo-review authorization tests, custom-role tests, project-controls tests, and localization checks. Android hardware testing remains pending.

## Consolidated project reports

Reduced project navigation from 25 sections to 15 groups (60% retained). Merged contracts/controls, schedule/milestones, BOQ/materials, progress/monthly reporting, photos/evidence, team/contractor/workers, quality/inspections, defects/risks, and documents/audit. Individual reports remain available within their group. Existing tab URLs and action parameters continue working, and each group's reports are filtered by the original role permissions before rendering navigation.

Refreshed shared card surfaces, headings, borders and elevation. Verified group coverage for every role, legacy navigation and report switching at 390px/1440px, localization, project controls, production build, native APK assembly and APK signature/assets.

## Portfolio and landing-page design refresh

Project cards now include blue district headers, larger names and budget/progress figures, completion dates, and keyboard-accessible project links. Shared report and metric cards have consistent blue headings, spacing, and elevation. The landing page has larger uncropped leadership portraits, a responsive hospital illustration, scroll reveals and subtle hover animations. Reduced-motion preferences disable landing animations. No workflow or authorization changes were introduced by this visual refresh.

Validation: production build, localization suite, browser checks across 18 workspace routes at 390px and 1440px, landing entry navigation, loaded portraits and native-class finance layout. Corrected narrow-screen hero clipping after visual review. The latest visual refresh has not been packaged into a new APK.

## 20 September review notes

- Module visibility toggles now preserve canonical navigation order, including previously saved permission arrays. Added module/person searches and a pending-KYC filter.
- Account menu includes a KYC application with declaration, document category and a profile snapshot. Administrators review applications; rejected applications can be resubmitted. This remains manual, device-local verification. No Aadhaar numbers or identity-document images are collected.
- Zone overview cards filter the dashboard and fit the map to the selected division instead of navigating away. Existing budget/scheme groupings show project counts.
- Street/satellite controls and attributed DataMeet Census 2011 district outlines, coloured by division. Historical boundaries are explicitly labelled and do not purport to be current legal boundaries. Source and license: public/maps/SOURCES.md.
- Added photo-coordinate maps on dashboard and field evidence, scoped to visible projects. Photo popups distinguish illustrative samples from saved evidence.
- Chart values appear outside marks; status doughnut retains a full count/share table. Monetary labels use existing currency formatting.
- Start/baseline, midpoint/progress and completion capture shortcuts show actual captured-photo counts. Field capture allows checkpoint selection. Larger photo cards and varied existing illustrative photographs preserve the distinction between samples and real evidence.
- Interpretation pending clarification: the handwritten “midpoint picture at the start” was implemented as three capture checkpoints; provider-backed eKYC and current authoritative boundary data require external inputs.

Final validation status: production build, localization, module-order and KYC state tests passed. Browser KYC application, pending filtering, search and manual approval ran successfully before the test reached an incorrect minister login ID. The test ID is corrected; remaining map/chart visual checks are pending because automatic tool approval hit a usage limit. No APK containing the September review-note changes has been generated yet. Earlier APKs contain only the preceding mobile design.

Push validation: browser checks at 390px and 1440px now pass for KYC submission/approval, pending application filtering, user search, zone selection without navigation, boundary rendering and satellite switching. Production build and access/KYC/localization tests passed again. No new APK containing these review-note changes has been packaged.
