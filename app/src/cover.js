// Neon Coast Cover Studio — cover engine.
// Draws GTA-poster-style multi-panel cover art onto a 2D canvas from the
// user's photos, a caption, a layout and a colour grade. No network, no
// fonts shipped: lettering uses heavy system sans + script fallbacks.

export const LAYOUTS = [
  { id: 'hero-three', name: 'Hero + Three', hint: 'One big hero panel, three stacked beside it' },
  { id: 'grid', name: 'Four Panel Grid', hint: 'Two by two poster grid' },
  { id: 'full-bleed', name: 'Full Bleed', hint: 'One photo edge to edge, title band over it' },
  { id: 'tilted', name: 'Tilted Snapshot', hint: 'A tilted snapshot over a full-bleed photo' },
  { id: 'triptych', name: 'Triptych', hint: 'Three tall panels side by side' },
  { id: 'duo', name: 'Duo Split', hint: 'Two wide panels, title band across the middle' },
];

export const GRADES = [
  { id: 'sunset', name: 'Vice Sunset', shadow: [38, 12, 64], mid: [214, 74, 110], high: [255, 196, 110], wash: 'rgba(255,120,60,0.16)' },
  { id: 'neon', name: 'Neon Nights', shadow: [8, 10, 42], mid: [196, 40, 180], high: [80, 240, 255], wash: 'rgba(40,220,255,0.14)' },
  { id: 'golden', name: 'Golden Hour', shadow: [52, 30, 8], mid: [224, 148, 52], high: [255, 236, 170], wash: 'rgba(255,190,80,0.18)' },
  { id: 'teal', name: 'Teal Noir', shadow: [6, 26, 34], mid: [24, 120, 130], high: [190, 240, 225], wash: 'rgba(20,180,170,0.14)' },
  { id: 'rose', name: 'Rose Palm', shadow: [48, 10, 44], mid: [226, 84, 130], high: [255, 205, 225], wash: 'rgba(255,90,160,0.15)' },
];

