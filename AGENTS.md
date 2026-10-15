# Journal d'un Venture Architect — Haskè Ventures

Plateforme de pilotage des projets du venture studio Haskè Ventures (Dakar). Elle remplace le fichier unique `passation-journal-va/journal-va.html`, hébergé jusqu'ici sur claude.ai.

## Priorité n°1 : le design
L'application doit être exceptionnellement belle, finement animée et très professionnelle : la sensation d'un logiciel construit par une excellente équipe de design et d'ingénierie. Le design est un critère d'acceptation au même titre que le fonctionnel. La beauté ne doit jamais être obtenue au détriment de la fiabilité. Voir `docs/DESIGN.md`.

## Sources de vérité
- `docs/DESIGN.md` : direction artistique, thèmes, typographie, tokens, motion. Prime sur toute autre indication visuelle.
- `passation-journal-va/LISEZMOI.md` : collections et permissions métier. Ignorer ses consignes Firebase : le projet utilise Prisma.
- `passation-journal-va/journal-va.html` : application d'origine. Ses fonctionnalités, workflows et sa logique de navigation doivent tous exister dans la nouvelle version.
- `passation-journal-va/export-donnees.json` et `passation-journal-va/donnees/` : données réelles, LECTURE SEULE.
- `public/logos/` : `haske-ventures.png`, `safya.png`, `triage-plus.png`, `ractac.png`.

## Projets autorisés
SAFYA (`safya`), TRIAGE+ (`triage`), RacTac (`rpm`). Uniquement ceux-là. EcoMoto est exclu partout (projets, navigation, graphiques, démo), même si un fichier venait à apparaître.

## Stack
- Next.js (App Router, dernière version stable) + TypeScript strict
- Prisma ORM + Prisma Postgres (offre gratuite, région Europe Paris ; `npx prisma dev` pour les essais lourds en local)
- Server Actions / Route Handlers pour toutes les écritures, validation Zod côté serveur
- Tailwind CSS + shadcn/ui profondément personnalisé, Lucide React
- `next-themes` (Light / Dark / System sans flash), `next/font` (Plus Jakarta Sans + Inter)
- Motion (`motion/react`), dnd-kit, Sonner, cmdk, @number-flow/react, Recharts
- React Hook Form + Zod, TanStack Query
- Vitest + Testing Library, Playwright + @axe-core/playwright
- Déploiement ultérieur : Netlify

Pas de dépendance lourde supplémentaire sans justification.

## Phase actuelle : local, sans connexion
- Pas d'écran de connexion. L'utilisateur courant vient de `DEV_USER_ID` (`.env`), par défaut **Alexandre Sankara, administrateur**. Sélecteur discret « Voir en tant que » visible uniquement si `AUTH_MODE=dev` (Alexandre, Fatoumata Sonko, VA Test).
- Les autorisations sont déjà vérifiées côté serveur (`requireUser()`, `requireAdmin()`). Brancher plus tard Auth.js + Microsoft Entra ID ne doit modifier que `src/server/auth/session.ts`.
- `AUTH_MODE=dev` refusé au démarrage si `NODE_ENV=production`.
- Une intégration non configurée affiche un état explicite, jamais un faux succès.

## Règles absolues
1. Interface en français, dates en `Africa/Dakar`.
2. Aucune statistique fictive présentée comme réelle. Démo uniquement dans `src/demo/`, marquée « Démo ».
3. Aucun bouton sans action, aucun formulaire qui n'enregistre rien.
4. Permissions vérifiées côté serveur. Masquer un bouton n'est jamais une protection.
5. Aucun secret côté client.
6. `tsc --noEmit`, `eslint`, `vitest run` passent avant de déclarer une étape terminée.
7. Économiser les opérations base de données (quota gratuit) : pas de polling court, requêtes regroupées.
8. Ne jamais affirmer un succès (tests, import, 60 FPS, déploiement) sans mesure ou exécution réelle.
9. Une phase à la fois, arrêt pour validation à la fin de chacune.

## Organisation du code
```
prisma/                  schema.prisma, migrations/
src/app/                 routes, layouts, loading.tsx, error.tsx
src/styles/tokens.css    tous les tokens (couleurs, type, espacements, rayons, ombres, motion)
src/components/ui/       composants shadcn personnalisés
src/components/motion/   primitives d'animation partagées
src/components/layout/   sidebar, header, thème, palette de commandes
src/features/            dashboard, projects, okrs, tasks, kpis, journal, meetings,
                         anomalies, team, summaries, deliveries
src/domain/              schémas Zod, calculs métier purs + tests
src/server/              db.ts, auth/, permissions.ts, actions/, storage/
src/lib/dates.ts         dates Africa/Dakar
src/demo/                données de démonstration isolées
scripts/migration/       import des données d'origine
```

## Sous-agents (`.cursor/agents/`)
`architecte-audit` (audit + revue d'intégration) · `design-system` · `motion-designer` · `ui-engineer` · `backend-prisma` · `migration-donnees` · `qa-visuelle`.
Jamais deux sous-agents sur les mêmes fichiers en même temps. L'agent principal coordonne et vérifie.
