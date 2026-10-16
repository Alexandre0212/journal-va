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

## Qualité

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
