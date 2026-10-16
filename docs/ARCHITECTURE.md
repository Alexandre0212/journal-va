# Architecture

Phase 2. Next.js (App Router) + Prisma 6.19 + le Postgres de `DATABASE_URL`. Prisma 8 est encore en release candidate (`8.0.0-rc.23`) : le projet reste sur la dernière 6 stable, qui parle le protocole `PostgreSQL` déjà configuré.

## Arborescence

- `prisma/schema.prisma` : identifiants texte d'origine, dates calendaires en `AAAA-MM-JJ`, `deletedAt` sur tâches, OKR, KPI, infos et courses.
- `src/domain/` : formules pures (OKR, KPI, courses, rythme, permissions) et schémas Zod.
- `src/server/auth/session.ts` : seul fichier à modifier pour Auth.js + Entra ID.
- `src/server/actions.ts` : écritures, contrôle de rôle, journal d'activité.
- `src/server/queries.ts` : lectures par écran. Le tableau de bord charge les projets avec leurs relations en jointure, plus les infos, réunions et récap du jour. Mesure du 15 octobre 2026 : 5 requêtes SQL pour cette page.
- `scripts/migration/import.ts` : import idempotent. Il lit uniquement `LEGACY_DATA_DIR` et ne modifie pas ce dossier.
- `src/app/` : écrans. `storage/` (hors `public/`) reçoit les pièces jointes nouvelles en local. Sur Netlify, `StorageService` les écrit dans Netlify Blobs.

## Permissions

Tout utilisateur lit tout. Un venture architect écrit projets, OKR, tâches, KPI, infos (suppression : les siennes), courses et anomalies. Notes, pilotage, réunions et récaps : administrateurs. L'activation des courses et des anomalies : administrateurs. `AUTH_MODE=dev` est refusé en production. `AUTH_MODE=preview` y est accepté : l'utilisateur est `DEV_USER_ID`, sans page de connexion et sans sélecteur.

## Authentification future

`authMode()` renvoie `preview` si `AUTH_MODE=preview`, y compris en production. Sinon, en production, il renvoie `entra`. Sans `AUTH_MICROSOFT_ID`, `AUTH_MICROSOFT_SECRET` et `AUTH_SECRET`, `/connexion` explique que la connexion n'est pas configurée. Le mode preview n'invente pas de session Microsoft : il charge `DEV_USER_ID`.

## Rafraîchissement

Pas de polling. Les pages sont rendues côté serveur et revalidées après chaque action. TanStack Query ne définit pas de `refetchInterval` : le focus de fenêtre suffit pour les mutations client.

## Migration

`npx prisma migrate deploy` puis `npm run db:import`. Le rapport est `docs/MIGRATION.md`. Les essais répétés et Playwright peuvent viser une base `npx prisma dev` en changeant temporairement `DATABASE_URL`, pour ne pas consommer le quota de Paris.
