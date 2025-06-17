# 📚 Documentation API - Guide Développeur Frontend

*Système de Gestion Documentaire Fastify v1.0*

## 🚀 Introduction

Cette documentation fournit toutes les informations nécessaires pour intégrer le frontend avec l'API Fastify. Toutes les routes nécessitent une authentification via JWT Token sauf indication contraire.

## 🔑 Authentification

### Headers requis
```javascript
{
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "Content-Type": "application/json"
}
```

### Gestion des erreurs communes
```javascript
// Codes d'erreur standardisés
{
  401: "Non autorisé - Token manquant ou invalide",
  403: "Accès interdit - Permissions insuffisantes", 
  404: "Ressource non trouvée",
  500: "Erreur serveur interne"
}
```

---

## 👥 Routes d'Authentification

### 🔐 Connexion Utilisateur
**POST** `/users/login`
```javascript
// Request Body
{
  "Email": "user@example.com",
  "Password": "password123"
}

// Response 200
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "nomUser": "Dupont",
    "prenomUser": "Jean",
    "isSuperAdmin": false,
    "lastLogin": "2024-01-15T10:30:00Z",
    "roles": [
      {
        "id": "role-uuid",
        "name": "user",
        "description": "Utilisateur standard",
        "isSystemRole": false
      }
    ]
  }
}
```

### 📝 Inscription Utilisateur
**POST** `/users/register`
```javascript
// Request Body (peut être un objet ou un tableau)
{
  "Email": "newuser@example.com",
  "Password": "securePassword123",
  "NomUser": "Martin",
  "PrenomUser": "Marie",
  "Telephone": "+33123456789",
  "roleNames": ["user"] // optionnel
}

// Response 201
{
  "status": "success",
  "results": [
    {
      "success": true,
      "user": {
        "id": "uuid",
        "email": "newuser@example.com",
        "nomUser": "Martin",
        "roles": ["user"]
      },
      "token": "jwt-token-here"
    }
  ]
}
```

### 🔄 Refresh Token
**POST** `/refresh-token`
```javascript
// Headers: Authorization: Bearer EXPIRED_TOKEN
// Response 200
{
  "success": true,
  "token": "new-jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "nomUser": "Dupont",
    "prenomUser": "Jean",
    "isSuperAdmin": false,
    "roles": [...]
  }
}
```

### 🚪 Déconnexion
**POST** `/logout`
```javascript
// Response 200
{
  "statusCode": 200,
  "message": "Logged out successfully."
}
```

### 🔒 Reset Mot de Passe
**POST** `/users/request-reset`
```javascript
// Request Body
{
  "email": "user@example.com"
}

// Response 200
{
  "statusCode": 200,
  "message": "Password reset email sent"
}
```

**POST** `/users/reset-password`
```javascript
// Request Body
{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword123"
}

// Response 200
{
  "statusCode": 200,
  "message": "Password reset successful"
}
```

---

## 👤 Routes Utilisateurs (Admin uniquement)

### 📋 Lister tous les Utilisateurs
**GET** `/users`
```javascript
// Response 200
[
  {
    "idUser": "uuid",
    "Email": "user@example.com",
    "NomUser": "Dupont",
    "PrenomUser": "Jean",
    "Telephone": "+33123456789",
    "LastLogin": "2024-01-15T10:30:00Z",
    "IsActive": true,
    "Roles": [
      {
        "name": "user"
      }
    ]
  }
]
```

### 👤 Détails d'un Utilisateur
**GET** `/users/:id`
```javascript
// Response 200
{
  "idUser": "uuid",
  "Email": "user@example.com",
  "NomUser": "Dupont",
  "PrenomUser": "Jean",
  "Telephone": "+33123456789",
  "LastLogin": "2024-01-15T10:30:00Z",
  "IsActive": true,
  "Roles": [
    {
      "name": "user"
    }
  ]
}
```

