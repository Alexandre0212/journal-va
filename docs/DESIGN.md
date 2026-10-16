# Direction artistique — « Haskè Premium 2026 »

Modern Executive SaaS + Refined Minimalism + Fluid Motion + Subtle Depth.

Qualités : exceptionnellement beau, moderne, élégant, professionnel, interactif, immédiatement compréhensible, agréable au quotidien.
Références de niveau (sans copier) : Linear (fluidité, précision), Stripe (clarté, graphiques), Vercel (hiérarchie, cohérence), Raycast (micro-interactions), Notion (facilité).
Identité propre à Haskè : profondeur du bleu, chaleur de l'orange, ruban ondulé du logo.

On conserve de l'original : organisation métier, frise des 7 phases, bandeau mission, logique de navigation familière.

---

## 1. Couleurs officielles
- Brand Blue `#23358E` — structure, navigation, actions principales.
- Brand Orange `#E79409` — dynamisme, accents, progression, moments forts.
Jamais de violet (l'ancien `#3E0090` est abandonné), jamais d'autre identité.
Générer des échelles 50→950 pour les deux couleurs, plus les variantes de contraste ci-dessous.

## 2. Thème clair — « Haskè Daylight »
| Token | Valeur |
|---|---|
| `--bg` | `#F7F9FD` |
| `--surface` | `#FFFFFF` |
| `--surface-sunken` | `#F0F3FA` |
| `--primary` | `#23358E` |
| `--accent` | `#E79409` |
| `--text` | `#18243A` |
| `--text-secondary` | `#65738B` |
| `--border` | `#E0E7F2` |
| `--link` | `#23358E` |
| `--accent-text` | `#9A5800` |

Direction : lumière douce, espaces généreux, surfaces raffinées, bordures légères, ombres subtiles, bleu pour structurer, orange pour dynamiser.

## 3. Thème sombre — « Haskè Midnight »
| Token | Valeur |
|---|---|
| `--bg` | `#0B1225` |
| `--surface` | `#17223C` |
| `--surface-raised` | `#1D2B47` |
| `--primary` (surfaces pleines) | `#23358E` |
| `--primary-fg` (texte, liens, icônes, indicateurs actifs) | `#9AABF5` |
| `--accent` | `#E79409` |
| `--text` | `#F4F7FF` |
| `--text-secondary` | `#A4B0C8` |
| `--border` | `#293752` |

Direction : bleu nuit profond, surfaces superposées, contrastes raffinés, lueurs d'accent subtiles, graphiques adaptés à la faible luminosité, orange avec retenue, profondeur sans effets excessifs.

Dans ce thème, les bordures `#293752` sont presque invisibles sur `#17223C` : jouer sur l'écart entre `--bg`, `--surface` et `--surface-raised` et sur une fine lueur intérieure (`inset 0 1px 0 rgb(255 255 255 / 0.04)`) plutôt que sur la bordure seule.

## 4. Contrastes vérifiés (WCAG)
| Paire | Ratio | Règle |
|---|---|---|
| `#18243A` sur `#F7F9FD` | 14,7 | OK |
| `#65738B` sur `#F7F9FD` | 4,55 | OK de justesse : jamais sur `--surface-sunken`, jamais en dessous de 13 px |
| `#23358E` sur `#F7F9FD` | 10,1 | OK |
| `#E79409` sur blanc | 2,4 | **Interdit pour du texte** → `#9A5800` (5,3) |
| Blanc sur `#23358E` | 10,7 | Boutons primaires OK dans les deux thèmes |
| `#18243A` sur `#E79409` | 6,4 | Texte sur orange : bleu nuit, pas blanc |
| `#F4F7FF` sur `#0B1225` | 17,4 | OK |
| `#A4B0C8` sur `#17223C` | 7,2 | OK |
| `#23358E` sur `#0B1225` | **1,75** | **Interdit** pour texte, icône ou indicateur en sombre → `#9AABF5` (8,4) |
| `#E79409` sur `#0B1225` | 7,7 | OK en sombre, texte compris |

## 5. Thème interactif
- Choix Light / Dark / System, mémorisé, synchronisé avec le système en mode System (`next-themes`, `attribute="class"`).
- Aucun flash au chargement (script de thème avant le rendu).
- Bascule animée avec subtilité : View Transitions API quand disponible (fondu croisé ou cercle qui s'étend depuis le bouton), sinon fondu bref. Jamais de `transition: all` global.

## 6. Typographie
- Titres : **Plus Jakarta Sans** (600–800). Interface et contenu : **Inter** (400–600). Chargées par `next/font`.
- Chiffres : Inter avec `font-variant-numeric: tabular-nums` (tableaux, KPI, FCFA, dates, pourcentages).

| Niveau | Taille / interligne | Police, graisse |
|---|---|---|
| Display | 40 / 48 | Jakarta 700, interlettrage −0,02em |
| H1 | 30 / 38 | Jakarta 700 |
| H2 | 22 / 30 | Jakarta 650 |
| H3 | 17 / 24 | Jakarta 600 |
| Body | 14 / 22 | Inter 400 |
| Small | 13 / 20 | Inter 400–500 |
| Caption | 12 / 16 | Inter 500, éventuellement majuscules espacées |
| Numeric KPI | 32–44 / 1,1 | Inter 600 tabulaire |

Aucune autre taille.

## 7. Tokens de structure
- Espacements : 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Rayons : 8 (champs, badges), 12 (cartes standard), 16 (cartes importantes), 20 (cartes héros, modales), 999 (pastilles).
- Élévations : 0 (à plat), 1 (cartes : ombre très douce), 2 (survol, menus), 3 (modales, overlay de drag). Ombres différentes selon le niveau, teintées de bleu en clair, remplacées en sombre par contraste de surface + lueur.
- Bordures : 1 px, couleur `--border`.

## 8. Projets
| Projet | id | Logo | Accent discret |
|---|---|---|---|
| SAFYA | `safya` | `/logos/safya.png` | vert `#1F5F4D` |
| TRIAGE+ | `triage` | `/logos/triage-plus.png` | orange `#F87000` |
| RacTac | `rpm` | `/logos/ractac.png` | jaune `#F0B030` |
L'accent ne sert qu'en petites touches (liseré, pastille, halo). Logos jamais recolorés ni déformés (`object-contain`, hauteur fixe) ; en sombre, posés sur une pastille claire si besoin. Nouveau projet futur sans logo : monogramme élégant.

## 9. Phases (frise, badges, graphiques)
Challenge `#23358E` · Discovery `#5B4BC4` · Validation `#0B7A80` · MVP `#2E7D32` · Launch `#A26806` · Grow `#C0400F` · Scale `#A3195B`. Le libellé de chaque segment est blanc. Launch n'utilise pas l'orange de marque `#E79409` comme fond : le blanc dessus est à 2,4, donc le segment est assombri jusqu'à `#A26806` (blanc à 4,6). L'orange `#E79409` reste la couleur d'accent, jamais un fond de texte blanc.

## 10. Motif signature : le ruban Haskè
Les rubans ondulés du logo (bleu, orange, vert) deviennent le fil conducteur, avec parcimonie :
- En-tête du dashboard : rubans SVG très légers en arrière-plan, ondulation lente (12–20 s).
- Premier chargement : le ruban se dessine (`pathLength` 0→1), puis le logo apparaît.
- États vides et séparateurs importants : fragment de ruban.
- Statique avec `prefers-reduced-motion`.

## 11. Motion system
| Token | Durée | Usage |
|---|---|---|
| `micro` | 120–180 ms | survol, appui, bascule |
| `standard` | 180–280 ms | onglets, filtres, menus, pages |
| `panel` | 250–350 ms | sidebar, tiroirs, modales |
| `reveal` | 350–550 ms | première entrée du dashboard |
Courbe par défaut `[0.22, 1, 0.36, 1]`. Ressorts (`stiffness 300–420`, `damping 30–36`) pour tout ce qui est physique : drag-and-drop, réorganisation, indicateurs actifs. Sorties plus rapides que les entrées. Adapter au contexte plutôt qu'appliquer aveuglément.

Règles : `transform` et `opacity` uniquement ; pas de layout thrashing ; `prefers-reduced-motion` → fondus seuls ; aucune animation ne bloque une action ; l'introduction du dashboard ne se rejoue pas à chaque rafraîchissement de données (une fois par session).

### Dashboard (première entrée)
Header révélé délicatement → KPI en léger décalage (40–60 ms) → compteurs animés depuis une valeur de départ adaptée (@number-flow/react) → graphiques révélés progressivement → cartes projet en séquence → activité récente.

### Sidebar
Ouverture/fermeture fluide (largeur via `layout`, libellés en fondu coordonné avec les icônes), indicateur actif qui glisse (`layoutId`), survol subtil, tooltips soignés en mode compact, groupes lisibles.

### Cartes projet
Logo réel, nom, phase, indicateurs utiles, progression, actions. Élévation légère et halo d'accent au survol, `whileTap` 0,98, progression animée, transition partagée vers la page détaillée (`layoutId` sur logo et titre). Pas de rotation 3D ni de gadget.

### Kanban (dnd-kit)
Drag overlay élégant (élévation 3, légère inclinaison ≤ 2°), réorganisation animée, zones de dépôt lisibles, colonne Bloqué clairement identifiable, toast de confirmation, retour visuel et annulation si la sauvegarde échoue (mise à jour optimiste réversible), navigation clavier complète.

### Tableaux et formulaires
Focus visible raffiné (anneau 2 px `--primary-fg` + décalage), états loading/error/success, survol de ligne discret, filtres animés, menus contextuels fluides, confirmation des actions sensibles, skeletons qui reprennent la structure réelle de la page.

### Modales
Backdrop subtil, scale 0,96→1 + translation 8–12 px, entrée/sortie coordonnées, piège de focus, Échap, retour du focus à l'élément d'origine.

### Célébrations
OKR à 100 % ou tâche terminée : bref éclat orange local. Pas de confettis plein écran.

## 12. Dashboard
A. Header : titre, date (Dakar), contexte du jour, actions rapides, notifications, profil, sur fond de ruban.
B. Synthèse KPI : projets actifs, tâches, taux de réalisation, blocages, échéances.
C. Projets : SAFYA, TRIAGE+, RacTac (cartes de la section 11).
D. Performance : graphiques KPI et OKR, tendances, objectifs atteints, retards.
E. Travail : mes tâches, priorités, activité récente, prochaines échéances.
F. Journal : entrée du jour, historique, réunions et décisions importantes.

## 13. Responsive
Desktop : dashboard riche, sidebar élégante. Tablette : colonnes adaptées, sidebar compacte. Mobile : navigation en tiroir ou barre inférieure, cartes lisibles, aucun débordement horizontal non voulu, cibles tactiles ≥ 44 px, formulaires ergonomiques, informations prioritaires en premier.
Tester à 375, 768, 1280 et 1440 px.

## 14. Icônes et états
Lucide, 18 px, trait 1,75. États vides : pictogramme + fragment de ruban + phrase utile + action. Chaque module : loading, empty, success, error, unauthorized.
