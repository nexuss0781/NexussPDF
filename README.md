# NexussPDF

NexussPDF is a standalone PDF text-extraction library and command-line tool derived from the PDF-specific implementation in [`nexuss0781/vault-operator`](https://github.com/nexuss0781/vault-operator). It supports two end-to-end paths:

| PDF type | Primary method | Output |
|---|---|---|
| Selectable/text PDF | `pdfjs-dist` | Normalized text grouped under `## Page N` headings. |
| Scanned/image-only PDF | `pdftoppm` rendering followed by `tesseract` OCR | OCR text grouped under `## Page N` headings. |

The implementation keeps the original PDF unchanged. It extracts text and returns structured metadata; it does not merge, split, rotate, redact, annotate, fill, or rewrite PDF files.

## Installation

The selectable-text path requires Node.js 18 or newer. The scanned-PDF fallback additionally requires the `pdftoppm` and `tesseract` executables. On Debian/Ubuntu:

```bash
sudo apt-get install poppler-utils tesseract-ocr tesseract-ocr-eng
npm install
```

## Usage

```bash
node src/cli.js document.pdf > document.md
node src/cli.js scanned-document.pdf --dpi 200 --language eng > document.md
node src/cli.js document.pdf --no-ocr > document.md
```

The CLI writes extracted text to standard output and a JSON summary to standard error. The JavaScript API is:

```js
import { extractPdf } from 'nexuss-pdf';

const result = await extractPdf('document.pdf', { dpi: 200, language: 'eng' });
console.log(result.method);             // pdfjs or ocr
console.log(result.metadata.pageCount);
console.log(result.text);
```

## Architecture

`src/parser.js` is the port of the upstream `PdfParser.parsePdf()` behavior. It copies the input bytes before handing them to PDF.js, uses in-process parsing, calls `getPage()` and `getTextContent()` for each page, normalizes whitespace, emits page headings, and enforces page and output-size caps.

`src/ocr.js` is the standalone replacement for the upstream Obsidian `text-extractor` integration. The upstream semantic indexer invokes that optional plugin when PDF.js finds no text. NexussPDF makes the boundary portable by rendering pages with Poppler’s `pdftoppm` and passing each PNG through Tesseract.

`src/index.js` implements the end-to-end policy: PDF.js is attempted first; the OCR adapter runs only when the result is image-only and OCR has not been disabled with `{ ocr: false }`.

The `ported/vault-operator/` directory preserves the relevant upstream source files for traceability. The standalone runtime does not import Obsidian APIs, so it can be used from Node.js applications, scripts, and CI.

## Verification

Fixtures are generated deterministically with:

```bash
npm run fixture
npm test
npm run benchmark
node scripts/quality.mjs
```

The test suite covers selectable extraction, explicit no-text behavior for scanned PDFs when OCR is disabled, and scanned-PDF OCR fallback. The benchmark repeats each case three times. The quality script compares normalized output with fixture ground truth using edit distance and expected phrase checks.

The validation run used Node.js v22.13.0 on the sandbox Linux x86_64 environment. Results for the included two-page fixtures were:

| Case | Method | File size | Median latency | Median byte throughput | Quality |
|---|---:|---:|---:|---:|---:|
| Selectable PDF | PDF.js | 1,926 bytes | 6.46 ms | 0.284 MB/s | 100% / edit distance 0 |
| Scanned PDF | Tesseract OCR | 52,494 bytes | 545.22 ms | 0.092 MB/s | 100% / edit distance 0 |

These are fixture-level measurements, not universal production guarantees. OCR latency depends heavily on page dimensions, DPI, language packs, layout complexity, and CPU availability. The raw machine-readable results are in `results/benchmark.json` and `results/quality.json`.

## Provenance and limitations

The ported implementation originates from these upstream files:

- `src/core/document-parsers/parsers/PdfParser.ts`
- `src/core/document-parsers/parseDocument.ts`
- `src/core/assets/bundle-entries/pdfjs-entry.ts`
- `src/core/assets/BundleLoader.ts`
- `src/core/assets/OptionalAssetManager.ts`
- `src/core/semantic/SemanticIndexService.ts`
- `src/core/tools/vault/ReadDocumentTool.ts`
- `src/core/tools/vault/IngestDocumentTool.ts`
- `src/core/ingest/PdfMarkdownMirror.ts`
- `src/ui/sidebar/AttachmentHandler.ts`

The upstream parser returns an explicit no-extractable-text marker for image-only PDFs. Its OCR fallback is indexing-specific and depends on Obsidian’s optional `text-extractor` plugin. NexussPDF preserves the parsing semantics while providing an independent CLI OCR adapter so scanned PDFs can be validated outside Obsidian.

## License

This project retains the Apache-2.0 licensing context of the upstream repository. See `LICENSE` and the upstream notice for attribution details.
