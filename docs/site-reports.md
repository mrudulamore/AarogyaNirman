# Measurement Book and material testing reports

Open Projects → a permitted project → Quality & inspections → Quality → Measurements & material tests. Finance also links to the register for roles allowed to view Quality. Pending review tasks route to Quality.

Assigned Junior/Deputy Engineers, Executive Engineers, PMC and Superadmins can submit. Assigned Executive Engineers, PMC and Superadmins can review; the author cannot review their own entry. Other roles with Quality access can read/export.

MB entries capture book/page, date, BOQ, location, dimensional or explained direct quantities, deductions, BOQ rate/unit and optional bill. Quantities are computed and validated; duplicate active entries for the same book/page/item/location are blocked. The PDF includes an accepted-quantity abstract and detailed records. Measurements do not automatically certify a bill or add to the existing billed-quantity ledger.

Material reports capture sample/batch, collection/test dates, laboratory reference, standard, acceptance criteria, measured result/unit and explicit PASS/FAIL/INCONCLUSIVE outcome. BOQ linkage is mandatory; matching MB, inspection and bill links are optional. Acceptance verifies the record and never changes its laboratory outcome. Failed results remain visibly flagged.

Both support account/project-specific saved form drafts, search/status filters, PDF export, up to six PDF/JPEG/PNG files (5 MB each), and independent acceptance/return with decision notes. Corrected submissions retain a reference to the returned record. Draft files must be reattached. Submitted reports retain author and review timestamps.

Frontend persistence uses the existing local store and IndexedDB. There is no shared server storage or legally signed departmental e-MB certification in this change; the existing backend phase remains separate. No automatic test pass criteria, fabricated measurements or laboratory records were added.

Validation: siteReports.mjs covers arithmetic, invalid dates, duplicates, scope, submission/review roles, failed-result preservation and task routing. Browser checks at 1440px and 390px cover drafts after reload, real evidence upload, both submissions and horizontal overflow. Build and localization checks run for both repositories.
