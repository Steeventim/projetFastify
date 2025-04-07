// utils/notificationUtils.js

// Fonction pour créer une notification
const createNotification = (title, options) => {
  if (Notification.permission === "granted") {
    new Notification(title, options);
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification(title, options);
      }
    });
  }
};

// Fonction pour afficher une notification avec des données spécifiques
const showNotification = (data) => {
  const { title, body, icon } = data;
  const options = {
    body: body,
    icon: icon,
  };
  createNotification(title, options);
};

// Fonction pour gérer les notifications en arrière-plan
const handleBackgroundNotifications = (payload) => {
  const data = JSON.parse(payload.data.text());
  showNotification(data);
};

// Exportation des fonctions
module.exports = {
  createNotification,
  showNotification,
  handleBackgroundNotifications,
};
