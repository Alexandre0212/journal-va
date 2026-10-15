# Préparation Netlify

Le déploiement n'a pas été exécuté. Ce document décrit ce qui est prêt.

## Build

`netlify.toml` lance `npx prisma generate && npm run build` avec le plugin `@netlify/plugin-nextjs`. Il faudra l'ajouter aux dépendances au moment du déploiement (`npm install -D @netlify/plugin-nextjs`) et définir les variables d'environnement dans Netlify, jamais dans le dépôt.

## Variables

Voir `.env.example`. En production : `AUTH_MODE=entra`, `DATABASE_URL` du Postgres Paris, et les trois secrets Microsoft. `AUTH_MODE=dev` fait échouer le démarrage.

## Microsoft 365

Comptes `@haskeventures.com`, bouton « Se connecter avec Microsoft », sans mot de passe géré par l'application. Le branchement Auth.js se fait uniquement dans `src/server/auth/session.ts`. Tant que les variables manquent, l'écran `/connexion` le dit explicitement.

## Récap de 17 h 40

Les récaps importés restent. Un administrateur peut calculer un récap depuis les données (bouton sur `/recaps`) : le texte ne contient que des faits lus en base. La tâche planifiée Netlify (jour de semaine, 17:40 `Africa/Dakar`) appellera plus tard la même fonction `generateSummary`, avec une clé serveur. Elle n'est pas activée ici, pour ne pas écrire dans la base sans votre accord.

## Fichiers

Les nouvelles pièces d'anomalies vont dans `storage/` en local. Sur Netlify, il faudra brancher Netlify Blobs derrière `AnomalyFile.storagePath` : l'interface est déjà un chemin vérifié côté serveur, pas une URL publique.