### ✏️ Modifier un Utilisateur
**PUT** `/users/:id`
```javascript
// Request Body
{
  "NomUser": "Nouveau Nom",
  "PrenomUser": "Nouveau Prénom",
  "Telephone": "+33987654321",
  "Password": "nouveauMotDePasse" // optionnel
}

// Response 200
{
  "statusCode": 200,
  "message": "User updated successfully",
  "user": { /* utilisateur mis à jour */ }
}
```

### 🗑️ Supprimer un Utilisateur
**DELETE** `/users/:id`
```javascript
// Response 200
{
  "statusCode": 200,
  "message": "User deleted successfully"
}
```

### 👤 Profil Utilisateur Connecté
**GET** `/users/me`
```javascript
// Response 200
{
  "idUser": "uuid",
  "Email": "user@example.com",
  "NomUser": "Dupont",
  "PrenomUser": "Jean",
  "isSuperAdmin": false,
  "isAdmin": false,
  "roles": [...]
}
```

---

## 📄 Routes Documents

### 📤 Transférer un Document
**POST** `/forward-document`
```javascript
// Content-Type: multipart/form-data
{
  "documentId": "uuid",
  "userId": "uuid", 
  "etapeId": "uuid",
  "comments": [
    {
      "content": "Commentaire sur le document"
    }
  ],
  "files": [/* fichiers joints */]
}

// Response 200
{
  "success": true,
  "message": "Document forwarded successfully",
  "data": {
    "document": { /* détails du document */ },
    "comments": [/* commentaires créés */],
    "files": [/* fichiers ajoutés */]
  }
}
```

### ✅ Approuver un Document
**POST** `/approve-document`
```javascript
// Content-Type: multipart/form-data
{
  "documentId": "uuid",
  "userId": "uuid",
  "etapeId": "uuid",
  "comments": [
    {
      "content": "Document approuvé"
    }
  ],
  "files": [/* fichiers optionnels */]
}

// Response 200
{
  "success": true,
  "message": "Document approved successfully",
  "data": {
    "document": { /* document mis à jour */ },
    "comments": [/* nouveaux commentaires */],
    "files": [/* fichiers ajoutés */]
  }
}
```

### 📨 Documents Reçus
**GET** `/received-documents/:userId`
```javascript
// Response 200
{
  "success": true,
  "message": "Documents retrieved successfully",
  "data": [
    {
      "documentId": "uuid",
      "title": "Document Title",
      "previousEtapeId": "uuid",
      "currentEtapeId": "uuid",
      "senderUserId": "uuid",
      "status": "pending",
      "transferStatus": "received",
      "transferTimestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 📑 Dernier Document
**GET** `/latest-document`
```javascript
// Response 200
{
  "success": true,
  "data": {
    "idDocument": "uuid",
    "Title": "Document Title",
    "status": "pending",
    "transferStatus": "sent",
    "transferTimestamp": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-15T09:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "commentaires": [
      {
        "idComment": "uuid",
        "Contenu": "Commentaire",
        "createdAt": "2024-01-15T10:30:00Z",
        "user": {
          "idUser": "uuid",
          "NomUser": "Dupont"
        }
      }
    ],
    "files": [
      {
        "idFile": "uuid",
        "fileName": "document.pdf",
        "filePath": "/uploads/document.pdf",
        "fileType": "application/pdf",
        "fileSize": 1024000,
        "thumbnailPath": "/uploads/thumbs/document.jpg"
      }
    ],
    "etape": {
      "idEtape": "uuid",
      "LibelleEtape": "Validation",
      "Description": "Étape de validation",
      "sequenceNumber": 1
    }
  }
}
```

### 👁️ Voir un Document
**GET** `/document/:documentTitle`
```javascript
// Response 200
{
  "success": true,
  "data": {
    "document": { /* détails complets du document */ },
    "commentaires": [/* tous les commentaires */],
    "files": [/* tous les fichiers */],
    "etape": { /* informations étape */}
  }
}
```

### ❌ Rejeter un Document
**POST** `/documents/:documentId/reject`
```javascript
// Request Body
{
  "userId": "uuid",
  "comments": [
    {
      "content": "Raison du rejet"
    }
  ]
}

