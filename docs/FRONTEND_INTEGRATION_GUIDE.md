# 🚀 Guide d'Intégration Frontend - Workflow DGI

## 📋 Vue d'Ensemble

Ce guide montre comment intégrer le workflow DGI avec un frontend en utilisant les **API endpoints existants** du backend Fastify. Toutes les fonctionnalités nécessaires sont déjà implémentées !

## 🔐 1. Authentification et Gestion des Utilisateurs

### 🔑 Connexion des Utilisateurs DGI

```javascript
// Frontend JavaScript - Connexion d'un utilisateur DGI
async function loginDgiUser(email, password) {
  try {
    const response = await fetch("http://localhost:3003/users/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Email: email,
        Password: password,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // Stocker le token JWT
      localStorage.setItem("dgi_token", data.token);
      localStorage.setItem("dgi_user", JSON.stringify(data.user));

      console.log("Utilisateur connecté:", data.user);
      return {
        success: true,
        user: data.user,
        token: data.token,
      };
    } else {
      throw new Error(data.message || "Échec de la connexion");
    }
  } catch (error) {
    console.error("Erreur de connexion:", error);
    return { success: false, error: error.message };
  }
}

// Exemples d'utilisation
loginDgiUser("secretariat@dgi.gov", "password123");
loginDgiUser("directeur.general@dgi.gov", "password123");
loginDgiUser("directeur.recouvrement@dgi.gov", "password123");
```

### 👤 Vérification du Rôle Utilisateur

```javascript
// Utilitaire pour vérifier le rôle de l'utilisateur connecté
function getCurrentUserRole() {
  const user = JSON.parse(localStorage.getItem("dgi_user") || "{}");
  const roles = user.roles || [];

  // Mapper les rôles DGI
  const dgiRoles = {
    secretariat_scanneur: "Agent Secrétariat",
    dgi_directeur: "Directeur Général DGI",
    directeur_recouvrement: "Directeur Recouvrement",
    sous_directeur: "Sous-Directeur",
    cadre_recouvrement: "Cadre Recouvrement",
  };

  const userRole = roles.find((role) => dgiRoles[role.name]);
  return userRole
    ? {
        code: userRole.name,
        label: dgiRoles[userRole.name],
        permissions: userRole.permissions || [],
      }
    : null;
}

// Headers d'authentification pour toutes les requêtes
function getAuthHeaders() {
  const token = localStorage.getItem("dgi_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
```

## 🔍 2. Recherche et Sélection de Documents

### 📄 Recherche de Documents de Recouvrement

```javascript
// Recherche de documents via Elasticsearch
async function searchRecouvrementDocuments(searchTerm) {
  try {
    const response = await fetch(
      `http://localhost:3003/search-propositions/${encodeURIComponent(
        searchTerm
      )}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        documents: data.data.hits.hits.map((hit) => ({
          id: hit._id,
          title: hit._source.file?.filename || "Document sans titre",
          content: hit._source.content,
          highlights: hit.highlight?.content || [],
          url: `http://localhost:3000/documents/${hit._source.file?.filename}`,
        })),
      };
    } else {
      throw new Error(data.message || "Erreur de recherche");
    }
  } catch (error) {
    console.error("Erreur de recherche:", error);
    return { success: false, error: error.message };
  }
}

