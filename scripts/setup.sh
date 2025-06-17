#!/bin/bash

echo "🎯 Setup initial du projet Fastify Document Management System"
echo "================================================================"

# Vérifier Node.js
echo "📦 Vérification de Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js détecté: $NODE_VERSION"

# Vérifier npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé"
    exit 1
fi

# Installer les dépendances
echo "📋 Installation des dépendances..."
npm install
if [ $? -eq 0 ]; then
    echo "✅ Dépendances installées avec succès"
else
    echo "❌ Erreur lors de l'installation des dépendances"
    exit 1
fi

# Vérifier PostgreSQL
echo "🐘 Vérification de PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL n'est pas installé. Installation requise:"
    echo "   Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo "   CentOS/RHEL:   sudo yum install postgresql postgresql-server"
    echo "   macOS:         brew install postgresql"
    exit 1
fi

echo "✅ PostgreSQL détecté"

# Vérifier le fichier .env
echo "⚙️  Vérification de la configuration..."
if [ ! -f ".env" ]; then
    echo "⚠️  Fichier .env manquant. Copie depuis .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Fichier .env créé"
        echo "🔧 IMPORTANT: Modifiez le fichier .env avec vos paramètres:"
        echo "   - DB_PASSWORD=votre_mot_de_passe"
        echo "   - JWT_SECRET=clé_secrète_sécurisée"
        echo "   - EMAIL_USER=votre_email@gmail.com"
        echo "   - EMAIL_PASSWORD=mot_de_passe_application"
    else
        echo "❌ Fichier .env.example manquant"
        exit 1
    fi
else
    echo "✅ Fichier .env présent"
fi

# Créer la base de données si elle n'existe pas
echo "🗄️  Configuration de la base de données..."
echo "Tentative de création de la base de données 'cenadi'..."

# Source .env pour obtenir les variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Créer la base de données
PGPASSWORD=$DB_PASSWORD createdb -h localhost -U postgres cenadi 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Base de données 'cenadi' créée"
else
    echo "ℹ️  Base de données 'cenadi' existe déjà ou erreur de création"
fi

# Exécuter les migrations
echo "🔄 Exécution des migrations..."
npm run migrate
if [ $? -eq 0 ]; then
    echo "✅ Migrations exécutées avec succès"
else
    echo "⚠️  Erreur lors des migrations (vérifiez la configuration DB)"
fi

# Test final
echo "🧪 Test final du setup..."
timeout 10s npm run dev > setup_test.log 2>&1 &
SERVER_PID=$!
sleep 5

if curl -s http://localhost:3003/health > /dev/null 2>&1; then
    echo "✅ Test de santé du serveur réussi"
    kill $SERVER_PID 2>/dev/null
else
    echo "⚠️  Test de santé échoué (voir setup_test.log)"
    kill $SERVER_PID 2>/dev/null
fi

echo ""
echo "🎉 Setup terminé !"
echo "================================================================"
echo "📚 Prochaines étapes :"
echo "   1. Modifiez .env avec vos paramètres"
echo "   2. Lancez le serveur: npm run dev"
echo "   3. Testez: curl http://localhost:3003/health"
echo ""
echo "📖 Documentation complète dans README.md"
echo "🐛 En cas de problème: npm run lint && npm test"
