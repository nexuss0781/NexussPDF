import { readFile } from 'node:fs/promises';
import { parsePdf, hasExtractableText } from './parser.js';
import { ocrPdf } from './ocr.js';

export { parsePdf, hasExtractableText, ocrPdf };

/** End-to-end extraction: PDF.js first, OCR fallback for image-only PDFs. */
export async function extractPdf(filePath, options = {}) {
  const data = await readFile(filePath);
  const parsed = await parsePdf(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), options);
  if (hasExtractableText(parsed) || options.ocr === false) {
    return { ...parsed, method: 'pdfjs' };
  }
  const ocr = await ocrPdf(filePath, options);
  return { text: ocr.text, images: [], metadata: { format: 'pdf', pageCount: ocr.pageCount }, method: 'ocr', ocr };
}
