# HASKÈ VENTURES — JOURNAL D'UN VENTURE ARCHITECT
## Refonte complète · Ultimate Premium UI/UX & Motion Design
Le fichier .env existe déjà avec DATABASE_URL (Prisma Postgres, Paris). Ne l'affiche jamais, ne le modifie pas, et assure-toi qu'il est dans .gitignore.
## TON RÔLE

Tu es l'agent principal d'une équipe de haut niveau :
Principal Product Designer · Senior Creative Frontend Engineer · Motion Design Specialist · Design Systems Architect · UX & Accessibility Engineer · Architecte logiciel · Ingénieur backend · Frontend QA Engineer.

Tu coordonnes les sous-agents de `.cursor/agents/` et tu vérifies leur travail.

Avant toute chose, lis dans cet ordre : `AGENTS.md`, `docs/DESIGN.md`, `passation-journal-va/LISEZMOI.md`, puis `passation-journal-va/journal-va.html` en entier.

---

## 1. LA MISSION

Transformer le « Journal d'un Venture Architect » (un fichier HTML unique qui dépend de claude.ai) en plateforme de pilotage pour l'équipe de Venture Architects de Haskè Ventures.

**La priorité est le DESIGN** : identité visuelle, élégance, harmonie, animations, micro-interactions, expérience utilisateur et finition des détails. Je veux un produit numérique remarquable, qui impressionne par son esthétique, ses transitions, son ergonomie et la qualité de ses composants, avec la sensation d'un logiciel construit par une excellente équipe de design et d'ingénierie.

**Mais la beauté ne doit jamais être obtenue au détriment de la fiabilité.** C'est un vrai outil de travail quotidien : tout ce qui s'affiche vient de vraies données, tout ce qui se clique fonctionne, aucune fonctionnalité de l'original n'est perdue.

En ouvrant l'app, on doit savoir en quelques secondes : quels projets avancent ou bloquent, quoi faire aujourd'hui, qui fait quoi, où en sont les OKR et KPI, quelles échéances approchent, quelles décisions ont été prises.

---

## 2. RÈGLES NON NÉGOCIABLES

**Couleurs officielles** : Brand Blue `#23358E`, Brand Orange `#E79409`. Jamais de violet ni d'autre identité. Déclinaisons de contraste selon `docs/DESIGN.md` §4. Attention, deux pièges vérifiés : l'orange est illisible en texte sur fond clair (utiliser `#9A5800`), et le bleu `#23358E` est illisible en texte sur fond sombre (utiliser `#9AABF5`).

**Projets autorisés** : SAFYA (`safya`), TRIAGE+ (`triage`), RacTac (`rpm`). Uniquement. **EcoMoto est exclu** partout : projets, navigation, graphiques, données de démonstration.

**Logos** : `public/logos/haske-ventures.png`, `safya.png`, `triage-plus.png`, `ractac.png`. Vérifie réellement leur présence et leurs dimensions ; signale tout manque au lieu de le remplacer. Proportions et intégrité toujours respectées.

**Application originale** : conserve l'organisation métier, les écrans et fonctionnalités, les workflows, les données et leurs relations, la logique de navigation familière (bandeau mission, frise des 7 phases, navigation par jour). Modernise profondément la présentation.

**Fiabilité** : pas de statistique fictive présentée comme réelle, pas de bouton décoratif, pas de formulaire qui n'enregistre rien, permissions côté serveur, aucun secret côté client, données sources en lecture seule, intégration non configurée = état explicite et jamais faux succès, aucune affirmation de succès (tests, import, 60 FPS) sans mesure réelle.

---

## 3. STACK

- **Next.js (App Router) + TypeScript strict + Prisma + PostgreSQL.** Pas de Firebase : ignore les consignes Firebase de `LISEZMOI.md`, garde uniquement sa partie métier (collections, permissions).
- Écritures via Server Actions validées par Zod côté serveur.
- Tailwind + shadcn/ui profondément personnalisé, Lucide, `next-themes`, `next/font`.
- Motion pour React, dnd-kit, Sonner, cmdk, @number-flow/react, Recharts, React Hook Form, TanStack Query.
- Vitest, Playwright, axe-core.
- Pas de dépendance lourde supplémentaire sans justification.

---

## 4. CONTEXTE ACTUEL : TEST EN LOCAL, SANS CONNEXION

