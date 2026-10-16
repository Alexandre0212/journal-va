# Audit — Journal d'un Venture Architect

Phase 1, 15 octobre 2026. Lecture seule de l'original. Aucune donnée source n'a été modifiée.

Sources lues : `AGENTS.md`, `docs/DESIGN.md`, `LISEZMOI.md` des données d'origine (partie métier seulement), `journal-va.html` des données d'origine (1 084 lignes), `donnees/` des données d'origine, `public/logos/`.

L'original est une page unique. Il n'y a pas de routes. Tout l'inventaire ci-dessous doit exister dans la nouvelle plateforme, modernisé selon `docs/DESIGN.md`. Ce qui n'existe pas dans l'original et qui est demandé par le cahier des charges est listé à part, comme ajout, jamais comme remplacement silencieux.

---

## 1. Décisions actées

Ces choix sont tranchés. La phase 2 les applique.

| Sujet | Décision |
|---|---|
| Utilisateur par défaut | Alexandre Sankara, administrateur, `alexandre.sankara@haskeventures.com`. C'est la valeur de `DEV_USER_ID`. `AGENTS.md` indique encore Fatoumata : la phase 2 aligne le document. |
| Propriétaire des données importées | `u_5MKSBjCyBoc8Pi6hC78kuQ` = Fatoumata Sonko, administratrice, `fatoumata.sonko@haskeventures.com`. Les champs qui portent déjà cet identifiant restent les siens. Les champs `createdBy`, `updatedBy` et `history[].by` laissés vides par la source restent vides : on n'invente pas un auteur. |
| Compte de test | « VA Test », rôle Venture Architect, marqué compte de test, présent uniquement si `AUTH_MODE=dev`. Identifiant proposé : `u_va_test`. E-mail proposé, réservé au dev : `va.test@haskeventures.com`. |
| « Voir en tant que » | Visible seulement si `AUTH_MODE=dev`. Trois choix : Alexandre (défaut), Fatoumata, VA Test. Le contrôle réel reste côté serveur. |
| Courses et anomalies | À l'import, activées sur RacTac seul. Un drapeau par projet permet de les activer ensuite sur SAFYA et TRIAGE+. |
| Champs absents de l'original | Priorité de tâche, responsable et participants de projet, notifications : créés vides. Aucune valeur inventée. |
| Suppressions | Suppression logique (`deletedAt`) pour les tâches, OKR, KPI, infos et courses. Confirmation, puis restauration depuis une corbeille. |
| Anomalies | Pas de suppression dans l'original : statut ouvert ou résolu. On conserve ce geste. |
| Capture manquante | L'anomalie RacTac référence un fichier Claude absent du paquet. On garde la référence et on affiche « Fichier indisponible ». |
| Base | L'application et l'import unique utilisent le Prisma Postgres de Paris (`DATABASE_URL` dans `.env`, jamais versionné). `npx prisma dev` est réservé aux tests automatiques et aux imports répétés. |
| Récaps importés | Conservés tels quels. L'original ne calcule pas leur texte. Une génération déterministe, sans phrase inventée, viendra plus tard. |
| Fuseau | `Africa/Dakar` partout, y compris si le navigateur est ailleurs. |

Identifiants proposés pour les deux comptes qui n'existent pas dans l'export : `u_alexandre_sankara` et `u_va_test`. Ils ne remplacent pas l'identifiant de Fatoumata.

---

## 2. Ce que contient le paquet

Douze dossiers de documents dans `donnees/` des données d'origine. La collection `anomalyfiles`, citée par le code et par `LISEZMOI.md`, n'a ni dossier ni fichier.

| Collection | Fichiers | Remarque vérifiée |
|---|---|---|
| `projects` | 3 | SAFYA `order` 1 phase 2, TRIAGE+ `order` 2 phase 2, RacTac `rpm` `order` 3 phase 3 |
| `okrs` | 9 | 3 par projet, tous dans la phase actuelle du projet |
| `tasks` | 40 | 30 à faire, 1 en cours, 9 faites, 0 bloquée |
| `kpis` | 3 | 2 RacTac, 1 TRIAGE+, aucun SAFYA |
| `infos` | 2 | Les deux le 14/10/2026, canal Appel, projet TRIAGE+ |
| `notes` | 3 | Un document par projet, trois rubriques renseignées |
| `mgmt` | 7 | Toutes datées du 13/10/2026 : 6 faites, 1 en cours (`m-1013-05`). Aucun champ auteur |
| `summaries` | 3 | Ids `2026-10-12`, `2026-10-13`, `2026-10-14` |
| `meetings` | 1 | Weekly Tech Review, 13/10/2026, 14:00 |
| `courses` | 1 | RacTac, 13/10/2026 |
| `anomalies` | 1 | RacTac, majeure, ouverte, fichier non récupéré |
| `team` | 1 | `joinedAt` seulement, aucun nom |

