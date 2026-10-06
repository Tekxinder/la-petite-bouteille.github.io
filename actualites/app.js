const TEMPLATE_URL = 'assets/Journal Template.png';
const IMAGE_PROXY = 'https://wsrv.nl/';
const PHOTO_BOX = { x: 170, y: 171, width: 354, height: 359 };
const DOT_CELL = 4.2; // close visual approximation of a 53 lpi, 45° diamond screen at this canvas size
const canvas = document.querySelector('#poster');
const ctx = canvas.getContext('2d');
const state = { template: null, photo: null, photoCanvas: null, photoId: 0, imageUrl: null, brightness: 100, contrast: 100 };
const fields = {
  title: document.querySelector('#articleTitle'), summary: document.querySelector('#articleSummary'),
  category: document.querySelector('#articleCategory'), date: document.querySelector('#articleDate'),
  source: document.querySelector('#articleSource')
};

function formatToday() {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(new Date());
}

document.querySelector('#todayHeader').textContent = formatToday();

function setMessage(element, message, error = false) {
  element.textContent = message;
  element.classList.toggle('error', error);
}

function loadImage(url, useCors = false) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (useCors) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image non disponible ou accès distant refusé.'));
    image.src = url;
  });
}

function imageToHalftone(image, brightness = 100, contrast = 100) {
  const { width, height } = PHOTO_BOX;
  const source = document.createElement('canvas');
  source.width = width;
  source.height = height;
  const sourceCtx = source.getContext('2d', { willReadFrequently: true });
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  let sx = 0, sy = 0, sw = image.naturalWidth, sh = image.naturalHeight;
  if (sourceRatio > targetRatio) {
    sw = image.naturalHeight * targetRatio;
    sx = (image.naturalWidth - sw) / 2;
  } else {
    sh = image.naturalWidth / targetRatio;
    sy = (image.naturalHeight - sh) / 2;
  }
  sourceCtx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
  // Reading image pixels also verifies that a remote photo grants canvas export access.
  const pixels = sourceCtx.getImageData(0, 0, width, height).data;
  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const out = output.getContext('2d');
  out.fillStyle = '#fdf9f2';
  out.fillRect(0, 0, width, height);
  const angle = Math.PI / 4;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const extent = Math.hypot(width, height);
  for (let gy = -extent; gy <= extent; gy += DOT_CELL) {
    for (let gx = -extent; gx <= extent; gx += DOT_CELL) {
      const cx = width / 2 + gx * cos - gy * sin;
      const cy = height / 2 + gx * sin + gy * cos;
      const px = Math.round(cx), py = Math.round(cy);
      if (px < 0 || py < 0 || px >= width || py >= height) continue;
      const offset = (py * width + px) * 4;
      const originalLuminance = (pixels[offset] * .299 + pixels[offset + 1] * .587 + pixels[offset + 2] * .114) / 255;
      const luminance = Math.max(0, Math.min(1, ((originalLuminance - .5) * (contrast / 100) + .5) * (brightness / 100)));
      const diameter = DOT_CELL * Math.sqrt(1 - luminance) * 1.35;
      if (diameter < .6) continue;
      const radius = diameter / 2;
      out.beginPath();
      out.moveTo(cx, cy - radius);
      out.lineTo(cx + radius, cy);
      out.lineTo(cx, cy + radius);
      out.lineTo(cx - radius, cy);
      out.closePath();
      out.fillStyle = '#28231d';
      out.fill();
    }
  }
  return output;
}

