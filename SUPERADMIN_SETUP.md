# 🛡️ Gestion SuperAdmin

Ce document explique comment créer et gérer le compte SuperAdmin dans l'application Fastify.

## 📋 Informations SuperAdmin Actuelles

- **📧 Email**: `steeventimnou@gmail.com`
- **🔑 Mot de passe**: `SuperAdmin@2025!`
- **👤 Nom**: Steeve Timnou
- **🛡️ Rôle**: superadmin (accès complet au système)

## 🚀 Méthodes de Création

### Méthode 1: Script Automatique (Recommandé)

```bash
# Exécuter le script de configuration complet
./scripts/setup-superadmin.sh

# Ou directement le script de création
npm run create-superadmin
```

### Méthode 2: Migration Sequelize

```bash
# Exécuter la migration spécifique
npx sequelize-cli db:migrate --name 20250617000000-create-new-superadmin.js

# Ou exécuter toutes les migrations
npm run migrate
```

### Méthode 3: Script de Test et Création

```bash
# Créer le superadmin via le script Node.js
node scripts/createSuperAdmin.js

# Tester la connexion
npm run test-superadmin
```

## 🔧 Configuration

### Variables d'Environnement (.env)

```env
# SuperAdmin Configuration
SUPERADMIN_EMAIL=steeventimnou@gmail.com
SUPERADMIN_PASSWORD=SuperAdmin@2025!
```

### Prérequis

1. **Base de données PostgreSQL** active et accessible
2. **Variables d'environnement** configurées dans `.env`
3. **Migrations** exécutées (tables User et Role créées)
4. **Serveur Fastify** démarré (pour les tests)

## 🧪 Tests et Vérification

### Test de Connexion

```bash
# Test automatique de connexion
npm run test-superadmin

# Résultat attendu:
# ✅ Login successful!
# 👤 User Info: [détails utilisateur]
# 🔑 Token: [token JWT]
# ✅ Protected route access successful!
```

### Test Manuel via API

```bash
# Connexion
curl -X POST http://localhost:3003/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "Email": "steeventimnou@gmail.com",
    "Password": "SuperAdmin@2025!"
  }'

# Réponse attendue:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "steeventimnou@gmail.com",
    "nomUser": "Steeve",
    "prenomUser": "Timnou",
    "isSuperAdmin": true,
    "roles": [{"name": "superadmin", ...}]
  }
}
```

### Vérification en Base de Données

```sql
-- Vérifier l'utilisateur
SELECT "idUser", "Email", "NomUser", "PrenomUser", "IsActive" 
FROM "Users" 
WHERE "Email" = 'steeventimnou@gmail.com';

-- Vérifier le rôle
SELECT r.name, r.description 
FROM "Roles" r 
JOIN "UserRoles" ur ON r."idRole" = ur."roleId"
JOIN "Users" u ON ur."userId" = u."idUser"
WHERE u."Email" = 'steeventimnou@gmail.com';
```

## 🔑 Privilèges SuperAdmin

Le SuperAdmin a accès à toutes les fonctionnalités :

### ✅ Gestion des Utilisateurs
- Créer, modifier, supprimer des utilisateurs
- Assigner des rôles
- Réinitialiser les mots de passe

### ✅ Gestion des Rôles et Permissions
- Créer des rôles personnalisés
- Définir les permissions
- Associer rôles et étapes

### ✅ Gestion des Étapes et Documents
- Créer et modifier les étapes
- Gérer les types de projets
- Accès à tous les documents

### ✅ Administration Système
- Créer d'autres administrateurs
- Accès aux logs et statistiques
- Configuration système

## 🛠️ Commandes Utiles

```bash
# Scripts disponibles
npm run create-superadmin      # Créer le superadmin
npm run test-superadmin        # Tester la connexion
./scripts/setup-superadmin.sh  # Configuration guidée

# Migrations
npm run migrate                # Exécuter toutes les migrations
npm run migrate:status         # Vérifier le statut des migrations
npm run migrate:undo          # Annuler la dernière migration

# Serveur
npm start                     # Démarrer le serveur
npm run dev                   # Mode développement avec nodemon
```

## 🚨 Dépannage

### Problème: "User not found" lors de la connexion

```bash
# Vérifier si l'utilisateur existe
npm run create-superadmin

# Ou vérifier en base de données
psql -d cenadi -c "SELECT * FROM \"Users\" WHERE \"Email\" = 'steeventimnou@gmail.com';"
```

### Problème: "Database connection error"

```bash
# Vérifier la connexion à la base
node -e "
require('dotenv').config();
const { sequelize } = require('./models');
sequelize.authenticate().then(() => console.log('✅ DB OK')).catch(console.error);
"
```

### Problème: "Server not responding"

```bash
# Démarrer le serveur
npm start

# Vérifier le port
netstat -tlnp | grep 3003
```

### Problème: "Token expired" ou "Invalid token"

```bash
# Se reconnecter pour obtenir un nouveau token
npm run test-superadmin
```

## 📚 Fichiers Importants

```
project/
├── .env                                    # Variables d'environnement
├── scripts/
│   ├── createSuperAdmin.js                 # Script de création
│   ├── testSuperAdminLogin.js              # Script de test
│   └── setup-superadmin.sh                 # Configuration guidée
├── migrations/
│   ├── superadminMigration.js              # Ancienne migration
│   └── 20250617000000-create-new-superadmin.js  # Nouvelle migration
└── controllers/
    ├── userController.js                   # Gestion des utilisateurs
    └── initializationController.js         # Initialisation système
```

## 🔄 Changelog

- **17/06/2025**: Migration vers `steeventimnou@gmail.com`
- **17/06/2025**: Ajout des scripts automatisés de création et test
- **17/06/2025**: Mise à jour du mot de passe vers `SuperAdmin@2025!`

---

**Note**: Gardez ces informations de connexion confidentielles et sécurisées. Le SuperAdmin a un accès complet au système.
