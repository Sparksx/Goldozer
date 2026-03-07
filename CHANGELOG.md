# Changelog

Toutes les modifications notables du projet sont documentées ici.
Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [0.7.1] - 2026-03-07

### Ajouté
- Dossier `public/models/` structure pour les modeles 3D externes (.obj/.mtl)
- Sous-dossiers : `vehicles/`, `buildings/`, `nature/`
- Module `src/modelLoader.js` : chargeur OBJ/MTL avec cache

## [0.7.0] - 2026-03-07

### Modifié
- Entrepot et station-service : premier niveau ne coute que de la terre (15)
- Entrepot donne 10 de capacite par niveau (au lieu de 5)
- Un seul point de vente en centre-ville (hors de la route)

### Supprimé
- Depot Sud et route sud supprimés
- Second point de vente supprimé

## [0.6.3] - 2026-03-07

### Ajouté
- Bonus de vitesse +50% lorsque le bulldozer roule sur les routes

## [0.6.2] - 2026-03-07

### Modifié
- Routes refaites en geometrie continue (BufferGeometry) qui epouse le terrain sans coutures visibles

## [0.6.1] - 2026-03-07

### Corrigé
- Les pepites poussees recalculent leur elevation (ne volent plus / ne s'enfoncent plus dans le sol)
- Les routes suivent l'elevation du terrain (ne disparaissent plus sous le sol)

## [0.6.0] - 2026-03-07

### Ajouté
- Ameliorations par batiments : Entrepot (+capacite), Station-service (+vitesse), Marche (+prix vente), Magasin d'equipement (+rayon collecte)
- Batiments multi-niveaux : chaque batiment peut etre ameliore 5 fois avec un cout croissant
- Magasin d'equipement (nouveau batiment fonctionnel)
- Concession agrandie avec showroom vitré, parking et vehicules exposés
- Station-service avec pompes multiples (nombre augmente avec le niveau)
- Artere principale large (14 unites) traversant la ville vers les nouvelles zones
- Trottoirs et marquages au sol sur l'artere principale
- Route sud elargie vers le Depot Sud

### Modifié
- Les ameliorations ne passent plus par un menu mais par la construction de batiments
- Menu d'amelioration supprime (pause et principal)
- Bouton mobile d'amelioration supprime
- Disposition des batiments reorganisee le long de l'artere principale
- Taille des batiments adaptee a leur usage (concession tres grande, station-service avec espace pompes)

### Corrigé
- Les pins/marqueurs de batiments se mettent a jour apres chaque livraison partielle
- Les pancartes de deblocage de zone disparaissent quand la zone est debloquee
- Les arbres ne poussent plus sur l'artere principale

## [0.5.0] - 2026-03-07

### Ajouté
- Système de collision : le bulldozer ne traverse plus les arbres, rochers et bâtiments
- Rebond léger lors des collisions pour éviter de rester bloqué contre les obstacles
- Poussée des pépites de ressources : quand le godet est plein, le bulldozer pousse les pépites au lieu de les ramasser
- Les pépites poussées roulent visuellement dans la direction du bulldozer
- Module `src/collision.js` dédié à la gestion des collisions

### Modifié
- `world.js` enregistre maintenant les positions de tous les obstacles (arbres, rochers, bâtiments, points de vente)
- Boucle de jeu améliorée avec vérification des collisions après chaque déplacement

## [0.4.2] - 2026-03-07

### Corrigé
- Bug critique terrain : le Y local de PlaneGeometry mappait vers -worldZ après rotation, causant une inversion de toutes les zones, montagnes et couleurs du terrain (les mounds étaient au mauvais endroit par rapport aux ressources)
- Raycaster terrain : ajout de `updateMatrixWorld(true)` pour que le raycaster prenne en compte la rotation du mesh sol — `getTerrainHeight()` retourne maintenant la vraie hauteur

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
