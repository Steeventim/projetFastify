const searchService = require('../services/searchService');

async function run(documentName, searchTerm) {
  try {
    console.log('Calling generateDocumentPreview...');
    const previewData = await searchService.generateDocumentPreview(documentName, searchTerm);
    console.log('Preview pages returned:', (previewData.previewPages || []).map(p => ({ pageNumber: p.pageNumber, pageType: p.pageType, hasMatches: p.hasMatches })));

    console.log('Now calling generateStructuredPDF to see copy logs...');
    const pdfBuffer = await searchService.generateStructuredPDF(previewData, documentName, searchTerm);
    console.log('generateStructuredPDF returned bytes:', pdfBuffer.length);
  } catch (e) {
    console.error('Error in inspect script:', e && e.message ? e.message : e);
    console.error(e.stack);
    process.exit(1);
  }
}

const doc = process.argv[2] || 'L1_output.pdf';
const term = process.argv[3] || 'talom';
run(doc, term);
