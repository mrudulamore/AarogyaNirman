# PDF exports

All report, finance, document-record and quality-report exports use `src/lib/pdf.ts`.

- PDFs are generated in a Web Worker so large tables do not block the screen. The generator is loaded on demand, compresses output, and returns a PDF Blob.
- Browsers download the Blob with a sanitized filename. The UI says the download has started; it cannot verify that the browser wrote the file to disk.
- Android calls the registered `PdfExport` plugin. Android's system document picker lets the user select Downloads or another document provider. The plugin writes the bytes off the UI thread and resolves only after the stream is closed. Cancelling does not report success. No broad storage permission is required.
- Exports display progress, prevent concurrent duplicate exports, and surface errors instead of premature success messages.
- Reports use the data available on the current device when export is requested; this change does not add server synchronization.

## Validation

```sh
npm ci
npm run build
node tests/pdfExport.mjs
node tests/fundDisbursal.mjs
node tests/billSubmission.mjs
npm run cap:sync
```

Build/install a new Android APK after syncing; a website update alone cannot add the Java plugin to an installed app. Use the repository's Java 17-compatible Android build environment.

Device acceptance checks:
1. Export government, contractor, roadmap, general and document-record PDFs.
2. Save to Downloads, open the PDF and verify the selected project/date and all pages.
3. Cancel the picker and confirm cancellation (not success), then export again.
4. Test a destination that cannot be written, verify an error and retry another location.
5. Export a large report, background/restore the app during the picker, and test a low-storage device.

Automated browser verification covered an actual Finance PDF download and native bridge mocks for save/cancel/failure. Native APK compilation and physical-device behavior require an Android SDK/JDK and device; bridge mocks are not a substitute for device testing.