- Je teste d'abord en local sur mon ordinateur. Pas d'écran de connexion pour l'instant.
- L'utilisateur courant vient de `DEV_USER_ID` (`.env`), par défaut **Fatoumata Sonko, administratrice**. Un sélecteur discret « Voir en tant que » (seulement si `AUTH_MODE=dev`) permet de tester en Venture Architect.
- Les permissions sont déjà vérifiées côté serveur, pour que l'ajout futur de la connexion Microsoft 365 (Auth.js + Entra ID) ne touche qu'un fichier. Connexion prévue : « Se connecter avec Microsoft » (comptes @haskeventures.com), sans mot de passe à gérer ni e-mail à envoyer.
- Base de données : **Prisma Postgres** (offre gratuite, région Europe Paris). L'URL de connexion est dans `DATABASE_URL` du fichier `.env`, que je remplis moi-même. Vérifie que `.env` est dans `.gitignore` et fournis un `.env.example` sans secret.
- L'offre gratuite compte chaque requête comme une opération (quota mensuel limité) : pas de rafraîchissement automatique agressif (pas de `refetchInterval` court), rafraîchissement au retour sur l'onglet et après chaque action, requêtes regroupées (`include`, `select`, `$transaction`), pas de requêtes en boucle. Mesure le nombre de requêtes d'un chargement du dashboard et indique-le.
- Pour les essais lourds (import répété, tests Playwright), propose une base locale avec `npx prisma dev` pour ne pas consommer le quota.
- Le déploiement Netlify viendra plus tard : rien ne doit fonctionner uniquement en local par construction.

---

## 5. CE QU'ON SAIT DE L'EXISTANT (à confirmer pendant l'audit)

- 12 collections : `projects`, `okrs`, `tasks`, `kpis`, `infos`, `courses`, `anomalies`, `anomalyfiles`, `team`, `notes`, `mgmt`, `meetings`, `summaries`.
- Volume : 3 projets, 9 OKR, 40 tâches, 3 KPI, 2 infos, 3 notes, 7 pilotage, 3 récaps, 1 réunion, 1 course, 1 anomalie, 1 membre.
- 7 phases indexées 0 à 6 : Challenge, Discovery, Validation, MVP, Launch, Grow, Scale.
- KPI : valeurs par date `AAAA-MM-JJ`. Courses RacTac : prix RacTac, Yango, livreur, départ, arrivée, km, nom du livreur.
- Courses et Anomalies codées en dur sur `projectId:"rpm"` : à rendre activables par projet.
- Identifiant d'origine `u_5MKSBjCyBoc8Pi6hC78kuQ` = Fatoumata Sonko (admin).
- Réservé aux admins : `notes` (Point chaud · So far · Keep in mind), `mgmt` (pilotage du studio), `meetings`, `summaries`.
- Le récap de 17 h 40 était écrit par une tâche Claude qui ne fonctionnera plus : génération à recalculer depuis les données.

---

## 6. DESIGN — « HASKÈ PREMIUM 2026 »

Tout est spécifié dans `docs/DESIGN.md`, qui fait foi. En résumé :

- **Style** : Modern Executive SaaS + Refined Minimalism + Fluid Motion + Subtle Depth. Références de niveau sans copier : Linear, Stripe, Vercel, Raycast, Notion. Identité propre à Haskè.
- **Deux thèmes** : Haskè Daylight (clair) et Haskè Midnight (sombre), avec les palettes exactes du §2–3 du document, plus le mode System. Préférence mémorisée, aucun flash au chargement, bascule animée avec subtilité.
- **Typographie** : Plus Jakarta Sans pour les titres, Inter pour l'interface, chiffres tabulaires, échelle Display / H1 / H2 / H3 / Body / Small / Caption / Numeric KPI et aucune autre taille.
- **Tokens centralisés** : couleurs sémantiques, typographie, espacements, rayons (8 à 20 px), bordures, ombres et élévations différenciées, durées et courbes d'animation.
- **Motif signature** : le ruban ondulé du logo Haskè, qui se dessine au premier chargement et ondule lentement derrière l'en-tête du dashboard.
- **Motion system** : micro 120–180 ms, standard 180–280 ms, panneaux 250–350 ms, révélation du dashboard 350–550 ms ; ressorts pour le drag-and-drop et les indicateurs ; `transform`/`opacity` uniquement ; `prefers-reduced-motion` ; jamais d'animation qui freine le travail ; l'intro du dashboard ne se rejoue pas à chaque rafraîchissement.
- **Composants animés** décrits précisément : intro du dashboard, sidebar, cartes projet, Kanban, tableaux et formulaires, modales, thème, célébrations discrètes.
- **Responsive premium** testé à 375, 768, 1280 et 1440 px.

---

## 7. MODULES FONCTIONNELS

**Dashboard** (structure du §12 de `docs/DESIGN.md`) : header (titre, date Dakar, contexte du jour, actions rapides, notifications, profil) · synthèse KPI (projets actifs, tâches, taux de réalisation, blocages, échéances) · cartes SAFYA, TRIAGE+, RacTac · performance (graphiques KPI et OKR, tendances, objectifs atteints, retards) · travail (mes tâches, priorités, activité récente, échéances) · journal (entrée du jour, historique, réunions et décisions).

**Projets** : liste ; page projet avec vue générale, phase (frise cliquable), progression, OKR, tâches, KPI, notes, réunions, infos, blocages, historique, responsable et participants. Identifiants d'origine conservés.

