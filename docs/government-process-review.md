# Government hospital construction: workflow review

Reviewed 17 September 2026 against the current application code and official sources below. This is an implementation gap assessment, not a compliance certificate.

## Which rules apply

For a Maharashtra project, record the executing department, funding scheme, applicable Government Resolutions, delegated financial powers, signed contract and amendments. The [Maharashtra PWD rules-manual publication](https://pwd.maharashtra.gov.in/en/publication/a-book-onpublic-works-department-rules-manual/) is a starting point; verify the applicable current departmental orders before configuring approval limits.

The central [Procurement of Works Manual, second edition 2025](https://doe.gov.in/files/manuals_documents/Works_Manual_SE_2025.pdf) is a reference framework, not automatically the governing contract for every state project. It covers planning/sanctions, tender evaluation, securities, measurements, interim/final payment, variations and contract closure. Its preface requires checking subsequent changes. Sections 7.3–7.6 are particularly relevant: recorded measurements, engineer certification, recoveries and contract close-out must support payments; handing over a building is distinct from completing contractual liabilities. Do not hard-code universal tax rates, approval limits, payment deadlines or defect-liability durations from a different department’s template.

## Highest-priority code findings

| Priority | Existing implementation | Gap and recommended change | Acceptance check |
|---|---|---|---|
| P0 | `useStore.completeHandoverAndOperationalize` | It completes **every** handover step and forces both physical and financial progress to 100%. Replace this with a readiness evaluation and authorized sign-off. Preserve actual financial progress. | An outstanding critical defect, required certificate or unsigned handover step blocks operationalization. Payment remains derived from actual records. |
| P0 | Zustand persistence, role selection and local evidence storage | These are prototype controls. Add authenticated backend authorization, project/contract ownership, durable evidence storage, versioned records and an append-only audit trail. | A contractor cannot approve/pay their own claim through a direct API call or altered client state. Reviewer and uploader identities are independently recorded. |
| P0 | RA form, `billSubmission.ts`, `billAttachments.ts`, finance approvals | Contractor-only submission and mandatory signed bill/measurement proof already exist. Add structured measurement lines, previous/current/cumulative quantities, certified values and duplicate-quantity detection. | Submitted quantities cannot exceed authorized quantities without a linked approved variation; the reviewer sees previous claims alongside the new claim. |
| P0 | Commissioning checklists and handover screens | Status changes are not equivalent to regulatory approval. Create a certificate register with authority, applicability, document number, issue/expiry dates, evidence, verification and renewal alerts. | Missing, expired or rejected applicable certificates cannot be counted as “ready”; “not applicable” requires a reason and authorized approval. |
| P1 | Tender, governance and document screens | Much of the lifecycle is displayed, but the approval gates need enforcement. Link DPR, land/site possession, administrative/expenditure approval, technical sanction, drawing/estimate versions and budget availability. | A work order cannot bypass the configured prerequisite approvals. Superseded drawings remain retrievable. |
| P1 | Tender award and contractor records | Add a verifiable procurement file: portal/tender reference, published versions and corrigenda, bidder eligibility, evaluation minutes, conflict declarations, approving authority, securities and insurance validity. | Award evidence is complete; expired security/insurance creates an actionable exception. |
| P1 | Change orders, time extensions and site issues | Link each variation and extension to a contractual clause, cause, quantities/rates, schedule/cost impact, authority and signed decision. | No silent contract-value increase or backdated baseline overwrite; original and approved revised dates remain visible. |
| P1 | Funds reports and paid-bill status | Government receipts and contractor payments are separate concepts, but illustrative releases and bill counts are not a treasury ledger. Add actual installment records, accounting heads, transaction references, reversals and reconciliation. | Totals reconcile to source transactions. A “paid” toggle cannot stand in for a bank/treasury confirmation. |
| P1 | Defects and lifecycle narrative | A narrative currently assumes a **12-month** defect-liability period. Store the period from each signed contract, plus commencement, extensions, defect notices, close-out and security release authorization. | Different contracts can have different periods; unresolved liabilities block the relevant close-out/security-release step. |
| P1 | Quality checklists | Checklist results need approved inspection/test plans, sampling records, traceable laboratory results, drawing revisions, nonconformity correction and independent reinspection. Version the cited standards. | A failed critical test cannot be cleared merely by changing a label; its evidence and approving reviewer remain linked. |

These recommendations describe application controls inferred from the code review. The exact official approval chain must be configured from the project’s governing documents; the current role chain is not proof of statutory delegation.

## Hospital-specific readiness

[IPHS 2022 for district/sub-district hospitals](https://nhm.gov.in/images/pdf/guidelines/iphs/iphs-revised-guidlines-2022/01-SDH_DH_IPHS_Guidelines-2022.pdf) addresses infrastructure, service provision, staffing, equipment and quality. Use the relevant facility-specific standard rather than a single checklist for PHCs, CHCs and district hospitals. Proposed additions:

- **Design readiness:** department/room schedule against the approved bed capacity and services; patient/staff/material flows; accessible routes and toilets; infection-control separation; emergency access.
- **Engineering readiness:** witnessed tests and evidence for electrical protection and backup power, water quality/supply, drainage, ventilation, medical gases, lifts and fire systems. Record the approving professional and applicable test specification.
- **Operational readiness:** installed equipment inventory, acceptance/calibration records, manuals, maintenance arrangements, trained staff and receiving health-authority acceptance. Construction completion alone should not make the hospital operational.

For diagnostic X-ray services, [AERB’s official radiology guidance](https://www.aerb.gov.in/english/regulatory-facilities/radiation-facilities/application-in-medicine/diagnostic-radiology) requires relevant licensing and provides layout/shielding and quality-assurance guidance. Track those documents only for applicable services; do not apply X-ray licensing to every room or every imaging modality.

MPCB provides a [combined consent and biomedical-waste authorization workflow](https://www.ecmpcb.in/cca/ctf/Operate). Add the applicable consent/authorization, waste-management arrangements and conditions to the certificate register. Determine requirements from the hospital’s category, capacity and actual authorization; do not reuse non-bedded-facility exemptions for a bedded hospital.

Also include authority-confirmed applicability for building/occupancy approval, fire approval, electrical/lift permissions and other service-specific licences. The app should record the authority’s actual conditions and validity, not invent a universal renewal period.

## Website/app language and accessibility

[GIGW 3.0](https://guidelines.india.gov.in/guidelines/) covers government website/app quality, accessibility, security and governance. Language switching needs equivalent interface content, keyboard/screen-reader access, readable error messages and accessible documents—not just translated navigation.

The current change adds Hindi/Marathi interface messages and language-sensitive dates/currency. Remaining release checks include human review of government terminology; mobile/wide-screen layout and assistive-technology testing; translation of newly introduced messages; and a Devanagari-capable, accessible report-export pipeline. Existing uploaded records, personal/project names, reference numbers and source evidence are retained as recorded. Any translated document should be a linked version, not an overwrite of the signed original.

## Suggested implementation order

1. Backend identity, scope enforcement and durable evidence/audit storage.
2. Certificate register and evidence-based handover gates; remove automatic 100% financial completion.
3. Structured measurement certification, RA-bill reconciliation and actual payment transactions.
4. Contract securities, variations, extensions and defect-liability close-out.
5. Facility-specific commissioning and operational-readiness acceptance.
6. Multilingual document exports and complete accessibility acceptance testing.

No government-process rules were silently changed during this review. The process changes above are recommendations requiring the applicable project/department configuration, rather than assumed universal legal rules.
