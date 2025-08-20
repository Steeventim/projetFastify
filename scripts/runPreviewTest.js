// Simple runner to test generateDocumentPreview
const searchService = require('../services/searchService');

async function run() {
  const doc = process.argv[2] || 'loi_n_2024_013_du_23_12_2024-web.pdf';
  const term = process.argv[3] || 'loi';
  try {
    const res = await searchService.generateDocumentPreview(doc, term);
    console.log('Result:', JSON.stringify({
      documentInfo: res.documentInfo,
      searchInfo: res.searchInfo,
      previewPagesCount: res.previewPages ? res.previewPages.length : 0,
      summary: res.summary
    }, null, 2));
  } catch (e) {
    console.error('Preview test error:', e && e.message ? e.message : e);
    process.exit(1);
  }
}

run();