async function usePhoto(url, cors = true) {
  const photoId = ++state.photoId;
  state.photo = null;
  state.photoCanvas = null;
  drawPoster();
  try {
    let image;
    let halftoneCanvas;
    let usedProxy = false;
    try {
      image = await loadImage(url, cors);
      halftoneCanvas = imageToHalftone(image, state.brightness, state.contrast);
    } catch (directError) {
      if (!cors) throw directError;
      const proxiedUrl = new URL(IMAGE_PROXY);
      proxiedUrl.searchParams.set('url', url);
      proxiedUrl.searchParams.set('output', 'png');
      image = await loadImage(proxiedUrl.href, true);
      halftoneCanvas = imageToHalftone(image, state.brightness, state.contrast);
      usedProxy = true;
    }
    if (photoId !== state.photoId) return;
    state.photoCanvas = halftoneCanvas;
    state.photo = image;
    setMessage(document.querySelector('#photoStatus'), usedProxy
      ? 'Photo tramée via le relais d’image · losange · 53 lignes/pouce · 45°'
      : 'Photo tramée · losange · 53 lignes/pouce · 45°');
  } catch (error) {
    if (photoId !== state.photoId) return;
    setMessage(document.querySelector('#photoStatus'), cors
      ? 'Cette image reste inaccessible même via le relais. Importez-la manuellement pour l’intégrer.'
      : 'Impossible de traiter cette image locale. Essayez un autre fichier.', true);
  }
  drawPoster();
}

function updateImageAdjustments() {
  const brightnessSlider = document.querySelector('#brightnessSlider');
  const contrastSlider = document.querySelector('#contrastSlider');
  state.brightness = Number(brightnessSlider.value);
  state.contrast = Number(contrastSlider.value);
  document.querySelector('#brightnessValue').value = `${state.brightness} %`;
  document.querySelector('#contrastValue').value = `${state.contrast} %`;
  if (state.photo) {
    state.photoCanvas = imageToHalftone(state.photo, state.brightness, state.contrast);
    drawPoster();
  }
}
function wrapText(text, maxWidth, font, maxLines = Infinity) {
  ctx.font = font;
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let line = '';
  let truncated = false;
  for (const word of words) {
    let remaining = word;
    while (remaining) {
      const candidate = line ? `${line} ${remaining}` : remaining;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        remaining = '';
        continue;
      }
      if (line) {
        lines.push(line);
        line = '';
        if (lines.length >= maxLines) { truncated = true; break; }
        continue;
      }
      // Split an unusually long unbroken word instead of letting it spill outside the paper.
      let cut = '';
      for (const character of remaining) {
        if (ctx.measureText(cut + character).width > maxWidth) break;
        cut += character;
      }
      if (!cut) cut = remaining[0];
      lines.push(cut);
      remaining = remaining.slice(cut.length);
      if (remaining) {
        if (lines.length >= maxLines) { truncated = true; break; }
      } else if (lines.length >= maxLines) {
        line = '';
      }
    }
    if (truncated) break;
  }
  if (line) {
    if (lines.length < maxLines) lines.push(line);
    else truncated = true;
  }
  if (truncated && lines.length) {
    let last = lines.length - 1;
    let final = lines[last];
    while (final.length && ctx.measureText(`${final}…`).width > maxWidth) final = final.slice(0, -1);
    lines[last] = `${final.trimEnd()}…`;
  }
  return lines;
}

function fitFontSize(text, family, maxWidth, startingSize, minSize = 10) {
  for (let size = startingSize; size >= minSize; size--) {
    ctx.font = `${size}px "${family}"`;
    if (ctx.measureText(text).width <= maxWidth) return size;
  }
  return minSize;
}

function drawPhotoBox() {
  if (state.photoCanvas) {
    ctx.drawImage(state.photoCanvas, PHOTO_BOX.x, PHOTO_BOX.y);
  } else {
    ctx.fillStyle = '#e7dfd3';
    ctx.fillRect(PHOTO_BOX.x, PHOTO_BOX.y, PHOTO_BOX.width, PHOTO_BOX.height);
    ctx.strokeStyle = '#28231d';
    ctx.lineWidth = 2;
    ctx.strokeRect(PHOTO_BOX.x + 1, PHOTO_BOX.y + 1, PHOTO_BOX.width - 2, PHOTO_BOX.height - 2);
    ctx.fillStyle = '#7d7367';
    ctx.textAlign = 'center';
    ctx.font = '15px "FFF Source", sans-serif';
    ctx.fillText('PHOTO DE L’ARTICLE', PHOTO_BOX.x + PHOTO_BOX.width / 2, PHOTO_BOX.y + PHOTO_BOX.height / 2);
    ctx.textAlign = 'left';
  }
}

