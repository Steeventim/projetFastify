const path = require('path');
const { extractPdfText } = require('../utils/pdfTextExtractorWrapper');

async function run(filePath, term) {
  try {
    console.log('Loading with extractor:', filePath);
    const res = await extractPdfText(filePath);
    console.log(`Extractor reported ${res.numpages} pages`);
    if (!res.pages) {
      console.log('No per-page array returned, showing first 200 chars of full text:');
      console.log(res.text.substring(0, 200));
      return;
    }
    const pages = res.pages;
    const normalized = (term || '').toLowerCase();
    const matches = [];
    for (let i = 0; i < pages.length; i++) {
      const p = (pages[i] || '').toLowerCase();
      if (p.includes(normalized)) {
        matches.push({ page: i + 1, snippet: pages[i].substring(Math.max(0, p.indexOf(normalized) - 50), Math.min(p.length, p.indexOf(normalized) + normalized.length + 50)) });
      }
    }
    console.log('Matches found:', matches.length);
    matches.forEach(m => console.log(`Page ${m.page}: ...${m.snippet}...`));
  } catch (e) {
    console.error('Error running check:', e && e.message ? e.message : e);
    process.exit(1);
  }
}

const file = process.argv[2];
const term = process.argv[3] || 'talom';
if (!file) {
  console.error('Usage: node checkMatchPages.js <path-to-pdf> [term]');
  process.exit(1);
}
run(file, term);
