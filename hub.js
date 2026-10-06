const savedKey = 'la-petite-bouteille-apps-v1';
const defaultApps = [{
  id: 'meteo', title: 'Météo', description: 'Consultez la météo du jour pour les villes de votre choix.', url: './meteo/index.html',
  icon: './meteo/assets/Soleil-nuageux.png', status: 'Disponible', builtin: true
}, {
  id: 'actualites', title: 'Actualités', description: 'Choisissez un thème, trouvez une source et composez votre une de journal.', url: './actualites/index.html',
  status: 'Disponible', builtin: true
}];
const grid = document.querySelector('#appGrid');
const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }).format(new Date());
document.querySelector('#today').textContent = today;
document.querySelector('#year').textContent = new Date().getFullYear();

function readApps() {
  try {
    const saved = JSON.parse(localStorage.getItem(savedKey) || '[]');
    return [...defaultApps, ...(Array.isArray(saved) ? saved : [])];
  } catch { return [...defaultApps]; }
}

function render() {
  grid.replaceChildren();
  for (const app of readApps()) {
    const card = document.createElement('article');
    card.className = 'app-card';
    const link = document.createElement('a');
    link.className = 'app-card-link';
    link.href = app.url;
    if (/^https?:\/\//i.test(app.url)) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }

    const top = document.createElement('div');
    top.className = 'card-top';
    const icon = document.createElement('div');
    icon.className = `app-icon${app.icon ? '' : ' app-icon--custom'}`;
    if (app.icon) {
      const image = document.createElement('img');
      image.src = app.icon;
      image.alt = '';
      icon.append(image);
    } else icon.textContent = app.title.slice(0, 2).toLocaleUpperCase('fr-FR');
    const status = document.createElement('span');
    status.className = 'app-status';
    status.textContent = app.status || 'Ajoutée';
    top.append(icon, status);

    const title = document.createElement('h3');
    title.textContent = app.title;
    const description = document.createElement('p');
    description.textContent = app.description;
    const callToAction = document.createElement('div');
    callToAction.className = 'card-link';
    callToAction.append('Ouvrir l’application');
    const arrow = document.createElement('span');
    arrow.textContent = '↗';
    callToAction.append(arrow);
    link.append(top, title, description, callToAction);
    card.append(link);
    grid.append(card);

    if (!app.builtin) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove-app';
      remove.textContent = 'Retirer';
      remove.setAttribute('aria-label', `Retirer ${app.title} du hub`);
      remove.addEventListener('click', event => {
        const remaining = readApps().filter(item => item.id !== app.id && !item.builtin);
        localStorage.setItem(savedKey, JSON.stringify(remaining));
        render();
      });
      card.append(remove);
    }
  }
}

render();
