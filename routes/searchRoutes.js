const searchController = require('../controllers/searchController');

async function searchRoutes(fastify, options) {
  fastify.get('/search-without-name/:searchTerm', async (request, reply) => {
    try {
      await searchController.searchDocumentsWithoutName(request, reply);
      return reply;
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.get('/search/:documentName/:searchTerm', async (request, reply) => {
    try {
      const { documentName, searchTerm } = request.params;
      const { etapeName } = request.query;
      
      await searchController.searchDocuments(request, reply);
      return reply;
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Add wrapper for proposition search with proper parameter validation
  fastify.get('/search-propositions/:searchTerm', {
    schema: {
      params: {
        type: 'object',
        required: ['searchTerm'],
        properties: {
          searchTerm: { 
            type: 'string',
            minLength: 1
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Decode the search term before passing to controller
      request.params.searchTerm = decodeURIComponent(request.params.searchTerm);
      await searchController.searchPropositions(request, reply);
      return reply;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Convert to GET route only for search1Highligth
  fastify.get('/search1Highligth/:searchTerm', {
    schema: {
      params: {
        type: 'object',
        required: ['searchTerm'],
        properties: {
          searchTerm: { 
            type: 'string',
            minLength: 1
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      request.params.searchTerm = decodeURIComponent(request.params.searchTerm);
      const response = await searchController.searchPropositions(request, reply);
      return response;
    } catch (error) {
      fastify.log.error('Search error:', {
        method: request.method,
        searchTerm: request.params.searchTerm,
        error: error.message
      });
      if (error.code === 'ECONNREFUSED') {
        return reply.code(503).send({
          success: false,
          error: 'Service Unavailable',
          message: 'Elasticsearch service is not available'
        });
      }
      return reply.status(500).send({ 
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  // Convert to GET route only for highlightera2
  // Route améliorée pour gérer les noms de fichiers complexes avec extensions
  fastify.get('/highlightera2/:documentName/:searchTerm', {
    schema: {
      params: {
        type: 'object',
        required: ['documentName', 'searchTerm'],
        properties: {
          documentName: { 
            type: 'string',
            // Permettre tous les caractères valides pour un nom de fichier
            pattern: '^.+$'
          },
          searchTerm: { 
            type: 'string',
            minLength: 1
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Décoder les paramètres URL pour gérer les caractères spéciaux
      request.params.documentName = decodeURIComponent(request.params.documentName);
      request.params.searchTerm = decodeURIComponent(request.params.searchTerm);
      
      fastify.log.info('highlightera2 route called:', {
        documentName: request.params.documentName,
        searchTerm: request.params.searchTerm,
        originalUrl: request.url
      });
      
      await searchController.highlightDocument(request, reply);
      return reply;
    } catch (error) {
      fastify.log.error('Error in highlightera2 route:', {
        error: error.message,
        documentName: request.params?.documentName,
        searchTerm: request.params?.searchTerm,
        stack: error.stack
      });
      return reply.status(500).send({ 
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  // Route alternative pour les noms de documents très longs ou complexes
  // Utilise query parameters: /highlightera2?doc=documentName&term=searchTerm
  fastify.get('/highlightera2', {
    schema: {
      querystring: {
        type: 'object',
        required: ['doc', 'term'],
        properties: {
          doc: { 
            type: 'string',
            minLength: 1,
            description: 'Document name'
          },
          term: { 
            type: 'string',
            minLength: 1,
            description: 'Search term'
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Mapper les query parameters vers les paramètres attendus
      request.params = {
        documentName: request.query.doc,
        searchTerm: request.query.term
      };
      
      fastify.log.info('highlightera2 query route called:', {
        documentName: request.query.doc,
        searchTerm: request.query.term,
        queryString: request.query
      });
      
      await searchController.highlightDocument(request, reply);
      return reply;
    } catch (error) {
      fastify.log.error('Error in highlightera2 query route:', {
        error: error.message,
        query: request.query,
        stack: error.stack
      });
      return reply.status(500).send({ 
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  // Route REST format pour la recherche dans un document spécifique
  // Pattern: /documents/:documentName/search/:searchTerm
  fastify.get('/documents/:documentName/search/:searchTerm', {
    schema: {
      params: {
        type: 'object',
        required: ['documentName', 'searchTerm'],
        properties: {
          documentName: { type: 'string' },
          searchTerm: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Rediriger vers la fonction de recherche existante
      await searchController.searchDocuments(request, reply);
      return reply;
    } catch (error) {
      fastify.log.error('Document search error:', {
        method: request.method,
        documentName: request.params.documentName,
        searchTerm: request.params.searchTerm,
        error: error.message
      });
      return reply.status(500).send({ 
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  // Route de fallback pour capturer toutes les URLs highlightera2 complexes
  // Cette route doit être la DERNIÈRE pour capturer ce qui n'est pas matché par les routes spécifiques
  fastify.get('/highlightera2/*', {
    schema: {
      params: {
        type: 'object',
        properties: {
          '*': { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Extraire documentName et searchTerm de l'URL wildcard
      const fullPath = request.params['*'];
      const decodedPath = decodeURIComponent(fullPath);
      
      fastify.log.info('highlightera2 wildcard fallback triggered:', {
        fullPath,
        decodedPath,
        originalUrl: request.url
      });
      
      // Séparer le chemin en segments - le dernier est le terme de recherche
      const pathSegments = decodedPath.split('/').filter(segment => segment.length > 0);
      
      if (pathSegments.length < 2) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'URL must contain document name and search term',
          received: request.url,
          expected: '/highlightera2/documentName/searchTerm or /highlightera2?doc=documentName&term=searchTerm'
        });
      }
      
      // Le dernier élément est le terme de recherche
      const searchTerm = pathSegments[pathSegments.length - 1];
      // Tout le reste constitue le nom du document
      const documentName = pathSegments.slice(0, -1).join('/');
      
      fastify.log.info('wildcard route parsed:', {
        documentName,
        searchTerm,
        pathSegments
      });
      
      // Reconstituer la structure de paramètres attendue par le contrôleur
      request.params = {
        documentName: documentName,
        searchTerm: searchTerm
      };
      
      // Appeler le contrôleur
      await searchController.highlightDocument(request, reply);
      return reply;
    } catch (error) {
      fastify.log.error('Error in highlightera2 wildcard fallback:', {
        error: error.message,
        fullPath: request.params?.['*'],
        originalUrl: request.url,
        stack: error.stack
      });
      return reply.status(500).send({ 
        error: 'Internal Server Error',
        message: 'Failed to process document request',
        details: error.message
      });
    }
  });
}

module.exports = searchRoutes;
