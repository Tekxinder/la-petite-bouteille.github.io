# Atelier Actualités

Application statique de recherche d’articles francophones et de composition d’une une 600 × 800 à partir du template Journal.

- La recherche utilise l’API NewsData.io et filtre les résultats avec `language=fr`. Elle n’envoie pas le paramètre `timeframe`, qui peut nécessiter un forfait supérieur.
- Le thème est envoyé comme filtre `category`; un mot-clé facultatif est combiné avec ce filtre. Les recherches personnalisées sans thème utilisent seulement le mot-clé. NewsData.io documente l’usage combiné de `q`, `category` et `language` dans l’endpoint Latest.
- Une clé API est préconfigurée et le champ de réglage est rempli automatiquement. Vous pouvez la remplacer dans « Configuration de la recherche » ; une clé personnalisée est conservée dans le stockage local du navigateur.
- L’application étant statique, la clé par défaut est lisible dans le JavaScript publié. Pour un site public, utilisez une clé dédiée et limitée ou un relais serveur pour la garder privée.
- Le résumé reste à écrire ou corriger après lecture de l’article source ; l’application peut préremplir la description fournie par l’API.
- Les images distantes sont tramées si leur hébergeur autorise l’export canvas. Sinon, utilisez le champ d’import local.
- La trame applique visuellement un écran losange à 45° de densité correspondant aux réglages affichés (53 lpi, entrée 96, sortie 25). L’export reste un PNG de 600 × 800 pixels.
- Les trois polices FFF sont chargées depuis `assets/fonts/` pour l’interface et le visuel.
- Ouvrir depuis le hub ou servir le dossier avec un hébergeur statique.
