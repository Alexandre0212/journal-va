# Journal d'un Venture Architect

Plateforme de pilotage des projets Haskè Ventures : SAFYA, TRIAGE+ et RacTac. Next.js, Prisma et PostgreSQL. L'interface est en français et les dates sont calculées en `Africa/Dakar`.

L'application lit uniquement PostgreSQL. Aucun fichier de `src/` n'ouvre le dossier des données d'origine.

## Lancer l'application

Copier `.env.example` vers `.env`, renseigner `DATABASE_URL`, puis :

```bash
npm install
npx prisma migrate deploy
npm run dev
```

L'application tourne sur http://localhost:3000.

## Données

| Commande | Rôle |
|---|---|
| `npm run db:verify` | Recompte les données en base et contrôle quelques invariants |
| `npm run db:dry` | Simule l'import, sans écrire |
| `npm run db:import` | Importe le dossier des données d'origine |
| `npm run db:migrate` | Applique les migrations Prisma |

L'import a besoin du dossier qui contient `donnees/`. Indiquez son chemin avec `LEGACY_DATA_DIR` dans `.env` :

```bash
LEGACY_DATA_DIR="C:/chemin/vers/donnees-origine"
```

Si la variable est vide ou si le dossier est absent, `db:dry` et `db:import` s'arrêtent. Ils ne modifient pas ces fichiers. L'import est idempotent. Le rapport du premier import vérifié est `docs/MIGRATION.md`.

## Déploiement Netlify

Le déploiement part de la branche `main`. `netlify.toml` utilise l'adaptateur officiel `@netlify/plugin-nextjs`, Node 22, et la commande `npm run build`. Cette commande exécute `prisma generate` puis `next build`. Elle ne lance aucune migration et n'écrit rien en base.

Le client Prisma est généré pour la machine de build (`native`) et pour les fonctions Netlify sous Linux (`rhel-openssl-3.0.x`).

En preview, `AUTH_MODE=preview` ouvre `DEV_USER_ID` sans page de connexion. Le sélecteur « Voir en tant que » reste réservé à `AUTH_MODE=dev`, lui-même refusé en production. Les pièces jointes nouvelles passent par Netlify Blobs. En local, elles restent dans `storage/`.

Variables à saisir dans Netlify (Site configuration, Environment variables). Aucune valeur secrète ne figure dans le dépôt. Ne pas définir `NODE_ENV=production` dans l'interface : npm n'installerait plus les outils de build. `NPM_FLAGS=--include=dev` est déjà dans `netlify.toml`.

| Variable | Production preview | Rôle |
|---|---|---|
| `DATABASE_URL` | oui | Connexion PostgreSQL, avec `sslmode=require` |
| `AUTH_MODE` | `preview` | Ouvre le compte `DEV_USER_ID`, sans Microsoft |
| `DEV_USER_ID` | `u_alexandre_sankara` | Identifiant d'Alexandre Sankara, administrateur |

`LEGACY_DATA_DIR` sert seulement à l'import local. `AUTH_SECRET`, `AUTH_MICROSOFT_ID`, `AUTH_MICROSOFT_SECRET` et `AUTH_MICROSOFT_TENANT_ID` sont réservés au mode `entra`.

## Qualité

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