// Response 200
{
  "success": true,
  "message": "Document rejected and returned to sender",
  "data": {
    "document": { /* document mis à jour */ },
    "returnedTo": {
      "id": "uuid",
      "name": "Expéditeur"
    },
    "comments": [/* commentaires de rejet */],
    "files": [/* fichiers du document */]
  }
}
```

### 🎯 Affecter une Étape
**POST** `/assign-etape`
```javascript
// Request Body
{
  "documentName": "Document Title",
  "etapeName": "Validation"
}

// Response 200
{
  "success": true,
  "message": "Etape assigned to document successfully"
}
```

### ⏭️ Transférer à l'Étape Suivante
**POST** `/forward-to-next-etape`
```javascript
// Content-Type: multipart/form-data
{
  "documentId": "uuid",
  "userId": "uuid",
  "etapeId": "uuid",
  "nextEtapeName": "Prochaine Etape",
  "UserDestinatorName": "Destinataire",
  "comments": [
    {
      "content": "Transfert vers étape suivante"
    }
  ]
}

// Response 200
{
  "success": true,
  "message": "Document forwarded to next etape successfully",
  "data": {
    "document": { /* document mis à jour */ },
    "nextEtape": { /* informations étape suivante */ },
    "comments": [/* nouveaux commentaires */],
    "files": [/* fichiers traités */]
  }
}
```

---

## 🎯 Routes Étapes

### 📋 Toutes les Étapes
**GET** `/etapes/all`
```javascript
// Response 200
{
  "success": true,
  "message": "All etapes retrieved successfully",
  "totalEtapes": 5,
  "count": 5,
  "data": [
    {
      "idEtape": "uuid",
      "LibelleEtape": "Validation",
      "Description": "Étape de validation",
      "Validation": true,
      "sequenceNumber": 1,
      "createdAt": "2024-01-15T09:00:00Z",
      "updatedAt": "2024-01-15T09:00:00Z",
      "typeProjets": [
        {
          "idType": "uuid",
          "Libelle": "Projet Standard",
          "Description": "Type de projet standard"
        }
      ]
    }
  ]
}
```

### ➕ Créer une Étape
**POST** `/etapes`
```javascript
// Request Body (peut être un objet ou un tableau)
{
  "LibelleEtape": "Nouvelle Étape",
  "Description": "Description de l'étape",
  "Validation": true,
  "typeProjetLibelle": "Projet Standard"
}

// Response 201
{
  "success": true,
  "message": "Etapes created successfully",
  "count": 1,
  "data": [
    {
      "idEtape": "uuid",
      "LibelleEtape": "Nouvelle Étape",
      "Description": "Description de l'étape",
      "Validation": true,
      "sequenceNumber": 2,
      "typeProjet": {
        "id": "uuid",
        "libelle": "Projet Standard"
      }
    }
  ]
}
```

### 🎯 Étape par ID
**GET** `/etapes/:etapeId`
```javascript
// Response 200
{
  "success": true,
  "data": {
    "idEtape": "uuid",
    "LibelleEtape": "Validation",
    "Description": "Étape de validation",
    "Validation": true,
    "sequenceNumber": 1,
    "typeProjets": [
      {
        "idType": "uuid",
        "Libelle": "Projet Standard",
        "Description": "Type de projet standard"
      }
    ]
  }
}
```

### 👥 Utilisateurs de l'Étape Suivante
**GET** `/etapes/:etapeId/next-users`
```javascript
// Response 200
{
  "success": true,
  "nextUsers": [
    {
      "idUser": "uuid",
      "NomUser": "Dupont",
      "PrenomUser": "Jean",
      "Email": "jean.dupont@example.com"
    }
  ]
}
```

### 🎭 Étapes par Rôle
**GET** `/etapes/role/:roleName`
```javascript
// Response 200
{
  "success": true,
  "role": {
    "id": "uuid",
    "name": "user",
    "description": "Utilisateur standard"
  },
  "totalEtapes": 3,
  "count": 3,
  "data": [
    {
      "idEtape": "uuid",
      "LibelleEtape": "Validation",
      "Description": "Étape de validation",
      "sequenceNumber": 1,
      "Validation": true,
      "hasTransfer": false, // Indicateur si des documents sont en transfert
      "typeProjets": [
        {
          "idType": "uuid",
          "Libelle": "Projet Standard",
          "Description": "Type de projet standard"
        }
      ]
    }
  ]
}
```

### 🗑️ Supprimer une Étape
**DELETE** `/etapes/delete/:etapeId`
```javascript
// Response 200
{
  "success": true,
  "message": "Etape deleted successfully"
}
```

### 🔗 Affecter Étape à Document
**POST** `/etapes/affect`
```javascript
// Content-Type: multipart/form-data
{
  "documentId": "uuid",
  "userId": "uuid",
  "etapeId": "uuid",
  "nextEtapeName": "Prochaine Étape",
  "UserDestinatorName": "Destinataire"
}

