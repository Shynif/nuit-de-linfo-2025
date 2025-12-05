# Projet Nuit de l'Info - Front

Ce projet est une application web interactive développée dans le cadre de la Nuit de l'Info. Elle combine des éléments de jeu, de sensibilisation et d'interaction sociale.

## Fonctionnalités

### 🎮 Jeu Principal
Un jeu de cartes narratif où chaque décision impacte quatre jauges principales :
- **Planète** 🌍
- **Inclusion** 🤝
- **Sécurité** 🛡️
- **Budget** 💰

Le but est de maintenir l'équilibre entre ces différentes ressources tout en progressant dans l'histoire.

### Mini-jeux
Une collection de classiques du jeu vidéo pour se détendre :
- **Pacman**
- **Snake**
- **Space Invaders**
- **Tetris**

### Classement (Leaderboard)
Un système de classement pour comparer vos scores avec les autres joueurs. Vous pouvez choisir de rendre votre profil visible ou caché dans les paramètres.

### Chatbot IA
Un assistant conversationnel intégré (alimenté par Google Generative AI) pour interagir avec les utilisateurs.

### Authentification
Système complet de création de compte et de connexion pour sauvegarder votre progression et vos scores.

## Stack Technique

- **Framework Frontend/Backend** : [SvelteKit](https://kit.svelte.dev/)
- **Base de données** : SQLite avec [Prisma](https://www.prisma.io/)
- **Styles** : [TailwindCSS](https://tailwindcss.com/)
- **Langage** : TypeScript

## Installation et Démarrage Local

1. **Cloner le dépôt**
   ```bash
   git clone <votre-repo>
   cd front
   ```

2. **Installer les dépendances**
   ```bash
   pnpm install
   ```

3. **Configurer la base de données**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Lancer le serveur de développement**
   ```bash
   pnpm dev
   ```

## Déploiement avec Docker

Voir le fichier `Dockerfile` pour les détails de construction de l'image.

1. **Construire l'image**
   ```bash
   docker build -t nuitinfo-front .
   ```

2. **Lancer le conteneur**
   ```bash
   docker run -p 3000:3000 -v $(pwd)/prisma:/app/prisma nuitinfo-front
   ```
   *Le conteneur initialisera automatiquement la base de données au démarrage.*
