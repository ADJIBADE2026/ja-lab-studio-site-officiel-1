# JA Lab Studio, site officiel

JA Lab Studio est une entreprise de photographie basée à Rimouski qui met l’accent sur la mise en valeur des personnes, des émotions et des moments importants. Notre objectif est de produire des images mémorables et soignées.

Site : <https://www.jalabstudio.com> (hébergé sur GitHub Pages)

## Contenu du site

| Fichier | Rôle |
| --- | --- |
| `index.html` | Page principale : accueil, services, portfolio, démarche, à propos, rendez-vous, FAQ, contact |
| `styles.css` | Mise en page et couleurs |
| `script.js` | Menu mobile, visionneuse photo, envoi du formulaire de rendez-vous |
| `merci.html` | Page affichée après une demande envoyée sans JavaScript |
| `confidentialite.html` | Politique de confidentialité |
| `assets/photos/` | Photos du portfolio optimisées (WebP, 800 px et 1600 px) |
| `assets/fonts/` | Polices hébergées sur le site (Cormorant Garamond, Inter) |
| `reservation-agenda/` | Script Google qui ajoute les rendez-vous dans Google Agenda ([guide d’installation](reservation-agenda/INSTALLATION.md)) |

## Rendez-vous

Les demandes du formulaire arrivent à **jalabstudio@gmail.com** :

- **avec Google Agenda** (recommandé) : suivez [reservation-agenda/INSTALLATION.md](reservation-agenda/INSTALLATION.md), puis collez l’URL du script dans `APPS_SCRIPT_URL` en haut de `script.js` ;
- **sans agenda** : envoi par courriel via FormSubmit. À la première demande, cliquez sur le lien « Activate Form » reçu par courriel.

## Ajouter une photo au portfolio

1. Exportez la photo en WebP en deux tailles (800 px et 1600 px de large) et placez-les dans `assets/photos/`.
2. Dans `index.html`, copiez un bloc `<a class="gallery-item" …>` de la section `#portfolio`, puis changez les noms de fichiers, la légende (`data-caption`), le texte `alt` et les dimensions (`width`, `height`).