function drawPoster() {
  if (!state.template) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(state.template, 0, 0, 600, 800);

  drawPhotoBox();

  const date = fields.date.value.trim() || formatToday();
  ctx.fillStyle = '#28231d';
  ctx.textAlign = 'right';
  ctx.font = '10px "FFF Source", sans-serif';
  //ctx.fillText(date.toLocaleUpperCase('fr-FR'), 535, 113, 91);

  const category = fields.category.value || 'Actualités';
  const categoryText = category.toLocaleUpperCase('fr-FR');
  ctx.save();
  ctx.translate(545, 174);
  ctx.rotate(Math.PI / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const categorySize = fitFontSize(categoryText, 'FFF Head', 345, 20, 10);
  ctx.font = `${categorySize}px "FFF Head", serif`;
  ctx.fillText(categoryText, 0, 0);
  ctx.restore();

  // Paper label overlaps the lower-left corner of the fixed upper-right photograph.
  ctx.fillStyle = '#fdf9f2';
  ctx.fillRect(72, 429, 258, 110);
  ctx.fillStyle = '#28231d';
  ctx.textAlign = 'left';
  const title = fields.title.value.trim() || 'Votre titre ici';
  const titleBox = { x: 79, y: 450, width: 238, height: 87 };
  let titleSize = 22;
  let titleLines = [];
  let titleLineHeight = 0;
  for (; titleSize >= 12; titleSize--) {
    const font = `${titleSize}px "FFF Head", serif`;
    titleLines = wrapText(title, titleBox.width, font, 4);
    ctx.font = font;
    const metrics = ctx.measureText('Ag');
    titleLineHeight = Math.max(titleSize, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) + 1;
    if (titleLineHeight * titleLines.length <= titleBox.height) break;
  }
  ctx.font = `${titleSize}px "FFF Head", serif`;
  ctx.textBaseline = 'top';
  titleLines.forEach((line, index) => ctx.fillText(line, titleBox.x, titleBox.y + index * titleLineHeight, titleBox.width));

  const summary = fields.summary.value.trim();
  ctx.fillStyle = summary ? '#28231d' : '#91877a';
  const summaryText = summary || 'Rédigez ici le résumé de votre article.';
  const summaryFont = '12px "FFF Body", sans-serif';
  const summaryLines = wrapText(summaryText, 448, summaryFont, 9);
  ctx.font = summaryFont;
  ctx.textBaseline = 'top';
  summaryLines.forEach((line, index) => ctx.fillText(line.toLocaleUpperCase('fr-FR'), 78, 557 + index * 15, 450));

  ctx.fillStyle = '#28231d';
  ctx.font = '10px "FFF Source", sans-serif';
  const sourceLabel = fields.source.value.trim() ? `SOURCE · ${fields.source.value.trim()}` : 'SOURCE · À RENSEIGNER';
  const footerText = `${sourceLabel.toLocaleUpperCase('fr-FR')} · ${date.toLocaleUpperCase('fr-FR')}`;
  ctx.font = `${fitFontSize(footerText, 'FFF Source', 450, 10, 7)}px "FFF Source", sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(footerText, 78, 741, 450);
}

function readDateForArticle() {
  const dateInput = fields.date;
  if (!dateInput.value) dateInput.value = formatToday();
}

Object.values(fields).forEach(field => field.addEventListener('input', drawPoster));
fields.category.addEventListener('change', drawPoster);
document.querySelector('#brightnessSlider').addEventListener('input', updateImageAdjustments);
document.querySelector('#contrastSlider').addEventListener('input', updateImageAdjustments);
document.querySelector('#photoFile').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (state.imageUrl) URL.revokeObjectURL(state.imageUrl);
  state.imageUrl = URL.createObjectURL(file);
  usePhoto(state.imageUrl, false);
});

loadImage(TEMPLATE_URL).then(async template => {
  state.template = template;
  await Promise.all([
    document.fonts.load('24px "FFF Head"'),
    document.fonts.load('12px "FFF Body"'),
    document.fonts.load('10px "FFF Source"')
  ]);
  readDateForArticle();
  drawPoster();
}).catch(error => {
  console.error(error);
  setMessage(document.querySelector('#photoStatus'), 'Le template Journal.png est introuvable dans les assets.', true);
});
