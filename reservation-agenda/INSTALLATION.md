# Recevoir les rendez-vous dans Google Agenda

Avec ce réglage, **chaque demande envoyée depuis le site** :

1. crée un évènement jaune **« À confirmer · Type de séance – Nom du client »** dans le Google Agenda de jalabstudio@gmail.com ;
2. envoie un courriel détaillé à jalabstudio@gmail.com (le bouton « Répondre » écrit directement au client) ;
3. envoie au client un courriel de confirmation de réception au nom de JA Lab Studio.

Durée : environ 5 minutes, à faire une seule fois, **sur un ordinateur**.
Aucun mot de passe n'est à partager avec qui que ce soit : tout se fait depuis votre propre compte Google.

---

## Étape 1 : créer le script

1. Connectez-vous à Google avec **jalabstudio@gmail.com**, puis ouvrez <https://script.google.com>.
2. Cliquez sur **Nouveau projet**.
3. En haut à gauche, cliquez sur « Projet sans titre » et renommez-le **Réservations JA Lab Studio**.
4. Effacez tout le code affiché, puis collez **tout le contenu du fichier `Code.gs`** (dans ce dossier).
5. Cliquez sur l'icône **Enregistrer** (disquette).

## Étape 2 : autoriser l'accès à l'agenda et aux courriels

1. Dans la barre du haut, choisissez la fonction **`autoriser`**, puis cliquez sur **Exécuter**.
2. Google affiche « Autorisation requise » : cliquez sur **Examiner les autorisations**, puis choisissez **jalabstudio@gmail.com**.
3. Un message « Google n'a pas validé cette application » apparaît. C'est normal, puisque c'est votre propre script.
   Cliquez sur **Paramètres avancés**, puis sur **Accéder à Réservations JA Lab Studio (non sécurisé)**, puis sur **Autoriser**.

**Test facultatif :** choisissez la fonction **`testerReservation`** et cliquez sur **Exécuter**.
Un évènement « À confirmer · Shooting en studio – TEST » apparaît dans votre agenda dans 7 jours et vous recevez deux courriels.
Supprimez ensuite cet évènement de test.

## Étape 3 : mettre le script en ligne

1. En haut à droite, cliquez sur **Déployer**, puis sur **Nouveau déploiement**.
2. Cliquez sur la roue dentée ⚙ à côté de « Sélectionner le type », puis choisissez **Application Web**.
3. Remplissez :
   - Description : `Site`
   - Exécuter en tant que : **Moi (jalabstudio@gmail.com)**
   - Qui a accès : **Tout le monde**
4. Cliquez sur **Déployer**, puis **copiez l'URL de l'application Web**. Elle ressemble à :
   `https://script.google.com/macros/s/AKfy.../exec`

> Vérification : en ouvrant cette URL dans un navigateur, vous devez voir
> « JA Lab Studio – service de réservation actif. »

## Étape 4 : relier le site au script

1. Ouvrez le fichier **`script.js`** du site (sur GitHub : cliquez sur le fichier, puis sur le crayon ✏️ pour le modifier).
2. Trouvez la ligne :
   ```js
   const APPS_SCRIPT_URL = "";
   ```
3. Collez votre URL entre les guillemets :
   ```js
   const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfy.../exec";
   ```
4. Enregistrez (**Commit changes**). Le site se met à jour en une ou deux minutes.
5. Faites une demande de test sur le site : l'évènement doit apparaître dans Google Agenda et le courriel dans Gmail.

---

## Bon à savoir

- **Horaires dans l'agenda** selon le « moment préféré » choisi par le client :
  Matin = 9 h à 12 h, Après-midi = 13 h à 17 h, Soirée = 18 h à 21 h, Indifférent = journée entière.
  Ces horaires sont indicatifs ; vous pouvez les changer dans `CONFIG.SLOTS` en haut du script.
- **Jaune = à confirmer.** Après avoir confirmé avec le client, renommez l'évènement (retirez « À confirmer ») et changez sa couleur.
- **Protection anti-abus** : champ invisible anti-robots, 3 demandes par heure au maximum par adresse courriel,
  30 par heure au total, et un double clic ne crée pas deux rendez-vous.
- **Si vous modifiez le code du script plus tard**, il faut publier une nouvelle version :
  Déployer, puis Gérer les déploiements, puis le crayon ✏️, puis Version « Nouvelle version », puis Déployer. L'URL ne change pas.

## Tant que cette installation n'est pas faite

Le formulaire fonctionne déjà, mais **par courriel seulement** (service FormSubmit), sans agenda :

1. Après la mise en ligne du site, **faites vous-même une première demande de test**.
2. FormSubmit envoie à jalabstudio@gmail.com un courriel **« Activate Form »** : cliquez sur le bouton pour activer le formulaire
   (regardez dans les indésirables si vous ne le voyez pas).
3. Ensuite, chaque demande arrive dans Gmail. Si elle tombe dans les indésirables, marquez-la « Non spam ».
