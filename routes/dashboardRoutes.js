const dashboardController = require('../controllers/dashboardController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

/**
 * Routes Dashboard Admin
 * @param {Object} fastify - Instance Fastify
 * @param {Object} options - Options de configuration
 */
async function dashboardRoutes(fastify, options) {
  // Middleware d'authentification pour toutes les routes du dashboard
  fastify.addHook('preHandler', async (request, reply) => {
    await verifyToken(request, reply);
    await requireRole(['admin', 'superadmin'])(request, reply);
  });

  // 📊 Route vue d'ensemble générale
  fastify.get('/admin/dashboard/overview', {
    schema: {
      description: 'Récupère les statistiques générales du système',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            timestamp: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                users: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    active: { type: 'number' },
                    inactive: { type: 'number' },
                    activePercentage: { type: 'number' }
                  }
                },
                documents: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    pending: { type: 'number' },
                    processed: { type: 'number' },
                    pendingPercentage: { type: 'number' }
                  }
                },
                system: {
                  type: 'object',
                  properties: {
                    etapes: { type: 'number' },
                    roles: { type: 'number' },
                    structures: { type: 'number' },
                    typeProjets: { type: 'number' },
                    files: { type: 'number' }
                  }
                },
                notifications: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    unread: { type: 'number' },
                    read: { type: 'number' },
                    unreadPercentage: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getOverview);

  // 👥 Route statistiques des utilisateurs
  fastify.get('/admin/dashboard/users', {
    schema: {
      description: 'Récupère les statistiques détaillées des utilisateurs',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            timestamp: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                byRole: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      description: { type: 'string' },
                      userCount: { type: 'number' }
                    }
                  }
                },
                recentActivity: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      idUser: { type: 'string' },
                      Email: { type: 'string' },
                      NomUser: { type: 'string' },
                      PrenomUser: { type: 'string' },
                      LastLogin: { type: 'string' },
                      IsActive: { type: 'boolean' }
                    }
                  }
                },
                growthByMonth: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      month: { type: 'string' },
                      count: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, dashboardController.getUserStats);

  // 📄 Route statistiques des documents
  fastify.get('/admin/dashboard/documents', {
    schema: {
      description: 'Récupère les statistiques détaillées des documents',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }]
    }
  }, dashboardController.getDocumentStats);

  // 🔔 Route statistiques des notifications
  fastify.get('/admin/dashboard/notifications', {
    schema: {
      description: 'Récupère les statistiques des notifications du système',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }]
    }
  }, dashboardController.getNotificationStats);

  // 🎯 Route statistiques des flux de travail
  fastify.get('/admin/dashboard/workflow', {
    schema: {
      description: 'Récupère les statistiques des étapes et flux de travail',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }]
    }
  }, dashboardController.getWorkflowStats);

  // 📁 Route statistiques des fichiers
  fastify.get('/admin/dashboard/files', {
    schema: {
      description: 'Récupère les statistiques des fichiers du système',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }]
    }
  }, dashboardController.getFileStats);

  // 📊 Route métriques de performance
  fastify.get('/admin/dashboard/metrics', {
    schema: {
      description: 'Récupère les métriques de performance du système',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }]
    }
  }, dashboardController.getSystemMetrics);

  // 🔄 Route données en temps réel
  fastify.get('/admin/dashboard/realtime', {
    schema: {
      description: 'Récupère les données en temps réel pour les graphiques dynamiques',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }]
    }
  }, dashboardController.getRealTimeData);

  // 📈 Route dashboard complet
  fastify.get('/admin/dashboard/complete', {
    schema: {
      description: 'Récupère toutes les données du dashboard en une seule requête optimisée',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }]
    }
  }, dashboardController.getCompleteData);

  // Route de test pour vérifier l'accès admin
  fastify.get('/admin/dashboard/test', {
    schema: {
      description: 'Route de test pour vérifier l\'accès administrateur',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                roles: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return reply.send({
      success: true,
      message: 'Accès administrateur confirmé',
      user: {
        id: request.user.idUser,
        email: request.user.Email,
        roles: request.user.roles?.map(role => role.name) || []
      },
      timestamp: new Date().toISOString()
    });
  });
}

module.exports = dashboardRoutes;