**OKR** : objectifs et résultats clés éditables, échéances, cibles chiffrées, progression calculée automatiquement (formule de l'original, testée), retards signalés, historique, vue par projet, visualisations.

**Tâches** : Kanban À faire / En cours / Bloqué / Terminé ; création, modification, suppression confirmée, assignation, priorité, échéance, description, projet, historique, filtres, recherche ; drag-and-drop souris, tactile et clavier avec confirmation et retour en cas d'échec de sauvegarde. Les « actions du jour » de l'original restent une vue à part entière.

**KPI et analytics** : valeur du jour, cibles, courbes historiques, écarts, filtres de dates. RacTac : courses, clients, livreurs, comparaison RacTac / Yango / livreur.

**Journal quotidien** : navigation par date, réalisations, tâches du jour, notes, infos reçues, blocages, activité par projet, chronologie, recherche, filtres. Fuseau `Africa/Dakar`.

**Réunions et décisions** : comptes rendus Markdown, participants, date, décisions, actions de suivi transformables en tâches, lien aux projets ; modèle prêt pour Microsoft 365 / Teams.

**Anomalies** : signalement, projet, gravité, statut, description, pièces jointes et captures (stockage local pour l'instant), responsable, historique. Reprendre les captures existantes.

**Équipe et rôles** : Administrateur et Venture Architect, écran d'équipe pour les admins.

**Récapitulatifs** : historique, consultation par date, partage (copie, Outlook, Gmail, WhatsApp), export Markdown et PDF, récaps importés conservés, génération calculée à partir des données, aucun texte inventé.

Chaque module : loading, empty, success, error, unauthorized.

---

## 8. CONTRÔLE QUALITÉ VISUEL

Ne te contente jamais de produire du code. À chaque phase visuelle :
1. Ouvre l'application.
2. Capture chaque écran concerné (dans `docs/captures/phase-N/`).
3. Vérifie les deux thèmes.
4. Inspecte les alignements.
5. Contrôle les contrastes.
6. Teste les animations.
7. Examine les états loading, empty et error.
8. Vérifie le responsive.
9. Corrige les défauts visibles.
10. Effectue un second passage de finition.

Vérifie aussi l'accessibilité, l'absence d'erreurs console et la performance (60 FPS visés, jamais déclarés sans mesure).

---

## 9. SOUS-AGENTS

- `architecte-audit` → audit, architecture, revue d'intégration (aucune fonctionnalité perdue)
- `design-system` → tokens, thèmes, composants fondamentaux, `/styleguide`
- `ui-engineer` → shell, dashboard, cartes projets, écrans, responsive
- `motion-designer` → motion system et toutes les animations
- `backend-prisma` → schéma, actions serveur, permissions
- `migration-donnees` → import des données d'origine dans la base locale
- `qa-visuelle` → contrôle visuel et technique à la fin de CHAQUE phase

En parallèle seulement s'ils touchent des fichiers différents. Tu intègres et tu vérifies. Un commit git par phase.

---

## 10. ORDRE IMPÉRATIF DE RÉALISATION

Une phase à la fois. Arrêt pour ma validation à la fin de chacune.

1. **Audit** — fonctionnalités, données, formules, identité visuelle de l'original, logos (présence, dimensions, lisibilité en sombre), risques, questions → `docs/AUDIT.md`.
2. **Fondations** — projet Next.js, Prisma, PostgreSQL local, `schema.prisma`, import des données d'origine dans la base locale (dry-run, import, rapport de vérification) → `docs/ARCHITECTURE.md`. Ainsi, le dashboard pourra être prototypé avec les vraies données.
3. **Design system** — tokens, thèmes Daylight / Midnight / System sans flash, typographie, composants fondamentaux, `/styleguide`.
4. **Shell** — sidebar, header, navigation, palette de commandes, changement de thème, navigation mobile.
5. **Dashboard premium** — les trois cartes projets, motion system complet, première revue visuelle avec captures clair et sombre aux quatre largeurs.
6. **⏸ Validation de la direction visuelle par moi.** Rien n'est généralisé avant mon accord.
7. **Modules** — design et fonctionnalités, dans l'ordre : Projets + Tâches, OKR, KPI + RacTac, Journal, Réunions, Anomalies, Récaps, Équipe.
8. **Finition** — tests complets, responsive, accessibilité, performance mesurée, second passage visuel.
9. **Préparation Netlify** (plus tard) — base hébergée, connexion Microsoft 365, récap planifié à 17 h 40, guide de déploiement.

À la fin de chaque phase, réponds en 5 points : réalisé · fichiers créés ou modifiés · tests et contrôles exécutés avec résultats · risques restants · ce que je dois faire moi-même.

---

## 11. MAINTENANT

Lis tous les fichiers, puis présente uniquement le plan détaillé de la phase 1 et les questions que tu dois me poser. Ne modifie aucun fichier avant ma validation.
