# Guide d'Utilisation de l'Interface Frontend - Workflow DGI

## 🎯 Vue d'ensemble

L'interface frontend du système de workflow DGI offre une expérience utilisateur moderne et intuitive pour la gestion des documents administratifs avec support complet des annotations au stylet.

## 🚀 Accès aux Interfaces

### Dashboard Principal
- **URL**: `http://localhost:3003/workflow/dashboard`
- **Description**: Interface de gestion globale avec statistiques et liste des tâches
- **Fonctionnalités**:
  - Statistiques en temps réel (documents en cours, terminés, rejetés)
  - Liste des tâches en attente
  - Création de nouveaux documents
  - Accès rapide au visualiseur

### Visualiseur de Workflow
- **URL**: `http://localhost:3003/workflow/viewer`
- **Description**: Interface d'annotation et de traitement des documents
- **Fonctionnalités**:
  - Visualisation des documents PDF
  - Outils d'annotation (texte, dessin, signature, surlignage)
  - Gestion du workflow (approbation/rejet)
  - Historique complet des actions

## 🎨 Outils d'Annotation Disponibles

### 1. Annotation Texte 📝
- **Utilisation**: Cliquer sur l'outil "Texte" puis sur le document
- **Fonctionnalité**: Ajouter des commentaires textuels
- **Cas d'usage**: Remarques, instructions, clarifications

### 2. Signature Électronique ✍️
- **Utilisation**: Cliquer sur l'outil "Signature" puis dessiner la signature
- **Fonctionnalité**: Signer électroniquement le document
- **Cas d'usage**: Validation officielle, approbation hiérarchique

### 3. Dessin au Stylet 🖊️
- **Utilisation**: Sélectionner "Dessin" et dessiner directement
- **Fonctionnalité**: Annotations libres au stylet ou souris
- **Support**: Écrans tactiles et stylets numériques
- **Cas d'usage**: Annotations manuscrites, schémas, corrections

### 4. Surlignage 🔆
- **Utilisation**: Sélectionner "Surligner" puis cliquer sur les zones
- **Fonctionnalité**: Mettre en évidence des sections importantes
- **Cas d'usage**: Souligner des points clés, marquer des erreurs

## 🔄 Workflow et Rôles

### Étapes du Processus DGI
1. **Saisie/Scan Initial** (Secrétariat)
   - Numérisation du document
   - Vérification de la qualité
   - Injection dans le workflow

2. **Analyse DGI** (Directeur Général des Impôts)
   - Première évaluation
   - Annotations stratégiques
   - Décision de transmission ou rejet

3. **Analyse Directeur Recouvrement**
   - Évaluation technique
   - Annotations spécialisées
   - Transmission ou retour

4. **Traitement Sous-directeur**
   - Analyse détaillée
   - Instructions opérationnelles
   - Validation ou ajustements

5. **Traitement Collaborateur**
   - Préparation de la réponse
   - Rédaction du projet
   - Proposition de solution

6. **Validation Finale DGI**
   - Contrôle qualité
   - Signature finale
   - Clôture du workflow

### Actions Disponibles par Rôle

| Rôle | Annotation | Approbation | Rejet | Signature |
|------|------------|-------------|--------|-----------|
| Secrétariat | ❌ | ✅ | ❌ | ❌ |
| DGI | ✅ | ✅ | ✅ | ✅ |
| Directeur Recouvrement | ✅ | ✅ | ✅ | ✅ |
| Sous-directeur | ✅ | ✅ | ✅ | ✅ |
| Collaborateur | ✅ | ✅ | ❌ | ✅ |

## 🖱️ Utilisation du Visualiseur

### Interface Principale

#### Panneau Gauche - Contrôles
- **Document Info**: ID, statut, priorité
- **Étapes Workflow**: Progression visuelle
- **Outils Annotation**: Sélection des outils
- **Actions**: Approuver, Rejeter, Sauvegarder

#### Zone Centrale - Document
- **Viewer**: Affichage du document PDF
- **Canvas**: Couche d'annotation superposée
- **Zoom**: Contrôles de zoom et navigation

#### Panneau Droit - Historique
- **Historique**: Chronologie des actions
- **Annotations**: Liste des annotations existantes
- **Détails**: Informations contextuelles

### Raccourcis Clavier
- **Ctrl + Zoom**: Ajuster le zoom
- **Espace**: Outil de déplacement
- **Échap**: Annuler l'action en cours
- **Ctrl + S**: Sauvegarder les annotations

## 📱 Support Multi-périphérique

### Ordinateurs de Bureau
- Interface optimisée pour écrans larges
- Support souris et clavier complet
- Toutes les fonctionnalités disponibles

