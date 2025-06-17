# 🏗️ Documentation des Design Patterns

Ce document décrit les patterns de conception (design patterns) utilisés dans l'application Fastify de gestion documentaire.

## 📑 Table des Matières

1. [Architecture Générale](#architecture-générale)
2. [Model-View-Controller (MVC)](#model-view-controller-mvc)
3. [Repository Pattern](#repository-pattern)
4. [Factory Pattern](#factory-pattern)
5. [Middleware Pattern](#middleware-pattern)
6. [Active Record Pattern](#active-record-pattern)
7. [Plugin Architecture](#plugin-architecture)
8. [Chain of Responsibility](#chain-of-responsibility)
9. [Observer Pattern](#observer-pattern)
10. [Strategy Pattern](#strategy-pattern)
11. [Patterns de Sécurité](#patterns-de-sécurité)
12. [Patterns de Transaction](#patterns-de-transaction)

---

## 🏛️ Architecture Générale

L'application suit une architecture en couches avec séparation claire des responsabilités :

```
┌─────────────────┐
│     Routes      │ ← Définition des endpoints et validation
├─────────────────┤
│   Controllers   │ ← Logique métier et orchestration
├─────────────────┤
│    Services     │ ← Services spécialisés (fichiers, notifications)
├─────────────────┤
│     Models      │ ← Modèles de données et relations
├─────────────────┤
│   Middleware    │ ← Authentification, autorisation, validation
├─────────────────┤
│   Database      │ ← Couche de persistance
└─────────────────┘
```

---

## 🎯 Model-View-Controller (MVC)

### Pattern Implémentation

Le pattern MVC est implémenté de façon adaptée au contexte API REST :

**Models** (Couche Modèle)
```javascript
// models/user.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    idUser: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    Email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
    // ... autres propriétés
  });

  User.associate = (models) => {
    User.belongsToMany(models.Role, { 
      through: 'UserRoles', 
      foreignKey: 'userId' 
    });
  };

  return User;
};
```

**Controllers** (Couche Contrôleur)
```javascript
// controllers/userController.js
const userController = {
  async getAllUsers(request, reply) {
    try {
      const users = await User.findAll({
        attributes: { exclude: ['Password'] },
        include: [{
          model: Role,
          through: 'UserRoles'
        }]
      });
      return reply.send(users);
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  }
};
```

**Routes** (Couche Vue/Interface)
```javascript
// routes/userRoutes.js
module.exports = async function (fastify, opts) {
  fastify.get('/users', {
    preHandler: [
      authMiddleware.verifyToken,
      authMiddleware.requireRole(['admin'])
    ]
  }, userController.getAllUsers);
};
```

### Avantages
- **Séparation des responsabilités** : Chaque couche a un rôle spécifique
- **Maintenabilité** : Modifications isolées par couche
- **Testabilité** : Tests unitaires facilités
- **Réutilisabilité** : Controllers réutilisables avec différentes interfaces

---

## 🗄️ Repository Pattern

### Implémentation avec Services

Le pattern Repository est implémenté via des services spécialisés :

```javascript
// services/fileHandler.js
const fileHandler = {
  async saveFile(fileData, documentId) {
    // Logique de sauvegarde des fichiers
    const savedFile = await File.create({
      idFile: uuidv4(),
      documentId,
      fileName: fileData.filename,
      filePath: path,
      fileType: fileData.mimetype
    });
    return savedFile;
  },

  async getFilesByDocument(documentId) {
    return await File.findAll({
      where: { documentId },
      order: [['createdAt', 'DESC']]
    });
  }
};
```

### Utilisation dans les Controllers
```javascript
// controllers/documentController.js
const documentController = {
  async forwardDocument(request, reply) {
    const t = await sequelize.transaction();
    try {
      // Utilisation du service de fichiers
      const savedFiles = await Promise.all(
        files.map(file => fileHandler.saveFile(file, documentId))
      );
      
      await t.commit();
      return reply.send({ files: savedFiles });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
};
```

### Avantages
- **Encapsulation** : Logique d'accès aux données centralisée
- **Abstraction** : Interface simple pour les opérations complexes
- **Testabilité** : Mock des repositories facilité
- **Consistance** : Opérations uniformes sur les données

---

## 🏭 Factory Pattern

### Factory pour la Création d'Utilisateurs

```javascript
// controllers/userController.js
const userController = {
  async createUser(request, reply) {
    try {
      let usersData = Array.isArray(request.body) ? request.body : [request.body];
      const results = [];

      for (const userData of usersData) {
        // Factory pattern pour la création d'utilisateur
        const newUser = await this.createUserInstance(userData);
        
        // Factory pattern pour l'assignation de rôles
        if (userData.roleNames) {
          await this.assignRolesToUser(newUser, userData.roleNames);
        }
        
        results.push({ success: true, user: newUser });
      }
      
      return reply.send({ results });
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  },

  async createUserInstance(userData) {
    // Validation et création standardisée
    const { error, value } = User.validate(userData);
    if (error) throw new Error(error.details[0].message);

    return await User.create({
      ...value,
      idUser: uuidv4()
    });
  },

  async assignRolesToUser(user, roleNames) {
    const roles = Array.isArray(roleNames) ? roleNames : [roleNames];
    
    for (const roleName of roles) {
      // Factory pattern pour la création/récupération de rôles
      const [role] = await Role.findOrCreate({
        where: { name: roleName },
        defaults: {
          idRole: uuidv4(),
          description: `${roleName} role`,
          isSystemRole: false
        }
      });

      // Association utilisateur-rôle
      await UserRoles.create({
        id: uuidv4(),
        userId: user.idUser,
        roleId: role.idRole
      });
    }
  }
};
```

### Factory pour la Création de Rôles

```javascript
// controllers/roleController.js
const createRole = async (request, reply) => {
  const t = await sequelize.transaction();
  
  try {
    let roles = Array.isArray(request.body) ? request.body : [request.body];
    const createdRoles = [];

    for (const roleData of roles) {
      // Factory pattern pour la création de rôle
      const role = await createRoleInstance(roleData, t);
      createdRoles.push(role);
    }

    await t.commit();
    return reply.send(createdRoles);
  } catch (error) {
    await t.rollback();
    return reply.status(400).send({ error: error.message });
  }
};

async function createRoleInstance(roleData, transaction) {
  const { name, description, isSystemRole, etapeName } = roleData;
  
  // Validation de l'étape
  const etape = await Etape.findOne({
    where: { LibelleEtape: etapeName },
    transaction
  });
  
  if (!etape) throw new Error(`Etape "${etapeName}" not found`);

  // Création du rôle
  return await Role.create({
    idRole: uuidv4(),
    name,
    description,
    isSystemRole,
    etapeId: etape.idEtape
  }, { transaction });
}
```

### Avantages
- **Centralisation** : Logique de création centralisée
- **Consistance** : Objets créés de manière uniforme
- **Flexibilité** : Paramètres de création configurables
- **Maintenance** : Modifications isolées dans la factory

---

## ⚙️ Middleware Pattern

### Middleware d'Authentification

```javascript
// middleware/authMiddleware.js
const authMiddleware = {
  // Middleware de vérification du token JWT
  verifyToken: async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return reply.status(401).send({ 
          error: 'Unauthorized', 
          message: 'No token provided' 
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Enrichissement de la requête avec les informations utilisateur
      const user = await User.findOne({
        where: { idUser: decoded.id },
        include: [{ model: Role }]
      });
      
      request.user = user;
      return; // Continue vers le handler suivant
    } catch (error) {
      return reply.status(401).send({ 
        error: 'Unauthorized', 
        message: 'Invalid token' 
      });
    }
  },

  // Middleware de vérification des rôles
  requireRole: (allowedRoles) => {
    return async (request, reply) => {
      const userRoles = request.user?.Roles?.map(role => role.name) || [];
      const hasPermission = allowedRoles.some(role => userRoles.includes(role));
      
      if (!hasPermission) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Insufficient permissions'
        });
      }
      
      return; // Continue vers le handler suivant
    };
  }
};
```

### Middleware Spécialisé pour l'Accès aux Étapes

```javascript
// middleware/etapeAccessMiddleware.js
const checkEtapeAccess = async (request, reply) => {
  try {
    const { documentId, userId } = request.params;

    const [document, user] = await Promise.all([
      Document.findOne({
        where: { idDocument: documentId },
        include: [{ model: Etape, as: 'etape' }]
      }),
      User.findOne({
        where: { idUser: userId },
        include: [{ model: Role }]
      })
    ]);

    if (!document?.etape || !user?.Roles) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Access denied to this etape'
      });
    }

    // Vérification des permissions d'accès à l'étape
    const hasAccess = user.Roles.some(role => 
      role.etapeId === document.etape.idEtape
    );

    if (!hasAccess) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'User does not have access to this etape'
      });
    }

    return; // Continue
  } catch (error) {
    return reply.status(500).send({ error: error.message });
  }
};
```

### Utilisation dans les Routes

```javascript
// routes/documentRoutes.js
module.exports = async function (fastify, opts) {
  fastify.post('/forward-document', {
    preHandler: [
      authMiddleware.verifyToken,           // 1. Authentification
      authMiddleware.requireRole(['user']), // 2. Autorisation
      checkEtapeAccess                      // 3. Accès spécifique
    ]
  }, documentController.forwardDocument);
};
```

### Avantages
- **Modularité** : Fonctionnalités réutilisables
- **Séparation des préoccupations** : Chaque middleware a une responsabilité
- **Composabilité** : Middlewares chaînables
- **Maintenabilité** : Modifications isolées

---

## 📊 Active Record Pattern

### Implémentation avec Sequelize

Les modèles Sequelize implémentent le pattern Active Record :

```javascript
// models/document.js
module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    idDocument: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    Title: DataTypes.STRING,
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending',
      validate: {
        isIn: [['indexed', 'verified', 'pending', 'rejected']]
      }
    }
  });

  // Méthodes d'instance (Active Record)
  Document.prototype.isCompleted = function() {
    return this.status === 'verified';
  };

  Document.prototype.markAsVerified = async function() {
    this.status = 'verified';
    return await this.save();
  };

  // Associations
  Document.associate = (models) => {
    Document.hasMany(models.Commentaire, { 
      foreignKey: 'documentId',
      as: 'commentaires',
      onDelete: 'CASCADE'
    });
    Document.hasMany(models.File, {
      foreignKey: 'documentId',
      as: 'files',
      onDelete: 'CASCADE'
    });
  };

  return Document;
};
```

### Utilisation dans les Controllers

```javascript
// controllers/documentController.js
const documentController = {
  async verifyDocument(request, reply) {
    try {
      const { documentId } = request.params;
      
      // Récupération de l'instance Active Record
      const document = await Document.findByPk(documentId);
      
      if (!document) {
        return reply.status(404).send({ error: 'Document not found' });
      }

      // Utilisation des méthodes Active Record
      if (document.isCompleted()) {
        return reply.send({ message: 'Document already verified' });
      }

      // Modification via Active Record
      await document.markAsVerified();
      
      return reply.send({ 
        message: 'Document verified successfully',
        document 
      });
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  }
};
```

### Méthodes Personnalisées

```javascript
// models/user.js
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.Password);
};

User.prototype.hasRole = function(roleName) {
  return this.Roles?.some(role => role.name === roleName);
};

// Utilisation
const user = await User.findByPk(userId, {
  include: [{ model: Role }]
});

if (await user.comparePassword(password) && user.hasRole('admin')) {
  // Accès autorisé
}
```

### Avantages
- **Simplicité** : Interface intuitive pour les opérations CRUD
- **Encapsulation** : Logique métier dans les modèles
- **Consistance** : Opérations standardisées
- **ORM Integration** : Intégration native avec Sequelize

---

## 🔌 Plugin Architecture

### Architecture Fastify avec Plugins

```javascript
// server.js
const fastify = require('fastify')({
  logger: {
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: { colorize: true }
    }
  }
});

// Enregistrement des plugins dans l'ordre
fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  credentials: true
});

fastify.register(require('@fastify/helmet'), {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
});

fastify.register(require('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '15 minutes'
});

// Enregistrement des routes comme plugins
fastify.register(userRoutes, { prefix: '/api/v1' });
fastify.register(documentRoutes, { prefix: '/api/v1' });
fastify.register(etapeRoutes, { prefix: '/api/v1' });
```

### Plugin Personnalisé d'Authentification

```javascript
// plugins/authPlugin.js
async function authPlugin(fastify, options) {
  // Décoration de l'instance Fastify
  fastify.decorate('authenticate', async function(request, reply) {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) throw new Error('No token provided');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      request.user = decoded;
    } catch (error) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Hook global
  fastify.addHook('preHandler', async (request, reply) => {
    // Logique commune à toutes les routes
    request.startTime = Date.now();
  });
}

module.exports = authPlugin;
```

### Avantages
- **Modularité** : Fonctionnalités encapsulées
- **Réutilisabilité** : Plugins partageables
- **Configuration** : Options par plugin
- **Lifecycle Hooks** : Contrôle fin du cycle de vie

---

## 🔗 Chain of Responsibility

### Chaîne de Validation et Traitement

```javascript
// middleware/validationChain.js
const validationChain = {
  // Validateur de données d'entrée
  validateInput: async (request, reply) => {
    const { error } = schema.validate(request.body);
    if (error) {
      return reply.status(400).send({ 
        error: 'Validation Error',
        details: error.details 
      });
    }
    return; // Continue vers le suivant
  },

  // Validateur de permissions
  validatePermissions: async (request, reply) => {
    const userRoles = request.user?.Roles || [];
    if (!hasRequiredPermissions(userRoles)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }
    return; // Continue vers le suivant
  },

  // Validateur de ressources
  validateResource: async (request, reply) => {
    const { documentId } = request.params;
    const document = await Document.findByPk(documentId);
    
    if (!document) {
      return reply.status(404).send({ error: 'Resource not found' });
    }
    
    request.document = document; // Enrichir la requête
    return; // Continue vers le suivant
  }
};
```

### Chaîne de Traitement des Documents

```javascript
// controllers/documentController.js
const documentProcessingChain = {
  async validateDocument(document, context) {
    if (!document.Title) {
      throw new Error('Document title is required');
    }
    context.validationPassed = true;
    return this.checkEtapeAccess(document, context);
  },

  async checkEtapeAccess(document, context) {
    const userHasAccess = await this.verifyEtapePermissions(
      context.user, 
      document.etapeId
    );
    
    if (!userHasAccess) {
      throw new Error('No access to this etape');
    }
    
    context.accessGranted = true;
    return this.processFiles(document, context);
  },

  async processFiles(document, context) {
    if (context.files?.length) {
      context.processedFiles = await Promise.all(
        context.files.map(file => fileHandler.saveFile(file, document.idDocument))
      );
    }
    
    return this.finalizeProcessing(document, context);
  },

  async finalizeProcessing(document, context) {
    await document.update({
      status: 'processed',
      lastModified: new Date()
    });
    
    return {
      success: true,
      document,
      files: context.processedFiles || []
    };
  }
};
```

### Utilisation

```javascript
fastify.post('/documents/process', {
  preHandler: [
    validationChain.validateInput,      // 1. Validation des données
    authMiddleware.verifyToken,         // 2. Authentification
    validationChain.validatePermissions,// 3. Permissions
    validationChain.validateResource    // 4. Ressource
  ]
}, async (request, reply) => {
  try {
    const context = {
      user: request.user,
      files: request.files
    };
    
    const result = await documentProcessingChain.validateDocument(
      request.document, 
      context
    );
    
    return reply.send(result);
  } catch (error) {
    return reply.status(500).send({ error: error.message });
  }
});
```

### Avantages
- **Flexibilité** : Chaînes configurables
- **Réutilisabilité** : Handlers indépendants
- **Maintenabilité** : Modifications isolées
- **Extensibilité** : Ajout facile de nouveaux maillons

---

## 👀 Observer Pattern

### Système de Notifications

```javascript
// utils/notificationUtils.js
const EventEmitter = require('events');

class NotificationSystem extends EventEmitter {
  constructor() {
    super();
    this.setupListeners();
  }

  setupListeners() {
    this.on('document:forwarded', this.handleDocumentForwarded.bind(this));
    this.on('document:approved', this.handleDocumentApproved.bind(this));
    this.on('document:rejected', this.handleDocumentRejected.bind(this));
    this.on('user:created', this.handleUserCreated.bind(this));
  }

  async handleDocumentForwarded(data) {
    const { documentId, fromUserId, toUserId, etapeName } = data;
    
    await Notification.create({
      idNotification: uuidv4(),
      userId: toUserId,
      type: 'document_forwarded',
      title: 'Nouveau document reçu',
      message: `Document transféré vers l'étape ${etapeName}`,
      relatedId: documentId,
      read: false
    });

    // Optionnel : notification en temps réel via WebSocket
    this.emit('realtime:notification', {
      userId: toUserId,
      notification: {
        type: 'document_forwarded',
        message: `Nouveau document à traiter`
      }
    });
  }

  async handleDocumentApproved(data) {
    const { documentId, approvedBy, originalSender } = data;
    
    await Notification.create({
      idNotification: uuidv4(),
      userId: originalSender,
      type: 'document_approved',
      title: 'Document approuvé',
      message: 'Votre document a été approuvé',
      relatedId: documentId,
      read: false
    });
  }

  async handleDocumentRejected(data) {
    const { documentId, rejectedBy, originalSender, reason } = data;
    
    await Notification.create({
      idNotification: uuidv4(),
      userId: originalSender,
      type: 'document_rejected',
      title: 'Document rejeté',
      message: `Document rejeté: ${reason}`,
      relatedId: documentId,
      read: false
    });
  }
}

const notificationSystem = new NotificationSystem();

// Fonction utilitaire pour créer une notification
const createNotification = async (type, data) => {
  notificationSystem.emit(type, data);
};

module.exports = { createNotification, notificationSystem };
```

### Utilisation dans les Controllers

```javascript
// controllers/documentController.js
const { createNotification } = require('../utils/notificationUtils');

const documentController = {
  async forwardToNextEtape(request, reply) {
    const t = await sequelize.transaction();
    
    try {
      const { documentId, userId, nextEtapeName } = request.body;
      
      // Traitement du transfert
      const document = await Document.findByPk(documentId, { transaction: t });
      const nextUsers = await this.getUsersForEtape(nextEtapeName);
      
      // Mise à jour du document
      await document.update({
        etapeId: nextEtape.idEtape,
        transferStatus: 'sent'
      }, { transaction: t });

      await t.commit();

      // Émettre l'événement (Observer Pattern)
      for (const user of nextUsers) {
        await createNotification('document:forwarded', {
          documentId,
          fromUserId: userId,
          toUserId: user.idUser,
          etapeName: nextEtapeName
        });
      }

      return reply.send({ success: true });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async approveDocument(request, reply) {
    try {
      const { documentId, userId } = request.body;
      
      // Traitement de l'approbation
      const document = await Document.findByPk(documentId);
      await document.update({ status: 'approved' });

      // Notification à l'expéditeur original
      const originalSender = await this.getOriginalSender(documentId);
      
      await createNotification('document:approved', {
        documentId,
        approvedBy: userId,
        originalSender: originalSender.idUser
      });

      return reply.send({ success: true });
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  }
};
```

### Avantages
- **Découplage** : Émetteurs et récepteurs indépendants
- **Extensibilité** : Nouveaux observateurs facilement ajoutés
- **Réactivité** : Réactions automatiques aux événements
- **Asynchrone** : Traitement non-bloquant

---

## 🎯 Strategy Pattern

### Stratégies de Validation

```javascript
// strategies/validationStrategies.js
const validationStrategies = {
  // Stratégie de validation pour les utilisateurs
  userValidation: {
    validate: (userData) => {
      const schema = Joi.object({
        Email: Joi.string().email().required(),
        Password: Joi.string().min(8).required(),
        NomUser: Joi.string().min(2).required(),
        PrenomUser: Joi.string().min(2).required(),
        Telephone: Joi.string().pattern(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/).required()
      });
      
      return schema.validate(userData);
    }
  },

  // Stratégie de validation pour les documents
  documentValidation: {
    validate: (documentData) => {
      const schema = Joi.object({
        Title: Joi.string().min(1).required(),
        etapeId: Joi.string().uuid().required(),
        files: Joi.array().items(Joi.object({
          filename: Joi.string().required(),
          mimetype: Joi.string().valid('application/pdf', 'image/jpeg', 'image/png').required()
        }))
      });
      
      return schema.validate(documentData);
    }
  },

  // Stratégie de validation pour les étapes
  etapeValidation: {
    validate: (etapeData) => {
      const schema = Joi.object({
        LibelleEtape: Joi.string().min(3).required(),
        Description: Joi.string().allow(''),
        sequenceNumber: Joi.number().integer().min(1).required(),
        typeProjetLibelle: Joi.string().required()
      });
      
      return schema.validate(etapeData);
    }
  }
};

// Contexte de validation
class ValidationContext {
  constructor(strategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  validate(data) {
    return this.strategy.validate(data);
  }
}

module.exports = { validationStrategies, ValidationContext };
```

### Stratégies de Traitement de Fichiers

```javascript
// strategies/fileProcessingStrategies.js
const fileStrategies = {
  // Stratégie pour les PDFs
  pdfStrategy: {
    canHandle: (mimetype) => mimetype === 'application/pdf',
    
    process: async (fileBuffer, metadata) => {
      // Traitement spécifique aux PDFs
      const thumbnailPath = await generatePdfThumbnail(fileBuffer, metadata);
      const textContent = await extractPdfText(fileBuffer);
      
      return {
        ...metadata,
        thumbnailPath,
        textContent,
        processed: true
      };
    }
  },

  // Stratégie pour les images
  imageStrategy: {
    canHandle: (mimetype) => mimetype.startsWith('image/'),
    
    process: async (fileBuffer, metadata) => {
      // Traitement spécifique aux images
      const thumbnailPath = await generateImageThumbnail(fileBuffer, metadata);
      const dimensions = await getImageDimensions(fileBuffer);
      
      return {
        ...metadata,
        thumbnailPath,
        dimensions,
        processed: true
      };
    }
  },

  // Stratégie par défaut
  defaultStrategy: {
    canHandle: () => true,
    
    process: async (fileBuffer, metadata) => {
      // Traitement basique
      return {
        ...metadata,
        processed: true
      };
    }
  }
};

// Contexte de traitement de fichiers
class FileProcessingContext {
  constructor() {
    this.strategies = [
      fileStrategies.pdfStrategy,
      fileStrategies.imageStrategy,
      fileStrategies.defaultStrategy
    ];
  }

  async processFile(fileBuffer, metadata) {
    // Sélection de la stratégie appropriée
    const strategy = this.strategies.find(s => s.canHandle(metadata.mimetype));
    return await strategy.process(fileBuffer, metadata);
  }
}
```

### Utilisation dans les Services

```javascript
// services/fileHandler.js
const { ValidationContext, validationStrategies } = require('../strategies/validationStrategies');
const { FileProcessingContext } = require('../strategies/fileProcessingStrategies');

const fileHandler = {
  async saveFile(fileData, documentId) {
    try {
      // Validation avec stratégie appropriée
      const validator = new ValidationContext(validationStrategies.documentValidation);
      const { error } = validator.validate({ files: [fileData] });
      
      if (error) throw new Error('File validation failed');

      // Traitement avec stratégie appropriée
      const processor = new FileProcessingContext();
      const processedFile = await processor.processFile(fileData.buffer, {
        filename: fileData.filename,
        mimetype: fileData.mimetype,
        documentId
      });

      // Sauvegarde en base
      const savedFile = await File.create({
        idFile: uuidv4(),
        documentId,
        fileName: processedFile.filename,
        filePath: processedFile.path,
        fileType: processedFile.mimetype,
        fileSize: processedFile.size,
        thumbnailPath: processedFile.thumbnailPath
      });

      return savedFile;
    } catch (error) {
      throw new Error(`File processing failed: ${error.message}`);
    }
  }
};
```

### Avantages
- **Flexibilité** : Changement d'algorithme à l'exécution
- **Extensibilité** : Nouvelles stratégies facilement ajoutées
- **Maintenabilité** : Algorithmes isolés
- **Testabilité** : Stratégies testables indépendamment

---

## 🔒 Patterns de Sécurité

### Authentification JWT avec Refresh Token

```javascript
// middleware/authMiddleware.js
const authMiddleware = {
  generateToken: (userData) => {
    const payload = {
      id: userData.idUser,
      email: userData.Email,
      roles: userData.Roles?.map(role => role.name) || [],
      isSuperAdmin: userData.Roles?.some(role => role.name === 'superadmin')
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
  },

  verifyToken: async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return reply.status(401).send({ 
          error: 'Unauthorized', 
          message: 'No token provided' 
        });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        // Gestion spéciale pour le refresh token
        if (request.url === '/refresh-token' && error.name === 'TokenExpiredError') {
          decoded = jwt.decode(token);
        } else {
          throw error;
        }
      }
      
      // Enrichissement avec les données utilisateur fraîches
      const user = await User.findOne({
        where: { idUser: decoded.id },
        include: [{
          model: Role,
          through: { attributes: [] }
        }]
      });

      if (!user) {
        return reply.status(401).send({ 
          error: 'Unauthorized', 
          message: 'User not found' 
        });
      }

      request.user = user;
      return;
    } catch (error) {
      return reply.status(401).send({ 
        error: 'Unauthorized', 
        message: 'Invalid token' 
      });
    }
  }
};
```

### Hachage des Mots de Passe

```javascript
// models/user.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    // ... définition des champs
    Password: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    hooks: {
      // Hook de pré-création pour hacher le mot de passe
      beforeCreate: async (user) => {
        if (user.Password) {
          const saltRounds = 10;
          user.Password = await bcrypt.hash(user.Password, saltRounds);
        }
      },
      
      // Hook de pré-mise à jour pour hacher le nouveau mot de passe
      beforeUpdate: async (user) => {
        if (user.changed('Password')) {
          const saltRounds = 10;
          user.Password = await bcrypt.hash(user.Password, saltRounds);
        }
      }
    }
  });

  // Méthode pour comparer les mots de passe
  User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.Password);
  };

  return User;
};
```

### Validation et Sanitisation

```javascript
// middleware/sanitizationMiddleware.js
const sanitizationMiddleware = {
  sanitizeInput: (request, reply, done) => {
    // Sanitisation des données d'entrée
    if (request.body) {
      request.body = sanitizeObject(request.body);
    }
    
    if (request.query) {
      request.query = sanitizeObject(request.query);
    }
    
    done();
  }
};

function sanitizeObject(obj) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Échapper les caractères spéciaux
      sanitized[key] = escapeHtml(value.trim());
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
```

### Contrôle d'Accès Basé sur les Rôles (RBAC)

```javascript
// middleware/authMiddleware.js
const authMiddleware = {
  requireRole: (allowedRoles) => {
    return async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      const userRoles = request.user.Roles?.map(role => role.name) || [];
      const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: `Required roles: ${allowedRoles.join(', ')}`,
          userRoles
        });
      }

      return;
    };
  },

  requirePermission: (permission) => {
    return async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized'
        });
      }

      // Vérification des permissions spécifiques
      const hasPermission = await checkUserPermission(request.user.idUser, permission);
      
      if (!hasPermission) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: `Permission required: ${permission}`
        });
      }

      return;
    };
  }
};

