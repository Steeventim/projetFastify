// Extraction de texte PDF compatible Node.js 18+/20+
const fs = require('fs');
const pdfjsLib = require('pdfjs-dist');
pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.js');

/**
 * Extrait le texte d'un PDF (Buffer ou chemin)
 * @param {Buffer|string} pdfInput - Buffer PDF ou chemin de fichier
 * @returns {Promise<{text: string, numpages: number}>}
 */
async function extractPdfText(pdfInput) {
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

module.exports = { extractPdfText };
