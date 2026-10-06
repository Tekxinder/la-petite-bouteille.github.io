# Hub « La Petite Bouteille »

- Accueil du hub : `index.html`
- Première application : `meteo/index.html`
- Deuxième application : `actualites/index.html`

L’Atelier Actualités utilise NewsData.io et filtre les articles en français. Le thème sélectionné applique un filtre de catégorie et un mot-clé facultatif précise la recherche. Une clé API est préconfigurée ; les visiteurs peuvent la remplacer dans l’application, où leur clé est enregistrée dans le navigateur. Le résumé reste éditable afin de pouvoir être corrigé après lecture de l’article source. Les photos qui interdisent l’export canvas peuvent être remplacées par une image importée depuis l’ordinateur.

Pour héberger le hub et les deux applications, publiez tout le contenu du dossier sur un hébergeur de fichiers statiques. La recherche d’articles appelle NewsData.io depuis le navigateur ; la clé par défaut est visible dans le code publié.