async function checkUserPermission(userId, permission) {
  const user = await User.findByPk(userId, {
    include: [{
      model: Role,
      include: [{
        model: Permission,
        where: { name: permission }
      }]
    }]
  });

  return user?.Roles?.some(role => 
    role.Permissions?.some(perm => perm.name === permission)
  );
}
```

### Avantages
- **Sécurité en profondeur** : Multiples couches de protection
- **Authentification robuste** : JWT avec refresh token
- **Autorisation granulaire** : Contrôle précis des accès
- **Protection des données** : Hachage et sanitisation

---

## 💾 Patterns de Transaction

### Gestion des Transactions Sequelize

```javascript
// controllers/documentController.js
const documentController = {
  async forwardToNextEtape(request, reply) {
    // Création d'une transaction
    const t = await sequelize.transaction();

    try {
      const { documentId, userId, comments, files, nextEtapeName } = request.body;

      // 1. Validation du document
      const document = await Document.findByPk(documentId, { transaction: t });
      if (!document) {
        await t.rollback();
        return reply.status(404).send({ error: 'Document not found' });
      }

      // 2. Traitement des commentaires (atomique)
      const newComments = [];
      if (comments?.length) {
        for (const comment of comments) {
          if (comment.content?.trim()) {
            const newComment = await Commentaire.create({
              idComment: uuidv4(),
              documentId: document.idDocument,
              userId,
              Contenu: comment.content,
              createdAt: new Date()
            }, { transaction: t });
            newComments.push(newComment);
          }
        }
      }

      // 3. Traitement des fichiers (atomique)
      const savedFiles = [];
      if (files?.length) {
        for (const file of files) {
          const savedFile = await File.create({
            idFile: uuidv4(),
            documentId: document.idDocument,
            fileName: file.filename,
            filePath: await fileHandler.saveFileContent(file),
            fileType: file.mimetype,
            fileSize: file.size
          }, { transaction: t });
          savedFiles.push(savedFile);
        }
      }

      // 4. Mise à jour du document
      await document.update({
        status: 'forwarded',
        transferStatus: 'sent',
        transferTimestamp: new Date()
      }, { transaction: t });

      // 5. Recherche de l'étape suivante
      const nextEtape = await Etape.findOne({
        where: { LibelleEtape: nextEtapeName },
        transaction: t
      });

      if (!nextEtape) {
        await t.rollback();
        return reply.status(404).send({ error: 'Next etape not found' });
      }

      // 6. Création d'une nouvelle entrée pour l'étape suivante
      await Document.update({
        etapeId: nextEtape.idEtape
      }, {
        where: { idDocument: documentId },
        transaction: t
      });

      // Commit de toutes les opérations
      await t.commit();

      // 7. Notifications (hors transaction pour éviter les blocages)
      await createNotification('document:forwarded', {
        documentId,
        fromUserId: userId,
        etapeName: nextEtapeName
      });

      return reply.send({
        success: true,
        message: 'Document forwarded successfully',
        data: {
          document,
          comments: newComments,
          files: savedFiles
        }
      });

    } catch (error) {
      // Rollback automatique en cas d'erreur
      await t.rollback();
      console.error('Error forwarding document:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
};
```

### Pattern Unit of Work

```javascript
// services/unitOfWork.js
class UnitOfWork {
  constructor() {
    this.transaction = null;
    this.operations = [];
  }

  async begin() {
    this.transaction = await sequelize.transaction();
  }

  addOperation(operation) {
    this.operations.push(operation);
  }

  async execute() {
    try {
      const results = [];
      
      for (const operation of this.operations) {
        const result = await operation(this.transaction);
        results.push(result);
      }

      await this.transaction.commit();
      return results;
    } catch (error) {
      await this.transaction.rollback();
      throw error;
    }
  }

  async rollback() {
    if (this.transaction) {
      await this.transaction.rollback();
    }
  }
}

// Utilisation
const uow = new UnitOfWork();

uow.addOperation(async (t) => {
  return await User.create(userData, { transaction: t });
});

uow.addOperation(async (t) => {
  return await Role.create(roleData, { transaction: t });
});

uow.addOperation(async (t) => {
  return await UserRoles.create(userRoleData, { transaction: t });
});

const results = await uow.execute();
```

### Transaction avec Retry Pattern

```javascript
// utils/transactionUtils.js
class TransactionManager {
  static async executeWithRetry(operation, maxRetries = 3, delay = 1000) {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      const t = await sequelize.transaction();
      
      try {
        const result = await operation(t);
        await t.commit();
        return result;
      } catch (error) {
        await t.rollback();
        
        attempt++;
        
        // Vérifier si l'erreur est récupérable
        if (this.isRetryableError(error) && attempt < maxRetries) {
          console.log(`Transaction failed, retrying... (attempt ${attempt}/${maxRetries})`);
          await this.sleep(delay * attempt); // Backoff exponentiel
          continue;
        }
        
        throw error;
      }
    }
  }

  static isRetryableError(error) {
    // Erreurs récupérables (deadlock, timeout, etc.)
    const retryableErrors = [
      'SequelizeDeadlockError',
      'SequelizeTimeoutError',
      'SequelizeConnectionError'
    ];
    
    return retryableErrors.includes(error.name);
  }

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Utilisation
const result = await TransactionManager.executeWithRetry(async (t) => {
  // Opérations complexes avec risque de deadlock
  const user = await User.create(userData, { transaction: t });
  const roles = await Role.bulkCreate(roleData, { transaction: t });
  await user.addRoles(roles, { transaction: t });
  
  return { user, roles };
});
```

### Avantages
- **Intégrité des données** : Opérations atomiques
- **Cohérence** : État cohérent de la base de données
- **Récupération d'erreurs** : Rollback automatique
- **Performance** : Optimisation des opérations groupées

---

## 📈 Conclusion

Cette application Fastify implémente de nombreux design patterns qui contribuent à :

### ✅ **Qualité du Code**
- **Maintenabilité** : Code organisé et modulaire
- **Lisibilité** : Patterns reconnaissables et bien documentés
- **Testabilité** : Composants facilement testables

### ✅ **Architecture Robuste**
- **Séparation des responsabilités** : Chaque pattern a son rôle
- **Extensibilité** : Nouvelles fonctionnalités facilement intégrables
- **Réutilisabilité** : Composants réutilisables

### ✅ **Performance et Sécurité**
- **Transactions atomiques** : Intégrité des données garantie
- **Authentification robuste** : Sécurité multicouche
- **Gestion des erreurs** : Récupération élégante des erreurs

### 🔄 **Évolution Continue**
Les patterns implémentés permettent une évolution continue de l'application tout en maintenant la stabilité et la qualité du code.

---

*Cette documentation des design patterns sert de référence pour les développeurs travaillant sur l'application et peut être mise à jour selon l'évolution de l'architecture.*
