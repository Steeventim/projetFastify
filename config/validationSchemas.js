/**
 * Système de validation centralisé pour l'API
 * Utilise Fluent JSON Schema pour une validation stricte et cohérente
 */

const S = require('fluent-json-schema');

/**
 * Schémas de validation pour les paramètres communs
 */
const commonSchemas = {
  // UUID validation
  uuid: S.string().format('uuid').description('Identifiant UUID valide'),
  
  // Email validation
  email: S.string().format('email').minLength(5).maxLength(254).description('Adresse email valide'),
  
  // Password validation
  password: S.string()
    .minLength(8)
    .maxLength(128)
    .pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')
    .description('Mot de passe (min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial)'),
  
  // Phone validation
  phone: S.string()
    .pattern('^[+]?[0-9]{8,15}$')
    .description('Numéro de téléphone valide'),
  
  // Name validation
  name: S.string()
    .minLength(2)
    .maxLength(100)
    .pattern('^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ\\s-\']+$')
    .description('Nom valide (lettres, espaces, tirets et apostrophes uniquement)'),
  
  // Text content validation
  textContent: S.string()
    .minLength(1)
    .maxLength(1000)
    .description('Contenu textuel valide'),
  
  // Date validation
  dateTime: S.string().format('date-time').description('Date et heure au format ISO 8601'),
  
  // Pagination
  page: S.integer().minimum(1).default(1).description('Numéro de page'),
  limit: S.integer().minimum(1).maximum(100).default(10).description('Nombre d\'éléments par page'),
  
  // Status enums
  documentStatus: S.string().enum(['pending', 'approved', 'rejected', 'in_progress']).description('Statut du document'),
  transferStatus: S.string().enum(['pending', 'transferred', 'completed']).description('Statut de transfert'),
  roleType: S.string().enum(['admin', 'user', 'viewer']).description('Type de rôle'),
  notificationType: S.string().enum(['info', 'warning', 'error', 'success']).description('Type de notification')
};

/**
 * Schémas de validation pour l'authentification
 */
const authSchemas = {
  loginRequest: S.object()
    .prop('email', commonSchemas.email)
    .prop('password', S.string().minLength(1).description('Mot de passe'))
    .required(['email', 'password'])
    .additionalProperties(false),
    
  registerRequest: S.object()
    .prop('NomUser', commonSchemas.name)
    .prop('email', commonSchemas.email)
    .prop('password', commonSchemas.password)
    .prop('UserPhone', commonSchemas.phone)
    .required(['NomUser', 'email', 'password'])
    .additionalProperties(false),
    
  passwordResetRequest: S.object()
    .prop('email', commonSchemas.email)
    .required(['email'])
    .additionalProperties(false),
    
  passwordResetConfirm: S.object()
    .prop('token', S.string().minLength(1))
    .prop('password', commonSchemas.password)
    .required(['token', 'password'])
    .additionalProperties(false)
};

/**
 * Schémas de validation pour les utilisateurs
 */
const userSchemas = {
  createUser: authSchemas.registerRequest,
  
  updateUser: S.object()
    .prop('NomUser', commonSchemas.name)
    .prop('email', commonSchemas.email)
    .prop('UserPhone', commonSchemas.phone)
    .prop('isActive', S.boolean())
    .additionalProperties(false),
    
  userParams: S.object()
    .prop('id', commonSchemas.uuid)
    .required(['id'])
    .additionalProperties(false)
};

/**
 * Schémas de validation pour les documents
 */
const documentSchemas = {
  createDocument: S.object()
    .prop('Title', S.string().minLength(1).maxLength(200))
    .prop('content', S.string().maxLength(10000))
    .prop('typeProjetId', commonSchemas.uuid)
    .required(['Title'])
    .additionalProperties(false),
    
  updateDocument: S.object()
    .prop('Title', S.string().minLength(1).maxLength(200))
    .prop('status', commonSchemas.documentStatus)
    .prop('transferStatus', commonSchemas.transferStatus)
    .additionalProperties(false),
    
  forwardDocument: S.object()
    .prop('documentId', commonSchemas.uuid)
    .prop('userId', commonSchemas.uuid)
    .prop('etapeId', commonSchemas.uuid)
    .prop('nextEtapeName', S.string().minLength(1).maxLength(100))
    .prop('UserDestinatorName', commonSchemas.name)
    .prop('comments', S.array().items(
      S.object()
        .prop('content', commonSchemas.textContent)
        .required(['content'])
    ))
    .required(['documentId', 'userId', 'etapeId'])
    .additionalProperties(false),
    
  rejectDocument: S.object()
    .prop('userId', commonSchemas.uuid)
    .prop('comments', S.array().items(
      S.object()
        .prop('content', commonSchemas.textContent)
        .required(['content'])
    ).minItems(1))
    .required(['userId', 'comments'])
    .additionalProperties(false),
    
  documentParams: S.object()
    .prop('documentId', commonSchemas.uuid)
    .required(['documentId'])
    .additionalProperties(false)
};

/**
 * Schémas de validation pour les étapes
 */
