const { User, Role, Document, Etape, TypeProjet, Structure, File, Notification, Commentaire } = require('../models');
const { QueryTypes } = require('sequelize');
const db = require('../models');

// Helper: recursively convert numeric-looking strings to numbers for consistent JSON types
function normalizeNumericStrings(obj, _seen = new WeakSet()) {
  // Use a WeakSet to avoid infinite recursion on circular structures
  const seen = _seen instanceof WeakSet ? _seen : new WeakSet();

  if (obj === null || obj === undefined) return obj;

  // Primitives
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      if (/^\d+$/.test(obj)) return parseInt(obj, 10);
      if (/^\d+\.\d+$/.test(obj)) return parseFloat(obj);
    }
    return obj;
  }

  // Avoid cycles
  if (seen.has(obj)) return undefined;
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((v) => normalizeNumericStrings(v, seen)).filter((v) => v !== undefined);
  }

  const res = {};
  for (const [k, v] of Object.entries(obj)) {
    try {
      const n = normalizeNumericStrings(v, seen);
      if (n !== undefined) res[k] = n;
    } catch (err) {
      // If a property throws (rare), preserve original value to avoid breaking the payload
      res[k] = v;
    }
  }
  return res;
}

// Convert model instances / complex objects to pure plain JS objects while
// stripping circular references. This ensures Fastify can JSON.stringify the
// response without hitting "Converting circular structure to JSON".
function toPlainObject(obj, _seen = new WeakSet()) {
  const seen = _seen instanceof WeakSet ? _seen : new WeakSet();
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  // Avoid cycles
  if (seen.has(obj)) return null;
  seen.add(obj);

  // If the object has a toJSON (Sequelize etc), prefer its output and recurse into it
  try {
    if (typeof obj.toJSON === 'function') {
      const json = obj.toJSON();
      // If toJSON returns a primitive, return it directly
      if (json === null || typeof json !== 'object') return json;
      return toPlainObject(json, seen);
    }
  } catch (err) {
    // ignore and continue
  }

  if (Array.isArray(obj)) {
    return obj.map((v) => toPlainObject(v, seen));
  }

  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    // skip functions and symbols
    if (typeof v === 'function') continue;
    try {
      const plain = toPlainObject(v, seen);
      // Only assign if not undefined (but keep null)
      if (plain !== undefined) out[k] = plain;
    } catch (err) {
      // On unexpected errors, skip the property to keep payload serializable
    }
  }
  return out;
}

// Remove any remaining circular references by performing a traversal and
// omitting repeated objects. Returns a new plain object/array with cycles removed.
function removeCircular(value) {
  const seen = new WeakSet();
  function derez(val) {
    if (val === null || typeof val !== 'object') return val;
    if (seen.has(val)) return undefined; // omit circular reference
    seen.add(val);
    if (Array.isArray(val)) return val.map(derez).filter((v) => v !== undefined);
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      try {
        const d = derez(v);
        if (d !== undefined) out[k] = d;
      } catch (err) {
        // skip problematic property
      }
    }
    return out;
  }
  return derez(value);
}

// Safe serializer that drops circular references using a replacer and
// returns a JSON string. This avoids TypeError from JSON.stringify on cycles.
function safeSerialize(obj) {
  const seen = new WeakSet();
  return JSON.stringify(obj, function (key, value) {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return undefined;
      seen.add(value);
    }
    if (typeof value === 'function') return undefined;
    return value;
  });
}

/**
 * Contrôleur Dashboard Admin
 * Fournit les données statistiques pour le dashboard administrateur
 */
class DashboardController {
  
