// Neon Coast Cover Studio — screenshot scenes.
// Reads ?shot=cover|editor from the URL so headless Chrome can capture the
// app's own renders: a full-frame exported cover, or the editor with a photo
// loaded. Only active when a shot query is present; normal use is untouched.

import { SIZES, renderCover } from './cover.js';

export function applyShotQuery({ state, loadSample, draw, setSize }) {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (!shot) return;
  const caption = q.get('caption');
  if (caption) state.title = caption;
  const subtitle = q.get('subtitle');
  if (subtitle) state.subtitle = subtitle;
  const layout = q.get('layout');
  if (layout) state.layout = layout;
  const grade = q.get('grade');
  if (grade) state.grade = grade;
  const photo = q.get('photo') || 'boulevard';
  loadSample(`samples/${photo}.jpg`, 0);
  loadSample(`samples/${photo === 'boulevard' ? 'pier' : 'boulevard'}.jpg`, 1);
  // Fill every panel from the two loaded photos so no shot shows an
  // empty placeholder panel.
  state.panels.forEach((p, i) => { p.photo = i % 2; });

  if (shot === 'cover') {
    // Full-frame cover: hide the editor chrome, size the canvas to the
    // requested export size and draw the cover at full resolution.
    const sizeId = q.get('size') || 'square';
    const size = SIZES.find(s => s.id === sizeId) || SIZES[0];
    const w = Number(q.get('w')) || size.w;
    const h = Number(q.get('h')) || size.h;
    document.body.classList.add('shot-cover');
    const stage = document.getElementById('stage');
    stage.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'shotCanvas';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.display = 'block';
    stage.appendChild(canvas);
    const paint = () => {
      if (!state.photos[0]) { requestAnimationFrame(paint); return; }
      renderCover(canvas, state, { w, h });
      document.title = 'cover ready';
    };
    requestAnimationFrame(paint);
  } else if (shot === 'editor') {
    // Editor view with a photo loaded: the controls stay visible.
    document.body.classList.add('shot-editor');
    setSize(SIZES.find(s => s.id === (q.get('size') || 'square')) || SIZES[0]);
    const paint = () => {
      if (!state.photos[0]) { requestAnimationFrame(paint); return; }
      draw();
      document.title = 'editor ready';
    };
    requestAnimationFrame(paint);
  }
}