// Response 200
{
  "success": true,
  "message": "Etape affected to document successfully"
}
```

---

## 🔍 Routes de Recherche

### 🔎 Recherche sans Nom de Document
**GET** `/search-without-name/:searchTerm`
```javascript
// Response 200 (Stream PDF)
// Headers:
// Content-Type: application/pdf
// Document-Id: uuid
// Document-Url: string
// Document-Status: string
```

### 📖 Recherche avec Nom de Document
**GET** `/search/:documentName/:searchTerm`
```javascript
// Query Parameters: ?etapeName=optional
// Response 200 (Stream PDF avec surlignage)
```

### 💡 Recherche de Propositions
**GET** `/search-propositions/:searchTerm`
```javascript
// Response 200
{
  "success": true,
  "searchTerm": "terme recherché",
  "results": [
    {
      "id": "uuid",
      "title": "Document Title",
      "snippet": "...extrait avec terme recherché...",
      "score": 0.95,
      "url": "/document/path"
    }
  ],
  "total": 10,
  "took": 25
}
```

### 🎨 Surlignage de Document
**GET** `/search1Highligth/:searchTerm`
**GET** `/highlightera2/:documentName/:searchTerm`
```javascript
// Response 200 (PDF avec surlignage)
// Content-Type: application/pdf
```

---

## 🏢 Routes Structures

### 📋 Toutes les Structures
**GET** `/structures/all`
```javascript
// Response 200
[
  {
    "idStructure": "uuid",
    "NomStructure": "Département IT",
    "DescriptionStructure": "Département Informatique",
    "createdAt": "2024-01-15T09:00:00Z",
    "updatedAt": "2024-01-15T09:00:00Z"
  }
]
```

### ➕ Créer une Structure
**POST** `/structures`
```javascript
// Request Body
{
  "NomStructure": "Nouveau Département",
  "DescriptionStructure": "Description du département"
}