  /**
   * Vue d'ensemble générale du système
   */
  async getOverview(request, reply) {
    try {
      // Build aggregates via raw SQL queries because Model.count(...) returns a number
      // and cannot be used with custom aggregate attributes in the way previously written.
      const [userStatsRows, documentStatsRows, systemStats, notificationStatsRows] = await Promise.all([
        // Statistiques utilisateurs (total, active, inactive)
        db.sequelize.query(`
          SELECT
            COUNT(*)::int AS total,
            SUM(CASE WHEN "IsActive" = true THEN 1 ELSE 0 END)::int AS active,
            SUM(CASE WHEN "IsActive" = false THEN 1 ELSE 0 END)::int AS inactive
          FROM "Users"
        `, { type: QueryTypes.SELECT }),

        // Statistiques documents (total, pending, processed)
        db.sequelize.query(`
          SELECT
            COUNT(*)::int AS total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)::int AS pending,
            SUM(CASE WHEN status != 'pending' THEN 1 ELSE 0 END)::int AS processed
          FROM "Documents"
        `, { type: QueryTypes.SELECT }),

        // Statistiques système (counts per table)
        Promise.all([
          Etape.count(),
          Role.count(),
          Structure.count(),
          TypeProjet.count(),
          File.count()
        ]),

        // Statistiques notifications (total, unread, read)
        db.sequelize.query(`
          SELECT
            COUNT(*)::int AS total,
            SUM(CASE WHEN "isRead" = false THEN 1 ELSE 0 END)::int AS unread,
            SUM(CASE WHEN "isRead" = true THEN 1 ELSE 0 END)::int AS read
          FROM "Notifications"
        `, { type: QueryTypes.SELECT })
      ]);

      const userStats = (userStatsRows && userStatsRows[0]) ? userStatsRows[0] : { total: 0, active: 0, inactive: 0 };
      const documentStats = (documentStatsRows && documentStatsRows[0]) ? documentStatsRows[0] : { total: 0, pending: 0, processed: 0 };
      const notificationStats = (notificationStatsRows && notificationStatsRows[0]) ? notificationStatsRows[0] : { total: 0, unread: 0, read: 0 };

      const users = {
        total: parseInt(userStats.total, 10) || 0,
        active: parseInt(userStats.active, 10) || 0,
        inactive: parseInt(userStats.inactive, 10) || 0,
        activePercentage: (userStats.total && userStats.total > 0) ? Math.round((userStats.active / userStats.total) * 100) : 0
      };

      const documents = {
        total: parseInt(documentStats.total, 10) || 0,
        pending: parseInt(documentStats.pending, 10) || 0,
        processed: parseInt(documentStats.processed, 10) || 0,
        pendingPercentage: (documentStats.total && documentStats.total > 0) ? Math.round((documentStats.pending / documentStats.total) * 100) : 0
      };

      const system = {
        etapes: systemStats[0] || 0,
        roles: systemStats[1] || 0,
        structures: systemStats[2] || 0,
        typeProjets: systemStats[3] || 0,
        files: systemStats[4] || 0
      };

      const notifications = {
        total: parseInt(notificationStats.total, 10) || 0,
        unread: parseInt(notificationStats.unread, 10) || 0,
        read: parseInt(notificationStats.read, 10) || 0,
        unreadPercentage: (notificationStats.total && notificationStats.total > 0) ? Math.round((notificationStats.unread / notificationStats.total) * 100) : 0
      };

  return reply.send({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          users,
          documents,
          system,
          notifications
        }
      });

    } catch (error) {
      console.error('Error in getOverview:', error);
  return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des statistiques générales',
        error: error.message
      });
    }
  }

  /**
   * Statistiques détaillées des utilisateurs
   */
  async getUserStats(request, reply) {
    try {
      const [byRole, recentActivity, growthByMonth] = await Promise.all([
        // Utilisateurs par rôle
        db.sequelize.query(`
          SELECT r.name, r.description, COUNT(ur."userId") as "userCount"
          FROM "Roles" r
          LEFT JOIN "UserRoles" ur ON r."idRole" = ur."roleId"
          GROUP BY r."idRole", r.name, r.description
          ORDER BY "userCount" DESC
        `, { type: QueryTypes.SELECT }),

        // Activité récente
        User.findAll({
          attributes: ['idUser', 'Email', 'NomUser', 'PrenomUser', 'LastLogin', 'IsActive'],
          include: [{
            model: Role,
            attributes: ['name'],
            through: { attributes: [] }
          }],
          order: [['LastLogin', 'DESC']],
          limit: 10
        }),

        // Croissance par mois
        db.sequelize.query(`
          SELECT 
            DATE_TRUNC('month', "createdAt") as month,
            COUNT(*) as count
          FROM "Users"
          WHERE "createdAt" >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', "createdAt")
          ORDER BY month ASC
        `, { type: QueryTypes.SELECT })
      ]);

  return reply.send({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          byRole,
          recentActivity,
          growthByMonth
        }
      });

    } catch (error) {
      console.error('Error in getUserStats:', error);
  return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des statistiques utilisateurs',
        error: error.message
      });
    }
  }

  /**
   * Statistiques des documents
   */
  async getDocumentStats(request, reply) {
    try {
      const [byStatus, byEtape, recent, dailyCreation] = await Promise.all([
        // Documents par statut
        db.sequelize.query(`
          SELECT status, "transferStatus", COUNT(*) as count
          FROM "Documents"
          GROUP BY status, "transferStatus"
          ORDER BY count DESC
        `, { type: QueryTypes.SELECT }),

        // Documents par étape
        db.sequelize.query(`
          SELECT 
            e."idEtape",
            e."LibelleEtape",
            e."sequenceNumber",
            COUNT(d."idDocument") as "documentCount"
          FROM "Etapes" e
          LEFT JOIN "Documents" d ON e."idEtape" = d."etapeId"
          GROUP BY e."idEtape", e."LibelleEtape", e."sequenceNumber"
          ORDER BY e."sequenceNumber" ASC
        `, { type: QueryTypes.SELECT }),

        // Documents récents
        Document.findAll({
          attributes: ['idDocument', 'Title', 'status', 'transferStatus', 'transferTimestamp'],
          include: [{
            model: Etape,
            as: 'etape',
            attributes: ['LibelleEtape', 'sequenceNumber']
          }],
          order: [['transferTimestamp', 'DESC']],
          limit: 10
        }),

        // Création quotidienne
        db.sequelize.query(`
          SELECT 
            DATE_TRUNC('day', "createdAt") as day,
            COUNT(*) as count
          FROM "Documents"
          WHERE "createdAt" >= NOW() - INTERVAL '30 days'
          GROUP BY DATE_TRUNC('day', "createdAt")
          ORDER BY day ASC
        `, { type: QueryTypes.SELECT })
      ]);

  return reply.send({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          byStatus,
          byEtape,
          recent,
          dailyCreation
        }
      });

    } catch (error) {
      console.error('Error in getDocumentStats:', error);
  return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des statistiques documents',
        error: error.message
      });
    }
  }

  /**
   * Statistiques des notifications
   */
  async getNotificationStats(request, reply) {
    try {
      const [byType, recent, dailyStats] = await Promise.all([
        // Notifications par type
        db.sequelize.query(`
          SELECT type, COUNT(*) as count
          FROM "Notifications"
          GROUP BY type
          ORDER BY count DESC
        `, { type: QueryTypes.SELECT }),

        // Notifications récentes
        Notification.findAll({
          attributes: ['idNotification', 'message', 'type', 'isRead', 'createdAt'],
          include: [{
            model: User,
            as: 'user',
            attributes: ['NomUser', 'PrenomUser', 'Email']
          }],
          order: [['createdAt', 'DESC']],
          limit: 10
        }),

        // Statistiques quotidiennes
        db.sequelize.query(`
          SELECT 
            DATE_TRUNC('day', "createdAt") as day,
            COUNT(*) as count,
            SUM(CASE WHEN "isRead" = false THEN 1 ELSE 0 END) as "unreadCount"
          FROM "Notifications"
          WHERE "createdAt" >= NOW() - INTERVAL '30 days'
          GROUP BY DATE_TRUNC('day', "createdAt")
          ORDER BY day ASC
        `, { type: QueryTypes.SELECT })
      ]);

  return reply.send({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          byType,
          recent,
          dailyStats
        }
      });

    } catch (error) {
      console.error('Error in getNotificationStats:', error);
  return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des statistiques notifications',
        error: error.message
      });
    }
  }

  /**
   * Statistiques des flux de travail
   */
  async getWorkflowStats(request, reply) {
    try {
      const [etapeEfficiency, bottlenecks, flowDistribution] = await Promise.all([
        // Efficacité par étape
        db.sequelize.query(`
          SELECT 
            e."idEtape",
            e."LibelleEtape",
            e."sequenceNumber",
            COUNT(d."idDocument") as "totalDocuments",
            SUM(CASE WHEN d.status = 'pending' THEN 1 ELSE 0 END) as "pendingDocuments",
            SUM(CASE WHEN d."transferStatus" = 'received' THEN 1 ELSE 0 END) as "receivedDocuments",
            SUM(CASE WHEN d.status = 'completed' THEN 1 ELSE 0 END) as "completedDocuments"
          FROM "Etapes" e
          LEFT JOIN "Documents" d ON e."idEtape" = d."etapeId"
          GROUP BY e."idEtape", e."LibelleEtape", e."sequenceNumber"
          ORDER BY e."sequenceNumber" ASC
        `, { type: QueryTypes.SELECT }),

        // Goulots d'étranglement
        db.sequelize.query(`
          SELECT 
            e."idEtape",
            e."LibelleEtape",
            e."sequenceNumber",
            COUNT(d."idDocument") as "pendingCount"
          FROM "Etapes" e
          INNER JOIN "Documents" d ON e."idEtape" = d."etapeId"
          WHERE d.status = 'pending'
          GROUP BY e."idEtape", e."LibelleEtape", e."sequenceNumber"
          ORDER BY "pendingCount" DESC
          LIMIT 5
        `, { type: QueryTypes.SELECT }),

        // Distribution des flux
        db.sequelize.query(`
          SELECT 
            d.status,
            d."transferStatus",
            COUNT(*) as count,
            e."LibelleEtape",
            e."sequenceNumber"
          FROM "Documents" d
          LEFT JOIN "Etapes" e ON d."etapeId" = e."idEtape"
          GROUP BY d.status, d."transferStatus", e."LibelleEtape", e."sequenceNumber"
          ORDER BY count DESC
        `, { type: QueryTypes.SELECT })
      ]);

  return reply.send({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          etapeEfficiency,
          bottlenecks,
          flowDistribution
        }
      });

    } catch (error) {
      console.error('Error in getWorkflowStats:', error);
  return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des statistiques de flux de travail',
        error: error.message
      });
    }
  }

  /**
   * Statistiques des fichiers
   */
  async getFileStats(request, reply) {
    try {
      const [overview, byType, recent] = await Promise.all([
        // Vue d'ensemble des fichiers
        db.sequelize.query(`
          SELECT 
            COUNT(*) as "totalFiles",
            SUM("fileSize") as "totalSize",
            AVG("fileSize") as "averageSize"
          FROM "Files"
        `, { type: QueryTypes.SELECT }),

        // Fichiers par type
        db.sequelize.query(`
          SELECT 
            "fileType",
            COUNT(*) as count,
            SUM("fileSize") as "totalSize"
          FROM "Files"
          GROUP BY "fileType"
          ORDER BY count DESC
        `, { type: QueryTypes.SELECT }),

        // Fichiers récents
        File.findAll({
          attributes: ['idFile', 'fileName', 'fileType', 'fileSize', 'createdAt'],
          include: [{
            model: Document,
            as: 'document',
            attributes: ['Title'],
            include: [{
              model: Etape,
              as: 'etape',
              attributes: ['LibelleEtape']
            }]
          }],
          order: [['createdAt', 'DESC']],
          limit: 10
        })
      ]);

  return reply.send({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          overview: overview[0],
          byType,
          recent
        }
      });

    } catch (error) {
      console.error('Error in getFileStats:', error);
  return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des statistiques de fichiers',
        error: error.message
      });
    }
  }

  /**
   * Métriques de performance système
   */
  async getSystemMetrics(request, reply) {
    try {
      const [recentActivity, trends] = await Promise.all([
        // Activité récente (dernières 24h)
        Promise.all([
          User.count({
            where: {
              LastLogin: {
                [db.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
              }
            }
          }),
          Document.count({
            where: {
              updatedAt: {
                [db.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
              }
            }
          }),
          Notification.count({
            where: {
              createdAt: {
                [db.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
              }
            }
          }),
          Commentaire.count({
            where: {
              createdAt: {
                [db.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
              }
            }
          })
        ]),

        // Tendances (comparaison avec la période précédente)
        Promise.all([
          // Documents - 7 derniers jours vs 7 jours précédents
          db.sequelize.query(`
            SELECT 
              SUM(CASE WHEN "createdAt" >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as current,
              SUM(CASE WHEN "createdAt" >= NOW() - INTERVAL '14 days' AND "createdAt" < NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as previous
            FROM "Documents"
          `, { type: QueryTypes.SELECT }),
          
          // Activité utilisateurs
          db.sequelize.query(`
            SELECT 
              COUNT(DISTINCT CASE WHEN "LastLogin" >= NOW() - INTERVAL '7 days' THEN "idUser" END) as current,
              COUNT(DISTINCT CASE WHEN "LastLogin" >= NOW() - INTERVAL '14 days' AND "LastLogin" < NOW() - INTERVAL '7 days' THEN "idUser" END) as previous
            FROM "Users"
          `, { type: QueryTypes.SELECT })
        ])
      ]);

      const documentTrend = trends[0][0];
      const userActivityTrend = trends[1][0];

      return reply.send({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          recentActivity: {
            activeUsers: recentActivity[0],
            documentsProcessed: recentActivity[1],
            notifications: recentActivity[2],
            comments: recentActivity[3]
          },
          trends: {
            documents: {
              current: parseInt(documentTrend.current) || 0,
              previous: parseInt(documentTrend.previous) || 0,
              trend: documentTrend.previous > 0 ?
                Math.round(((documentTrend.current - documentTrend.previous) / documentTrend.previous) * 100) : 0
            },
            userActivity: {
              current: parseInt(userActivityTrend.current) || 0,
              previous: parseInt(userActivityTrend.previous) || 0,
              trend: userActivityTrend.previous > 0 ?
                Math.round(((userActivityTrend.current - userActivityTrend.previous) / userActivityTrend.previous) * 100) : 0
            }
          }
        }
      });

    } catch (error) {
      console.error('Error in getSystemMetrics:', error);
  return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des métriques système',
        error: error.message
      });
    }
  }

  /**
   * Données en temps réel
   */
  async getRealTimeData(request, reply) {
    try {
      const [activeUsers, pendingDocuments, recentNotifications, recentComments] = await Promise.all([
        // Utilisateurs actifs (connectés dans les 30 dernières minutes)
        User.count({
          where: {
            LastLogin: {
              [db.Sequelize.Op.gte]: new Date(Date.now() - 30 * 60 * 1000)
            }
          }
        }),

        // Documents en attente
        Document.count({
          where: {
            status: 'pending'
          }
        }),

        // Notifications récentes (dernière heure)
        Notification.count({
          where: {
            createdAt: {
              [db.Sequelize.Op.gte]: new Date(Date.now() - 60 * 60 * 1000)
            }
          }
        }),

        // Commentaires récents (dernière heure)
        Commentaire.count({
          where: {
            createdAt: {
              [db.Sequelize.Op.gte]: new Date(Date.now() - 60 * 60 * 1000)
            }
          }
        })
      ]);

      // Simulation de métriques système (à remplacer par de vraies métriques)
      const systemLoad = {
        cpu: Math.floor(Math.random() * 100),
        memory: Math.floor(Math.random() * 100),
        database: Math.floor(Math.random() * 100)
      };

  return reply.send({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          activeUsers,
          pendingDocuments,
          recentNotifications,
          recentComments,
          systemLoad
        }
      });

    } catch (error) {
      console.error('Error in getRealTimeData:', error);
  return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des données temps réel',
        error: error.message
      });
    }
  }

  /**
   * Toutes les données du dashboard en une requête
   */
  async getCompleteData(request, reply) {
    try {
      // Créer des objets reply mock pour récupérer les données sans envoyer de réponse
      const mockReply = {
        send: (data) => {
          const payload = data && data.data ? data.data : data;
          try {
            return toPlainObject(payload);
          } catch (err) {
            return payload;
          }
        },
        status: () => mockReply,
        code: () => mockReply
      };

      // Appeler toutes les méthodes en parallèle avec le bon contexte
      const DashboardController = module.exports.constructor;
      const [overview, users, documents, notifications, workflow, files, metrics, realtime] = await Promise.all([
        DashboardController.prototype.getOverview.call(this, request, mockReply),
        DashboardController.prototype.getUserStats.call(this, request, mockReply),
        DashboardController.prototype.getDocumentStats.call(this, request, mockReply),
        DashboardController.prototype.getNotificationStats.call(this, request, mockReply),
        DashboardController.prototype.getWorkflowStats.call(this, request, mockReply),
        DashboardController.prototype.getFileStats.call(this, request, mockReply),
        DashboardController.prototype.getSystemMetrics.call(this, request, mockReply),
        DashboardController.prototype.getRealTimeData.call(this, request, mockReply)
      ]);

      // Sanitize each sub-response by serializing with safeSerialize (drops circular refs)
      const parts = [overview, users, documents, notifications, workflow, files, metrics, realtime];
      const parsedParts = parts.map((p) => {
        try {
          return JSON.parse(safeSerialize(p));
        } catch (err) {
          // Fallback: try the toPlainObject converter
          try {
            return toPlainObject(p);
          } catch (err2) {
            return null;
          }
        }
      });

      const assembledSafe = {
        overview: parsedParts[0],
        users: parsedParts[1],
        documents: parsedParts[2],
        notifications: parsedParts[3],
        workflow: parsedParts[4],
        files: parsedParts[5],
        metrics: parsedParts[6],
        realtime: parsedParts[7]
      };

      // Normalize numeric strings to numbers for consistent typing in the API
      const normalized = normalizeNumericStrings(assembledSafe) || {};
      const safe = removeCircular(normalized);

      // Return a plain object — Fastify should be able to stringify it safely
      return reply.send({
        success: true,
        timestamp: new Date().toISOString(),
        data: safe
      });

    } catch (error) {
      console.error('Error in getCompleteData:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des données complètes du dashboard',
        error: error.message
      });
    }
  }
}

module.exports = new DashboardController();
