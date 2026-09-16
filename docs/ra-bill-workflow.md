# RA bill submission

## Workflow implemented

- The contractor for a project submits the current-period claim. Role and project scope are checked by the store action as well as the UI. The prototype currently maps its demo contractor login to the flagship project's firm through the existing scope model.
- Required fields: bill number/date, billing period, agreement/work-order reference, MB/e-MB reference and pages, description with BOQ references, itemized amounts, declaration, signed bill and measurement proof.
- Previous bill/measurement references and additional site photos, test reports or applicable material invoices can be supplied.
- Tax, retention, recovery and penalty amounts come from the signed claim and contract; no universal percentage is assumed. The app does not certify that the entered tax amounts or measurement quantities are correct.
- The existing review chain is Deputy Engineer (measurements), Executive Engineer (quality and approval), then Commissioner (payment). Contractors cannot verify, approve or pay their own bills. Reviewers can open proof from project Approvals or Finance.
- Attachments are PDF/JPEG/PNG, with a 5 MB per-file and six-file limit. File signatures are checked. Missing evidence prevents submission. Existing prototype bills are retained as historical records and may lack uploaded files.

## Reference basis

Reviewed online on September 16, 2026:

- [CPWD manual, Volume II, section 9](https://www.cpwd.gov.in/Publication/manualvolume2.PDF): contractor-prepared bills, scrutiny of measurement-book descriptions and quantities, and verification before payment.
- [CPWD published works manual, sections 7 and 9](https://www.cpwd.gov.in/newsitem/latestnewspdf/Final-WorksManual.pdf): previous measurement references and running-account billing records. This is a legacy manual, used for process context rather than a claim about current rates or contractual compliance.
- [CPWD SOP circular register](https://cpwd.gov.in/AllCirculars.aspx?Type=124): confirms subsequent amendments to the 2024 SOPs, including measurements. Department/project-specific requirements and the actual agreement must be checked before production adoption.

Mandatory upload categories, file-size limits and the declaration are application requirements. They do not assert that CPWD procedures or a particular checklist apply unchanged to every Maharashtra contract.

## Storage and deployment limits

The app is a local prototype without authenticated server APIs. Bill metadata remains in the existing persisted store; proof blobs are in IndexedDB to avoid filling localStorage with large files. Files survive reloads on the same browser/app origin but are not synchronized between users' devices. Clearing app/site data removes them. Production requires server-side authorization, durable object storage, malware scanning and audit records; client-side checks are not a security boundary.

Web and Capacitor Android use the same submission components. Browser/Android file pickers allow selecting existing signed documents and images. PDF preview depends on the browser/WebView; image previews and a download link are provided. Native device testing is still required.

Validation: `node tests/billSubmission.mjs`, `node tests/fundDisbursal.mjs`, `npm run build`.