Phases présentes dans les données : Validation (2) pour 28 tâches, MVP (3) pour 12 tâches. Aucune tâche ni OKR dans les autres phases. Les sept phases restent proposées par l'interface.

Tâches : les 40 ont une `date`, un `okrId` et un `history`. 34 sans `assignee`, 34 sans `createdBy`, 31 sans `updatedBy`, 34 entrées d'historique sans `by`. Aucune échéance (`due` vide), aucun `blocker`. Historique le plus long : 3 entrées.

---

## 3. Inventaire fonctionnel

Ligne = `journal-va.html` des données d'origine. Destination = module futur. Rien de cette liste ne disparaît.

### En-tête et navigation familière

| Fonction | Lignes | Comportement | Destination |
|---|---|---|---|
| Logo et titre | 291–297 | Logo, « Haskè Ventures · studio », titre de la page | Shell |
| Bandeau mission | 299–303 | Texte fixe, mot « entreprises à fort potentiel » en accent | Dashboard |
| Frise des 7 phases | 304–314, 59–78 | Sept chevrons, infobulle au survol ou au focus. Ce n'est pas un menu : changer de phase se fait dans le projet | Shell / projet |
| Libellés de phase | 306–312 | Textes exacts à conserver, voir § 8 | Domaine |

### Journal du jour

| Fonction | Lignes | Comportement | Destination |
|---|---|---|---|
| Jour courant | 473–474, 539–546 | `AAAA-MM-JJ`. Aujourd'hui, ou date longue si jour passé. Pas de jour futur | Journal |
| Veille / suivant / calendrier / Aujourd'hui | 322–328, 1042–1047 | Suivant désactivé sur aujourd'hui. Changer de jour remet le récap sur ce jour | Journal |
| Bandeau « jour passé » | 141, 542–543 | Prévenir que l'ajout est daté de ce jour | Journal |
| Actions du jour | 369–385, 555–566, 1026–1041 | Formulaire distinct du tableau. Titre max 200. Statut, OKR lié, raison si bloqué. Créées avec `date` = jour affiché, assignées à l'utilisateur courant, échéance vide | Tâches, vue « actions du jour » |
| Liste du jour, groupée par personne | 149–158, 555–566 | Une action appartient au jour si `date` égale ce jour, ou si `date` est vide et `createdAt` tombe ce jour, ou si une entrée d'historique tombe ce jour | Journal |
| Clic sur une action | 564 | Ouvre la fiche tâche | Tâches |
| Infos reçues | 386–401, 801–813, 983–991 | Projet sélectionné et jour affiché. Texte max 1 200, source max 120, canal parmi WhatsApp, Appel, Email, SMS, Teams (chat), En personne, Autre | Journal |
| Suppression d'une info | 806–808 | Auteur ou administrateur. Pas d'édition du texte | Journal, corbeille |

### Récap et réunions

| Fonction | Lignes | Comportement | Destination |
|---|---|---|---|
| Ouvrir le récap | 329, 1055 | Panneau repliable | Récaps |
| Date de récap indépendante | 340, 647–648, 1048 | Une fois changée, elle ne suit plus le jour du journal, jusqu'au prochain changement de jour | Récaps |
| Affichage | 620–628, 656–661 | Markdown limité : titres `##`, listes `-`, gras `**`. Message vide si aucun document | Récaps |
| Partage | 343–349, 643–666, 1049–1054 | Copier, Outlook, Gmail, WhatsApp. Le texte partagé retire le gras et passe les titres en capitales | Récaps |
| Réunions du jour | 332–336, 629–641 | Pastilles « CR + titre + heure ». Filtrées sur la date du récap si elle diffère du journal. Pas de formulaire de création dans l'original | Réunions |
| Compte rendu | 633–640 | Titre, heure, participants, corps Markdown | Réunions |

