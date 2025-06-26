# 📊 Documentation Dashboard Admin - Routes API

## 🎯 Vue d'ensemble

Le dashboard admin fournit des routes API pour récupérer des statistiques et métriques en temps réel du système. Toutes les routes sont protégées et nécessitent une authentification avec les rôles `admin` ou `superadmin`.

---

## 🔐 Authentification

Toutes les routes requièrent :
- **Header Authorization** : `Bearer <token>`
- **Rôles requis** : `admin` ou `superadmin`

---

## 📋 Routes Disponibles

### 📊 Vue d'ensemble générale
**GET** `/admin/dashboard/overview`

Récupère les statistiques générales du système.

```javascript
// Response 200
{
  "success": true,
  "timestamp": "2025-06-19T10:30:00Z",
  "data": {
    "users": {
      "total": 150,
      "active": 125,
      "inactive": 25,
      "activePercentage": 83
    },
    "documents": {
      "total": 1250,
      "pending": 85,
      "processed": 1165,
      "pendingPercentage": 7
    },
    "system": {
      "etapes": 8,
      "roles": 6,
      "structures": 12,
      "typeProjets": 4,
      "files": 2340
    },
    "notifications": {
      "total": 650,
      "unread": 45,
      "read": 605,
      "unreadPercentage": 7
    }
  }
}
```

### 👥 Statistiques des utilisateurs
**GET** `/admin/dashboard/users`

Récupère les statistiques détaillées des utilisateurs.

```javascript
// Response 200
{
  "success": true,
  "timestamp": "2025-06-19T10:30:00Z",
  "data": {
    "byRole": [
      {
        "name": "user",
        "description": "Utilisateur standard",
        "userCount": 98
      },
      {
        "name": "admin",
        "description": "Administrateur",
        "userCount": 12
      }
    ],
    "recentActivity": [
      {
        "idUser": "uuid",
        "Email": "user@example.com",
        "NomUser": "Dupont",
        "PrenomUser": "Jean",
        "LastLogin": "2025-06-19T09:45:00Z",
        "IsActive": true,
        "Roles": [{"name": "user"}]
      }
    ],
    "growthByMonth": [
      {
        "month": "2025-01-01T00:00:00Z",
        "count": 15
      }
    ]
  }
}
```

### 📄 Statistiques des documents
**GET** `/admin/dashboard/documents`

Récupère les statistiques détaillées des documents.

```javascript
// Response 200
{
  "success": true,
  "timestamp": "2025-06-19T10:30:00Z",
  "data": {
    "byStatus": [
      {
        "status": "pending",
        "transferStatus": "sent",
        "count": 45
      },
      {
        "status": "verified",
        "transferStatus": "received",
        "count": 120
      }
    ],
    "byEtape": [
      {
        "idEtape": "uuid",
        "LibelleEtape": "Saisie/Scan Initial",
        "sequenceNumber": 1,
        "documentCount": 25
      }
    ],
    "recent": [
      {
        "idDocument": "uuid",
        "Title": "Document Recouvrement ABC",
        "status": "pending",
        "transferStatus": "sent",
        "transferTimestamp": "2025-06-19T09:30:00Z",
        "etape": {
          "LibelleEtape": "Validation DGI",
          "sequenceNumber": 2
        }
      }
    ],
    "dailyCreation": [
      {
        "day": "2025-06-19T00:00:00Z",
        "count": 12
      }
    ]
  }
}
```

### 🔔 Statistiques des notifications
**GET** `/admin/dashboard/notifications`

Récupère les statistiques des notifications du système.

```javascript
// Response 200
{
  "success": true,
  "timestamp": "2025-06-19T10:30:00Z",
  "data": {
    "byType": [
      {
        "type": "document_forwarded",
        "count": 245
      },
      {
        "type": "document_approved",
        "count": 180
      }
    ],
    "recent": [
      {
        "idNotification": "uuid",
        "message": "Document transféré vers l'étape Validation DGI",
        "type": "document_forwarded",
        "read": false,
        "createdAt": "2025-06-19T10:25:00Z",
        "user": {
          "NomUser": "Martin",
          "PrenomUser": "Paul",
          "Email": "paul.martin@example.com"
        }
      }
    ],
    "dailyStats": [
      {
        "day": "2025-06-19T00:00:00Z",
        "count": 15,
        "unreadCount": 8
      }
    ]
  }
}
```

### 🎯 Statistiques des flux de travail
**GET** `/admin/dashboard/workflow`

Récupère les statistiques des étapes et flux de travail.

```javascript
// Response 200
{
  "success": true,
  "timestamp": "2025-06-19T10:30:00Z",
  "data": {
    "etapeEfficiency": [
      {
        "idEtape": "uuid",
        "LibelleEtape": "Saisie/Scan Initial",
        "sequenceNumber": 1,
        "totalDocuments": 125,
        "pendingDocuments": 15,
        "receivedDocuments": 85,
        "completedDocuments": 25
      }
    ],
    "bottlenecks": [
      {
        "idEtape": "uuid",
        "LibelleEtape": "Validation DGI",
        "sequenceNumber": 2,
        "pendingCount": 25
      }
    ],
    "flowDistribution": [
      {
        "status": "pending",
        "transferStatus": "sent",
        "count": 15,
        "etape": {
          "LibelleEtape": "Validation DGI",
          "sequenceNumber": 2
        }
      }
    ]
  }
}
```

### 📁 Statistiques des fichiers
**GET** `/admin/dashboard/files`

Récupère les statistiques des fichiers du système.