// Interface de recherche pour l'agent secrétariat
async function displaySearchInterface() {
  const searchTerm = prompt("Rechercher un document de recouvrement:");
  if (!searchTerm) return;

  const results = await searchRecouvrementDocuments(searchTerm);

  if (results.success) {
    console.log("Documents trouvés:", results.documents);

    // Afficher la liste des documents
    results.documents.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.title}`);
      console.log(`   Extraits: ${doc.highlights.join("...")}`);
    });

    return results.documents;
  } else {
    alert("Aucun document trouvé ou erreur: " + results.error);
    return [];
  }
}
```

### 📋 Création d'un Document dans le Workflow

```javascript
// Créer un document et l'injecter dans le workflow DGI
async function createDocumentInWorkflow(documentData) {
  try {
    const response = await fetch("http://localhost:3003/documents", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        Title: documentData.title,
        url: documentData.url,
        // Le backend assignera automatiquement la première étape
        UserDestinatorName: "Directeur Général DGI",
        status: "pending",
        transferStatus: "pending",
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("Document créé dans le workflow:", data);
      return { success: true, document: data };
    } else {
      throw new Error(data.message || "Erreur création document");
    }
  } catch (error) {
    console.error("Erreur création document:", error);
    return { success: false, error: error.message };
  }
}

// Workflow complet pour l'agent secrétariat
async function initiateRecouvrementWorkflow() {
  // 1. Rechercher le document
  const documents = await displaySearchInterface();
  if (documents.length === 0) return;

  // 2. Sélectionner le document (ici le premier)
  const selectedDoc = documents[0];

  // 3. Créer l'entrée dans le workflow
  const result = await createDocumentInWorkflow({
    title: `Recouvrement - ${selectedDoc.title}`,
    url: selectedDoc.url,
  });

  if (result.success) {
    // 4. Ajouter commentaire initial
    await addCommentToDocument(
      result.document.idDocument,
      "Document scanné et indexé. Prêt pour validation DGI."
    );

    alert("Document ajouté au workflow DGI avec succès !");
    return result.document;
  }

  return null;
}
```

## 🔄 3. Gestion du Workflow - Transmission entre Étapes

### 📤 Transmission à l'Étape Suivante

```javascript
// Transmettre un document à l'étape suivante
async function forwardDocumentToNextStep(documentId, comment, destinataire) {
  try {
    const response = await fetch(
      `http://localhost:3003/documents/${documentId}/forward`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          commentaire: comment,
          UserDestinatorName: destinataire,
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      console.log("Document transmis:", data);
      return { success: true, data };
    } else {
      throw new Error(data.message || "Erreur transmission");
    }
  } catch (error) {
    console.error("Erreur transmission:", error);
    return { success: false, error: error.message };
  }
}

// Interface de transmission pour DGI Directeur
async function dgiValidateAndForward(documentId) {
  const annotation =
    prompt("Annotations DGI (optionnel):") ||
    "Document validé par DGI. Procéder selon procédure standard.";

  const result = await forwardDocumentToNextStep(
    documentId,
    annotation,
    "Directeur du Recouvrement"
  );

  if (result.success) {
    alert("Document validé et transmis au Directeur du Recouvrement");
    // Optionnel: actualiser la liste des documents
    refreshDocumentsList();
  } else {
    alert("Erreur: " + result.error);
  }
}

// Interface pour Directeur du Recouvrement
async function directeurAnalyzeAndForward(documentId) {
  const orientations =
    prompt("Orientations pour le traitement:") ||
    "Analyser le dossier et proposer une solution de recouvrement.";

  const result = await forwardDocumentToNextStep(
    documentId,
    orientations,
    "Sous-Directeur"
  );

  if (result.success) {
    alert("Orientations données et dossier transmis au Sous-Directeur");
  }
}
```

### 📋 Affectation avec Étapes Spécifiques

```javascript
// Utiliser l'endpoint existant pour affecter une étape spécifique
async function affectDocumentToEtape(documentId, etapeName, comment) {
  try {
    // D'abord obtenir l'ID de l'étape
    const etapes = await getWorkflowEtapes();
    const etape = etapes.find((e) => e.LibelleEtape === etapeName);

    if (!etape) {
      throw new Error(`Étape "${etapeName}" non trouvée`);
    }

    const userId = JSON.parse(localStorage.getItem("dgi_user")).id;

    const response = await fetch("http://localhost:3003/etapes/affect", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        documentId: documentId,
        userId: userId,
        commentaire: comment,
        nextEtapeName: etapeName,
      }),
    });

    const data = await response.json();
    return response.ok
      ? { success: true, data }
      : { success: false, error: data.message };
  } catch (error) {
    console.error("Erreur affectation étape:", error);
    return { success: false, error: error.message };
  }
}