export const SIZES = [
  { id: 'square', name: 'Square post', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait post', w: 1080, h: 1350 },
  { id: 'wide', name: 'Wide post', w: 1920, h: 1080 },
];

// Panel rectangles in unit space (0..1 of the canvas), before the title band.
export function layoutPanels(layoutId, w, h) {
  const band = 0.16; // title band height, fraction of h
  const gap = 0.012;
  const body = { x: 0, y: 0, w: 1, h: 1 - band };
  const inset = (r, g) => ({ x: r.x + g, y: r.y + g, w: r.w - 2 * g, h: r.h - 2 * g });
  switch (layoutId) {
    case 'grid': {
      const hw = body.w / 2, hh = body.h / 2;
      return [
        inset({ x: 0, y: 0, w: hw, h: hh }, gap),
        inset({ x: hw, y: 0, w: hw, h: hh }, gap),
        inset({ x: 0, y: hh, w: hw, h: hh }, gap),
        inset({ x: hw, y: hh, w: hw, h: hh }, gap),
      ];
    }
    case 'full-bleed':
      return [inset(body, 0)];
    case 'tilted':
      return [
        inset(body, 0),
        { x: 0.14, y: 0.10, w: 0.72, h: 0.58, angle: -0.07 },
      ];
    case 'triptych': {
      const pw = body.w / 3;
      return [0, 1, 2].map(i => inset({ x: i * pw, y: 0, w: pw, h: body.h }, gap));
    }
    case 'duo': {
      const hh = body.h / 2;
      return [
        inset({ x: 0, y: 0, w: body.w, h: hh }, gap),
        inset({ x: 0, y: hh, w: body.w, h: hh }, gap),
      ];
    }
    case 'hero-three':
    default: {
      const heroW = 0.62, sideW = 0.38, th = body.h / 3;
      return [
        inset({ x: 0, y: 0, w: heroW, h: body.h }, gap),
        inset({ x: heroW, y: 0, w: sideW, h: th }, gap),
        inset({ x: heroW, y: th, w: sideW, h: th }, gap),
        inset({ x: heroW, y: 2 * th, w: sideW, h: th }, gap),
      ];
    }
  }
}

export function defaultState() {
  return {
    layout: 'hero-three',
    grade: 'sunset',
    title: 'NEON COAST',
    subtitle: 'chase the sunset',
    photos: [null, null, null, null], // HTMLImageElement or null, 4 slots
    // per-panel photo assignment, zoom and pan (index into photos)
    panels: [
      { photo: 0, zoom: 1.0, panX: 0, panY: 0 },
      { photo: 1, zoom: 1.0, panX: 0, panY: 0 },
      { photo: 2, zoom: 1.0, panX: 0, panY: 0 },
      { photo: 3, zoom: 1.0, panX: 0, panY: 0 },
    ],
    selectedPanel: 0,
    grain: 0.5,
    vignette: 0.6,
  };
}

// Cover-fit draw of one photo into a panel rect, with zoom + pan.
function drawPhotoInto(ctx, img, rect, panel, px, py, pw, ph) {
  if (!img) {
    // Empty panel: warm placeholder gradient with a sun disc.
    const g = ctx.createLinearGradient(px, py, px, py + ph);
    g.addColorStop(0, '#3a1c5e');
    g.addColorStop(0.55, '#c94b7c');
    g.addColorStop(1, '#ff9e57');
    ctx.fillStyle = g;
    ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = 'rgba(255,236,170,0.9)';
    ctx.beginPath();
    ctx.arc(px + pw * 0.5, py + ph * 0.42, Math.min(pw, ph) * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `700 ${Math.round(ph * 0.055)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', px + pw / 2, py + ph * 0.72);
    return;
  }
  const scale = Math.max(pw / img.naturalWidth, ph / img.naturalHeight) * (panel?.zoom ?? 1);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = px + (pw - dw) / 2 + (panel?.panX ?? 0) * pw * 0.25;
  const dy = py + (ph - dh) / 2 + (panel?.panY ?? 0) * ph * 0.25;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function gradeOverlay(ctx, grade, w, h) {
  const [sr, sg, sb] = grade.shadow;
  const [mr, mg, mb] = grade.mid;
  const [hr, hg, hb] = grade.high;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `rgba(${hr},${hg},${hb},0.20)`);
  g.addColorStop(0.5, `rgba(${mr},${mg},${mb},0.10)`);
  g.addColorStop(1, `rgba(${sr},${sg},${sb},0.30)`);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = grade.wash;
  ctx.fillRect(0, 0, w, h);
}

let grainTile = null;
function grainPattern() {
  if (grainTile) return grainTile;
  const t = document.createElement('canvas');
  t.width = 128; t.height = 128;
  const c = t.getContext('2d');
  const data = c.createImageData(128, 128);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 90);
    data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; data.data[i + 3] = 255;
  }
  c.putImageData(data, 0, 0);
  grainTile = t;
  return t;
}

function halftoneDots(ctx, x, y, w, h, color, spacing, maxR) {
  ctx.fillStyle = color;
  for (let yy = y; yy < y + h; yy += spacing) {
    for (let xx = x; xx < x + w; xx += spacing) {
      const fade = 1 - (yy - y) / Math.max(1, h);
      const r = Math.max(0.4, maxR * fade);
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawTitleBand(ctx, state, grade, w, h) {
  const bandH = h * 0.16;
  const y0 = h - bandH;
  const g = ctx.createLinearGradient(0, y0, 0, h);
  g.addColorStop(0, '#12081f');
  g.addColorStop(1, '#1d0b33');
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, w, bandH);
  ctx.fillStyle = `rgba(${grade.mid[0]},${grade.mid[1]},${grade.mid[2]},0.9)`;
  ctx.fillRect(0, y0, w, Math.max(3, h * 0.006));
  // Halftone strip on the right of the band.
  halftoneDots(ctx, w * 0.78, y0 + bandH * 0.18, w * 0.2, bandH * 0.64,
    `rgba(${grade.high[0]},${grade.high[1]},${grade.high[2]},0.55)`, Math.max(7, w * 0.012), Math.max(2, w * 0.005));
  // Bold condensed title with a hard offset shadow.
  const titleSize = Math.min(bandH * 0.52, w * 0.075);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const tx = w * 0.035, ty = y0 + bandH * 0.42;
  ctx.font = `900 ${titleSize}px "Arial Black", Impact, "Franklin Gothic Heavy", sans-serif`;
  ctx.fillStyle = '#0a0614';
  ctx.fillText(state.title.toUpperCase(), tx + titleSize * 0.06, ty + titleSize * 0.06);
  const tg = ctx.createLinearGradient(tx, ty - titleSize / 2, tx, ty + titleSize / 2);
  tg.addColorStop(0, '#ffffff');
  tg.addColorStop(0.55, `rgb(${grade.high[0]},${grade.high[1]},${grade.high[2]})`);
  tg.addColorStop(1, `rgb(${grade.mid[0]},${grade.mid[1]},${grade.mid[2]})`);
  ctx.fillStyle = tg;
  ctx.fillText(state.title.toUpperCase(), tx, ty);
  // Neon script subtitle.
  const subSize = Math.min(bandH * 0.30, w * 0.032);
  ctx.font = `italic 700 ${subSize}px "Brush Script MT", "Segoe Script", cursive`;
  ctx.shadowColor = `rgb(${grade.mid[0]},${grade.mid[1]},${grade.mid[2]})`;
  ctx.shadowBlur = subSize * 0.45;
  ctx.fillStyle = `rgb(${grade.high[0]},${grade.high[1]},${grade.high[2]})`;
  ctx.fillText(state.subtitle, tx + titleSize * 0.08, y0 + bandH * 0.82);
  ctx.shadowBlur = 0;
  // Small badge, tucked in the band's bottom-right corner, clear of the
  // halftone strip above it.
  const badge = 'NEON COAST STUDIO';
  ctx.font = `700 ${Math.max(10, w * 0.011)}px Arial, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText(badge, w * 0.965, y0 + bandH * 0.88);
  ctx.textAlign = 'left';
}

export function renderCover(canvas, state, size) {
  const w = size.w, h = size.h;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  const grade = GRADES.find(g => g.id === state.grade) || GRADES[0];
  const panels = layoutPanels(state.layout, w, h);
  const ink = Math.max(2, Math.round(w * 0.004));
  panels.forEach((p, i) => {
    const px = p.x * w, py = p.y * h, pw = p.w * w, ph = p.h * h;
    ctx.save();
    if (p.angle) {
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate(p.angle);
      ctx.translate(-pw / 2, -ph / 2);
    } else {
      ctx.translate(px, py);
    }
    const spec = state.panels[i] || { photo: i, zoom: 1, panX: 0, panY: 0 };
    const img = state.photos[spec.photo] || null;
    drawPhotoInto(ctx, img, p, spec, 0, 0, pw, ph);
    // Inked poster frame: dark outer stroke + thin light inner line.
    ctx.lineWidth = ink;
    ctx.strokeStyle = '#0d0716';
    ctx.strokeRect(0, 0, pw, ph);
    ctx.lineWidth = Math.max(1, ink * 0.35);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.strokeRect(ink * 1.4, ink * 1.4, pw - ink * 2.8, ph - ink * 2.8);
    ctx.restore();
  });
  // Grade wash over the photo area only (above the title band).
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h * 0.84);
  ctx.clip();
  gradeOverlay(ctx, grade, w, h);
  ctx.restore();
  drawTitleBand(ctx, state, grade, w, h);
  // Grain + vignette over everything.
  if (state.grain > 0) {
    const pat = ctx.createPattern(grainPattern(), 'repeat');
    ctx.globalAlpha = 0.10 * state.grain;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
  if (state.vignette > 0) {
    const vg = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(10,4,20,0)');
    vg.addColorStop(1, `rgba(10,4,20,${0.45 * state.vignette})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
  return canvas;
}
