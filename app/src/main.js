// Neon Coast Cover Studio — editor wiring.
// Loads the user's photos, binds every control, keeps a live preview and
// exports all three post sizes in one click. Photos never leave the machine.

import { LAYOUTS, GRADES, SIZES, defaultState, renderCover, layoutPanels } from './cover.js';
import { applyShotQuery } from './shots.js';

const $ = (id) => document.getElementById(id);
const state = defaultState();
const preview = $('preview');
const history = [];
let historyIndex = -1;
let currentSize = SIZES[0];

function snapshot() {
  return JSON.stringify({
    layout: state.layout, grade: state.grade, title: state.title,
    subtitle: state.subtitle, panels: state.panels,
    grain: state.grain, vignette: state.vignette,
  });
}

function pushHistory() {
  history.splice(historyIndex + 1);
  history.push(snapshot());
  if (history.length > 40) history.shift();
  historyIndex = history.length - 1;
  $('undoBtn').disabled = historyIndex <= 0;
  $('redoBtn').disabled = true;
}

function restoreHistory(json) {
  const s = JSON.parse(json);
  state.layout = s.layout; state.grade = s.grade; state.title = s.title;
  state.subtitle = s.subtitle; state.panels = s.panels;
  state.grain = s.grain; state.vignette = s.vignette;
  syncControls();
  draw();
}

function draw() {
  // In shot-cover mode the editor chrome is gone; the shot canvas paints itself.
  if (document.body.classList.contains('shot-cover')) return;
  renderCover(preview, state, currentSize);
  const label = $('sizeLabel');
  if (label) label.textContent = `${currentSize.name} — ${currentSize.w} × ${currentSize.h}`;
}

function syncControls() {
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('grainRange').value = Math.round(state.grain * 100);
  $('vignetteRange').value = Math.round(state.vignette * 100);
  document.querySelectorAll('#layoutRow button').forEach(b => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('#gradeRow button').forEach(b => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('#sizeRow button').forEach(b => {
    b.classList.toggle('active', b.dataset.size === currentSize.id);
  });
  updatePanelControls();
}

function updatePanelControls() {
  const spec = state.panels[state.selectedPanel];
  $('panelLabel').textContent = `Panel ${state.selectedPanel + 1} of ${layoutPanels(state.layout, 1, 1).length}`;
  $('photoSelect').value = String(spec.photo);
  $('zoomRange').value = Math.round(spec.zoom * 100);
  $('panXRange').value = Math.round(spec.panX * 100);
  $('panYRange').value = Math.round(spec.panY * 100);
  $('zoomVal').textContent = `${Math.round(spec.zoom * 100)}%`;
}

function loadImageFile(file, slot) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        state.photos[slot] = img;
        renderPhotoSlots();
        draw();
        resolve(true);
      };
      img.onerror = () => resolve(false);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function loadSample(url, slot) {
  const img = new Image();
  img.onload = () => {
    state.photos[slot] = img;
    renderPhotoSlots();
    draw();
  };
  img.src = url;
}

function renderPhotoSlots() {
  const wrap = $('photoSlots');
  wrap.innerHTML = '';
  state.photos.forEach((img, i) => {
    const slot = document.createElement('div');
    slot.className = 'slot' + (img ? ' filled' : '');
    slot.textContent = img ? `Photo ${i + 1} ✓` : `Photo ${i + 1} — empty`;
    slot.title = img ? 'Click to load a different photo here' : 'Click to add a photo';
    slot.addEventListener('click', () => {
      pendingSlot = i;
      $('fileInput').click();
    });
    wrap.appendChild(slot);
  });
}

let pendingSlot = 0;

function downloadCanvas(canvas, filename) {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function exportAll() {
  const off = document.createElement('canvas');
  const base = state.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'neon-coast';
  SIZES.forEach((size) => {
    renderCover(off, state, size);
    downloadCanvas(off, `${base}-${size.w}x${size.h}.png`);
  });
  $('exportNote').textContent = `Exported 3 PNGs — ${SIZES.map(s => `${s.w}×${s.h}`).join(', ')}.`;
}

function buildPickers() {
  const layoutRow = $('layoutRow');
  LAYOUTS.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = l.id;
    b.textContent = l.name;
    b.title = l.hint;
    b.addEventListener('click', () => {
      state.layout = l.id;
      state.selectedPanel = 0;
      pushHistory();
      syncControls();
      draw();
    });
    layoutRow.appendChild(b);
  });
  const gradeRow = $('gradeRow');
  GRADES.forEach((g) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = g.id;
    b.textContent = g.name;
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = `linear-gradient(135deg, rgb(${g.mid.join(',')}), rgb(${g.high.join(',')}))`;
    b.prepend(dot);
    b.addEventListener('click', () => {
      state.grade = g.id;
      pushHistory();
      syncControls();
      draw();
    });
    gradeRow.appendChild(b);
  });
  const sizeRow = $('sizeRow');
  SIZES.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.size = s.id;
    b.textContent = `${s.name} ${s.w}×${s.h}`;
    b.addEventListener('click', () => {
      currentSize = s;
      preview.style.aspectRatio = `${s.w} / ${s.h}`;
      syncControls();
      draw();
    });
    sizeRow.appendChild(b);
  });
}

