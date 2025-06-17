# Multi-stage build pour optimiser la taille
FROM node:18-alpine AS builder

# Créer le répertoire de l'application
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production && npm cache clean --force

# Stage de production
FROM node:18-alpine AS production

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S fastify -u 1001

# Répertoire de travail
WORKDIR /app

# Copier les dépendances depuis le stage builder
COPY --from=builder --chown=fastify:nodejs /app/node_modules ./node_modules

# Copier le code source
COPY --chown=fastify:nodejs . .

# Créer le dossier uploads
RUN mkdir -p uploads && chown fastify:nodejs uploads

# Exposer le port
EXPOSE 3003

# Basculer vers l'utilisateur non-root
USER fastify

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3003

# Démarrer l'application
CMD ["node", "server.js"]
