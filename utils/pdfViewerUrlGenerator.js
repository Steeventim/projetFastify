/**
 * Utilitaire pour générer les URLs de visualisation PDF avec recherche
 * Gère automatiquement les noms de documents complexes
 */

class PDFViewerUrlGenerator {
  constructor(baseUrl = 'http://localhost:3003') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Enlever le slash final
  }

  /**
   * Génère une URL de visualisation PDF optimale selon la complexité du nom de document
   * @param {string} documentName - Nom du document
   * @param {string} searchTerm - Terme de recherche
   * @returns {string} URL optimisée pour la visualisation
   */
  generateViewerUrl(documentName, searchTerm) {
    const cleanDocName = documentName?.trim() || '';
    const cleanSearchTerm = searchTerm?.trim() || '';
    if (!cleanDocName || !cleanSearchTerm) {
      throw new Error('Document name and search term are required');
    }
    return this.generateQueryUrl(cleanDocName, cleanSearchTerm);
  }

  isComplexDocumentName(documentName) {
    const criteria = {
      tooLong: documentName.length > 80,
      moderatelyLong: documentName.length > 60,
      hasManySpaces: (documentName.match(/\s/g) || []).length > 8,
      hasSpecialChars: /[^\w\s\-_.]/g.test(documentName),
      hasUnicodeChars: /[^\x00-\x7F]/g.test(documentName),
      hasConsecutiveSpaces: /\s{2,}/g.test(documentName),
      hasNumbers: /\d{4}/g.test(documentName),
      hasMultipleDots: (documentName.match(/\./g) || []).length > 1
    };
    const complexityScore = Object.values(criteria).filter(Boolean).length;
    return criteria.tooLong || 
           (criteria.moderatelyLong && complexityScore >= 2) ||
           complexityScore >= 3;
  }

  generateNormalUrl(documentName, searchTerm) {
    const encodedDoc = encodeURIComponent(documentName);
    const encodedTerm = encodeURIComponent(searchTerm);
    return `${this.baseUrl}/highlightera2/${encodedDoc}/${encodedTerm}`;
  }

  generateQueryUrl(documentName, searchTerm) {
    const params = new URLSearchParams({
      doc: documentName,
      term: searchTerm
    });
    return `${this.baseUrl}/highlightera2?${params.toString()}`;
  }
}

module.exports = PDFViewerUrlGenerator;
