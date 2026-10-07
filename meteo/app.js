const cities = [
  { name: 'Paris', lat: 48.8566, lon: 2.3522, fixed: true },
  { name: 'Marseille', lat: 43.2965, lon: 5.3698 },
  { name: 'Lyon', lat: 45.764, lon: 4.8357 },
  { name: 'Bordeaux', lat: 44.8378, lon: -.5792 },
  { name: 'Brest', lat: 48.3904, lon: -4.4861 },
  { name: 'Lille', lat: 50.6292, lon: 3.0573 },
  { name: 'Strasbourg', lat: 48.5734, lon: 7.7521 },
  { name: 'Nantes', lat: 47.2184, lon: -1.5536 },
  { name: 'Toulouse', lat: 43.6047, lon: 1.4442 },
  { name: 'Nice', lat: 43.7102, lon: 7.262 },
  { name: 'Montpellier', lat: 43.6108, lon: 3.8767 },
  { name: 'Rennes', lat: 48.1173, lon: -1.6778 },
  { name: 'Dijon', lat: 47.322, lon: 5.0415 },
  { name: 'Clermont-Ferrand', lat: 45.7772, lon: 3.087 },
  { name: 'Ajaccio', lat: 41.9192, lon: 8.7386 }
];
const preset = ['Marseille', 'Paris', 'Strasbourg', 'Bordeaux', 'Brest'];
const icons = {
  sun: 'Soleil.png', partly: 'Soleil-nuageux.png', rain: 'Pluie.png',
  storm: 'Orages.png', snow: 'Neige.png', mixed: 'Soleil-nuageux-pluie.png', cloud: 'Nuage.png'
};
const canvas = document.querySelector('#weatherCanvas');
const ctx = canvas.getContext('2d');
const downloadButton = document.querySelector('#downloadCanvas');
function saveCanvas() {
  try {
    const link = document.createElement('a');
    const date = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date());
    link.download = 'meteo-france-' + date + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Weather canvas save failed.', error);
    setStatus('Impossible de sauvegarder le canevas en PNG.', true);
  }
}

downloadButton.addEventListener('click', saveCanvas);
const statusEl = document.querySelector('#status');
const state = { selected: new Set(preset), weather: new Map(), images: {}, outlines: {}, requestId: 0, testMode: false };
const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
});
const dateText = dateFmt.format(new Date());
const headerDateText = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
document.querySelector('#todayHeader').textContent = headerDateText;

function makeChoices() {
  const root = document.querySelector('#cityList');
  root.replaceChildren();
  cities.forEach(city => {
    const label = document.createElement('label');
    label.className = `city-choice${city.fixed ? ' is-fixed' : ''}`;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = city.name;
    input.checked = state.selected.has(city.name);
    input.disabled = Boolean(city.fixed) || state.testMode;
    input.setAttribute('aria-label', city.fixed ? 'Paris, ville toujours incluse' : city.name);
    input.addEventListener('change', () => {
      if (input.checked && state.selected.size >= 6) {
        input.checked = false;
        setStatus('Choisissez six villes maximum.', true);
        return;
      }
      if (input.checked) state.selected.add(city.name);
      else state.selected.delete(city.name);
      // Fetch the newly selected city's forecast immediately; it has no marker until data arrives.
      refreshWeather();
    });
    label.append(input, document.createTextNode(city.name));
    if (city.fixed) {
      const tag = document.createElement('small');
      tag.textContent = 'FIXE';
      label.append(tag);
    }
    root.append(label);
  });
}

function setStatus(message, error = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', error);
}

function selectedCities() { return cities.filter(city => state.selected.has(city.name)); }

function weatherKind(code) {
  if (code === 0) return 'sun';
  if (code === 1 || code === 2) return 'partly';
  if (code === 3 || code === 45 || code === 48) return 'cloud';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  if ([80, 81, 82, 56, 57, 66, 67].includes(code)) return 'mixed';
  if (code >= 51 && code <= 67) return 'rain';
  return 'cloud';
}

function weatherDescription(code) {
  return ({ sun: 'Soleil', partly: 'Éclaircies', cloud: 'Nuageux', rain: 'Pluie',
    storm: 'Orages', snow: 'Neige', mixed: 'Averses' })[weatherKind(code)];
}

