# 🚀 Fastify Document Management System

## 📋 Description

Application Fastify complète pour la gestion de documents avec workflow d'étapes, authentification JWT, et système de rôles et permissions avancé.

### 🌟 Fonctionnalités Principales

- ✅ **Authentification JWT** avec refresh tokens
- 👥 **Gestion des utilisateurs** et système de rôles
- 📄 **Workflow de documents** avec étapes de validation
- 💬 **Système de commentaires** et notifications
- 📤 **Upload de fichiers** sécurisé
- 🔍 **Recherche** avec Elasticsearch
- 🔔 **Notifications temps réel** via WebSockets
- 🔐 **Reset de mot de passe** sécurisé

## 🛠️ Installation

### Prérequis
- Node.js (v16 ou supérieur)
- PostgreSQL (v13 ou supérieur)
- Elasticsearch (optionnel, pour la recherche)

### Configuration

1. **Cloner le projet**
```bash
git clone <votre-repo>
cd myproject
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration de l'environnement**
```bash
cp .env.example .env
# Modifier .env avec vos paramètres
```

4. **Configuration de la base de données**
```bash
# Créer la base de données
createdb cenadi

# Exécuter les migrations
npm run migrate
```

## 🚀 Usage

### Développement
```bash
npm run dev
```

### Production
```bash
npm start
```

### Migrations
```bash
npm run migrate          # Exécuter toutes les migrations
npm run migrate:undo     # Annuler la dernière migration
npm run migrate:fresh    # Reset complet de la DB
```

### Tests
```bash
npm test
```

## 📡 API Endpoints

### 🔐 Authentication
- `POST /users/login` - Connexion utilisateur
- `POST /users/register` - Inscription
- `POST /users/request-reset` - Demande reset mot de passe
- `POST /users/reset-password` - Reset mot de passe
- `POST /refresh-token` - Refresh du token JWT
- `POST /logout` - Déconnexion

### 👥 Users (Admin uniquement)
- `GET /users` - Liste des utilisateurs
- `GET /users/:id` - Détails utilisateur
- `PUT /users/:id` - Modifier utilisateur
- `DELETE /users/:id` - Supprimer utilisateur
- `GET /users/me` - Profil utilisateur connecté

### 📄 Documents
- `POST /forward-document` - Transférer document
- `POST /approve-document` - Approuver document
- `GET /received-documents/:userId` - Documents reçus
- `GET /latest-document` - Dernier document

### 🎯 Étapes
- `GET /etapes/all` - Toutes les étapes
- `POST /etapes` - Créer étape(s)
- `GET /etapes/:id` - Détails étape
- `POST /etapes/affect` - Affecter étape à document

## 🏗️ Architecture

```
├── config/          # Configuration (DB, upload, validation)
├── controllers/     # Logique métier
├── middleware/      # Middlewares (auth, rate limiting)
├── models/          # Modèles Sequelize
├── routes/          # Définition des routes
├── migrations/      # Migrations base de données
├── scripts/         # Scripts utilitaires
├── uploads/         # Fichiers uploadés
└── utils/           # Fonctions utilitaires
```

## 🔒 Sécurité

- **JWT** avec expiration configurable
- **Rate limiting** (100 req/15min)
- **Validation** des entrées avec Joi
- **Hachage** des mots de passe avec bcrypt
- **Contrôle d'accès** basé sur les rôles
- **Upload sécurisé** avec validation MIME

## 🐛 Débogage

### Logs
Les logs sont configurés avec Pino :
```bash
# Logs détaillés en développement
npm run dev

# Vérifier les logs de migration
npm run migrate:status
```

### Base de données
```bash
# Vérifier la connexion
psql -U postgres -d cenadi -c "SELECT version();"

# État des migrations
npm run migrate:status
```

## Dependencies

- Fastify
- Sequelize
- dotenv
- cors
- @fastify/multipart
- @fastify/rate-limit
- nodemailer
- pdf-lib
- And others...

## Testing

To run the tests, use the following command:

```bash
npm test
```