// Response 201
{
  "idStructure": "uuid",
  "NomStructure": "Nouveau Département",
  "DescriptionStructure": "Description du département",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

## 🎭 Routes Rôles (Admin uniquement)

### 📋 Tous les Rôles
**GET** `/rolesss`
```javascript
// Response 200
[
  {
    "idRole": "uuid",
    "name": "admin",
    "description": "Administrateur système",
    "isSystemRole": true,
    "createdAt": "2024-01-15T09:00:00Z",
    "updatedAt": "2024-01-15T09:00:00Z"
  }
]
```

### ➕ Créer un Rôle
**POST** `/roles`
```javascript
// Request Body (peut être un objet ou un tableau)
{
  "name": "nouveau_role",
  "description": "Description du nouveau rôle",
  "isSystemRole": false,
  "etapeName": "Validation",
  "permissions": ["read", "write"]
}

// Response 201
{
  "success": true,
  "message": "Roles created successfully",
  "data": [
    {
      "idRole": "uuid",
      "name": "nouveau_role",
      "description": "Description du nouveau rôle",
      "isSystemRole": false,
      "etape": {
        "id": "uuid",
        "name": "Validation"
      }
    }
  ]
}
```

### ✏️ Modifier un Rôle
**PUT** `/roles/:roleId`
```javascript
// Request Body
{
  "name": "role_modifie",
  "description": "Description modifiée"
}

// Response 200
{
  "success": true,
  "message": "Role updated successfully"
}
```

### 🗑️ Supprimer un Rôle
**DELETE** `/roles/:roleId`
```javascript
// Response 204 (No Content)
```

---

## 📊 Routes Projets

### 📋 Tous les Types de Projets
**GET** `/projets/all`
```javascript
// Response 200
[
  {
    "idType": "uuid",
    "Libelle": "Projet Standard",
    "Description": "Type de projet standard",
    "createdAt": "2024-01-15T09:00:00Z",
    "updatedAt": "2024-01-15T09:00:00Z"
  }
]
```

### ➕ Créer un Type de Projet
**POST** `/projets`
```javascript
// Request Body
{
  "Libelle": "Nouveau Type",
  "Description": "Description du nouveau type"
}

// Response 201
{
  "idType": "uuid",
  "Libelle": "Nouveau Type",
  "Description": "Description du nouveau type",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

## 🔗 Routes Étapes-Types Projets

### 📋 Types Projets avec Étapes
**GET** `/typeprojets-with-etapes`
```javascript
// Response 200
{
  "statusCode": 200,
  "message": "Retrieved all TypeProjets with their Etapes successfully",
  "data": [
    {
      "idType": "uuid",
      "Libelle": "Projet Standard",
      "Description": "Type de projet standard",
      "Etapes": [
        {
          "idEtape": "uuid",
          "LibelleEtape": "Validation",
          "Description": "Étape de validation",
          "sequenceNumber": 1
        }
      ]
    }
  ]
}
```

### 🔗 Assigner Étape à Type Projet
**POST** `/assign-etape-type-projet`
```javascript
// Request Body
{
  "etapeId": "uuid",
  "typeProjetId": "uuid"
}

// Response 201
{
  "statusCode": 201,
  "message": "Etape assigned to TypeProjet successfully",
  "data": {
    "id": "uuid",
    "etapeId": "uuid",
    "typeProjetId": "uuid"
  }
}
```

### 🎯 Étapes par Type Projet
**GET** `/typeprojet/:typeProjetId/etapes`
```javascript
// Response 200
{
  "statusCode": 200,
  "message": "Retrieved all Etapes for TypeProjet Projet Standard successfully",
  "typeProjet": {
    "id": "uuid",
    "libelle": "Projet Standard",
    "description": "Type de projet standard"
  },
  "data": [
    {
      "idEtape": "uuid",
      "LibelleEtape": "Validation",
      "Description": "Étape de validation",
      "Validation": true,
      "sequenceNumber": 1,
      "createdAt": "2024-01-15T09:00:00Z",
      "updatedAt": "2024-01-15T09:00:00Z"
    }
  ]
}
```

---

## 🔔 Routes Notifications

### 📋 Toutes les Notifications
**GET** `/notifications`
```javascript
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "message": "Nouveau document reçu",
      "type": "document_received",
      "isRead": false,
      "createdAt": "2024-01-15T10:30:00Z",
      "userId": "uuid"
    }
  ]
}
```

### 📬 Notifications Non Lues
**GET** `/notifications/unread`
```javascript
// Response 200
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "uuid",
      "message": "Document en attente d'approbation",
      "type": "document_pending",
      "isRead": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### ✅ Marquer comme Lu
**PUT** `/notifications/:notificationId/read`
```javascript
// Response 200
{
  "success": true,
  "message": "Notification marked as read"
}
```

### ✅ Marquer Tout comme Lu
**PUT** `/notifications/read-all`
```javascript
// Response 200
{
  "success": true,
  "message": "All notifications marked as read",
  "updated": 5
}
```

