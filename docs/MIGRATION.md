# Rapport de migration

Import exécuté le 2026-10-15T14:04:50.845Z vers le Prisma Postgres configuré dans `.env`. Les fichiers des données d'origine n'ont pas été modifiés.

## Volumes

- projects : 3
- okrs : 9
- tasks : 40
- kpis : 3
- infos : 2
- courses : 1
- anomalies : 1
- notes : 3
- mgmt : 7
- meetings : 1
- summaries : 3
- team : 1
- anomalyfiles : 0

## Comptes créés

- Alexandre Sankara, administrateur, utilisateur par défaut
- Fatoumata Sonko, administratrice, propriétaire des données déjà attribuées à son identifiant
- VA Test, venture architect, compte de test

## Transformations

- `m-1013-06` : le texte importé est « GitHub haskeventures branché au récap du soir (SAFYA, TRIAGE+) ». Le texte source était « GitHub haskeventures branché au récap du soir (SAFYA, TRIAGE+ ; Ecomoto cité hors périmètre) ». Transformation faite dans le script, pas dans le fichier source.

## Fichiers

- Anomalie `r9uav5g0ztze8cojwoui` : référence conservée (Erreur Connexion.jpeg, asset, 19146ec297857495f1508f4c2d05ea1d). Binaire absent : état « fichier indisponible ».

## Contrôles

Les identifiants d'origine sont conservés. Courses et anomalies sont activées sur RacTac seulement. Priorité, responsable et participants sont vides. Les auteurs absents de la source restent vides.
