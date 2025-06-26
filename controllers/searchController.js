const axios = require('axios');
const { Document } = require('../models');
const { v4: uuidv4, validate: isUUID } = require('uuid');
const searchService = require('../services/searchService');
const PDFKit = require('pdfkit');
const { sequelize } = require('../models');

// Fonction utilitaire pour créer ou mettre à jour un document
const createOrUpdateDocument = async (document, documentName, documentUrl, transaction) => {
  if (!document) {
    return await Document.create({
      idDocument: uuidv4(),
      Title: documentName,
      url: documentUrl,
      status: 'indexed',
      transferStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }, { transaction });
  } else {
    await document.update({
      updatedAt: new Date()
    }, { transaction });
    return document;
  }
};

const searchController = {
  searchDocumentsWithoutName: async (request, reply) => {
    const { searchTerm } = request.params;

    if (!searchTerm) {
      return reply.code(400).send({ error: 'Search term is required' });
    }

    try {
      // Use internal search service instead of external API
      console.log('Searching for term without specific document:', searchTerm);
      
      const searchResponse = await searchService.searchWithHighlight(searchTerm);
      
      if (!searchResponse || searchResponse.hits.total.value === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Not Found',
          message: 'No results found for the search term',
          searchTerm
        });
      }

      return reply.send({
        success: true,
        searchTerm,
        totalResults: searchResponse.hits.total.value,
        data: searchResponse.hits.hits.map(hit => ({
          filename: hit._source.file?.filename || 'Unknown',
          content: hit._source.content || '',
          highlight: hit.highlight || null,
          score: hit._score
        }))
      });

    } catch (error) {
      console.error('Search error:', {
        message: error.message,
        searchTerm,
        stack: error.stack
      });

      if (error.code === 'ECONNREFUSED') {
        return reply.code(503).send({
          error: 'Search service unavailable',
          details: 'Could not connect to Elasticsearch'
        });
      }
      
      return reply.code(500).send({
        error: 'Search service error',
        details: error.message
      });
    }
  },

  searchDocuments: async (request, reply) => {
    const { documentName, searchTerm } = request.params;

    if (!documentName || !searchTerm) {
      return reply.code(400).send({ error: 'Document name and search term are required' });
    }

    try {
      // Use internal search service instead of external API
      console.log('Processing search for document:', documentName, 'with term:', searchTerm);
      
      // Search using the internal search service
      const searchResponse = await searchService.searchWithHighlight(searchTerm);
      
      if (!searchResponse || searchResponse.hits.total.value === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Not Found',
          message: 'No results found for the search term',
          documentName,
          searchTerm
        });
      }

      // Find or filter documents by name if needed
      const relevantHits = searchResponse.hits.hits.filter(hit => 
        hit._source.filename && hit._source.filename.includes(documentName)
      );

      if (relevantHits.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Not Found',
          message: 'Document not found in search results',
          documentName,
          searchTerm
        });
      }

      return reply.send({
        success: true,
        message: 'Search completed successfully',
        documentName,
        searchTerm,
        data: {
          total: relevantHits.length,
          hits: relevantHits
        }
      });

    } catch (error) {
      console.error('Search error:', {
        message: error.message,
        documentName,
        searchTerm,
        stack: error.stack
      });

      return reply.code(503).send({ 
        success: false,
        error: 'Search Service Error',
        message: 'Unable to process search request',
        details: error.message
      });
    }
  },

  searchPropositions: async (request, reply) => {
    try {
      const { searchTerm } = request.params;
      
      if (!searchTerm) {
        return reply.code(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Search term is required'
        });
      }

      const response = await searchService.searchWithHighlight(searchTerm);
      
      if (!response || response.hits.total.value === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Not Found',
          message: 'No results found for the search term',
          searchTerm
        });
      }

      return reply.send({
        success: true,
        searchTerm: searchTerm,
        query: {
          original: searchTerm,
          encoded: encodeURIComponent(searchTerm)
        },
        data: response
      });
    } catch (error) {
      console.error('Error searching propositions:', {
        error: error.message,
        searchTerm: request.params?.searchTerm || 'unknown',
      });

      if (error.code === 'ECONNREFUSED') {
        return reply.code(503).send({
          success: false,
          error: 'Service Unavailable',
          message: 'Search service is currently unavailable'
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to process search request',
        details: error.message
      });
    }
  },  highlightDocument: async (request, reply) => {
    const t = await sequelize.transaction();

    try {
      let { documentName, searchTerm } = request.params;
      
      // Make sure the document name is properly decoded
      // Some URLs might be double-encoded, so decode multiple times if needed
      try {
        documentName = decodeURIComponent(documentName);
        // Check if still contains encoded characters
        if (documentName.includes('%')) {
          documentName = decodeURIComponent(documentName);
        }
      } catch (e) {
        console.warn('Error decoding document name:', e.message);
        // Continue with the original name if decoding fails
      }
      
      // Also ensure searchTerm is properly decoded
      try {
        searchTerm = decodeURIComponent(searchTerm);
      } catch (e) {
        console.warn('Error decoding search term:', e.message);
      }
      
      console.log('Processing document request with params:', {
        documentName,
        searchTerm
      });
      
      const space = ' ' + searchTerm.toLowerCase();
      const lowerSearchTerm = space;
      const baseUrl = process.env.BASE_URL || 'http://localhost:3003';

      // Construct document URL with search term
      const encodedDocName = encodeURIComponent(documentName);
      const encodedSearchTerm = encodeURIComponent(searchTerm);
      const documentUrl = new URL(`/documents/${encodedDocName}/search/${encodedSearchTerm}`, baseUrl).toString();

      console.log('Generated URL:', documentUrl);

      // Check if document already exists with this URL
      let document = await Document.findOne({
        where: { url: documentUrl },
        transaction: t
      });

      const searchResponse = await searchService.searchWithHighlight(normalizedSearchTerm);

      if (!searchResponse || searchResponse.hits.hits.length === 0) {
        await t.rollback();
        return reply.code(404).send({
          success: false,
          error: 'Not Found',
          message: 'Document not found'
        });
      }

      console.log('Calling generateDocumentPreview...');
      let previewResult = null;
      try {
        previewResult = await searchService.generateDocumentPreview(documentName, normalizedSearchTerm);
        console.log('generateDocumentPreview result:', previewResult ? 'Preview generated' : 'No preview');
      } catch (searchError) {
        console.error('Error in generateDocumentPreview:', searchError.message);
        previewResult = null; // Force fallback
      }

      if (!previewResult) {
        // Fallback: génération d'une prévisualisation basique
        const content = searchResponse.hits.hits[0]._source.content;
        const matchCount = (content.match(new RegExp(normalizedSearchTerm, 'gi')) || []).length;
        
        // Extraire le physicalPath depuis Elasticsearch si disponible
        const elasticsearchDoc = searchResponse.hits.hits[0]._source;
        const physicalPath = elasticsearchDoc.file?.path?.real || 
                           elasticsearchDoc.path?.real || 
                           elasticsearchDoc.file?.path || 
                           'Document non trouvé localement';
        
        previewResult = {
          documentInfo: {
            filename: documentName,
            totalPages: 'N/A',
            physicalPath: physicalPath,
            previewType: 'Elasticsearch Content'
          },
          searchInfo: {
            searchTerm: searchTerm,
            normalizedTerm: normalizedSearchTerm,
            matchCount: matchCount,
            timestamp: new Date().toISOString()
          },
          previewPages: [
            {
              pageNumber: 1,
              content: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
              hasMatches: true,
              matchHighlights: searchResponse.hits.hits[0].highlight?.content || []
            }
          ],
          summary: `Prévisualisation générée à partir d'Elasticsearch. ${matchCount} occurrence(s) trouvée(s).`
        };
      }

      // Sauvegarder les métadonnées du document
      document = await createOrUpdateDocument(document, documentName, documentUrl, t);
      await t.commit();

      // Générer le PDF physique simplifié (uniquement pages avec correspondances)
      console.log('Generating simplified PDF with only matching pages...');
      const pdfBuffer = await searchService.generateStructuredPDF(previewResult, documentName, searchTerm);

      // Configurer la réponse pour afficher le PDF dans le navigateur
      const filename = `${documentName}_recherche_${searchTerm}_${new Date().toISOString().split('T')[0]}.pdf`;
      reply.type('application/pdf');
      reply.header('Content-Disposition', `inline; filename="${filename}"`);
      reply.header('Content-Length', pdfBuffer.length);

      console.log(`=== highlightDocument END - PDF generated (${pdfBuffer.length} bytes) ===`);
      return reply.send(pdfBuffer);

    } catch (error) {
      await t.rollback();
      console.error('Error highlighting document:', {
        error: error.message,
        documentName,
        searchTerm,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      // Gestion spécifique des différents types d'erreurs
      if (error.message === 'Document not found') {
        return reply.code(404).send({
          success: false,
          error: 'Not Found',
          message: 'Document not found',
          documentName,
          searchTerm
        });
      }
      
      if (error.name === 'SequelizeError') {
        return reply.code(500).send({
          success: false,
          error: 'Database Error',
          message: 'Failed to save document metadata'
        });
      }

      if (error.code === 'ECONNREFUSED') {
        return reply.code(503).send({
          success: false,
          error: 'Service Unavailable',
          message: 'Search service is currently unavailable'
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to process document highlighting',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = searchController;
