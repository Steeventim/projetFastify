const documentTransferController = require('../controllers/documentTransferController');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = function(fastify, opts, done) {
  // Send a document to another user
  fastify.post('/documents/send', {
    preHandler: [authMiddleware.authenticate],
    handler: documentTransferController.sendDocument
  });

  // Get received documents
  fastify.get('/documents/received', {
    preHandler: [authMiddleware.authenticate],
    handler: documentTransferController.getReceivedDocuments
  });

  // Mark document as viewed
  fastify.put('/documents/transfers/:transferId/view', {
    preHandler: [authMiddleware.authenticate],
    handler: documentTransferController.markAsViewed
  });

  done();
};
