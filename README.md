# NexussPDF

> Adapted from [Vault Operator](https://github.com/nexuss0781/vault-operator).

**Fast, deterministic PDF text extraction for Node.js — with OCR fallback for scanned documents.**

NexussPDF turns both text-based and image-only PDFs into clean, page-structured Markdown. It automatically uses native PDF text extraction when selectable text exists and switches to OCR when the document is scanned.

<div align="center">

| Selectable PDFs | Scanned PDFs | Page Structure | CLI + API |
|:---:|:---:|:---:|:---:|
| PDF.js | Tesseract OCR | `## Page N` | Node.js |

</div>

## Why NexussPDF?

PDFs are not all alike. Some contain a real text layer; others are collections of page images. NexussPDF handles both cases through one small API:

```text
PDF file
   │
   ├── Text layer found ──► PDF.js extraction
   │
   └── No text layer ────► Page rendering + Tesseract OCR
                                  │
                                  ▼
                       Markdown text by page
```

The original PDF is always treated as read-only. NexussPDF extracts text and metadata; it does not alter, rewrite, merge, split, rotate, redact, annotate, or otherwise manipulate PDF files.

## Features

- **Automatic detection:** PDF.js is attempted first, with OCR used only when no extractable text is found.
- **Stable page boundaries:** Every extracted page is emitted under a predictable `## Page N` heading.
- **Clean output:** Whitespace is normalized for downstream search, indexing, and LLM workflows.
- **Safety limits:** Extraction is capped at 2,000 pages and 50 MB of text output.
- **Useful metadata:** Results include extraction method, format, page count, and OCR settings when applicable.
- **Two interfaces:** Use the JavaScript API inside an application or the CLI from a shell.
- **Traceable organization:** The `ported/` directory preserves the related implementation files used during the standalone extraction.

## Quick start

### Requirements

The selectable-text path requires **Node.js 18 or newer**. The scanned-PDF path additionally requires Poppler’s `pdftoppm` and Tesseract.

On Debian or Ubuntu:

```bash
sudo apt-get install poppler-utils tesseract-ocr tesseract-ocr-eng
```

### Install

```bash
git clone https://github.com/nexuss0781/NexussPDF.git
cd NexussPDF
npm install
```

### Extract from the command line

```bash
# Automatic mode: PDF.js first, OCR fallback for scanned files
node src/cli.js document.pdf > document.md

# Force selectable-text extraction only
node src/cli.js document.pdf --no-ocr > document.md

# Configure OCR resolution and language
node src/cli.js scanned-document.pdf --dpi 300 --language eng > document.md
```

The extracted Markdown is written to standard output. A compact JSON summary is written to standard error:

```json
{
  "method": "ocr",
  "pages": 8,
  "characters": 12450
}
```

## JavaScript API

```js
import { extractPdf } from './src/index.js';

const result = await extractPdf('document.pdf', {
  dpi: 200,
  language: 'eng'
});

console.log(result.method);             // "pdfjs" or "ocr"
console.log(result.metadata.pageCount);
console.log(result.text);
```

For lower-level control:

```js
import { parsePdf, ocrPdf } from './src/index.js';

const selectable = await parsePdf(arrayBuffer);
const scanned = await ocrPdf('scanned-document.pdf', { dpi: 300 });
```

## Output format

```markdown
## Page 1

Text extracted from the first page.

## Page 2

Text extracted from the second page.
```

This format makes page-range slicing, citation, indexing, and document review straightforward while retaining the source page order.

## Architecture

| File | Responsibility |
|---|---|
| `src/parser.js` | PDF.js text-layer extraction, page grouping, normalization, and safety limits. |
| `src/ocr.js` | Scanned-page rendering and Tesseract OCR adapter. |
| `src/index.js` | Automatic PDF.js-first/OCR-fallback orchestration and public exports. |
| `src/cli.js` | Shell interface with JSON diagnostics. |
| `scripts/benchmark.mjs` | Repeated latency and byte-throughput measurements. |
| `scripts/quality.mjs` | Ground-truth comparison using edit distance and phrase checks. |
| `test/` | Deterministic fixtures and end-to-end tests. |
| `ported/` | Preserved related implementation files for traceability. |

## Performance snapshot

The included benchmark uses deterministic two-page fixtures and three repeated runs per case on Node.js v22.13.0.

| Workload | Method | Median latency | Median throughput | Quality |
|---|---|---:|---:|---:|
| Selectable PDF · 1.9 KB | PDF.js | **6.46 ms** | **0.284 MB/s** | **100%** |
| Scanned PDF · 52.5 KB | Tesseract OCR | **545.22 ms** | **0.092 MB/s** | **100%** |

These measurements are fixture-level baselines. OCR performance varies with page dimensions, DPI, language models, typography, layout complexity, and available CPU resources.

## Test and benchmark

Generate fixtures and run the functional suite:

```bash
npm run fixture
npm test
```

Run performance and quality checks:

```bash
npm run benchmark
node scripts/quality.mjs
```

The machine-readable outputs are committed in:

```text
results/benchmark.json
results/quality.json
```

The test suite verifies selectable extraction, explicit scanned-document detection when OCR is disabled, and the complete scanned-document OCR fallback.

## Operational notes

PDF.js extraction is deterministic for a given input and runtime. OCR is inherently more variable: increasing `--dpi` can improve recognition for small text but increases rendering time and memory use. Install additional Tesseract language packs when processing non-English documents, then pass the corresponding language code with `--language`.

Encrypted, malformed, or unreadable PDFs may fail before text extraction. The library intentionally does not bypass passwords or attempt destructive repair. Applications should catch extraction errors and decide whether to request a readable source file.

## License

Apache License 2.0. See [`LICENSE`](./LICENSE) for the complete license text.