async function getWeather(city) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FParis&forecast_days=1`;
  const response = await fetch(url);
  if (!response.ok) throw Error(`Open-Meteo (${response.status})`);
  const data = await response.json();
  return {
    code: data.daily.weather_code[0],
    max: Math.round(data.daily.temperature_2m_max[0]),
    min: Math.round(data.daily.temperature_2m_min[0])
  };
}

async function refreshWeather() {
  if (state.testMode) return;
  const requestId = ++state.requestId;
  const places = selectedCities();
  setStatus('Récupération des prévisions du jour…');
  const results = await Promise.allSettled(places.map(async city => [city.name, await getWeather(city)]));
  if (requestId !== state.requestId) return;
  let failures = 0;
  results.forEach(result => {
    if (result.status === 'fulfilled') state.weather.set(...result.value);
    else failures++;
  });
  const time = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date());
  if (failures === places.length) setStatus('Les prévisions ne répondent pas. Réessayez dans un instant.', true);
  else if (failures) setStatus(`Certaines prévisions sont indisponibles · ${time}`, true);
  else setStatus(`Prévisions du jour · ${time}`);
  draw();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadAssets() {
  const names = ['Journal.png', 'Carte.png', ...new Set(Object.values(icons))];
  await Promise.all(names.map(async name => { state.images[name] = await loadImage(`assets/${name}`); }));
  for (const name of new Set(Object.values(icons))) {
    const icon = state.images[name];
    const outline = document.createElement('canvas');
    outline.width = icon.naturalWidth;
    outline.height = icon.naturalHeight;
    const outlineCtx = outline.getContext('2d');
    outlineCtx.drawImage(icon, 0, 0);
    outlineCtx.globalCompositeOperation = 'source-in';
    outlineCtx.fillStyle = '#28231d';
    outlineCtx.fillRect(0, 0, outline.width, outline.height);
    state.outlines[name] = outline;
  }
  await Promise.all([
    document.fonts.load('16px "FFF Urban"'),
    document.fonts.load('16px "FFF Ville"'),
    document.fonts.load('20px "FFF Temperature"')
  ]);
}

function drawCity(city, info, x, y) {
  const safeX = Math.max(72, Math.min(528, x));
  const safeY = Math.max(246, Math.min(634, y));
  const iconName = icons[weatherKind(info.code)];
  const icon = state.images[iconName];
  const outline = state.outlines[iconName];
  const iconX = safeX - 28, iconY = safeY - 39, iconSize = 56;
  // Stamp the silhouette in short, fixed offsets for a crisp, solid contour (no blur).
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#ffffff';
  if (icon) {
    const radius = 2;
    for (let step = 0; step < 16; step++) {
      const angle = step * Math.PI / 8;
      ctx.drawImage(outline, iconX + Math.cos(angle) * radius, iconY + Math.sin(angle) * radius, iconSize, iconSize);
    }
    ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
  }
  ctx.textAlign = 'right';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#28231d';
  ctx.font = '13px "FFF Temperature", monospace';
  ctx.lineWidth = 3.5;
  ctx.strokeText(`${info.max}°`, iconX + iconSize + 7, iconY + iconSize - 2);
  ctx.fillText(`${info.max}°`, iconX + iconSize + 7, iconY + iconSize - 2);
  ctx.textAlign = 'center';
  ctx.font = '15px "FFF Ville", Arial, sans-serif';
  ctx.lineWidth = 4;
  ctx.strokeText(city.name.toLocaleUpperCase('fr-FR'), safeX, safeY + 43, 100);
  ctx.fillText(city.name.toLocaleUpperCase('fr-FR'), safeX, safeY + 43, 100);
  ctx.textAlign = 'left';
  ctx.restore();
}

function draw() {
  drawWeatherCanvas();
}

function drawWeatherCanvas() {
  if (!state.images['Journal.png']) return;
  ctx.clearRect(0, 0, 600, 800);
  ctx.drawImage(state.images['Journal.png'], 0, 0, 600, 800);

  // Date is printed above the map area on the exported 600x800 newspaper.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#28231d';
  ctx.font = '10px "FFF Urban", sans-serif';
   const sourceLabel = `Météo du ${dateText}`;
  const footerText =`${sourceLabel.toLocaleUpperCase('fr-FR')}`;
  ctx.fillText(footerText, 78, 741, 450);

  // Draw the supplied map at full opacity and at a larger size: its original dark ink is unchanged.
  ctx.drawImage(state.images['Carte.png'], 54, 190, 492, 530);

  if (state.testMode) {
    // Fixed sample values cover every icon category; this branch never requests the weather API.
    const samples = [
      { name: 'Brest', code: 0, max: 24, x: 100, y: 285 },
      { name: 'Paris', code: 2, max: 18, x: 235, y: 285 },
      { name: 'Lille', code: 61, max: 12, x: 370, y: 285 },
      { name: 'Strasbourg', code: 95, max: 16, x: 505, y: 285 },
      { name: 'Nantes', code: 71, max: -2, x: 165, y: 555 },
      { name: 'Bordeaux', code: 80, max: 21, x: 300, y: 555 },
      { name: 'Lyon', code: 3, max: 29, x: 435, y: 555 }
    ];
    samples.forEach(sample => drawCity(sample, sample, sample.x, sample.y));
    return;
  }

  // Map coordinates fitted to the larger French silhouette and the poster's printable area.
  for (const city of selectedCities()) {
    const info = state.weather.get(city.name);
    if (!info) continue;
    const x = 72 + (city.lon + 5.5) * 30.5;
    const y = 209 + (51 - city.lat) * 48;
    drawCity(city, info, x, y);
  }
  const shown = selectedCities().filter(city => state.weather.has(city.name)).length;
  if (!shown) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#756d62';
    ctx.font = '16px "FFF Ville", monospace';
    ctx.fillText('Chargement des prévisions…', 300, 455);
  }
}

function choose(names) {
  state.selected = new Set(['Paris', ...names]);
  state.selected = new Set([...state.selected].slice(0, 6));
  makeChoices();
  refreshWeather();
}

document.querySelector('#presetButton').addEventListener('click', () => choose(preset));
document.querySelector('#randomButton').addEventListener('click', () => {
  const pool = cities.filter(city => !city.fixed).sort(() => Math.random() - .5);
  choose(pool.slice(0, 4).map(city => city.name));
});
document.querySelector('#testButton').addEventListener('click', event => {
  state.testMode = !state.testMode;
  state.requestId++;
  const button = event.currentTarget;
  button.setAttribute('aria-pressed', String(state.testMode));
  button.textContent = state.testMode ? '← Revenir à la météo réelle' : '▧ Tester les pictogrammes';
  document.querySelector('#presetButton').disabled = state.testMode;
  document.querySelector('#randomButton').disabled = state.testMode;
  makeChoices();
  if (state.testMode) {
    setStatus('Mode test : 7 villes, 7 pictogrammes, températures fictives (aucun appel API).');
    draw();
  } else {
    setStatus('Retour aux prévisions réelles…');
    draw();
    refreshWeather();
  }
});
makeChoices();
loadAssets().then(() => { draw(); refreshWeather(); }).catch(error => {
  console.error(error);
  setStatus('Un asset météo est introuvable dans le dossier assets.', true);
});