Les trois récaps importés sont des textes rédigés hors de la page (tâche Claude de 17 h 40, heure de Dakar). La page ne fait que les lire. Leurs sections observées : tâches du jour, infos reçues, GitHub, progression des OKR, points bloquants, à venir. La section GitHub décrit une intégration externe. Tant qu'elle n'est pas branchée, l'application affiche un état explicite. Elle ne fabrique pas de statut GitHub. Les textes déjà importés restent intacts, y compris cette section.

### Vue d'ensemble

| Fonction | Lignes | Comportement | Destination |
|---|---|---|---|
| Cartes projet | 106–128, 587–606 | Tri par `order`. Clic = sélection + défilement vers le détail. Carte pressée si sélectionnée | Dashboard, Projets |
| Pourcentage de carte | 591–598 | Moyenne des OKR de la phase actuelle du projet. « — » s'il n'y en a pas | Domaine |
| Notes sur la carte | 119–124, 508, 599 | Point chaud, So far, Keep in mind. « À renseigner » si vide. Visibles de tous | Projets |
| Compteurs de tâches | 128–133, 594–605 | À faire, en cours, bloqué, fait, pour la phase actuelle seulement | Projets |
| Points bloquants | 354–357, 608–618 | Toutes les tâches `blocked`, tous projets. Raison, projet, personne, « aujourd'hui » ou « depuis N j ». Clic = ouvrir le projet et la fiche | Dashboard |
| Édition des notes | 364, 510–526, 1057 | Bouton réservé à l'administrateur. Remplacement du document `notes/<id projet>` | Projets |
| Modifier le projet | 364, 967–976 | Nom (max 80) et phase actuelle. Les OKR et tâches des phases précédentes restent | Projets |
| Sélecteur de phase | 366, 815–825, 1056 | Filtre OKR, actions du jour et tableau. Ne filtre pas KPI, courses ni anomalies. Revenir au projet resynchronise sur sa phase actuelle | Projets |

### OKR

| Fonction | Lignes | Comportement | Destination |
|---|---|---|---|
| Cartes colorées du journal | 166–181, 534–537, 569–584 | Couleur stable par ordre d'id dans la phase (5 couleurs, puis ça recommence). Saisie directe de la valeur actuelle | OKR |
| Compteur « actions sur 7 jours » | 530, 572 | Tâches liées à l'OKR dont la date, la création ou l'historique tombe dans les 7 derniers jours, aujourd'hui inclus | OKR |
| Fiche OKR du tableau | 247–261, 843–858 | Pourcentage, échéance, barres, rythme, modifier | OKR |
| Créer / modifier / supprimer | 935–965 | Titre max 160, projet, phase, échéance, résultats clés (libellé, cible, actuel, unité). Suppression en deux temps | OKR, corbeille |
| Rythme | 834–842 | Voir § 5. Masqué si le résultat clé est à 100 % ou s'il n'y a pas d'échéance | Domaine |

### KPI

| Fonction | Lignes | Comportement | Destination |
|---|---|---|---|
| Liste du projet | 195–204, 681–700 | Nom, objectif par jour, saisie du jour, moyenne 7 jours, pastille atteint / en dessous, courbe 14 jours | KPI |
| Saisie | 690–692 | Vide = retirer la valeur de ce jour. La saisie écrit toujours sur aujourd'hui, pas sur le jour du journal | KPI |
| Créer / modifier / supprimer | 702–717 | Nom max 120, unité max 30, objectif optionnel. Suppression en deux temps | KPI, corbeille |
| Projet sans KPI | 684 | État vide avec action « + KPI » | KPI |

`rpm-k2` (« Nouveaux livreurs inscrits ») n'a ni objectif ni valeur. L'interface doit afficher « sans objectif chiffré » et une moyenne « — », pas un zéro.

### Courses (RacTac aujourd'hui)

| Fonction | Lignes | Comportement | Destination |
|---|---|---|---|
| Visibilité | 736–737 | Panneau seulement si le projet actif est `rpm` | KPI RacTac |
| Formulaire | 415–426, 1009–1018 | Date (pas dans le futur), départ, arrivée, km, trois prix, nom du livreur, note. Au moins un prix | Courses |
| Statistiques | 735–750 | Moyennes RacTac, Yango, livreur. Écart moyen RacTac vs Yango | Domaine |
| Tableau | 428, 751–763 | 60 dernières à l'écran. Écart par course. Suppression en deux temps | Courses, corbeille |

