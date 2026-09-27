# Visual clarity review — 27 September 2026

## Addressed

- Project finance progress: a single report month previously produced isolated points on a trend chart. It now uses a labelled snapshot with definitions, an explicit percentage-point comparison, and no invented monthly history. Two or more months retain a trend, visible legend, and a readable values table.
- Schedule estimate: the calculation is date-based, so the UI now says estimate instead of implying an approved physical baseline. Invalid/reversed schedule dates show unavailable rather than NaN.
- Reported versus certified: monthly progress-report values are labelled reported work. The mobile view no longer calls project certified progress reported progress in this chart.
- Finance KPIs: definitions clarify contract value, certified bill value, paid amounts, pending balances, deductions and processing time. Missing processing history displays an em dash rather than an apparent zero-day result.
- Sanction/payment comparison (website): values appear directly alongside horizontal bars. The display explains that categories must not be summed and that remaining contract value is not cash available.
- Bill ageing: totals and counts over 30 days are stated directly; submission age is not described as contractual overdue time.
- Monthly expenditure: last complete month is compared to its predecessor. The incomplete current month is called out separately. Colours, reversals and the limits of interpreting lower spending are explained. Mobile negative bars diverge left of zero.
- Shared KPI labels use sentence-style, larger type. Clickable KPI cards support Enter and Space.
- Shared tables gain alternating rows and tabular digits. Bill monetary columns are right-aligned and the gross/net/payment basis is explained.

## Validation

Both production builds passed. Both localization suites passed. Browser checks covered website and mobile widths; one-month example (28/20/18), multi-month series, no records, invalid schedule, and no horizontal page overflow. Regression tests are in tests/visualClarity.mjs.

## Scope

Reviewed the submitted example, project finance sections, expenditure visuals and reusable KPI/table components. This is not a claim that every screen in both products has been exhaustively reviewed. Existing transactions, workflows and access permissions are preserved. Source branches are based on website cd8f481 and mobile 0fc62d9, verified by a fresh GitHub fetch. Earlier local development is preserved in its original directories. No push, deployment or new APK is included.