```javascript
// Response 200
{
  "success": true,
  "timestamp": "2025-06-19T10:30:00Z",
  "data": {
    "overview": {
      "totalFiles": 2340,
      "totalSize": 1250000000,
      "averageSize": 534188
    },
    "byType": [
      {
        "fileType": "application/pdf",
        "count": 1850,
        "totalSize": 980000000
      },
      {
        "fileType": "image/jpeg",
        "count": 320,
        "totalSize": 180000000
      }
    ],
    "recent": [
      {
        "idFile": "uuid",
        "fileName": "document_scan.pdf",
        "fileType": "application/pdf",
        "fileSize": 1250000,
        "createdAt": "2025-06-19T09:45:00Z",
        "document": {
          "Title": "Document Recouvrement XYZ",
          "etape": {
            "LibelleEtape": "Analyse Directeur"
          }
        }
      }
    ]
  }
}
```

### 📊 Métriques de performance
**GET** `/admin/dashboard/metrics`

Récupère les métriques de performance du système.

```javascript
// Response 200
{
  "success": true,
  "timestamp": "2025-06-19T10:30:00Z",
  "data": {
    "recentActivity": {
      "activeUsers": 25,
      "documentsProcessed": 12,
      "notifications": 8,
      "comments": 15
    },
    "trends": {
      "documents": {
        "current": 45,
        "previous": 38,
        "trend": 18
      },
      "userActivity": {
        "current": 85,
        "previous": 78,
        "trend": 9
      }
    }
  }
}
```

### 🔄 Données en temps réel
**GET** `/admin/dashboard/realtime`

Récupère les données en temps réel pour les graphiques dynamiques.

```javascript
// Response 200
{
  "success": true,
  "timestamp": "2025-06-19T10:30:00Z",
  "data": {
    "activeUsers": 25,
    "pendingDocuments": 45,
    "recentNotifications": 8,
    "recentComments": 12,
    "systemLoad": {
      "cpu": 65,
      "memory": 72,
      "database": 45
    }
  }
}
```

### 📈 Dashboard complet
**GET** `/admin/dashboard/complete`

Récupère toutes les données du dashboard en une seule requête optimisée.

```javascript
// Response 200
{
  "success": true,
  "timestamp": "2025-06-19T10:30:00Z",
  "data": {
    "overview": { /* données de /overview */ },
    "users": { /* données de /users */ },
    "documents": { /* données de /documents */ },
    "notifications": { /* données de /notifications */ },
    "workflow": { /* données de /workflow */ },
    "files": { /* données de /files */ },
    "metrics": { /* données de /metrics */ },
    "realtime": { /* données de /realtime */ }
  }
}
```

---

## 🚀 Utilisation Frontend

### Exemple d'intégration React/Vue.js

```javascript
// Service API Dashboard
class DashboardAPI {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async getOverview() {
    const response = await fetch(`${this.baseURL}/admin/dashboard/overview`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  }

  async getRealTimeData() {
    const response = await fetch(`${this.baseURL}/admin/dashboard/realtime`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  }

  async getCompleteData() {
    const response = await fetch(`${this.baseURL}/admin/dashboard/complete`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  }
}

// Utilisation
const dashboardAPI = new DashboardAPI('http://localhost:3003', userToken);

// Charger les données initiales
const initialData = await dashboardAPI.getCompleteData();

// Actualiser les données en temps réel (toutes les 30 secondes)
setInterval(async () => {
  const realtimeData = await dashboardAPI.getRealTimeData();
  updateCharts(realtimeData);
}, 30000);
```

### Exemple d'actualisation automatique

```javascript
// Hook React pour données temps réel
import { useState, useEffect } from 'react';

export function useDashboardData(refreshInterval = 30000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getCompleteData();
        setData(response.data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Chargement initial
    fetchData();

    // Actualisation périodique
    const interval = setInterval(fetchData, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { data, loading, error };
}
```

---

## 🔧 Performance et Optimisation

### Recommandations d'utilisation

1. **Données complètes** : Utilisez `/admin/dashboard/complete` pour le chargement initial
2. **Temps réel** : Utilisez `/admin/dashboard/realtime` pour les mises à jour fréquentes
3. **Spécifiques** : Utilisez les routes spécifiques pour des sections particulières
4. **Cache** : Implémentez un cache côté client pour réduire les requêtes
5. **Pagination** : Les données récentes sont limitées automatiquement

### Fréquences recommandées

- **Données générales** : 2-5 minutes
- **Temps réel** : 30 secondes - 1 minute
- **Métriques système** : 1-2 minutes
- **Activité utilisateur** : 1 minute

---

## 🛡️ Sécurité

- Toutes les routes sont protégées par authentification JWT
- Vérification des rôles admin/superadmin
- Pas d'exposition de données sensibles (mots de passe, tokens)
- Limitation automatique des données volumineuses
- Validation des paramètres d'entrée

---

## 📊 Types de Graphiques Recommandés

### Vue d'ensemble
- **Cartes de statistiques** : Totaux et pourcentages
- **Graphiques en secteurs** : Distribution par statut
- **Barres horizontales** : Comparaisons simples

### Utilisateurs
- **Graphique en barres** : Utilisateurs par rôle
- **Graphique linéaire** : Croissance mensuelle
- **Liste** : Activité récente

### Documents
- **Graphique en secteurs** : Documents par statut
- **Graphique en barres** : Documents par étape
- **Graphique linéaire** : Création quotidienne

### Flux de travail
- **Funnel** : Progression dans les étapes
- **Graphique en barres** : Goulots d'étranglement
- **Heatmap** : Efficacité par étape

### Temps réel
- **Graphiques dynamiques** : Métriques en temps réel
- **Jauges** : Charge système
- **Compteurs animés** : Activité récente

---

*Dashboard Admin API - Version 1.0*  
*Dernière mise à jour : 19 juin 2025*
