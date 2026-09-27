# Numeric audit — 27 September 2026

Audited the bundled demonstration portfolio in both repositories: 36 projects and 65 bills. This does not inspect transactions stored on other users’ devices.

- Corrected generated receipts that exceeded sanction: the old generator added 5% to expenditure even for fully spent projects. Only generated receipts are capped.
- Untouched monthly demo ledgers are migrated by comparing every record field; edited records, additional transactions and changed sanctions are preserved. Older edited/opening balances require individual review.
- Historical sample receipts no longer reappear as pending disbursal plans.
- Mobile utilisation now means expenditure / sanction; release coverage remains receipts / sanction. Average physical progress includes the same portfolio as insights.
- Project finance shows a review warning for receipts above sanction or expenditure above available funds/sanction, without overwriting saved transactions.
- Mobile payment reports retain verified payments without linked bills, matching the ledger; associations are not invented.
- Bill net arithmetic includes GST, deductions, retention and penalties.

Portfolio totals in rupees: sanction 15,734,000,000; corrected receipts 13,424,171,850 (previously 13,822,301,850); expenditure unchanged at 13,164,097,000.

Regression checks cover project limits, finite progress percentages, bill arithmetic, per-project report totals, monthly expenditure totals, historical plans, migration idempotency and preservation of edits/changed sanctions. Actual ledger entries are not clipped to sanction. Demo payments without bill links remain explicitly unlinked; no evidence or bill associations are fabricated.