La course importée : 2 400 F RacTac, 1 500 F Yango, 1 500 F livreur, km et note vides, livreur nommé, trajet renseigné.

### Anomalies (RacTac aujourd'hui)

| Fonction | Lignes | Comportement | Destination |
|---|---|---|---|
| Visibilité | 776–777 | Panneau seulement si le projet actif est `rpm` | Anomalies |
| Formulaire | 432–438, 992–1007 | Date, gravité (mineure, majeure, bloquante ; majeure par défaut), texte max 300, fichier facultatif | Anomalies |
| Fichier | 766–775, 794–799, 999–1003 | Image compressée (côté 1 400 px, JPEG, refus si trop lourde) ou pièce via le service de fichiers. PDF et vidéo seulement si le stockage les accepte | Stockage |
| Liste | 779–792 | 40 dernières. Résoudre ou rouvrir. Image cliquable | Anomalies |
| Fichier absent | 773 | L'original dit déjà « Fichier indisponible » pour une image inline manquante. Même état pour la capture non récupérée | Anomalies |

L'unique anomalie garde `file.kind = "asset"`, l'identifiant `19146ec297857495f1508f4c2d05ea1d`, le nom `Erreur Connexion.jpeg`, le type `image/jpeg`. Le binaire n'est pas dans le paquet.

### Tableau des tâches

| Fonction | Lignes | Comportement | Destination |
|---|---|---|---|
| Quatre colonnes | 262–275, 469–470, 826–831 | À faire, En cours, Bloqué, Fait. Filtrées par projet et phase affichée. Pas de glisser-déposer dans l'original | Tâches |
| Carte | 860–870 | Titre cliquable, raison si bloqué, personne, échéance en retard, pastille OKR, liste de statut | Tâches |
| Passer en bloqué | 864 | Ouvre la fiche et exige une raison. Le statut ne change pas tant que la fiche n'est pas enregistrée | Tâches |
| Autre statut | 873–880 | Mise à jour partielle. Historique plafonné. `doneAt` ou `blockedAt`. Quitter « bloqué » efface la raison | Tâches |
| Fiche | 893–932 | Titre, projet, phase, OKR lié (filtré), responsable, échéance, statut, raison. Création ou remplacement complet. Suppression en deux temps | Tâches, corbeille |
| Retard | 861 | `due` antérieure à aujourd'hui et statut différent de fait | Domaine |

Le glisser-déposer (souris, tactile, clavier, confirmation, retour arrière si la sauvegarde échoue) est un ajout du cahier des charges. Le changement par liste doit rester.

### Pilotage du studio

| Fonction | Lignes | Comportement | Destination |
|---|---|---|---|
| Liste | 448–462, 718–734 | Hors projets. Groupé par jour, 3 jours puis « voir les jours précédents ». Compteur du jour | Pilotage (admin) |
| Formulaire | 453–459, 1021–1023, 1065 | Réservé à l'administrateur. Texte max 200, statut fait / en cours / à faire, daté d'aujourd'hui | Pilotage |
| Changement de statut | 728–729 | Administrateur. Pas de suppression dans l'original | Pilotage |

### États transverses

| Fonction | Lignes | Comportement | Destination |
|---|---|---|---|
| Message d'erreur d'écriture | 485 | Lecture seule, quota, ou échec générique. À réécrire sans mention de claude.ai | Toutes les actions |
| Garde « non connecté » | 978, 985, 994, 1011, 1028, 1063 | Remplacée par la session serveur. En dev, il y a toujours un utilisateur | Auth |
| Modale | 278–280, 883–889 | Clic hors cadre et Échap ferment. Focus au premier champ | Composant |
| Personne | 492–496 | « Vous », nom, ou « Membre de l'équipe » / « Non attribuée ». Avatar 18 px si le profil en a un | Équipe |
| Premier passage | 1080 | Crée `team/<uid>` avec `joinedAt` s'il n'existe pas | Équipe |
| Temps réel | 1066–1079 | Douze écoutes. Remplacées par des lectures groupées, rafraîchies au retour sur l'onglet et après une action. Pas de polling court | Serveur |

---

## 4. Modèle de données

Identifiants d'origine conservés, y compris les ids générés (`bj93y5r8i7uavg81k9n5`, etc.). Dates calendaires en `AAAA-MM-JJ`. Instants en ISO 8601.

### `projects/<id>`

