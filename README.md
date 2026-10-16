# Journal d'un Venture Architect

Plateforme de pilotage des projets Haskè Ventures (Dakar). Next.js, Prisma et PostgreSQL.

## Lancer l'application

Copier `.env.example` vers `.env`, renseigner `DATABASE_URL`, puis :

```bash
npm install
npx prisma migrate deploy
npm run dev
```

L'application tourne sur http://localhost:3000. Elle lit uniquement PostgreSQL. Aucun fichier de `src/` n'ouvre le dossier d'origine.

## Importer les données d'origine

L'import est réservé aux scripts `npm run db:dry` et `npm run db:import`. Il a besoin du dossier d'origine, celui qui contient `donnees/`.

Indiquez son chemin avec `LEGACY_DATA_DIR` dans `.env` :

```bash
LEGACY_DATA_DIR="C:/chemin/vers/donnees-origine"
```

Si la variable est vide ou si le dossier est absent, les scripts s'arrêtent. Ils ne modifient pas ces fichiers. Ils sont idempotents.

Le rapport du premier import vérifié est `docs/MIGRATION.md`.