### 🗑️ Supprimer une Notification
**DELETE** `/notifications/:notificationId`
```javascript
// Response 200
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

## 💬 Routes Commentaires

### ➕ Créer un Commentaire
**POST** `/commentaires`
```javascript
// Request Body
{
  "content": "Contenu du commentaire",
  "userId": "uuid",
  "documentId": "uuid",
  "UserDestinatorName": "Destinataire"
}

// Response 201
{
  "idComment": "uuid",
  "content": "Contenu du commentaire",
  "userId": "uuid",
  "documentId": "uuid",
  "UserDestinatorName": "Destinataire",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### ✏️ Modifier un Commentaire
**PUT** `/commentaires/:idCommentaire`
```javascript
// Request Body
{
  "content": "Contenu modifié"
}

// Response 200
{
  "message": "Commentaire updated successfully"
}
```

### 🗑️ Supprimer un Commentaire (Admin uniquement)
**DELETE** `/commentaires/:idCommentaire`
```javascript
// Response 200
{
  "message": "Commentaire deleted successfully"
}
```

---

## ⚕️ Routes Système

### 🏥 Health Check
**GET** `/health`
```javascript
// Response 200
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 86400,
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 15,
      "details": {
        "host": "localhost",
        "database": "documentms_dev"
      }
    },
    "environment": {
      "status": "healthy",
      "details": {
        "nodeEnv": "development",
        "configuredVars": 12
      }
    },
    "elasticsearch": {
      "status": "healthy",
      "responseTime": 25,
      "details": {
        "cluster": "elasticsearch",
        "status": "green"
      }
    }
  }
}
```

### 🔧 Initialisation Admin (SuperAdmin uniquement)
**POST** `/init/admin`
```javascript
// Request Body
{
  "email": "admin@example.com",
  "password": "secureAdminPassword",
  "nomUser": "Admin",
  "prenomUser": "System",
  "telephone": "+33123456789"
}

// Response 201
{
  "statusCode": 201,
  "message": "General Admin created successfully",
  "admin": {
    "email": "admin@example.com",
    "nom": "Admin",
    "prenom": "System",
    "telephone": "+33123456789",
    "role": "admin"
  }
}
```

---

## 🛡️ Sécurité et Permissions

### Hiérarchie des Rôles
```javascript
{
  "superadmin": "Accès total au système",
  "admin": "Gestion des utilisateurs, rôles, et configuration",
  "user": "Accès aux fonctionnalités standards"
}
```

### Middleware d'Authentification
- **verifyToken**: Vérifie la validité du JWT
- **requireRole(['admin', 'user'])**: Contrôle d'accès basé sur les rôles
- **requireSuperAdmin**: Accès SuperAdmin uniquement

### Gestion des Erreurs
```javascript
// Format standard des erreurs
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Description détaillée de l'erreur"
}
```

---

## 📝 Notes d'Implémentation

### Upload de Fichiers
- Format: `multipart/form-data`
- Validation MIME type automatique
- Génération de thumbnails pour les images
- Stockage sécurisé dans `/uploads/`

### Pagination
- Certaines routes supportent la pagination
- Paramètres: `?page=1&limit=10`
- Réponse avec metadata: `total`, `count`, `page`

### Recherche Elasticsearch
- Indexation automatique des documents PDF
- Recherche full-text avec score de pertinence
- Surlignage automatique des termes trouvés

### WebSocket (si implémenté)
- Notifications en temps réel
- Mise à jour du statut des documents
- Notifications de workflow

---

## 🔗 Liens Utiles

- **Documentation Fastify**: https://www.fastify.io/docs/
- **JWT.io**: https://jwt.io/
- **Swagger UI**: `/documentation` (si configuré)
- **Health Check**: `/health`

---

## 📞 Support

Pour toute question technique, contactez l'équipe de développement backend.

**Version**: 1.0.0  
**Dernière mise à jour**: Janvier 2024
