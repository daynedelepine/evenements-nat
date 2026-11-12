# Événements Nat : consignes de travail

Projet : site de réservation d'événements privés (Cafés Nat, Tables d'hôtes, ApéroNus). Public averti. Tout en français, vouvoiement.
**Au démarrage, lire `reprise.md` (une page).** Ne pas relire les fichiers déjà lus ; lecture ciblée (Grep, puis Read avec `offset`/`limit`).

## Méthode (reprise de NutriTable Pro)

Questions → proposition → validation → jalon livré testable. Jamais de clé, de mot de passe ni de code 2FA dans la conversation (guider l'utilisateur pas à pas dans les consoles Firebase / Netlify). Tests réels avec des données temporaires, supprimées ensuite. Commits locaux seulement : rien n'est poussé ni déployé sans accord explicite. Signaler hypothèses, dette technique et risques. Ne pas inventer une information manquante.

## Économie de tokens

- **Une session par jalon.** En fin de jalon : mettre à jour `reprise.md` (8 Ko au plus, **remplacer** la section « État » au lieu d'ajouter), puis proposer d'ouvrir une nouvelle session.
- Tests : fichiers concernés pendant le travail, suite complète une fois en fin de jalon, sortie limitée (`tail`, `--reporter=dot`).
- Sorties de commandes filtrées ; captures seulement pour un changement visuel (`scale` 0,5, jamais `fullPage`) ; préférer `read_page` / mesures par script.
- Réponses courtes, sans récapitulatif du plan déjà affiché ; Edit ciblés plutôt que réécritures.

## Règles propres à ce projet

- Données personnelles (noms, téléphones) : jamais lisibles par les visiteurs, seulement par l'admin. Ne pas afficher de données réelles dans les sorties.
- Pas de service payant, pas de domaine personnalisé. Hébergement Netlify (déploiement auto depuis `main` sur GitHub).
- Site privé : `noindex`, pas de SEO.
