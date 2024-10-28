# Étape 1 : Utiliser une image de base Ubuntu pour installer MongoDB et Node.js
FROM ubuntu:20.04

# Mise à jour et installation de curl, wget et autres utilitaires nécessaires
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Étape 2 : Installer MongoDB
RUN wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | apt-key add - && \
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-4.4.list && \
    apt-get update && apt-get install -y mongodb-org && \
    mkdir -p /data/db

# Étape 3 : Installer Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier tout le reste du projet
COPY . .

# Transpiler TypeScript en JavaScript pour la production
RUN npm run tsc

# Copie du script d'initialisation MongoDB
COPY init-mongo.js /init-mongo.js

# Exposer les ports pour MongoDB et votre application Node.js
EXPOSE 27017 3000

# Démarrer MongoDB et le backend Node.js
CMD ["bash", "-c", "mongod --logpath /var/log/mongodb.log --bind_ip_all & sleep 5 && mongo /init-mongo.js && npm run prod"]