// Récupérer les étapes du workflow DGI
async function getWorkflowEtapes() {
  try {
    const response = await fetch("http://localhost:3003/etapes", {
      method: "GET",
      headers: getAuthHeaders(),
    });

    const data = await response.json();
    return response.ok
      ? data.filter((e) =>
          e.typeProjets?.some((tp) => tp.Libelle === "Recouvrement DGI")
        )
      : [];
  } catch (error) {
    console.error("Erreur récupération étapes:", error);
    return [];
  }
}
```

## 💬 4. Gestion des Commentaires et Annotations

### 📝 Ajouter des Annotations

```javascript
// Ajouter un commentaire/annotation à un document
async function addCommentToDocument(documentId, comment) {
  try {
    const response = await fetch("http://localhost:3003/commentaires", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        documentId: documentId,
        Contenu: comment,
      }),
    });

    const data = await response.json();
    return response.ok
      ? { success: true, data }
      : { success: false, error: data.message };
  } catch (error) {
    console.error("Erreur ajout commentaire:", error);
    return { success: false, error: error.message };
  }
}

// Interface d'annotation pour chaque rôle
const annotationTemplates = {
  dgi_directeur: [
    "Document validé - Procédure standard",
    "Document validé - Procédure prioritaire",
    "Document validé - Procédure renforcée",
    "Demande complément d'information",
  ],
  directeur_recouvrement: [
    "Analyser historique paiements",
    "Calculer pénalités de retard",
    "Proposer échéancier amiable",
    "Engager procédure contentieuse",
  ],
  sous_directeur: [
    "Assigner au collaborateur désigné",
    "Convoquer l'entreprise sous 5 jours",
    "Priorité absolue - délai 48h",
    "Procédure normale - délai standard",
  ],
  cadre_recouvrement: [
    "VALIDATION - Projet de réponse favorable",
    "REJET - Dossier non recouvrable",
    "EN COURS - Nécessite investigation",
    "ATTENTE - Réponse entreprise attendue",
  ],
};

// Interface d'annotation intelligente
async function smartAnnotationInterface(documentId) {
  const userRole = getCurrentUserRole();
  const templates = annotationTemplates[userRole.code] || [];

  console.log("Annotations suggérées:");
  templates.forEach((template, index) => {
    console.log(`${index + 1}. ${template}`);
  });

  const choice = prompt(
    `Choisir une annotation (1-${templates.length}) ou saisir texte libre:`
  );

  let annotation;
  if (choice && !isNaN(choice) && choice >= 1 && choice <= templates.length) {
    annotation = templates[choice - 1];
  } else {
    annotation = choice || "Annotation vide";
  }

  const result = await addCommentToDocument(documentId, annotation);

  if (result.success) {
    console.log("Annotation ajoutée:", annotation);
  }

  return result;
}
```

## 📊 5. Dashboard et Suivi des Documents

### 📋 Documents en Attente pour l'Utilisateur

```javascript
// Récupérer les documents en attente pour l'utilisateur connecté
async function getMyPendingDocuments() {
  try {
    const response = await fetch("http://localhost:3003/documents/my-pending", {
      method: "GET",
      headers: getAuthHeaders(),
    });

    const data = await response.json();
    return response.ok
      ? { success: true, documents: data }
      : { success: false, error: data.message };
  } catch (error) {
    console.error("Erreur récupération documents:", error);
    return { success: false, error: error.message };
  }
}

