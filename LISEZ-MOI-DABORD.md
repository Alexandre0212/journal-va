# Mode d'emploi du kit Cursor — Journal VA

## 1. Préparer le dossier
Crée un dossier `journal-va-platform` et mets dedans :
- le dossier des données d'origine (dézippé, tel quel), hors du dépôt : son chemin se renseigne dans `LEGACY_DATA_DIR` ;
- tout le contenu de ce kit, y compris le dossier caché `.cursor/` (Mac : `Cmd + Shift + .` pour voir les fichiers cachés ; Windows : Affichage > Éléments masqués).

```
journal-va-platform/
├── .cursor/agents/      ← 7 sous-agents
├── .cursor/rules/       ← règles appliquées automatiquement
├── AGENTS.md
├── PROMPT-CURSOR.md     ← le prompt à coller dans Cursor
├── docs/DESIGN.md
└── public/logos/        ← logos
```
Dans un terminal, depuis ce dossier : `git init && git add . && git commit -m "Point de départ"`.

## 2. Avant de lancer
Installe Node.js (version LTS) et PostgreSQL. Le plus simple : Docker Desktop, ou Postgres.app sur Mac, ou l'installateur officiel PostgreSQL sur Windows. Cursor te donnera les commandes exactes à la phase 2.

## 3. Lancer dans Cursor
1. `File > Open Folder` sur `journal-va-platform`.
2. Nouveau chat Agent, passe en **mode Plan** (`Shift + Tab`).
3. Choisis le modèle le plus puissant disponible (pas « Auto »).
4. Ouvre `PROMPT-CURSOR.md`, copie tout, colle-le dans le chat.
5. Réponds à ses questions, puis valide le plan.

## 4. Avancer phase par phase
- Un chat par phase : « Lis AGENTS.md et docs/AUDIT.md, on attaque la phase N ».
- Aux phases 3 à 5 (design), sois exigeant : demande des captures, compare, fais reprendre. Exemples : « plus d'air entre les cartes », « le chiffre héros doit être plus grand », « le ruban est trop visible », « l'animation du Kanban est trop lente ».
- Fin de phase : « Lance qa-accessibilite pour vérifier la phase N », puis commit git.
- Pour lancer l'app : `npm run dev`, puis http://localhost:3000.
