# Changelog

Toutes les modifications notables du projet sont documentées ici.
Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [0.4.1] - 2026-03-07

### Corrigé
- Terrain lisse : remplacement du bruit pseudo-random par un vrai bruit de valeur avec interpolation bilinéaire et smoothstep (fBm multi-octaves)
- Montagnes trop abruptes : mounds élargis (rayon 70) avec falloff smoothstep au lieu de quadratique
- Collines zone 2 : transition douce aux bordures de zone avec blending progressif
- Ressources sous le terrain : pépites placées plus haut (y + size * 0.9) et taille augmentée pour meilleure visibilité
- Émissivité des pépites augmentée (0.3 → 0.4)

## [0.4.0] - 2026-03-07

### Ajouté
- Zone ville centrale avec terrain plat, routes et bâtiments organisés
- Routes (nord-sud et est-ouest) avec marquages au sol dans la ville
- Ressources redessinées en pépites colorées (icosaèdres) avec lueur émissive
- Filons de ressources avec respawn automatique (timer 30-45s)
- Marqueurs visuels au sol pour les filons de ressources
- 4 nouveaux bâtiments WIP : Concession, Fonderie, Station-service, Laboratoire
- Modèles 3D pour tous les nouveaux bâtiments
- Depot Sud (second point de vente au sud de la carte)

### Modifié
- Carte agrandie (MAP_SIZE 200 → 400) pour plus d'espace d'exploration
- Zone 2 (Collines) élargie : z 65-135 → z 90-250 (160 unités)
- Zone 3 (Forêt) élargie : z 145-200 → z 260-400 (140 unités)
- Ressources plus grosses, plus visibles et plus nombreuses
- Couleurs de ressources variées par type (palettes de 4 couleurs)
- Plus d'arbres et de rochers dans toutes les zones
- Ombre et brouillard ajustés pour la carte plus grande

### Corrigé
- Ressources flottantes : meilleur échantillonnage du terrain (raycaster à y=100)
- Arbres et bâtiments enfoncés dans le sol : terrain aplati dans la ville
- Rivière invisible/enterrée : suit maintenant la hauteur du terrain
- Terrain aplati autour de la rivière pour éviter les artefacts visuels
- Pas de ressources dans la zone ville (exclusion par rayon)

## [0.3.0] - 2026-03-07

### Ajouté
- Système de changelog et versioning
- Fichier `CHANGELOG.md` pour tracer l'historique des changements
- Module `src/version.js` centralisant le numéro de version
- Affichage de la version et du changelog dans le menu crédits du jeu
- Instructions dans `CLAUDE.md` pour maintenir le changelog à chaque modification

## [0.2.0] - Date inconnue

### Ajouté
- Système de livraison de ressources aux chantiers et bâtiments
- Zones multiples (Plaine, Collines, Forêt) avec déblocage progressif
- Construction de bâtiments (Maison, Entrepôt, Marché, Scierie) avec effets
- Obstacles de chantier (éboulement, rivière) à débloquer avec des ressources
- Ressources multiples : terre, pierre, bois
- Système d'internationalisation (FR/EN)
- Sauvegarde LocalStorage avec encodage base64

## [0.1.0] - Date inconnue

### Ajouté
- Bulldozer 3D contrôlable (WASD/flèches + joystick mobile)
- Génération procédurale du monde (terrain, arbres, rochers)
- Collecte de ressources et système de vente
- Système d'améliorations (vitesse, capacité, puissance, rayon)
- HUD avec affichage argent et godet
- Menu principal, pause, options son, crédits
- Support mobile (joystick virtuel + boutons tactiles)