`name`, `order`, `phase` (entier 0–6), `updatedAt`.

Ajouts vides à l'import : responsable, participants, `coursesEnabled`, `anomaliesEnabled` (vrais pour `rpm` seulement).

### `okrs/<id>`

`projectId`, `phase`, `title`, `due` (date ou null), `updatedAt`, `keyResults[]` de `{ id, label, target, current, unit }`.

Deux échéances renseignées : TRIAGE+ « Prouver que TRIAGE+ marche à grande échelle » le 5 décembre 2026, RacTac « Valider l'appli RacTac » le 7 décembre 2026.

### `tasks/<id>`

`title`, `projectId`, `phase`, `okrId`, `assignee`, `due`, `date`, `status` (`todo` | `doing` | `blocked` | `done`), `blocker`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `doneAt`, `blockedAt`, `history[]` de `{ at, status, by }`.

Ajout vide : `priority`. Ajout système : `deletedAt`.

### `kpis/<id>`

`projectId`, `label`, `unit`, `target` (nombre ou null), `values` objet `{ "AAAA-MM-JJ": nombre }`, `createdAt`, `updatedAt`.

Valeurs présentes : `rpm-k1` et `triage-k1` ont une seule valeur, le 13/10/2026. `rpm-k2` n'en a aucune.

### `infos/<id>`

`date`, `text`, `source`, `channel`, `projectId`, `by`, `createdAt`.

### `courses/<id>`

`projectId`, `date`, `from`, `to`, `km`, `app`, `yango`, `liv`, `who`, `note`, `by`, `createdAt`. Nombres ou null.

### `anomalies/<id>`

`projectId`, `date`, `text`, `severity` (`minor` | `major` | `blocking`), `status` (`open` | `resolved`), `file` ou null, `by`, `createdAt`.

`file` : soit `{ kind: "asset", id, name, type }`, soit `{ kind: "inline", doc, name, type }` où `doc` pointe vers `anomalyfiles/<id>`.

### `anomalyfiles/<id>`

`data` (data URL JPEG), `name`, `createdAt`. Aucun document exporté.

### `notes/<projectId>`

`hot`, `sofar`, `keep`, `updatedAt`. Chaîne ou null.

### `mgmt/<id>`

`text`, `status` (`done` | `doing` | `todo`), `date`, `createdAt`, `updatedAt`. Le code écrit aussi `by` à la création ; les sept documents exportés ne l'ont pas.

### `meetings/<id>`

`title`, `date`, `start` (`HH:MM`), `participants[]` (noms en texte, pas des ids), `cr` (Markdown), `source`, `createdAt`.

Participants du compte rendu importé : Elias Ba, Amy Sam, Ben Diop, Alexandre Sankara, Yunes Rubin, Michael Goudiaby, Fatoumata Sonko. Ce sont des noms dans un compte rendu, pas des comptes utilisateurs. Seuls les trois comptes du § 1 sont créés.

### `summaries/<AAAA-MM-JJ>`

`date`, `text`, `generatedAt`. L'id est la date.

### `team/<uid>`

`joinedAt` seulement. Les noms viennent aujourd'hui du service d'identité Claude, pas de ce document. L'import crée les trois comptes du § 1 et conserve le `joinedAt` de Fatoumata.

---

## 5. Formules

À porter telles quelles dans `src/domain/`, avec tests sur les données réelles. `t` est aujourd'hui en `Africa/Dakar`.

**Résultat clé.** Si `target > 0`, `clamp(current / target, 0, 1)`. Sinon 0. Une cible à 0 ne fait pas monter l'objectif.

**OKR.** Moyenne arithmétique des résultats clés. 0 s'il n'y en a pas. L'affichage est `Math.round(ratio * 100)` suivi de « % ».

**Carte projet.** Même moyenne, limitée aux OKR dont la phase est la phase actuelle du projet. Null s'il n'y en a aucun : afficher « — », pas 0.

**Rythme** (`pace`, l. 834–842). Rien si pas d'échéance ou si le résultat clé vaut au moins 1. `reste = target - current`. `jours = ceil(échéance fin de journée − maintenant)`. Si `jours <= 0` : « Échéance dépassée · il manque {reste} {unité} ». Sinon : « Reste {reste} {unité} en {jours/7} semaine(s) · rythme nécessaire ≈ {reste / (jours/7)} {unité} / semaine ». Nombres en français, une décimale max.