const etapeSchemas = {
  createEtape: S.object()
    .prop('LibelleEtape', S.string().minLength(1).maxLength(100))
    .prop('Description', S.string().maxLength(500))
    .prop('Validation', S.boolean().default(false))
    .prop('typeProjetLibelle', S.string().minLength(1).maxLength(100))
    .prop('sequenceNumber', S.integer().minimum(1))
    .required(['LibelleEtape'])
    .additionalProperties(false),
    
  createMultipleEtapes: S.array().items(
    S.object()
      .prop('LibelleEtape', S.string().minLength(1).maxLength(100))
      .prop('Description', S.string().maxLength(500))
      .prop('Validation', S.boolean().default(false))
      .prop('typeProjetLibelle', S.string().minLength(1).maxLength(100))
      .required(['LibelleEtape'])
  ).minItems(1),
  
  updateEtape: S.object()
    .prop('LibelleEtape', S.string().minLength(1).maxLength(100))
    .prop('Description', S.string().maxLength(500))
    .prop('Validation', S.boolean())
    .prop('sequenceNumber', S.integer().minimum(1))
    .additionalProperties(false),
    
  etapeParams: S.object()
    .prop('etapeId', commonSchemas.uuid)
    .required(['etapeId'])
    .additionalProperties(false),
    
  assignEtape: S.object()
    .prop('etapeName', S.string().minLength(1).maxLength(100))
    .prop('documentId', commonSchemas.uuid)
    .prop('typeProjetLibelle', S.string().minLength(1).maxLength(100))
    .required(['etapeName', 'documentId'])
    .additionalProperties(false)
};

/**
 * Schémas de validation pour les rôles
 */
const roleSchemas = {
  createRole: S.object()
    .prop('name', commonSchemas.roleType)
    .prop('description', S.string().maxLength(200))
    .required(['name'])
    .additionalProperties(false),
    
  updateRole: S.object()
    .prop('name', commonSchemas.roleType)
    .prop('description', S.string().maxLength(200))
    .additionalProperties(false),
    
  roleParams: S.object()
    .prop('roleId', commonSchemas.uuid)
    .required(['roleId'])
    .additionalProperties(false)
};

/**
 * Schémas de validation pour les commentaires
 */
const commentaireSchemas = {
  createCommentaire: S.object()
    .prop('Contenu', commonSchemas.textContent)
    .prop('documentId', commonSchemas.uuid)
    .required(['Contenu', 'documentId'])
    .additionalProperties(false),
    
  updateCommentaire: S.object()
    .prop('Contenu', commonSchemas.textContent)
    .required(['Contenu'])
    .additionalProperties(false),
    
  commentaireParams: S.object()
    .prop('idCommentaire', commonSchemas.uuid)
    .required(['idCommentaire'])
    .additionalProperties(false)
};

/**
 * Schémas de validation pour les projets
 */
const projetSchemas = {
  createProjet: S.object()
    .prop('Libelle', S.string().minLength(1).maxLength(100))
    .prop('Description', S.string().maxLength(500))
    .required(['Libelle'])
    .additionalProperties(false),
    
  updateProjet: S.object()
    .prop('Libelle', S.string().minLength(1).maxLength(100))
    .prop('Description', S.string().maxLength(500))
    .additionalProperties(false)
};

/**
 * Schémas de validation pour les structures
 */
const structureSchemas = {
  createStructure: S.object()
    .prop('name', commonSchemas.name.required())
    .prop('description', S.string().maxLength(500))
    .prop('parentId', commonSchemas.uuid)
    .required(['name'])
    .additionalProperties(false),
    
  updateStructure: S.object()
    .prop('name', commonSchemas.name)
    .prop('description', S.string().maxLength(500))
    .prop('parentId', commonSchemas.uuid)
    .additionalProperties(false)
};

/**
 * Schémas de validation pour les notifications
 */
const notificationSchemas = {
  createNotification: S.object()
    .prop('message', S.string().minLength(1).maxLength(500).required())
    .prop('type', commonSchemas.notificationType.default('info'))
    .prop('userId', commonSchemas.uuid.required())
    .required(['message', 'userId'])
    .additionalProperties(false),
    
  notificationParams: S.object()
    .prop('notificationId', commonSchemas.uuid.required())
    .required(['notificationId'])
    .additionalProperties(false)
};

/**
 * Schémas de validation pour la recherche
 */
const searchSchemas = {
  searchParams: S.object()
    .prop('searchTerm', S.string().minLength(1).maxLength(200).required())
    .required(['searchTerm'])
    .additionalProperties(false),
    
  searchWithDocumentParams: S.object()
    .prop('documentName', S.string().minLength(1).maxLength(200).required())
    .prop('searchTerm', S.string().minLength(1).maxLength(200).required())
    .required(['documentName', 'searchTerm'])
    .additionalProperties(false)
};

/**
 * Schémas de validation pour la pagination
 */
const paginationSchemas = {
  paginationQuery: S.object()
    .prop('page', commonSchemas.page)
    .prop('limit', commonSchemas.limit)
    .prop('sort', S.string().enum(['asc', 'desc']).default('desc'))
    .prop('sortBy', S.string().maxLength(50))
    .additionalProperties(false)
};

/**
 * Schémas de réponse standardisés
 */
const responseSchemas = {
  successResponse: S.object()
    .prop('success', S.boolean().const(true))
    .prop('message', S.string())
    .prop('data', S.raw({}))
    .required(['success']),
    
  errorResponse: S.object()
    .prop('error', S.string().required())
    .prop('message', S.string().required())
    .prop('details', S.string())
    .prop('statusCode', S.integer())
    .required(['error', 'message']),
    
  paginatedResponse: S.object()
    .prop('success', S.boolean().const(true))
    .prop('count', S.integer().minimum(0))
    .prop('total', S.integer().minimum(0))
    .prop('data', S.array())
    .required(['success', 'count', 'data'])
};

module.exports = {
  commonSchemas,
  authSchemas,
  userSchemas,
  documentSchemas,
  etapeSchemas,
  roleSchemas,
  commentaireSchemas,
  projetSchemas,
  structureSchemas,
  notificationSchemas,
  searchSchemas,
  paginationSchemas,
  responseSchemas
};