// Dashboard simple pour chaque rôle
async function displayDashboard() {
  const userRole = getCurrentUserRole();
  const pendingDocs = await getMyPendingDocuments();

  console.log(`📊 DASHBOARD - ${userRole.label}`);
  console.log("=".repeat(50));

  if (pendingDocs.success) {
    console.log(`📄 Documents en attente: ${pendingDocs.documents.length}`);

    pendingDocs.documents.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.Title}`);
      console.log(`   📍 Étape: ${doc.etape?.LibelleEtape || "Non définie"}`);
      console.log(
        `   📅 Reçu: ${new Date(doc.updatedAt).toLocaleDateString()}`
      );
      console.log(`   👤 De: ${doc.UserDestinatorName || "Non spécifié"}`);
      console.log();
    });

    return pendingDocs.documents;
  } else {
    console.log("❌ Erreur chargement dashboard:", pendingDocs.error);
    return [];
  }
}

// Actions rapides par rôle
async function quickActions(documentId) {
  const userRole = getCurrentUserRole();

  switch (userRole.code) {
    case "secretariat_scanneur":
      return await initiateRecouvrementWorkflow();

    case "dgi_directeur":
      return await dgiValidateAndForward(documentId);

    case "directeur_recouvrement":
      return await directeurAnalyzeAndForward(documentId);

    case "sous_directeur":
      const instructions = prompt("Instructions pour le collaborateur:");
      return await forwardDocumentToNextStep(
        documentId,
        instructions,
        "Cadre Recouvrement"
      );

    case "cadre_recouvrement":
      const decision = confirm(
        "Valider le dossier ? (OK = Validation, Annuler = Rejet)"
      );
      const comment = decision
        ? "VALIDATION - Projet de réponse élaboré"
        : "REJET - Dossier non recouvrable";
      return await addCommentToDocument(documentId, comment);

    default:
      alert("Rôle non reconnu");
  }
}
```

## 🔔 6. Notifications en Temps Réel

### 📡 WebSocket pour Notifications

```javascript
// Connexion WebSocket pour notifications temps réel
class DgiNotificationService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    try {
      this.socket = io("http://localhost:3003");

      this.socket.on("connect", () => {
        console.log("🔔 Service de notifications connecté");
        this.isConnected = true;
      });

      this.socket.on("notification", (data) => {
        this.handleNotification(data);
      });

      this.socket.on("disconnect", () => {
        console.log("🔔 Service de notifications déconnecté");
        this.isConnected = false;
      });
    } catch (error) {
      console.error("Erreur connexion notifications:", error);
    }
  }

  handleNotification(data) {
    const userRole = getCurrentUserRole();

    // Filtrer les notifications selon le rôle
    if (data.targetRole && data.targetRole !== userRole.code) {
      return; // Notification non destinée à ce rôle
    }

    // Afficher notification
    this.showNotification({
      title: data.title || "Nouvelle notification DGI",
      message: data.message || "Un document attend votre attention",
      type: data.type || "info",
      documentId: data.documentId,
    });
  }

  showNotification(notification) {
    // Notification navigateur
    if (Notification.permission === "granted") {
      new Notification(notification.title, {
        body: notification.message,
        icon: "/assets/dgi-icon.png",
      });
    }

    // Notification dans l'interface
    console.log("🔔 NOTIFICATION:", notification);

    // Mettre à jour le badge de notifications
    this.updateNotificationBadge();
  }

  updateNotificationBadge() {
    // Actualiser le compteur de documents en attente
    getMyPendingDocuments().then((result) => {
      if (result.success) {
        const badge = document.getElementById("notification-badge");
        if (badge) {
          badge.textContent = result.documents.length;
          badge.style.display = result.documents.length > 0 ? "inline" : "none";
        }
      }
    });
  }

  // Envoyer une notification (pour tests)
  sendTestNotification(targetRole, message) {
    if (this.isConnected) {
      this.socket.emit("sendNotification", {
        targetRole: targetRole,
        title: "Test Workflow DGI",
        message: message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

// Initialisation du service de notifications
const notificationService = new DgiNotificationService();

// Démarrer les notifications quand l'utilisateur se connecte
function initializeDgiApp() {
  // Demander permission notifications navigateur
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  // Connecter WebSocket
  notificationService.connect();

  // Charger dashboard initial
  displayDashboard();
}
```

## 🚀 7. Application Frontend Complète - Exemple

```javascript
// Application frontend complète pour workflow DGI
class DgiWorkflowApp {
  constructor() {
    this.currentUser = null;
    this.notificationService = new DgiNotificationService();
    this.init();
  }

  async init() {
    // Vérifier si utilisateur déjà connecté
    const savedUser = localStorage.getItem("dgi_user");
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
      await this.loadMainInterface();
    } else {
      this.showLoginInterface();
    }
  }

  showLoginInterface() {
    console.log("🔐 CONNEXION WORKFLOW DGI");
    console.log("Utilisateurs de test disponibles:");
    console.log("1. secretariat@dgi.gov - Agent Secrétariat");
    console.log("2. directeur.general@dgi.gov - DGI Directeur");
    console.log("3. directeur.recouvrement@dgi.gov - Directeur Recouvrement");
    console.log("4. sous.directeur@dgi.gov - Sous-Directeur");
    console.log("5. cadre.recouvrement@dgi.gov - Cadre Recouvrement");

    const email = prompt("Email:") || "secretariat@dgi.gov";
    const password = prompt("Password:") || "password123";

    this.login(email, password);
  }

  async login(email, password) {
    const result = await loginDgiUser(email, password);

    if (result.success) {
      this.currentUser = result.user;
      console.log(`✅ Connecté en tant que: ${getCurrentUserRole().label}`);
      await this.loadMainInterface();
    } else {
      alert("Échec de la connexion: " + result.error);
      this.showLoginInterface();
    }
  }

  async loadMainInterface() {
    // Initialiser notifications
    this.notificationService.connect();

    // Charger dashboard
    console.log("\n🏠 INTERFACE PRINCIPALE");
    const documents = await displayDashboard();

    // Menu selon le rôle
    this.showRoleMenu(documents);
  }

  showRoleMenu(documents) {
    const userRole = getCurrentUserRole();

    console.log("\n📋 ACTIONS DISPONIBLES:");

    switch (userRole.code) {
      case "secretariat_scanneur":
        console.log("1. Rechercher et ajouter un document au workflow");
        console.log("2. Voir documents initiés");
        break;

      case "dgi_directeur":
        console.log("1. Valider documents en attente");
        console.log("2. Ajouter annotations prioritaires");
        console.log("3. Voir historique validations");
        break;

      case "directeur_recouvrement":
        console.log("1. Analyser documents reçus");
        console.log("2. Donner orientations de traitement");
        console.log("3. Voir dossiers analysés");
        break;

      case "sous_directeur":
        console.log("1. Donner instructions aux collaborateurs");
        console.log("2. Suivre avancement des dossiers");
        break;

      case "cadre_recouvrement":
        console.log("1. Traiter dossiers assignés");
        console.log("2. Élaborer projets de réponse");
        console.log("3. Valider ou rejeter dossiers");
        break;
    }

    console.log("0. Déconnexion");

    const choice = prompt("Votre choix:");
    this.handleMenuChoice(choice, documents);
  }

  async handleMenuChoice(choice, documents) {
    const userRole = getCurrentUserRole();

    switch (choice) {
      case "1":
        if (userRole.code === "secretariat_scanneur") {
          await initiateRecouvrementWorkflow();
        } else if (documents.length > 0) {
          await quickActions(documents[0].idDocument);
        }
        break;

      case "2":
        if (documents.length > 0) {
          await smartAnnotationInterface(documents[0].idDocument);
        }
        break;

      case "0":
        this.logout();
        return;

      default:
        console.log("Choix non valide");
    }

    // Recharger l'interface
    setTimeout(() => this.loadMainInterface(), 2000);
  }

  logout() {
    localStorage.removeItem("dgi_token");
    localStorage.removeItem("dgi_user");
    this.currentUser = null;
    console.log("🔓 Déconnecté");
    this.showLoginInterface();
  }
}

// 🚀 LANCEMENT DE L'APPLICATION
console.log("🏛️  BIENVENUE DANS LE WORKFLOW DGI");
console.log("=====================================");
const app = new DgiWorkflowApp();
```

## 📱 8. Interface HTML Simple (Optionnel)

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Workflow DGI - Recouvrement</title>
    <script src="https://cdn.socket.io/4.0.0/socket.io.min.js"></script>
  </head>
  <body>
    <div id="app">
      <header>
        <h1>🏛️ Workflow DGI - Gestion Recouvrement</h1>
        <div id="user-info" style="display: none;">
          <span id="user-role"></span>
          <span
            id="notification-badge"
            style="background: red; color: white; border-radius: 50%; padding: 2px 6px; display: none;"
          ></span>
          <button onclick="app.logout()">Déconnexion</button>
        </div>
      </header>

      <main>
        <div id="login-form">
          <h2>Connexion</h2>
          <input
            type="email"
            id="email"
            placeholder="Email"
            value="secretariat@dgi.gov"
          />
          <input
            type="password"
            id="password"
            placeholder="Mot de passe"
            value="password123"
          />
          <button onclick="loginFromForm()">Se connecter</button>
        </div>

        <div id="dashboard" style="display: none;">
          <h2>Dashboard</h2>
          <div id="pending-documents"></div>
          <div id="actions"></div>
        </div>
      </main>
    </div>

    <script>
      // Intégrer tout le code JavaScript ci-dessus
      // ... code JavaScript ...

      // Fonction de connexion depuis le formulaire
      async function loginFromForm() {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const result = await loginDgiUser(email, password);

        if (result.success) {
          document.getElementById("login-form").style.display = "none";
          document.getElementById("dashboard").style.display = "block";
          document.getElementById("user-info").style.display = "block";
          document.getElementById("user-role").textContent =
            getCurrentUserRole().label;

          // Charger dashboard
          loadDashboardHTML();
        } else {
          alert("Erreur: " + result.error);
        }
      }

      async function loadDashboardHTML() {
        const docs = await getMyPendingDocuments();
        const container = document.getElementById("pending-documents");

        if (docs.success) {
          container.innerHTML = `
                    <h3>Documents en attente (${docs.documents.length})</h3>
                    ${docs.documents
                      .map(
                        (doc) => `
                        <div class="document-card" style="border: 1px solid #ccc; margin: 10px; padding: 10px;">
                            <h4>${doc.Title}</h4>
                            <p>Étape: ${
                              doc.etape?.LibelleEtape || "Non définie"
                            }</p>
                            <p>Reçu: ${new Date(
                              doc.updatedAt
                            ).toLocaleDateString()}</p>
                            <button onclick="quickActions('${
                              doc.idDocument
                            }')">Traiter</button>
                        </div>
                    `
                      )
                      .join("")}
                `;
        }
      }
    </script>
  </body>
