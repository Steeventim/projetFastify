#!/bin/bash

echo "🔔 VÉRIFICATION COMPLÈTE DU SYSTÈME DE NOTIFICATIONS"
echo "=================================================="

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les résultats
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $3${NC}"
    fi
}

# Fonction pour afficher les warnings
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Fonction pour afficher les infos
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Variables
BASE_URL="http://localhost:3003"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="Test123!@#"
TOKEN=""

echo "🚀 Démarrage du serveur pour les tests..."

# Démarrer le serveur en arrière-plan
node server.js > notification_test.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Attendre que le serveur démarre
sleep 8

# Vérifier que le serveur répond
print_info "Test de connexion au serveur..."
curl -s "$BASE_URL/health" > /dev/null
print_result $? "Serveur accessible" "Serveur non accessible"

echo ""
echo "📋 VÉRIFICATION DES COMPOSANTS"
echo "==============================="

# 1. Vérifier l'existence des fichiers du système de notification
print_info "Vérification des fichiers..."

# Modèle Notification
if [ -f "models/notification.js" ]; then
    echo -e "${GREEN}✅ Modèle Notification existe${NC}"
else
    echo -e "${RED}❌ Modèle Notification manquant${NC}"
fi

# Controller Notification
if [ -f "controllers/notificationController.js" ]; then
    echo -e "${GREEN}✅ Controller Notification existe${NC}"
else
    echo -e "${RED}❌ Controller Notification manquant${NC}"
fi

# Routes Notification
if [ -f "routes/notificatonRoutes.js" ]; then
    echo -e "${GREEN}✅ Routes Notification existent${NC}"
else
    echo -e "${RED}❌ Routes Notification manquantes${NC}"
fi

# Utils Notification
if [ -f "utils/notificationUtils.js" ]; then
    echo -e "${GREEN}✅ Utils Notification existent${NC}"
else
    echo -e "${RED}❌ Utils Notification manquants${NC}"
fi

echo ""
echo "🗄️  VÉRIFICATION DE LA BASE DE DONNÉES"
echo "======================================"

# Vérifier la table Notifications
print_info "Vérification de la table Notifications..."
PGPASSWORD=$DB_PASSWORD psql -h localhost -U postgres -d cenadi -c "SELECT COUNT(*) FROM \"Notifications\";" > /dev/null 2>&1
print_result $? "Table Notifications existe" "Table Notifications manquante"

# Vérifier la structure de la table
print_info "Vérification de la structure de la table..."
PGPASSWORD=$DB_PASSWORD psql -h localhost -U postgres -d cenadi -c "\\d \"Notifications\"" > table_structure.tmp 2>/dev/null
if [ -f table_structure.tmp ]; then
    echo -e "${GREEN}✅ Structure de table accessible${NC}"
    rm table_structure.tmp
else
    echo -e "${RED}❌ Impossible d'accéder à la structure${NC}"
fi

echo ""
echo "🔌 VÉRIFICATION DES WEBSOCKETS"
echo "=============================="

# Vérifier la configuration Socket.IO dans server.js
if grep -q "socket.io" server.js; then
    echo -e "${GREEN}✅ Socket.IO configuré dans server.js${NC}"
else
    echo -e "${RED}❌ Socket.IO non configuré${NC}"
fi

# Vérifier les événements WebSocket
if grep -q "sendNotification" server.js; then
    echo -e "${GREEN}✅ Événements de notification configurés${NC}"
else
    echo -e "${RED}❌ Événements de notification manquants${NC}"
fi

echo ""
echo "🧪 TESTS FONCTIONNELS"
echo "===================="

# Test de connexion utilisateur pour obtenir un token
print_info "Test de connexion utilisateur..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"Email\":\"$TEST_EMAIL\",\"Password\":\"$TEST_PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✅ Connexion réussie, token obtenu${NC}"
else
    echo -e "${RED}❌ Échec de connexion${NC}"
    echo "Réponse: $LOGIN_RESPONSE"
fi