**Appartenance à un jour** (`onDay`, l. 529). Vrai si `date` égale ce jour, ou si `date` est vide et le jour de `createdAt` égale ce jour, ou si un `history[].at` tombe ce jour. Le jour d'un instant est calculé en `Africa/Dakar`, plus dans le fuseau du navigateur.

**Sept derniers jours** (`inLast7`, l. 530). De J−6 à J inclus, sur `date`, ou `createdAt` si pas de `date`, ou un `history[].at`.

**Moyenne KPI 7 jours** (l. 688–689). Les valeurs numériques de J, J−1, … J−6. Les jours sans saisie sont ignorés, pas comptés comme zéro. Null si aucune valeur.

**Atteint.** La moyenne existe, la cible est un nombre, et la moyenne est supérieure ou égale à la cible. Sans cible : pas de pastille.

**Courbe 14 jours** (`spark`, l. 669–679). J−13 à J. Seuls les jours avec une valeur numérique sont des points. L'échelle va de 0 au maximum entre la cible et les points (au moins 1). Trait d'objectif en pointillés si la cible est un nombre non nul. Dernier point plus gros.

**Courses.** Moyenne de chaque prix sur les courses où ce prix est un nombre. Écart d'une course : `(app - yango) / yango * 100` si `yango > 0` et les deux prix sont des nombres. Écart global : moyenne de ces écarts. Négatif ou nul = favorable (RacTac moins cher ou égal), strictement positif = défavorable. Affichage en FCFA arrondis, pourcentages sans décimale, signe affiché sauf zéro.

**Ancienneté d'un blocage.** `floor((maintenant − blockedAt) / 86400000)` jours. 0 = « aujourd'hui ».

**Historique de statut** (`stamp`, l. 873–878). On conserve les 19 dernières entrées puis on ajoute la nouvelle, soit 20 au plus. On n'ajoute une ligne que si le statut change. `doneAt` quand on passe à fait, `blockedAt` quand on passe à bloqué, `blocker` remis à null dès qu'on quitte bloqué.

**Récap.** Aucune formule dans la page. Ne pas réécrire les trois textes importés pour les « faire coller » à un calcul.

---

## 6. Dépendances à claude.ai

| Service | Usage | Remplacement |
|---|---|---|
| `claude.use("db")` | Douze `onSnapshot`, `add`, `doc().get/set/update/delete`, `collection().doc()` pour un id de fichier | Prisma. Lectures groupées. Écritures en Server Actions Zod |
| `claude.use("user")` | `id()`, `canEdit()` (administrateur), `profiles()` | `src/server/auth/session.ts`. En dev : `DEV_USER_ID` et le sélecteur. Plus tard : Auth.js + Microsoft Entra ID, comptes `@haskeventures.com`, sans autre fichier à toucher |
| `claude.use("assets")` | Upload d'une pièce d'anomalie, URL `/_blob/<id>` | `StorageService`, disque `storage/` hors `public/` en local, Netlify Blobs plus tard |

`canEdit()` est vrai pour la propriétaire et les éditeurs Claude. Dans la nouvelle application, cela correspond au rôle administrateur. Fatoumata et Alexandre sont administrateurs. VA Test ne l'est pas.

Les messages « Connectez-vous à claude.ai… » (l. 978, 985, 994, 1011, 1028, 1063) et les textes de `fail()` (l. 485) sont réécrits. Une intégration non configurée affiche un état explicite.

---

## 7. Valeurs codées en dur

| Endroit | Lignes | Traitement |
|---|---|---|
| Panneau courses visible | 737 | Remplacé par `coursesEnabled` |
| Liste courses filtrée | 739 | Filtre sur le projet affiché |
| Création de course | 1013 | `projectId` = projet actif |
| Panneau anomalies visible | 777 | Remplacé par `anomaliesEnabled` |
| Liste anomalies filtrée | 779 | Filtre sur le projet affiché |
| Création d'anomalie | 1004 | `projectId` = projet actif |
| Date du jour | 474 | `Africa/Dakar` via `src/lib/dates.ts` |
| Couleur de marque violette `#3E0090` | 7–37 | Abandonnée. Brand Blue `#23358E`, Brand Orange `#E79409`, contrastes de `docs/DESIGN.md` § 4 |

À l'import, `coursesEnabled` et `anomaliesEnabled` sont vrais sur `rpm` et faux sur `safya` et `triage`.

