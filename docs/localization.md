# Interface language coverage

The website and Capacitor Android app share the same React interface. The English/Hindi/Marathi selector now drives source-message translations across project sections, forms, notices, status labels, chart legends, map popups, report cards and accessible labels. Components subscribe to language changes without remounting forms or changing saved values. The HTML language attribute and shared date/currency formatting follow the selection.

## Maintaining translations

- Existing i18next keys remain in `src/i18n/locales/{en,hi,mr}.json`.
- Additional exact interface messages are in `interface.tsv` (pipe-separated English, Hindi, Marathi); generate the runtime JSON with `node scripts/build-interface-catalog.mjs`.
- Use `uiText('Complete English message')` for interface text. Use `uiMessage('Message with {{0}}', [value])` for variable content. Do not concatenate translatable sentence fragments in new code.
- Translate display labels, never form values, route IDs, enum values, user identities or database keys. `uiText` passes non-string values through and preserves unknown text. It does not perform external machine translation.
- `node scripts/audit-interface.mjs --check` checks common static interface-message sources for missing entries. It is a regression aid, not proof that all runtime-generated content is covered.
- `node tests/localization.mjs` checks both catalogs, interpolation parameters, rendered form/status labels, enum display text, dates/currency and preservation of project records across language switches.

## Explicit remaining boundaries

- Signed/uploaded documents, personal/project names, geographic names, user-entered descriptions and existing audit narratives retain their recorded content. To show translated narrative records, add separately authored language versions linked to the original.
- Legacy PDF exports remain English because their Helvetica renderer cannot correctly render Devanagari. Export-only dates/currency retain English formatting. A proper multilingual export needs a font/shaping-capable renderer and accessible document testing.
- Native camera/file-picker windows, browser validation messages and third-party map tiles use their platform/provider language. The app’s own file-upload button and help text are translated.
- The separate Expo prototype is not the Capacitor app and was not changed in this pass.
- A fluent departmental reviewer should approve terminology, especially Marathi procurement/engineering terms. Browser/device testing of long text, dialog focus, screen readers and keyboard navigation is still required before government deployment.
