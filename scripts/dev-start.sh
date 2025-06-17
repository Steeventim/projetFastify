#!/bin/bash

# Script pour démarrer l'environnement de développement complet
echo "🚀 Démarrage de l'environnement de développement Fastify..."

# Vérifier que PostgreSQL est démarré
echo "📊 Vérification de PostgreSQL..."
if ! pgrep -x "postgres" > /dev/null; then
    echo "❌ PostgreSQL n'est pas démarré. Veuillez le démarrer avec:"
    echo "   sudo systemctl start postgresql"
    exit 1
fi

# Vérifier la connexion à la base de données
echo "🔗 Test de connexion à la base de données..."
if PGPASSWORD=$DB_PASSWORD psql -h localhost -U postgres -d cenadi -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Connexion à la base de données OK"
else
    echo "❌ Impossible de se connecter à la base de données"
    echo "   Vérifiez vos variables d'environnement DB_* dans .env"
    exit 1
fi

# Vérifier les migrations
echo "🗄️  Vérification des migrations..."
npm run migrate:status | grep "up" | wc -l
echo "✅ Migrations vérifiées"

# Vérifier Elasticsearch (optionnel)
echo "🔍 Vérification d'Elasticsearch (optionnel)..."
if curl -s http://localhost:9200 > /dev/null 2>&1; then
    echo "✅ Elasticsearch disponible"
else
    echo "⚠️  Elasticsearch non disponible (optionnel pour la recherche)"
fi

# Lancer les tests
echo "🧪 Exécution des tests..."
npm test > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Tests passés"
else
    echo "⚠️  Certains tests ont échoué"
fi

# Démarrer le serveur
echo "🚀 Démarrage du serveur de développement..."
echo "   Le serveur sera accessible sur http://localhost:3003"
echo "   Health check: http://localhost:3003/health"
echo ""
echo "   Pour arrêter: Ctrl+C"
echo ""

npm run dev