</html>
```

---

## 🎯 **Résumé des Endpoints Utilisés**

| Fonction             | Endpoint                     | Méthode | Description              |
| -------------------- | ---------------------------- | ------- | ------------------------ |
| **Authentification** | `/users/login`               | POST    | Connexion utilisateur    |
| **Recherche**        | `/search-propositions/:term` | GET     | Recherche Elasticsearch  |
| **Documents**        | `/documents`                 | POST    | Créer document           |
| **Documents**        | `/documents/:id/forward`     | POST    | Transmettre document     |
| **Documents**        | `/documents/my-pending`      | GET     | Documents en attente     |
| **Étapes**           | `/etapes/affect`             | POST    | Affecter étape           |
| **Commentaires**     | `/commentaires`              | POST    | Ajouter commentaire      |
| **WebSocket**        | Socket.IO                    | -       | Notifications temps réel |

## 🚀 **Conclusion**

Ce guide montre que **toute l'infrastructure backend est déjà prête** pour intégrer le workflow DGI avec n'importe quel frontend (React, Vue, Angular, HTML/JS).

Les développeurs frontend n'ont qu'à :

1. **Utiliser les endpoints existants**
2. **Gérer l'authentification JWT**
3. **Intégrer les WebSocket** pour les notifications
4. **Adapter l'interface** selon les rôles utilisateurs

Le workflow DGI est **opérationnel immédiatement** ! 🎉