function bindControls() {
  $('fileInput').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const f of files) {
      const slot = state.photos.findIndex(p => !p);
      await loadImageFile(f, slot === -1 ? pendingSlot : slot);
    }
    e.target.value = '';
  });
  $('sampleBtn').addEventListener('click', () => {
    loadSample('samples/boulevard.jpg', 0);
    loadSample('samples/pier.jpg', 1);
  });
  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; draw(); });
  $('titleInput').addEventListener('change', pushHistory);
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; draw(); });
  $('subtitleInput').addEventListener('change', pushHistory);
  $('photoSelect').addEventListener('change', (e) => {
    state.panels[state.selectedPanel].photo = Number(e.target.value);
    pushHistory();
    draw();
  });
  $('zoomRange').addEventListener('input', (e) => {
    state.panels[state.selectedPanel].zoom = Number(e.target.value) / 100;
    updatePanelControls();
    draw();
  });
  $('zoomRange').addEventListener('change', pushHistory);
  $('panXRange').addEventListener('input', (e) => {
    state.panels[state.selectedPanel].panX = Number(e.target.value) / 100;
    draw();
  });
  $('panXRange').addEventListener('change', pushHistory);
  $('panYRange').addEventListener('input', (e) => {
    state.panels[state.selectedPanel].panY = Number(e.target.value) / 100;
    draw();
  });
  $('panYRange').addEventListener('change', pushHistory);
  $('grainRange').addEventListener('input', (e) => { state.grain = Number(e.target.value) / 100; draw(); });
  $('grainRange').addEventListener('change', pushHistory);
  $('vignetteRange').addEventListener('input', (e) => { state.vignette = Number(e.target.value) / 100; draw(); });
  $('vignetteRange').addEventListener('change', pushHistory);
  $('exportBtn').addEventListener('click', exportAll);
  $('undoBtn').addEventListener('click', () => {
    if (historyIndex <= 0) return;
    historyIndex -= 1;
    restoreHistory(history[historyIndex]);
    $('undoBtn').disabled = historyIndex <= 0;
    $('redoBtn').disabled = false;
  });
  $('redoBtn').addEventListener('click', () => {
    if (historyIndex >= history.length - 1) return;
    historyIndex += 1;
    restoreHistory(history[historyIndex]);
    $('undoBtn').disabled = false;
    $('redoBtn').disabled = historyIndex >= history.length - 1;
  });
  preview.addEventListener('click', (e) => {
    const rect = preview.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const panels = layoutPanels(state.layout, 1, 1);
    const hit = panels.findIndex(p => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
    if (hit >= 0) {
      state.selectedPanel = hit;
      updatePanelControls();
      draw();
    }
  });
}

buildPickers();
bindControls();
renderPhotoSlots();
syncControls();
pushHistory();
applyShotQuery({ state, loadSample, draw, setSize: (s) => { currentSize = s; preview.style.aspectRatio = `${s.w} / ${s.h}`; } });
draw();
