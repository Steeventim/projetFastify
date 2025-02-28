const { Document, Role, User, Etape } = require('../models');

const checkEtapeAccess = async (request, reply) => {
  try {
    const { documentId, userId } = request.params;

    // Get document and user with roles and etapes in parallel
    const [document, user] = await Promise.all([
      Document.findOne({
        where: { idDocument: documentId },
        include: [{
          model: Etape,
          as: 'etape',
          attributes: ['idEtape', 'roleId']
        }]
      }),
      User.findOne({
        where: { idUser: userId },
        include: [{
          model: Role,
          attributes: ['idRole', 'name']
        }]
      })
    ]);

    if (!document || !document.etape) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Document or etape not found'
      });
    }

    if (!user || !user.Roles) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'User not found or has no roles assigned'
      });
    }

    // Check if any of the user's roles match the etape's required role
    const hasAccess = user.Roles.some(role => role.idRole === document.etape.roleId);

    if (!hasAccess) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to access documents at this etape'
      });
    }

    // Add etape info to request for controllers to use
    request.etapeInfo = {
      etapeId: document.etape.idEtape,
      roleId: document.etape.roleId,
      roles: user.Roles.filter(role => role.idRole === document.etape.roleId)
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