# Test des routes de notification (si token disponible)
if [ ! -z "$TOKEN" ]; then
    echo ""
    print_info "Test des endpoints de notification..."
    
    # Test GET /notifications
    NOTIF_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/notifications")
    if echo "$NOTIF_RESPONSE" | grep -q "success"; then
        echo -e "${GREEN}✅ GET /notifications fonctionne${NC}"
    else
        echo -e "${RED}❌ GET /notifications ne fonctionne pas${NC}"
        echo "Réponse: $NOTIF_RESPONSE"
    fi
    
    # Test GET /notifications/unread
    UNREAD_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/notifications/unread")
    if echo "$UNREAD_RESPONSE" | grep -q "success"; then
        echo -e "${GREEN}✅ GET /notifications/unread fonctionne${NC}"
    else
        echo -e "${RED}❌ GET /notifications/unread ne fonctionne pas${NC}"
        echo "Réponse: $UNREAD_RESPONSE"
    fi
else
    echo -e "${YELLOW}⚠️  Tests des endpoints ignorés (pas de token)${NC}"
fi

echo ""
echo "📊 VÉRIFICATION DES UTILITAIRES"
echo "==============================="

# Test de création de notification via utils
print_info "Test de la fonction createNotification..."
node -e "
const { createNotification } = require('./utils/notificationUtils');
const { User } = require('./models');

async function test() {
  try {
    // Trouver un utilisateur existant
    const user = await User.findOne();
    if (user) {
      const notif = await createNotification({
        userId: user.idUser,
        title: 'Test de notification',
        message: 'Ceci est un test du système de notification',
        type: 'test'
      });
      console.log('✅ Notification créée avec succès:', notif.idNotification);
    } else {
      console.log('❌ Aucun utilisateur trouvé pour le test');
    }
  } catch (error) {
    console.log('❌ Erreur lors de la création:', error.message);
  }
  process.exit(0);
}

test();
" 2>/dev/null

echo ""
echo "🔍 ANALYSE DES LOGS"
echo "=================="

# Analyser les logs du serveur
if [ -f notification_test.log ]; then
    print_info "Vérification des logs du serveur..."
    
    if grep -q "WebSocket" notification_test.log; then
        echo -e "${GREEN}✅ WebSocket initialisé${NC}"
    else
        echo -e "${YELLOW}⚠️  WebSocket non mentionné dans les logs${NC}"
    fi
    
    if grep -q "Notification" notification_test.log; then
        echo -e "${GREEN}✅ Modèle Notification chargé${NC}"
    else
        echo -e "${YELLOW}⚠️  Modèle Notification non mentionné${NC}"
    fi
    
    # Afficher les erreurs s'il y en a
    if grep -q "Error\|error" notification_test.log; then
        echo -e "${RED}⚠️  Erreurs détectées dans les logs:${NC}"
        grep -i "error" notification_test.log | tail -5
    fi
fi

echo ""
echo "📋 RAPPORT FINAL"
echo "==============="

# Compte des vérifications
TOTAL_CHECKS=0
PASSED_CHECKS=0

# Résumé des vérifications
echo "Composants du système de notification:"
[ -f "models/notification.js" ] && echo "✅ Modèle" || echo "❌ Modèle"
[ -f "controllers/notificationController.js" ] && echo "✅ Controller" || echo "❌ Controller"
[ -f "routes/notificatonRoutes.js" ] && echo "✅ Routes" || echo "❌ Routes"
[ -f "utils/notificationUtils.js" ] && echo "✅ Utils" || echo "❌ Utils"

echo ""
echo "Recommandations:"

# Vérifier si les routes sont enregistrées
if ! grep -q "notificationRoutes" server.js; then
    echo -e "${YELLOW}⚠️  Les routes de notification ne sont pas enregistrées dans server.js${NC}"
    echo "   Ajoutez: fastify.register(notificationRoutes);"
fi

# Vérifier le type dans la migration
if ! grep -q "type:" migrations/20250408053114-create-notifications.js; then
    echo -e "${YELLOW}⚠️  Le champ 'type' manque dans la migration${NC}"
fi

echo ""
echo "🏁 Test terminé"

# Nettoyer
kill $SERVER_PID 2>/dev/null
rm -f notification_test.log table_structure.tmp