---

## 8. Identité visuelle à conserver

Le violet, Raleway, DM Sans et le thème sombre violet de l'original ne sont pas repris. `docs/DESIGN.md` fait foi pour la forme. On conserve la structure que l'équipe reconnaît.

**Mission, texte exact.** « Transformer des opportunités de marché en entreprises à fort potentiel, en réunissant stratégie, entrepreneuriat, capital et exécution. »

**Sept phases, index 0 à 6, infobulles exactes.**

| Index | Nom | Infobulle |
|---|---|---|
| 0 | Challenge | Identifier un problème de marché et décider s'il mérite d'être exploré. |
| 1 | Discovery | Comprendre les utilisateurs, le marché et la concurrence. |
| 2 | Validation | Prouver la demande et la volonté de payer avec de vrais clients. |
| 3 | MVP | Construire la première version utilisable du produit. |
| 4 | Launch | Mettre le produit sur le marché et signer les premiers clients. |
| 5 | Grow | Trouver la traction et un modèle d'acquisition répétable. |
| 6 | Scale | Industrialiser, lever des fonds et étendre à de nouveaux marchés. |

Couleurs de phase : celles de `docs/DESIGN.md` § 9, pas les violet et bleu d'origine. En sombre, versions éclaircies pour le texte. Launch garde un texte bleu nuit sur l'orange, pas du blanc.

**Navigation par jour** en tête du journal, avec le récap et les réunions à proximité.

**Carte projet** : nom, phase lisible par la couleur, pourcentage d'OKR, trois notes, compteurs de tâches. La sélection ouvre le détail du projet.

**Dans le projet** : phase affichée choisie par une frise ou un sélecteur, actions du jour à part du tableau, OKR, KPI, puis courses et anomalies si le projet les active, puis le tableau à quatre colonnes.

**Pilotage** séparé des projets, réservé à l'écriture administrateur.

L'original n'a pas de bouton de thème : le sombre suit seulement le système, en violet. Le nouveau thème est Daylight / Midnight / System, sans flash, selon `docs/DESIGN.md`.

---

## 9. Logos

Fichiers présents, mesurés le 15 octobre 2026. Rien n'a été remplacé ni recoloré.

| Fichier | Pixels | Format | Fond | Lecture |
|---|---|---|---|---|
| `haske-ventures.png` | 2 500 × 1 086 | 32 bits, alpha | Transparent. Contenu utile environ x 280–2 219, y 287–831 | Mot `#181818`. Ruban : orange `#E79409`, bleu `#003CB9`, vert `#003C09` |
| `safya.png` | 2 292 × 648 | 32 bits, alpha | Transparent. Contenu utile environ x 60–2 251, y 36–587 | Mot et carré `#1F5E4B`, S blanc, étoile `#D4502A` |
| `triage-plus.png` | 333 × 55 | 24 bits, sans alpha | Blanc opaque | Wordmark bleu et orange, lisible sur clair. Sur sombre, le rectangle blanc fait office de pastille |
| `ractac.png` | 87 × 75 | 24 bits, sans alpha | Blanc opaque | Résolution trop basse pour un affichage net au-delà de sa taille native |

Contrastes calculés (blanc de référence `#FFFFFF`, Daylight `#F7F9FD`, Midnight `#0B1225`) :

| Paire | Ratio | Conséquence |
|---|---|---|
| `#181818` sur Daylight | 16,9 : 1 | Le mot Haskè se lit en clair |
| `#181818` sur Midnight | 1,1 : 1 | Le mot disparaît |
| `#E79409` sur Midnight | 7,7 : 1 | Seule la bande orange du ruban reste lisible |
| `#003CB9` sur Midnight | 2,1 : 1 | La bande bleue du ruban disparaît |
| `#003C09` sur Midnight | 1,5 : 1 | La bande verte du ruban disparaît |
| `#1F5E4B` sur Daylight | 7,2 : 1 | SAFYA se lit en clair |
| `#1F5E4B` sur Midnight | 2,5 : 1 | Le mot SAFYA ne se lit pas |

En Midnight, Haskè et SAFYA se posent sur une pastille claire, sans recolorer le fichier. TRIAGE+ et RacTac ont déjà un fond blanc : le contenir dans la même pastille évite un rectangle irrégulier. RacTac ne doit pas être agrandi au-delà de 87 × 75 sans accepter un flou ; le signaler plutôt que d'inventer une version plus grande. Proportions conservées (`object-contain`, hauteur fixe).

