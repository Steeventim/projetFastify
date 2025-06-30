// Extraction de texte PDF compatible Node.js 20+ et pdfjs-dist ESM (build legacy)
import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
// Correction workerSrc : build legacy (must be a file:// URL on Windows)
const workerSrcPath = join(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerSrcPath).href;

/**
 * Extrait le texte d'un PDF (Buffer ou chemin)
 * @param {Buffer|string} pdfInput - Buffer PDF ou chemin de fichier
 * @returns {Promise<{text: string, numpages: number}>}
 */
export async function extractPdfText(pdfInput) {
  let data;
  if (Buffer.isBuffer(pdfInput)) {
    data = new Uint8Array(pdfInput);
  } else if (typeof pdfInput === 'string') {
    data = new Uint8Array(fs.readFileSync(pdfInput));
  } else {
    throw new Error('Entrée PDF invalide');
  }

  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n\n';
  }
  await pdf.destroy();
  return { text, numpages: pdf.numPages };
}