### Tablettes
- Interface tactile adaptée
- Support stylet natif
- Gestes tactiles intuitifs
- Mode portrait/paysage

### Smartphones (Affichage adaptatif)
- Interface condensée
- Navigation simplifiée
- Fonctionnalités essentielles

## 🔧 Configuration et Personnalisation

### Paramètres d'Annotation
```javascript
// Configuration des outils dans workflow-viewer.js
const annotationConfig = {
    strokeWidth: 3,        // Épaisseur du trait
    defaultColor: '#007bff', // Couleur par défaut
    canvasSize: {          // Taille du canvas
        width: 800,
        height: 600
    }
};
```

### Thèmes et Couleurs
- Interface Bootstrap 5 moderne
- Thème DGI avec couleurs institutionnelles
- Mode sombre disponible (futur)

## 🚨 Gestion des Erreurs

### Erreurs Courantes
1. **Document non chargé**: Vérifier la connexion réseau
2. **Annotations perdues**: Utiliser la sauvegarde automatique
3. **Permissions insuffisantes**: Vérifier les droits utilisateur
4. **Workflow bloqué**: Contacter l'administrateur

### Messages d'Erreur
- Notifications toast en temps réel
- Codes d'erreur explicites
- Instructions de résolution

## 📊 Statistiques et Reporting

### Dashboard Analytics
- **Workflows en cours**: Nombre total actuel
- **Taux de completion**: Pourcentage de réussite
- **Temps moyen**: Durée moyenne de traitement
- **Goulots d'étranglement**: Identification des blocages

### Exports Disponibles
- Historique au format JSON
- Annotations au format PDF
- Rapports Excel (futur)
- Données analytics CSV

## 🔐 Sécurité et Conformité

### Authentification
- Tokens JWT sécurisés
- Sessions temporisées
- Authentification multi-facteur (futur)

### Audit Trail
- Traçabilité complète des actions
- Horodatage précis
- Identification des utilisateurs
- Conservation des données

### Conformité RGPD
- Anonymisation des données sensibles
- Droit à l'oubli respecté
- Consentement explicite
- Portabilité des données

## 🔄 Intégration API

### Endpoints Disponibles
```bash
# Statistiques
GET /api/workflow/stats

# Tâches en attente
GET /api/workflow/tasks/pending

# Créer un workflow
POST /api/workflow/start

# Traiter une étape
POST /api/workflow/:id/process

# Ajouter une annotation
POST /api/workflow/:id/annotate

# Historique
GET /api/workflow/history/:id

# Annotations
GET /api/workflow/annotations/:id
```

### Format des Données
```json
{
  "annotation": {
    "type": "text|drawing|signature|highlight",
    "content": "Contenu de l'annotation",
    "coordinates": { "x": 100, "y": 200 },
    "page": 1,
    "strokeData": { /* données du dessin */ }
  }
}
```

## 📈 Performance et Optimisation

### Recommandations
- **Résolution écran**: Minimum 1920x1080 pour une expérience optimale
- **Navigateur**: Chrome/Firefox dernières versions
- **Connexion**: Minimum 5 Mbps pour les documents volumineux
- **Mémoire**: 4GB RAM minimum recommandé

### Optimisations Implémentées
- Lazy loading des documents
- Compression des annotations
- Cache intelligent côté client
- Rendu optimisé du canvas

## 🆘 Support et Assistance

### Documentation Technique
- Code source documenté
- API Reference complète
- Guides d'installation
- Procédures de déploiement

### Contact Support
- **Email**: support-dgi@example.com
- **Téléphone**: +33 1 23 45 67 89
- **Tickets**: Système de ticketing intégré
- **Wiki**: Base de connaissances en ligne

## 🚀 Mises à Jour et Évolutions

### Version Actuelle: 1.0.0
- Interface frontend complète
- Annotations multi-outils
- Workflow 6 étapes
- Support tactile/stylet

### Roadmap Futur
- **v1.1**: Mode collaboratif temps réel
- **v1.2**: Reconnaissance optique de caractères (OCR)
- **v1.3**: Intelligence artificielle pour suggestions
- **v2.0**: Application mobile native

---

## 🎉 Conclusion

L'interface frontend du workflow DGI représente une solution moderne et complète pour la gestion documentaire administrative. Avec ses outils d'annotation avancés et son support multi-périphérique, elle transforme l'expérience utilisateur traditionnelle en un processus numérique fluide et efficace.

**Prêt à démarrer ? Accédez au dashboard :** http://localhost:3003/workflow/dashboard
