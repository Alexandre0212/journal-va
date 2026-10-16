# Préparation Netlify

Le déploiement n'a pas été exécuté. Ce document décrit ce qui est prêt.

## Build

`netlify.toml` lance `npm run build` avec Node 22 et l'adaptateur `@netlify/plugin-nextjs`. Le script exécute `prisma generate` (cibles `native` et `rhel-openssl-3.0.x`) puis `next build`. Aucune migration n'est lancée et aucune donnée n'est écrite. Les variables d'environnement se définissent dans Netlify, jamais dans le dépôt. Ne pas y fixer `NODE_ENV=production` avant l'installation des dépendances.

## Variables

Voir `.env.example` et la section « Déploiement Netlify » du README. Pour le site de prévisualisation : `AUTH_MODE=preview`, `DEV_USER_ID=u_alexandre_sankara` et `DATABASE_URL` du Postgres Paris. `AUTH_MODE=dev` fait échouer le démarrage en production. Les secrets Microsoft ne sont nécessaires qu'en mode `entra`.

## Microsoft 365

Comptes `@haskeventures.com`, bouton « Se connecter avec Microsoft », sans mot de passe géré par l'application. Le branchement Auth.js se fait uniquement dans `src/server/auth/session.ts`. Tant que les variables manquent, l'écran `/connexion` le dit explicitement.

## Récap de 17 h 40

Les récaps importés restent. Un administrateur peut calculer un récap depuis les données (bouton sur `/recaps`) : le texte ne contient que des faits lus en base. La tâche planifiée Netlify (jour de semaine, 17:40 `Africa/Dakar`) appellera plus tard la même fonction `generateSummary`, avec une clé serveur. Elle n'est pas activée ici, pour ne pas écrire dans la base sans votre accord.

## Fichiers

Les nouvelles pièces d'anomalies vont dans `storage/` en local. Sur Netlify (`NETLIFY=true`), `StorageService` les écrit dans le store Netlify Blobs `anomaly-files`. Les contrôles de type et de taille sont les mêmes. L'accès passe par la route serveur, pas par une URL publique.