Le PNG encodé dans le HTML (déclaré 634 × 162, en-tête toujours sur fond blanc) n'est pas le fichier de `public/logos/`. On utilise les fichiers de `public/logos/`.

---

## 10. Ajouts du cahier des charges

Ils n'existent pas dans l'original. On les crée vides ou explicites, sans donnée inventée.

| Ajout | État à l'import |
|---|---|
| Priorité de tâche | Vide |
| Responsable et participants du projet | Vides |
| Notifications du header | Aucune. État vide |
| Glisser-déposer du tableau | Le changement par liste reste |
| Recherche et filtres | Aucun filtre enregistré |
| Export Markdown et PDF des récaps | Les trois textes existent déjà. L'export ne les réécrit pas |
| Création de réunions et transformation d'une action de suivi en tâche | L'original ne fait qu'afficher le compte rendu |
| Écran équipe | Trois comptes du § 1 |
| Corbeille | Vide après import. Restaure tâches, OKR, KPI, infos, courses |
| Pages par module, chargement, vide, erreur, non autorisé | Chaque écran |

Le tableau d'origine n'est pas un Kanban déplaçable. La vue « actions du jour » reste une vue à part, pas un filtre du tableau.

---

## 11. Permissions

Tout utilisateur authentifié lit tout. Masquer un bouton ne suffit pas : chaque action revérifie le rôle.

| Écriture | Administrateur | Venture Architect |
|---|---|---|
| Projets, OKR, tâches, KPI, courses, anomalies | Oui | Oui |
| Infos : créer | Oui | Oui |
| Infos : retirer (suppression logique) | Oui | Seulement les siennes |
| Notes, pilotage, réunions, récaps | Oui | Non |
| Drapeaux courses / anomalies d'un projet | Oui | Non, tant que ce n'est pas précisé autrement. Proposition : administrateur seul |
| Équipe | Oui, y compris les autres | Son propre profil |
| Corbeille : restaurer | Oui | Ses propres retraits, pour les collections qu'il peut écrire |
| Bascule « Voir en tant que » | Réservée à `AUTH_MODE=dev` | Idem, le compte de test inclus |

`AUTH_MODE=dev` est refusé si `NODE_ENV=production`.

---

## 12. Risques

1. **Quota Prisma Postgres.** L'import tient en une transaction groupée, une fois. Les écrans ne font pas de polling. Le nombre de requêtes du dashboard sera mesuré en phase 5, pas estimé ici.
2. **Capture non récupérée.** L'anomalie s'affiche. La pièce affiche « Fichier indisponible ». Aucune image de remplacement.
3. **RacTac en 87 × 75.** Flou si on l'affiche grand. Attendre un fichier plus grand plutôt que le redessiner.
4. **Logos sombres.** Sans pastille claire, Haskè et SAFYA sont illisibles en Midnight.
5. **Auteurs vides.** 34 tâches sur 40 n'ont pas d'auteur. Les écrans disent « Non attribuée » ou omettent l'auteur. Ils n'affichent pas Fatoumata à sa place.
6. **Noms du compte rendu.** Sept personnes sont citées. Trois seulement ont un compte. Lier un nom de participant à un compte se fait par correspondance explicite (Fatoumata Sonko, Alexandre Sankara), pas par devinette sur les autres.
7. **Récap de 17 h 40.** Plus aucune tâche externe ne l'écrit. Les récaps passés restent. Le futur texte sera calculé depuis les données, au moment prévu par la phase Netlify.
8. **`AGENTS.md` en retard sur le défaut.** Il cite encore Fatoumata comme utilisateur courant. La décision du § 1 prime, et la phase 2 corrige le document.
9. **`.env`.** Présent, exclu par `.gitignore`, non lu pour cet audit. Pas de `.env.example` : il appartient à la phase 2, sans secret.

---

## 13. Contrôle de cet audit

Comptages faits en lisant les 74 fichiers JSON de `donnees/` (3 + 9 + 40 + 3 + 2 + 3 + 7 + 3 + 1 + 1 + 1 + 1). Formules relues aux lignes citées. Logos mesurés par lecture des pixels (dimensions, alpha, couleurs dominantes, contrastes). Aucun test applicatif : il n'y a pas encore d'application. Les données d'origine n'ont pas été modifiées.
