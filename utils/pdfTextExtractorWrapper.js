// CommonJS wrapper pour pdfTextExtractor.mjs
const path = require('path');
const { URL } = require('url');

/**
 * Wrapper CommonJS pour l'extracteur de texte PDF ESM
 * @param {Buffer|string} pdfInput - Buffer PDF ou chemin de fichier
 * @returns {Promise<{text: string, numpages: number, pageTexts: string[]}>}
 */
async function extractPdfText(pdfInput) {
  try {
    // Import dynamique avec URL file:// pour Windows
    const extractorPath = path.resolve(__dirname, './pdfTextExtractor.mjs');
    const fileURL = new URL(`file:///${extractorPath.replace(/\\/g, '/')}`);
    
    const { extractPdfText: esmExtractPdfText } = await import(fileURL.href);
    return await esmExtractPdfText(pdfInput);
  } catch (error) {
    console.error('Error in PDF text extraction wrapper:', error);
    throw error;
  }
}

module.exports = { extractPdfText };
