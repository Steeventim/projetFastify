const { Document, Role } = require('../models');

const checkEtapeAccess = async (request, reply) => {
  try {
    const { documentTitle } = request.body || request.params;
    const userRoles = request.user.Roles;

    // Find document and its current etape
    const document = await Document.findOne({
      where: { Title: documentTitle }
    });

    if (!document || !document.etapeId) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Document or etape not found'
      });
    }

    // Check if any of the user's roles have access to this etape
    const hasAccess = userRoles.some(role => role.etapeId === document.etapeId);

    if (!hasAccess) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to manipulate documents at this etape'
      });
    }

    // Add etape info to request for later use
    request.etapeInfo = {
      etapeId: document.etapeId,
      roles: userRoles.filter(role => role.etapeId === document.etapeId)
    };

    return true;
  } catch (error) {
    console.error('Etape access check error:', error);
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'Error checking etape access'
    });
  }
};

module.exports = { checkEtapeAccess };
