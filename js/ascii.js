/* THE MANIFOLD · DARKROOM — image → glyph converter
   loaded only by ascii.html; needs js/vendor/omggif.js (GifReader / GifWriter) */
(function () {
'use strict';

/* ============================== state ============================== */

var S = {
  cols: 140, rows: 0, aspect: 0.50, zoom: 9,
  bright: 0, contrast: 0, gamma: 1, sparse: 0, invert: false, dither: false,
  charset: 'ramp', custom: ' .:-=+*#%@', reverse: false, edge: 0,
  cmode: 'garden', tint: '#bce08e', duo1: '#10220c', duo2: '#bce08e', sat: 100, glow: false, bg: 'black',
  flicker: 0, drift: 0, scan: 0,
  mosh: 0, decay: 40, moshdir: 'down',
  sortth: 50, sortrun: 60, sortdir: 'h',
  tear: 0, rgb: 0, corrupt: 0,
  ghost: 0, wobble: 0, noise: 0,
  enMotion: true, enMosh: true, enSort: false, enGlitch: true, enVhs: true,
  fit: 'contain', fps: 0, scale: 1, secs: 4, seed: 1234
};

var CHARSETS = {
  ramp:    ' .:-=+*#%@',
  minimal: ' .:*#',
  blocks:  ' ░▒▓█',
  dots:    ' ·∘○◉●',
  binary:  ' 01',
  kana:    ' ･ｨｼﾂｸﾈﾗﾊﾑﾎ',
  braille: ' ⠁⠉⠋⠛⠟⠿⡿⣿',
  geo:     ' ·▫▪◇◆█'
};
var EDGE_GLYPHS = ['-', '\\', '|', '/'];           // by gradient angle bucket
var CORRUPT_GLYPHS = '█▚▞▒§¿@#%&?';

var FX_OFF = { flicker: 0, drift: 0, scan: 0, mosh: 0, tear: 0, rgb: 0, corrupt: 0, ghost: 0, wobble: 0, noise: 0,
  enMotion: true, enMosh: true, enSort: false, enGlitch: true, enVhs: true };
function preset(o) {
  var base = { rows: 0, aspect: 0.5, bright: 0, contrast: 0, gamma: 1, sparse: 0, invert: false, dither: false,
    charset: 'ramp', reverse: false, edge: 0, sat: 100, glow: false, bg: 'black' };
  var out = {};
  Object.keys(FX_OFF).forEach(function (k) { out[k] = FX_OFF[k]; });
  Object.keys(base).forEach(function (k) { out[k] = base[k]; });
  Object.keys(o).forEach(function (k) { out[k] = o[k]; });
  return out;
}
var PRESETS = {
  /* glyphs typed over the video's own colors — nothing recolored */
  lotus:      preset({ cols: 180, zoom: 8, contrast: 25, gamma: 1.15, sparse: 34,
                       cmode: 'source', glow: true, flicker: 14, drift: 8, noise: 5 }),
  classic:    preset({ cols: 140, zoom: 9, cmode: 'garden' }),
  blocks:     preset({ cols: 120, zoom: 10, contrast: 10, dither: true, cmode: 'source', sat: 120 }),
  matrix:     preset({ cols: 150, zoom: 9, contrast: 30, gamma: 1.1, sparse: 26, charset: 'custom',
                       cmode: 'duo', glow: true, flicker: 30, drift: 45, scan: 18, corrupt: 4, ghost: 25, noise: 10 }),
  ghost:      preset({ cols: 150, zoom: 9, contrast: 15, sparse: 18, cmode: 'tint', tint: '#9fd8e8', glow: true,
                       flicker: 10, ghost: 55, wobble: 12, noise: 12 }),
  melt:       preset({ cols: 150, zoom: 9, contrast: 15, sparse: 10, cmode: 'source',
                       mosh: 65, decay: 25, moshdir: 'down' }),
  glitchcore: preset({ cols: 150, zoom: 9, contrast: 20, sparse: 8, cmode: 'source',
                       enSort: true, sortth: 55, sortrun: 80, sortdir: 'h',
                       tear: 45, rgb: 40, corrupt: 18 }),
  blueprint:  preset({ cols: 160, zoom: 9, contrast: 10, sparse: 12, charset: 'minimal', edge: 70,
                       cmode: 'duo', duo1: '#06182e', duo2: '#7ec9ff', glow: true }),
  xray:       preset({ cols: 150, zoom: 9, contrast: 25, gamma: 0.9, invert: true,
                       cmode: 'tint', tint: '#bfe6ff' })
};
var MATRIX_CHARS = ' ･ｲｸｼﾂﾈﾊﾎﾑﾗ01';

/* ============================== source ============================= */

var frames = [];        // [{bmp:ImageBitmap, delay:ms}]
var srcW = 0, srcH = 0; // capped internal size
var fileName = '';
var playing = true, curFrame = 0;

var stage   = document.getElementById('dk-stage');
var canvas  = document.getElementById('dk-canvas');
var ctx     = canvas.getContext('2d');
var dropEl  = document.getElementById('dk-drop');
var statusEl= document.getElementById('dk-status');
var exStatus= document.getElementById('ex-status');

var dirty = true;
var decoding = false;   // while true, the status line belongs to the decoder

/* sampling scratch */
var sampCv = document.createElement('canvas');
var sampCtx = sampCv.getContext('2d', { willReadFrequently: true });

/* compositing scratch (rgb split / channel isolation) */
var tmpA = document.createElement('canvas'), tmpActx = tmpA.getContext('2d');
var tmpB = document.createElement('canvas'), tmpBctx = tmpB.getContext('2d');

/* ============================ utilities ============================ */

function $(id) { return document.getElementById(id); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

/* deterministic per-cell noise */
function hash3(x, y, t, seed) {
  var h = (x * 374761393 + y * 668265263 + t * 1274126177 + seed * 974711) | 0;
  h = (h ^ (h >>> 13)) | 0; h = (h * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function hexToRgb(hex) {
  var n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function charsetString() {
  return S.charset === 'custom' ? (S.custom || ' .:-=+*#%@') : CHARSETS[S.charset];
}

function timeFxOn() {
  return (S.enMotion && (S.flicker > 0 || S.drift > 0 || S.scan > 0)) ||
         (S.enMosh && S.mosh > 0) ||
         (S.enGlitch && (S.tear > 0 || S.corrupt > 0)) ||
         (S.enVhs && (S.ghost > 0 || S.wobble > 0 || S.noise > 0));
}

function download(blob, name) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
}

function baseName() {
  return (fileName || 'darkroom').replace(/\.[^.]+$/, '') + '-ascii';
}

function nextFrameP() { return new Promise(function (r) { requestAnimationFrame(r); }); }

/* ============================== decode ============================= */

var CAP = 640; // longest internal side

function disposeFrames() {
  for (var i = 0; i < frames.length; i++) if (frames[i].bmp.close) frames[i].bmp.close();
  frames = [];
}

function setStatus(html) { statusEl.innerHTML = html; }

async function loadFile(file) {
  if (!file) return;
  var isVideo = /^video\//.test(file.type) || /\.(mp4|mov|webm|m4v)$/i.test(file.name || '');
  if (!isVideo && !/^image\//.test(file.type)) return;
  try {
    exStatus.textContent = '';
    fileName = file.name || 'pasted';
    disposeFrames();
    dropEl.style.display = 'none';        // hide the placeholder the moment developing starts
    decoding = true;
    if (isVideo) {
      await decodeVideo(file);
    } else {
      var buf = await file.arrayBuffer();
      var u8 = new Uint8Array(buf);
      var isGif = u8.length > 3 && u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46;
      if (isGif) await decodeGif(u8);
      else await decodeStill(file);
    }
    decoding = false;
    curFrame = 0; playing = true;
    fxReset(previewFx);
    updateTransport();
    dirty = true;
  } catch (e) {
    decoding = false;
    if (!frames.length) dropEl.style.display = '';
    setStatus('<span style="color:var(--bloom,#cf8a4a)">could not develop that file — ' + e.message + '</span>');
  }
}

async function decodeStill(file) {
  var bmp0 = await createImageBitmap(file);
  var sc = Math.min(1, CAP / Math.max(bmp0.width, bmp0.height));
  srcW = Math.max(1, Math.round(bmp0.width * sc));
  srcH = Math.max(1, Math.round(bmp0.height * sc));
  var cv = document.createElement('canvas'); cv.width = srcW; cv.height = srcH;
  cv.getContext('2d').drawImage(bmp0, 0, 0, srcW, srcH);
  if (bmp0.close) bmp0.close();
  frames = [{ bmp: await createImageBitmap(cv), delay: 0 }];
}

function seekVideo(v, t) {
  return new Promise(function (res, rej) {
    v.onseeked = function () { res(); };
    v.onerror = function () { rej(new Error('video seek failed')); };
    v.currentTime = t;
  });
}

async function decodeVideo(file) {
  var url = URL.createObjectURL(file);
  var v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto';
  v.src = url;
  try {
    await new Promise(function (res, rej) {
      v.onloadedmetadata = function () { res(); };
      v.onerror = function () { rej(new Error('codec not supported by this browser')); };
    });
    var dur = v.duration;
    var sc = Math.min(1, CAP / Math.max(v.videoWidth, v.videoHeight));
    srcW = Math.max(1, Math.round(v.videoWidth * sc));
    srcH = Math.max(1, Math.round(v.videoHeight * sc));
    var fps = 12.5;                                 // the lotus.gif cadence
    var count = clamp(Math.floor(dur * fps), 1, 250);
    var small = document.createElement('canvas'); small.width = srcW; small.height = srcH;
    var smallCtx = small.getContext('2d');
    for (var i = 0; i < count; i++) {
      await seekVideo(v, Math.min(dur - 0.01, i / fps));
      smallCtx.drawImage(v, 0, 0, srcW, srcH);
      frames.push({ bmp: await createImageBitmap(small), delay: 1000 / fps });
      if ((i & 7) === 0) { setStatus('developing frame <span class="lit">' + (i + 1) + '/' + count + '</span> …'); await nextFrameP(); }
    }
  } finally {
    v.removeAttribute('src'); v.load();
    URL.revokeObjectURL(url);
  }
}

async function decodeGif(u8) {
  var gr = new GifReader(u8);
  var W = gr.width, H = gr.height, n = gr.numFrames();
  var sc = Math.min(1, CAP / Math.max(W, H));
  srcW = Math.max(1, Math.round(W * sc));
  srcH = Math.max(1, Math.round(H * sc));
  var rgba = new Uint8ClampedArray(W * H * 4);
  var id = new ImageData(rgba, W, H);
  var full = document.createElement('canvas'); full.width = W; full.height = H;
  var fullCtx = full.getContext('2d');
  var small = document.createElement('canvas'); small.width = srcW; small.height = srcH;
  var smallCtx = small.getContext('2d');
  var prevSnap = null;
  for (var i = 0; i < n; i++) {
    var fi = gr.frameInfo(i);
    if (fi.disposal === 3) prevSnap = rgba.slice();
    gr.decodeAndBlitFrameRGBA(i, rgba);
    fullCtx.putImageData(id, 0, 0);
    smallCtx.clearRect(0, 0, srcW, srcH);
    smallCtx.drawImage(full, 0, 0, srcW, srcH);
    frames.push({ bmp: await createImageBitmap(small), delay: Math.max(20, (fi.delay || 8) * 10) });
    if (fi.disposal === 2) {           // restore to background = clear frame rect
      for (var y = fi.y; y < fi.y + fi.height; y++) {
        var off = (y * W + fi.x) * 4;
        rgba.fill(0, off, off + fi.width * 4);
      }
    } else if (fi.disposal === 3 && prevSnap) {
      rgba.set(prevSnap);
    }
    if ((i & 7) === 0) { setStatus('developing frame <span class="lit">' + (i + 1) + '/' + n + '</span> …'); await nextFrameP(); }
  }
}

/* =========================== the pipeline =========================== */
/* computeGrid → per-cell arrays in G; draw → paints a target canvas.
   fxState carries datamosh persistence so preview and exports stay independent. */

function freshFx() { return { lum: null, r: null, g: null, b: null, cols: 0, rows: 0, shiftAcc: 0 }; }
var previewFx = freshFx();
function fxReset(f) { f.lum = f.r = f.g = f.b = null; f.cols = f.rows = 0; f.shiftAcc = 0; }

function gridDims() {
  if (!srcW) return { cols: 0, rows: 0 };
  var cols = S.cols;
  var rows = S.rows > 0 ? S.rows
    : Math.max(2, Math.round(cols * (srcH / srcW) * S.aspect));
  return { cols: cols, rows: rows };
}

/* reusable grid buffers */
var G = { cols: 0, rows: 0 };
function ensureBuffers(cols, rows) {
  if (G.cols === cols && G.rows === rows) return;
  var n = cols * rows;
  G.cols = cols; G.rows = rows;
  G.lum = new Float32Array(n);
  G.lum2 = new Float32Array(n);
  G.r = new Uint8ClampedArray(n); G.g = new Uint8ClampedArray(n); G.b = new Uint8ClampedArray(n);
  G.r2 = new Uint8ClampedArray(n); G.g2 = new Uint8ClampedArray(n); G.b2 = new Uint8ClampedArray(n);
  G.chars = new Uint16Array(n);          // charCode, 0 = blank
  G.colKey = new Uint16Array(n);         // 4 bits / channel
  G.sobel = new Float32Array(n);
  G.sobelDir = new Uint8Array(n);
}

function buildLut() {
  var lut = new Float32Array(256);
  var C = S.contrast * 2.55;
  var cf = (259 * (C + 255)) / (255 * (259 - C));
  var br = S.bright * 1.275;
  var ig = 1 / S.gamma;
  for (var i = 0; i < 256; i++) {
    var v = cf * (i - 128) + 128 + br;
    v = clamp(v, 0, 255);
    v = 255 * Math.pow(v / 255, ig);
    if (S.invert) v = 255 - v;
    lut[i] = v;
  }
  return lut;
}

function computeGrid(frameIdx, tick, fxState) {
  var d = gridDims();
  var cols = d.cols, rows = d.rows, n = cols * rows;
  ensureBuffers(cols, rows);

  /* --- sample the frame into the cell grid --- */
  if (sampCv.width !== cols || sampCv.height !== rows) { sampCv.width = cols; sampCv.height = rows; }
  sampCtx.clearRect(0, 0, cols, rows);
  var bmp = frames[frameIdx].bmp;
  if (S.rows > 0 && S.fit !== 'stretch') {
    var ratio = (srcH / srcW) * S.aspect;       // rows per column at natural shape
    var dw, dh;
    if (S.fit === 'contain' ? cols * ratio <= rows : cols * ratio > rows) { dw = cols; dh = cols * ratio; }
    else { dh = rows; dw = rows / ratio; }
    sampCtx.drawImage(bmp, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
  } else {
    sampCtx.drawImage(bmp, 0, 0, cols, rows);
  }
  var px = sampCtx.getImageData(0, 0, cols, rows).data;

  /* --- tone --- */
  var lut = buildLut();
  var satF = S.sat / 100;
  var i, x, y, o;
  for (i = 0; i < n; i++) {
    o = i * 4;
    var r = px[o], g = px[o + 1], b = px[o + 2], a = px[o + 3] / 255;
    r *= a; g *= a; b *= a;                       // transparent source → black
    if (satF !== 1) {
      var gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = clamp(gray + (r - gray) * satF, 0, 255);
      g = clamp(gray + (g - gray) * satF, 0, 255);
      b = clamp(gray + (b - gray) * satF, 0, 255);
    }
    G.r[i] = r; G.g[i] = g; G.b[i] = b;
    G.lum[i] = lut[(0.2126 * r + 0.7152 * g + 0.0722 * b) | 0];
  }

  /* --- motion: drift / flicker / scanline --- */
  var enMo = S.enMotion;
  if (enMo && S.drift > 0) {
    var amp = (S.drift / 100) * Math.max(2, rows * 0.12);
    G.lum2.set(G.lum); G.r2.set(G.r); G.g2.set(G.g); G.b2.set(G.b);
    for (x = 0; x < cols; x++) {
      var offY = Math.round(Math.sin(tick * 0.045 + x * 0.55) * amp * hash3(x, 0, 0, S.seed));
      if (!offY) continue;
      for (y = 0; y < rows; y++) {
        var di = y * cols + x;
        var sy = y + offY;
        if (sy < 0 || sy >= rows) { G.lum[di] = 0; G.r[di] = G.g[di] = G.b[di] = 0; continue; }
        var si = sy * cols + x;
        G.lum[di] = G.lum2[si]; G.r[di] = G.r2[si]; G.g[di] = G.g2[si]; G.b[di] = G.b2[si];
      }
    }
  }
  if (enMo && S.flicker > 0) {
    var fAmt = S.flicker * 1.6;
    for (i = 0; i < n; i++) G.lum[i] = clamp(G.lum[i] + (hash3(i % cols, (i / cols) | 0, tick, S.seed) - 0.5) * fAmt, 0, 255);
  }
  if (enMo && S.scan > 0) {
    var bandY = (tick * 0.7) % (rows * 1.4);
    var sAmt = S.scan * 1.8;
    for (y = 0; y < rows; y++) {
      var dyy = Math.abs(y - bandY), boost = sAmt * Math.exp(-dyy * dyy / 18);
      if (boost < 1) continue;
      for (x = 0; x < cols; x++) { i = y * cols + x; G.lum[i] = clamp(G.lum[i] + boost, 0, 255); }
    }
  }

  /* --- FX: pixel sort --- */
  if (S.enSort) pixelSort(cols, rows);

  /* --- FX: datamosh / melt --- */
  if (S.enMosh && S.mosh > 0) datamosh(cols, rows, fxState);
  else if (fxState.lum) fxReset(fxState);

  /* --- edge field (before sparsity blanks anything) --- */
  var edgeOn = S.edge > 0;
  if (edgeOn) sobel(cols, rows);

  /* --- sparsity + glyph map (with optional dithering) --- */
  var cs = charsetString();
  var nGlyph = cs.length;
  var sparseTh = S.sparse * 2.2;
  var lumQ = G.lum2; lumQ.set(G.lum);            // dither works on a copy
  for (y = 0; y < rows; y++) {
    for (x = 0; x < cols; x++) {
      i = y * cols + x;
      var L = lumQ[i];
      if (G.lum[i] < sparseTh) { G.chars[i] = 0; continue; }
      var qi = clamp(Math.floor(L / 256 * nGlyph), 0, nGlyph - 1);
      if (S.dither) {
        var qv = (qi + 0.5) * 256 / nGlyph;
        var err = L - qv;
        if (x + 1 < cols) lumQ[i + 1] += err * 7 / 16;
        if (y + 1 < rows) {
          if (x > 0) lumQ[i + cols - 1] += err * 3 / 16;
          lumQ[i + cols] += err * 5 / 16;
          if (x + 1 < cols) lumQ[i + cols + 1] += err * 1 / 16;
        }
      }
      if (S.reverse) qi = nGlyph - 1 - qi;
      var ch = cs.charCodeAt(qi);
      G.chars[i] = ch === 32 ? 0 : ch;
    }
  }

  /* --- edge glyph override (can revive blanked cells → outlines) --- */
  if (edgeOn) {
    var eTh = (104 - S.edge) * 8;
    for (i = 0; i < n; i++) {
      if (G.sobel[i] > eTh) {
        G.chars[i] = EDGE_GLYPHS[G.sobelDir[i]].charCodeAt(0);
        if (G.lum[i] < 60) G.lum[i] = 60;        // keep outlines visible
      }
    }
  }

  /* --- FX: corruption --- */
  if (S.enGlitch && S.corrupt > 0) {
    var p = (S.corrupt / 100) * 0.10;
    var ct = Math.floor(tick / 2);
    for (i = 0; i < n; i++) {
      if (G.chars[i] && hash3(i % cols, (i / cols) | 0, ct, S.seed ^ 0x5f3) < p) {
        G.chars[i] = CORRUPT_GLYPHS.charCodeAt((hash3(i, ct, 7, S.seed) * CORRUPT_GLYPHS.length) | 0);
      }
    }
  }

  /* --- per-cell colour --- */
  colorize(n);

  return G;
}

function sobel(cols, rows) {
  var L = G.lum;
  for (var y = 0; y < rows; y++) {
    for (var x = 0; x < cols; x++) {
      var i = y * cols + x;
      if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) { G.sobel[i] = 0; continue; }
      var tl = L[i - cols - 1], t = L[i - cols], tr = L[i - cols + 1];
      var l = L[i - 1], r = L[i + 1];
      var bl = L[i + cols - 1], b = L[i + cols], br = L[i + cols + 1];
      var gx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      var gy = (bl + 2 * b + br) - (tl + 2 * t + tr);
      G.sobel[i] = Math.abs(gx) + Math.abs(gy);
      /* edge runs perpendicular to the gradient; bucket into - \ | / */
      var ang = Math.atan2(gy, gx) + Math.PI;            // 0..2π
      G.sobelDir[i] = (Math.round(ang / (Math.PI / 4)) + 2) % 4;
    }
  }
}

function pixelSort(cols, rows) {
  var th = S.sortth * 2.55, maxRun = S.sortrun;
  var run = [], x, y, i;
  function flush() {
    if (run.length < 2) { run.length = 0; return; }
    var vals = run.map(function (j) { return [G.lum[j], G.r[j], G.g[j], G.b[j]]; });
    vals.sort(function (a, b) { return b[0] - a[0]; });
    for (var k = 0; k < run.length; k++) {
      var j = run[k];
      G.lum[j] = vals[k][0]; G.r[j] = vals[k][1]; G.g[j] = vals[k][2]; G.b[j] = vals[k][3];
    }
    run.length = 0;
  }
  if (S.sortdir === 'h') {
    for (y = 0; y < rows; y++) {
      for (x = 0; x < cols; x++) {
        i = y * cols + x;
        if (G.lum[i] > th && run.length < maxRun) run.push(i); else flush();
      }
      flush();
    }
  } else {
    for (x = 0; x < cols; x++) {
      for (y = 0; y < rows; y++) {
        i = y * cols + x;
        if (G.lum[i] > th && run.length < maxRun) run.push(i); else flush();
      }
      flush();
    }
  }
}

function datamosh(cols, rows, fxState) {
  var n = cols * rows;
  if (!fxState.lum || fxState.cols !== cols || fxState.rows !== rows) {
    fxState.cols = cols; fxState.rows = rows; fxState.shiftAcc = 0;
    fxState.lum = new Float32Array(G.lum);
    fxState.r = new Uint8ClampedArray(G.r); fxState.g = new Uint8ClampedArray(G.g); fxState.b = new Uint8ClampedArray(G.b);
    return;
  }
  /* drift the retained ghost along the smear direction */
  fxState.shiftAcc += (S.mosh / 100) * 0.55;
  while (fxState.shiftAcc >= 1) {
    fxState.shiftAcc -= 1;
    shiftGrid(fxState.lum, cols, rows, S.moshdir);
    shiftGrid(fxState.r, cols, rows, S.moshdir);
    shiftGrid(fxState.g, cols, rows, S.moshdir);
    shiftGrid(fxState.b, cols, rows, S.moshdir);
  }
  var keepTh = (S.mosh / 100) * 150;
  var decayF = 1 - (S.decay / 100) * 0.055;
  for (var i = 0; i < n; i++) {
    var d = Math.abs(G.lum[i] - fxState.lum[i]);
    if (d < keepTh) {
      G.lum[i] = fxState.lum[i] * decayF;
      G.r[i] = fxState.r[i] * decayF; G.g[i] = fxState.g[i] * decayF; G.b[i] = fxState.b[i] * decayF;
    }
    fxState.lum[i] = G.lum[i]; fxState.r[i] = G.r[i]; fxState.g[i] = G.g[i]; fxState.b[i] = G.b[i];
  }
}

function shiftGrid(a, cols, rows, dir) {
  var y, s;
  if (dir === 'down') { a.copyWithin(cols, 0, cols * (rows - 1)); a.fill(0, 0, cols); }
  else if (dir === 'up') { a.copyWithin(0, cols); a.fill(0, cols * (rows - 1)); }
  else if (dir === 'right') {
    for (y = 0; y < rows; y++) { s = y * cols; a.copyWithin(s + 1, s, s + cols - 1); a[s] = 0; }
  } else {
    for (y = 0; y < rows; y++) { s = y * cols; a.copyWithin(s, s + 1, s + cols); a[s + cols - 1] = 0; }
  }
}

var SAGE = [188, 224, 142];
function colorize(n) {
  var mode = S.cmode;
  var tint = hexToRgb(S.tint), d1 = hexToRgb(S.duo1), d2 = hexToRgb(S.duo2);
  for (var i = 0; i < n; i++) {
    if (!G.chars[i]) { G.colKey[i] = 0; continue; }
    var L = G.lum[i] / 255, r, g, b;
    if (mode === 'garden') {
      var f = 0.30 + 0.70 * L;
      r = SAGE[0] * f; g = SAGE[1] * f; b = SAGE[2] * f;
    } else if (mode === 'mono') {
      r = g = b = 255 * (0.25 + 0.75 * L);   // black & white
    } else if (mode === 'source') {
      r = G.r[i]; g = G.g[i]; b = G.b[i];   // the video's own colors, untouched
    } else if (mode === 'tint') {
      var ft = 0.15 + 0.85 * L;
      r = tint[0] * ft; g = tint[1] * ft; b = tint[2] * ft;
    } else {
      r = d1[0] + (d2[0] - d1[0]) * L; g = d1[1] + (d2[1] - d1[1]) * L; b = d1[2] + (d2[2] - d1[2]) * L;
    }
    G.colKey[i] = ((clamp(r | 0, 0, 255) >> 4) << 8) | ((clamp(g | 0, 0, 255) >> 4) << 4) | (clamp(b | 0, 0, 255) >> 4);
  }
}

/* ============================== draw =============================== */

var charCache = {};   // charCode -> single-char string
function chStr(c) { return charCache[c] || (charCache[c] = String.fromCharCode(c)); }
var fillCache = {};   // colKey -> css color
function keyColor(k) {
  var s = fillCache[k];
  if (!s) {
    var r = ((k >> 8) & 15) * 17, g = ((k >> 4) & 15) * 17, b = (k & 15) * 17;
    s = fillCache[k] = 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  return s;
}

function measureChar(tctx, fontPx) {
  tctx.font = fontPx + 'px "VT323", monospace';
  return Math.max(2, tctx.measureText('@').width);
}

function draw(tctx, grid, tick, fontPx) {
  var cols = grid.cols, rows = grid.rows;
  var cw = measureChar(tctx, fontPx), chh = fontPx;
  var W = Math.ceil(cols * cw), H = Math.ceil(rows * chh);
  var cv = tctx.canvas;
  if (cv.width !== W || cv.height !== H) {
    cv.width = W; cv.height = H;
    cw = measureChar(tctx, fontPx);              // canvas resize resets ctx state
  }

  /* background / ghosting */
  var ghostKeep = (S.enVhs && S.ghost > 0) ? (S.ghost / 100) * 0.90 : 0;
  if (S.bg === 'black') {
    tctx.fillStyle = ghostKeep > 0 ? 'rgba(0,0,0,' + (1 - ghostKeep).toFixed(3) + ')' : '#000';
    tctx.fillRect(0, 0, W, H);
  } else {
    if (ghostKeep > 0) {
      tctx.save(); tctx.globalCompositeOperation = 'destination-out';
      tctx.fillStyle = 'rgba(0,0,0,' + (1 - ghostKeep).toFixed(3) + ')'; tctx.fillRect(0, 0, W, H);
      tctx.restore();
    } else tctx.clearRect(0, 0, W, H);
  }

  tctx.font = fontPx + 'px "VT323", monospace';
  tctx.textBaseline = 'top';

  /* per-row offsets: tear bands + vhs wobble */
  var tearAmt = S.enGlitch ? S.tear / 100 : 0, wobAmt = S.enVhs ? S.wobble / 100 : 0;
  var bandT = Math.floor(tick / 3);
  var curKey = -1;
  for (var y = 0; y < rows; y++) {
    var xoff = 0;
    if (tearAmt > 0) {
      var band = (y / 4) | 0;
      if (hash3(band, bandT, 11, S.seed) < tearAmt * 0.3) {
        xoff += (hash3(band, bandT, 23, S.seed) - 0.5) * cols * 0.4 * tearAmt * cw;
      }
    }
    if (wobAmt > 0) xoff += Math.sin(tick * 0.13 + y * 0.33) * wobAmt * cw * 3;
    var ybase = y * chh;
    var rowOff = y * cols;
    for (var x = 0; x < cols; x++) {
      var i = rowOff + x;
      var c = grid.chars[i];
      if (!c) continue;
      var k = grid.colKey[i];
      if (k !== curKey) { tctx.fillStyle = keyColor(k); curKey = k; }
      tctx.fillText(chStr(c), x * cw + xoff, ybase);
    }
  }

  /* vhs noise sprinkle */
  if (S.enVhs && S.noise > 0) {
    var cs = charsetString();
    var cnt = Math.floor((S.noise / 100) * cols * rows * 0.02);
    tctx.fillStyle = 'rgba(150,190,140,0.5)';
    for (var kx = 0; kx < cnt; kx++) {
      var nx = (hash3(kx, tick, 31, S.seed) * cols) | 0, ny = (hash3(kx, tick, 53, S.seed) * rows) | 0;
      var nc = cs.charCodeAt((hash3(kx, tick, 77, S.seed) * cs.length) | 0);
      if (nc !== 32) tctx.fillText(chStr(nc), nx * cw, ny * chh);
    }
  }

  /* glow: additive blurred self-composite */
  if (S.glow) {
    tctx.save();
    tctx.globalCompositeOperation = 'lighter';
    tctx.globalAlpha = 0.45;
    tctx.filter = 'blur(' + Math.max(1, fontPx * 0.45) + 'px)';
    tctx.drawImage(cv, 0, 0);
    tctx.restore();
    tctx.filter = 'none';
  }

  /* rgb split: channel-isolated offset re-composite */
  if (S.enGlitch && S.rgb > 0) {
    var dpx = Math.max(1, Math.round((S.rgb / 100) * fontPx * 0.9));
    if (tmpA.width !== W || tmpA.height !== H) { tmpA.width = W; tmpA.height = H; }
    if (tmpB.width !== W || tmpB.height !== H) { tmpB.width = W; tmpB.height = H; }
    tmpActx.clearRect(0, 0, W, H);
    tmpActx.drawImage(cv, 0, 0);
    if (S.bg === 'black') { tctx.fillStyle = '#000'; tctx.fillRect(0, 0, W, H); } else tctx.clearRect(0, 0, W, H);
    var chans = [['#ff0000', -dpx], ['#00ff00', 0], ['#0000ff', dpx]];
    tctx.save();
    tctx.globalCompositeOperation = 'lighter';
    for (var ci = 0; ci < 3; ci++) {
      tmpBctx.globalCompositeOperation = 'source-over';
      tmpBctx.clearRect(0, 0, W, H);
      tmpBctx.drawImage(tmpA, 0, 0);
      tmpBctx.globalCompositeOperation = 'multiply';
      tmpBctx.fillStyle = chans[ci][0];
      tmpBctx.fillRect(0, 0, W, H);
      tmpBctx.globalCompositeOperation = 'destination-in';
      tmpBctx.drawImage(tmpA, 0, 0);
      tctx.drawImage(tmpB, chans[ci][1], 0);
    }
    tctx.restore();
  }
}

/* ============================ main loop ============================ */

var lastT = 0, frameAcc = 0, lastCellsTick = 0;

function loop(t) {
  requestAnimationFrame(loop);
  if (!frames.length) { lastT = t; return; }
  var animated = (frames.length > 1 && playing) || timeFxOn();
  if (frames.length > 1 && playing) {
    frameAcc += t - lastT;
    var dur = S.fps > 0 ? 1000 / S.fps : frames[curFrame].delay;
    var guard = 0;
    while (frameAcc >= dur && guard++ < frames.length) {
      frameAcc -= dur;
      curFrame = (curFrame + 1) % frames.length;
      dur = S.fps > 0 ? 1000 / S.fps : frames[curFrame].delay;
      updateTransport();
    }
  }
  lastT = t;
  if (!animated && !dirty) return;
  var tick = Math.floor(t / 33);
  computeGrid(curFrame, tick, previewFx);
  draw(ctx, G, tick, S.zoom);
  lastCellsTick = tick;
  dirty = false;
  if (!decoding) updateStatusLine();
}

function updateStatusLine() {
  var d = gridDims();
  var fpsTxt = frames.length > 1 ? (S.fps > 0 ? S.fps + 'fps' : 'native') : 'still';
  setStatus('<span class="lit">' + fileName + '</span>' +
    '<span>' + srcW + '×' + srcH + ' → grid ' + d.cols + '×' + d.rows + '</span>' +
    '<span>' + frames.length + ' frame' + (frames.length > 1 ? 's' : '') + '</span>' +
    '<span>' + fpsTxt + '</span>');
}

function updateTransport() {
  var tr = $('transport');
  if (frames.length > 1) {
    tr.classList.add('show');
    var sc = $('tp-scrub');
    sc.max = frames.length - 1;
    sc.value = curFrame;
    $('tp-frame').textContent = (curFrame + 1) + '/' + frames.length;
    $('tp-play').textContent = playing ? '❚❚' : '▶';
  } else tr.classList.remove('show');
}

/* ============================= exports ============================= */

function gridText() {
  var out = [], cols = G.cols, rows = G.rows;
  for (var y = 0; y < rows; y++) {
    var line = '';
    for (var x = 0; x < cols; x++) {
      var c = G.chars[y * cols + x];
      line += c ? chStr(c) : ' ';
    }
    out.push(line.replace(/\s+$/, ''));
  }
  return out.join('\n');
}

function exMsg(s) { exStatus.textContent = s; }

function exportTxt(copyOnly) {
  if (!frames.length) return exMsg('nothing in the tray yet');
  var t = gridText();
  if (copyOnly) {
    navigator.clipboard.writeText(t).then(function () { exMsg('copied ' + t.length + ' chars'); },
      function () { exMsg('clipboard refused — try ⇪ .txt'); });
  } else {
    download(new Blob([t], { type: 'text/plain' }), baseName() + '.txt');
    exMsg('.txt saved');
  }
}

function makeExportTarget() {
  var cv = document.createElement('canvas');
  return { canvas: cv, ctx: cv.getContext('2d', { willReadFrequently: true }) };
}

function exportPng() {
  if (!frames.length) return exMsg('nothing in the tray yet');
  var fontPx = S.zoom * S.scale;
  var t = makeExportTarget();
  computeGrid(curFrame, lastCellsTick, previewFx);
  draw(t.ctx, G, lastCellsTick, fontPx);
  t.canvas.toBlob(function (blob) {
    download(blob, baseName() + '.png');
    exMsg('.png saved (' + t.canvas.width + '×' + t.canvas.height + ')');
  }, 'image/png');
}

function exportWebm() {
  if (!frames.length) return exMsg('nothing in the tray yet');
  var ms;
  if (frames.length > 1) {
    ms = 0;
    for (var i = 0; i < frames.length; i++) ms += S.fps > 0 ? 1000 / S.fps : frames[i].delay;
  } else ms = S.secs * 1000;
  playing = true; updateTransport(); dirty = true;
  var stream = canvas.captureStream(30);
  var mime = '';
  var cands = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  for (var c = 0; c < cands.length; c++) if (MediaRecorder.isTypeSupported(cands[c])) { mime = cands[c]; break; }
  var rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8e6 } : undefined);
  var chunks = [];
  rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
  rec.onstop = function () {
    download(new Blob(chunks, { type: 'video/webm' }), baseName() + '.webm');
    exMsg('.webm saved (' + (ms / 1000).toFixed(1) + 's)');
  };
  rec.start();
  exMsg('recording ' + (ms / 1000).toFixed(1) + 's …');
  setTimeout(function () { rec.stop(); }, ms + 120);
}

/* ---- gif quantizer: 5-bit histogram → ≤256 palette, lazy nearest ---- */
function Quantizer(transparent) {
  this.transparent = transparent;
  this.hist = new Map();
  this.lookup = new Map();
  this.palette = null;
}
Quantizer.prototype.feed = function (data) {
  for (var i = 0; i < data.length; i += 4) {
    if (this.transparent && data[i + 3] < 128) continue;
    var key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
    this.hist.set(key, (this.hist.get(key) || 0) + 1);
  }
};
Quantizer.prototype.freeze = function () {
  var entries = Array.from(this.hist.entries()).sort(function (a, b) { return b[1] - a[1]; });
  var pal = [];
  if (this.transparent) pal.push(0);            // index 0 reserved for transparency
  for (var i = 0; i < entries.length && pal.length < 256; i++) {
    var k = entries[i][0];
    var r = ((k >> 10) << 3) | 4, g = (((k >> 5) & 31) << 3) | 4, b = ((k & 31) << 3) | 4;
    this.lookup.set(k, pal.length);
    pal.push((r << 16) | (g << 8) | b);
  }
  while (pal.length < 2) pal.push(0);
  var size = 2; while (size < pal.length) size <<= 1;
  while (pal.length < size) pal.push(0);
  this.palette = pal;
};
Quantizer.prototype.index = function (r, g, b) {
  var key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
  var hit = this.lookup.get(key);
  if (hit !== undefined) return hit;
  var best = this.transparent ? 1 : 0, bestD = 1e9;
  for (var i = this.transparent ? 1 : 0; i < this.palette.length; i++) {
    var p = this.palette[i];
    var dr = r - ((p >> 16) & 255), dg = g - ((p >> 8) & 255), db = b - (p & 255);
    var d = dr * dr + dg * dg + db * db;
    if (d < bestD) { bestD = d; best = i; }
  }
  this.lookup.set(key, best);
  return best;
};

function exportSeq() {
  /* the deterministic frame sequence both .gif and .html replay */
  var seq = [];
  if (frames.length > 1) {
    var tAcc = 0;
    for (var i = 0; i < frames.length; i++) {
      var dms = S.fps > 0 ? 1000 / S.fps : frames[i].delay;
      seq.push({ f: i, tick: Math.round(tAcc / 33), delayMs: dms });
      tAcc += dms;
    }
  } else {
    var fps = 15, count = timeFxOn() ? S.secs * fps : 1;
    for (var j = 0; j < count; j++) seq.push({ f: 0, tick: j * 2, delayMs: 1000 / fps });
  }
  return seq;
}

async function exportGif() {
  if (!frames.length) return exMsg('nothing in the tray yet');
  var transparent = S.bg === 'transparent';
  var fontPx = S.zoom * S.scale;
  var t = makeExportTarget();
  var efx = freshFx();
  var seq = exportSeq();

  /* size the canvas + buffer from a first render */
  computeGrid(seq[0].f, seq[0].tick, efx);
  draw(t.ctx, G, seq[0].tick, fontPx);
  var W = t.canvas.width, H = t.canvas.height;
  var buf;
  try {
    buf = new Uint8Array(Math.ceil(W * H * seq.length * 1.35) + seq.length * 800 + 4096);
  } catch (e) { return exMsg('too big — lower SCALE or COLUMNS'); }

  /* palette from a spread of frames */
  var q = new Quantizer(transparent);
  var sampleEvery = Math.max(1, Math.floor(seq.length / 12));
  fxReset(efx);
  for (var s = 0; s < seq.length; s += sampleEvery) {
    computeGrid(seq[s].f, seq[s].tick, efx);
    draw(t.ctx, G, seq[s].tick, fontPx);
    q.feed(t.ctx.getImageData(0, 0, W, H).data);
    exMsg('palette pass ' + (s + 1) + '/' + seq.length + ' …');
    await nextFrameP();
  }
  q.freeze();

  var gw = new GifWriter(buf, W, H, { loop: 0 });
  var indexed = new Uint8Array(W * H);
  fxReset(efx);
  for (var k = 0; k < seq.length; k++) {
    computeGrid(seq[k].f, seq[k].tick, efx);
    draw(t.ctx, G, seq[k].tick, fontPx);
    var data = t.ctx.getImageData(0, 0, W, H).data;
    for (var px = 0, n = W * H; px < n; px++) {
      var o = px * 4;
      indexed[px] = (transparent && data[o + 3] < 128) ? 0 : q.index(data[o], data[o + 1], data[o + 2]);
    }
    var opts = { palette: q.palette, delay: Math.max(2, Math.round(seq[k].delayMs / 10)), disposal: 2 };
    if (transparent) opts.transparent = 0;
    gw.addFrame(0, 0, W, H, indexed, opts);
    exMsg('writing gif ' + (k + 1) + '/' + seq.length + ' …');
    await nextFrameP();
  }
  var out = buf.slice(0, gw.end());
  download(new Blob([out], { type: 'image/gif' }), baseName() + '.gif');
  exMsg('.gif saved (' + (out.length / 1024 / 1024).toFixed(1) + ' MB, ' + seq.length + ' frames)');
}

/* ---- standalone html ---- */
function escapeHtmlChar(s) {
  return s === '&' ? '&amp;' : s === '<' ? '&lt;' : s;
}

function frameHtml() {
  var cols = G.cols, rows = G.rows, html = '';
  for (var y = 0; y < rows; y++) {
    var line = '', runKey = -2, runTxt = '';
    for (var x = 0; x < cols; x++) {
      var i = y * cols + x;
      var c = G.chars[i];
      var key = c ? G.colKey[i] : -1;
      if (key !== runKey) {
        if (runTxt) line += runKey === -1 ? runTxt : '<span style="color:' + keyColor(runKey) + '">' + runTxt + '</span>';
        runKey = key; runTxt = '';
      }
      runTxt += c ? escapeHtmlChar(chStr(c)) : ' ';
    }
    if (runTxt) line += runKey === -1 ? runTxt.replace(/ +$/, '') : '<span style="color:' + keyColor(runKey) + '">' + runTxt + '</span>';
    html += line + '\n';
  }
  return html;
}

async function exportHtml() {
  if (!frames.length) return exMsg('nothing in the tray yet');
  var efx = freshFx();
  var seq = exportSeq();
  var fhtml = [], delays = [];
  if (seq.length > 1) {
    for (var k = 0; k < seq.length; k++) {
      computeGrid(seq[k].f, seq[k].tick, efx);
      fhtml.push(frameHtml()); delays.push(Math.round(seq[k].delayMs));
      if ((k & 7) === 0) { exMsg('weaving html ' + (k + 1) + '/' + seq.length + ' …'); await nextFrameP(); }
    }
  } else {
    computeGrid(curFrame, lastCellsTick, efx);
    fhtml.push(frameHtml());
  }
  var fontPx = S.zoom * S.scale;
  var doc = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + baseName() +
    '</title><style>body{background:' + (S.bg === 'transparent' ? 'transparent' : '#000') +
    ';margin:0;display:grid;place-items:center;min-height:100vh}pre{font:' + fontPx +
    'px/' + fontPx + 'px "VT323","Courier New",monospace;letter-spacing:0;margin:0}</style></head><body><pre id="p"></pre>';
  if (fhtml.length > 1) {
    doc += '<script>var F=' + JSON.stringify(fhtml) + ',D=' + JSON.stringify(delays) +
      ',i=0,p=document.getElementById("p");(function step(){p.innerHTML=F[i];var d=D[i];i=(i+1)%F.length;setTimeout(step,d);})();<\/script>';
  } else {
    doc += '<script>document.getElementById("p").innerHTML=' + JSON.stringify(fhtml[0]) + ';<\/script>';
  }
  doc += '</body></html>';
  download(new Blob([doc], { type: 'text/html' }), baseName() + '.html');
  exMsg('.html saved (' + (doc.length / 1024 / 1024).toFixed(2) + ' MB)');
  dirty = true;
}

/* ============================ UI wiring ============================ */

var KNOBS = {
  'k-cols': ['cols', 0], 'k-rows': ['rows', 0, function (v) { return v === 0 ? 'auto' : v; }],
  'k-aspect': ['aspect', 2], 'k-zoom': ['zoom', 0],
  'k-bright': ['bright', 0], 'k-contrast': ['contrast', 0], 'k-gamma': ['gamma', 2], 'k-sparse': ['sparse', 0],
  'k-edge': ['edge', 0], 'k-sat': ['sat', 0],
  'k-flicker': ['flicker', 0], 'k-drift': ['drift', 0], 'k-scan': ['scan', 0],
  'k-mosh': ['mosh', 0], 'k-decay': ['decay', 0],
  'k-sortth': ['sortth', 0], 'k-sortrun': ['sortrun', 0],
  'k-tear': ['tear', 0], 'k-rgb': ['rgb', 0], 'k-corrupt': ['corrupt', 0],
  'k-ghost': ['ghost', 0], 'k-wobble': ['wobble', 0], 'k-noise': ['noise', 0],
  'k-fps': ['fps', 0, function (v) { return v === 0 ? 'auto' : v; }],
  'k-secs': ['secs', 0]
};
var SEGS = { 'seg-fit': 'fit', 'seg-charset': 'charset', 'seg-cmode': 'cmode', 'seg-bg': 'bg',
  'seg-moshdir': 'moshdir', 'seg-sortdir': 'sortdir', 'seg-scale': 'scale' };
var TOGS = { 't-invert': 'invert', 't-dither': 'dither', 't-reverse': 'reverse', 't-glow': 'glow',
  't-en-motion': 'enMotion', 't-en-mosh': 'enMosh', 't-en-sort': 'enSort',
  't-en-glitch': 'enGlitch', 't-en-vhs': 'enVhs' };
var COLORS = { 'c-tint': 'tint', 'c-duo1': 'duo1', 'c-duo2': 'duo2' };

function knobOut(id, v) {
  var spec = KNOBS[id];
  var out = $(id).parentElement.querySelector('output');
  if (!out) return;
  out.textContent = spec[2] ? spec[2](v) : (spec[1] > 0 ? v.toFixed(spec[1]) : String(v));
}

function wire() {
  Object.keys(KNOBS).forEach(function (id) {
    var el = $(id), key = KNOBS[id][0];
    el.addEventListener('input', function () {
      var v = parseFloat(el.value);
      S[key] = v; knobOut(id, v); dirty = true;
    });
  });
  Object.keys(SEGS).forEach(function (id) {
    var seg = $(id), key = SEGS[id];
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      seg.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      S[key] = key === 'scale' ? parseInt(b.dataset.v, 10) : b.dataset.v;
      dirty = true;
    });
  });
  Object.keys(TOGS).forEach(function (id) {
    var el = $(id), key = TOGS[id];
    el.addEventListener('click', function () {
      S[key] = !S[key];
      el.classList.toggle('on', S[key]);
      if (id.indexOf('t-en-') === 0) el.textContent = S[key] ? 'ON' : 'OFF';
      dirty = true;
    });
  });
  Object.keys(COLORS).forEach(function (id) {
    var el = $(id), key = COLORS[id];
    el.addEventListener('input', function () { S[key] = el.value; dirty = true; });
  });
  $('f-charset').addEventListener('input', function () {
    S.custom = $('f-charset').value || ' .:-=+*#%@';
    S.charset = 'custom';
    syncSeg('seg-charset', 'custom');
    dirty = true;
  });
  $('btn-reseed').addEventListener('click', function () { S.seed = (Math.random() * 1e9) | 0; dirty = true; });

  /* presets */
  document.querySelectorAll('[data-preset]').forEach(function (b) {
    b.addEventListener('click', function () {
      var p = PRESETS[b.dataset.preset];
      Object.keys(p).forEach(function (k) { S[k] = p[k]; });
      if (b.dataset.preset === 'matrix') { S.custom = MATRIX_CHARS; S.duo1 = '#031503'; S.duo2 = '#52f07a'; }
      syncUI(); fxReset(previewFx); dirty = true;
    });
  });

  /* user presets (saved in this browser) */
  $('btn-save-preset').addEventListener('click', function () {
    var name = ($('f-preset-name').value || '').trim();
    var all = loadUserPresets();
    if (!name) name = 'preset ' + (Object.keys(all).length + 1);
    var snap = {};
    Object.keys(S).forEach(function (k) { if (k !== 'seed') snap[k] = S[k]; });
    all[name] = snap;
    saveUserPresets(all);
    $('f-preset-name').value = '';
    renderUserPresets();
    exMsg('saved preset “' + name + '”');
  });
  renderUserPresets();

  /* file / drop / paste */
  $('f-file').addEventListener('change', function () { if (this.files[0]) loadFile(this.files[0]); });
  ['dragover', 'dragenter'].forEach(function (ev) {
    stage.addEventListener(ev, function (e) { e.preventDefault(); stage.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    stage.addEventListener(ev, function (e) { e.preventDefault(); stage.classList.remove('dragover'); });
  });
  stage.addEventListener('drop', function (e) {
    var f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadFile(f);
  });
  document.addEventListener('paste', function (e) {
    var items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (var i = 0; i < items.length; i++) {
      if (/^image\//.test(items[i].type)) { loadFile(items[i].getAsFile()); break; }
    }
  });

  /* transport */
  $('tp-play').addEventListener('click', function () { playing = !playing; updateTransport(); dirty = true; });
  $('tp-scrub').addEventListener('input', function () {
    playing = false; curFrame = parseInt(this.value, 10); frameAcc = 0;
    updateTransport(); dirty = true;
  });

  /* exports */
  $('btn-copy').addEventListener('click', function () { exportTxt(true); });
  $('btn-txt').addEventListener('click', function () { exportTxt(false); });
  $('btn-png').addEventListener('click', exportPng);
  $('btn-webm').addEventListener('click', exportWebm);
  $('btn-gif').addEventListener('click', function () { exportGif().catch(function (e) { exMsg('gif failed — ' + e.message); dirty = true; }); });
  $('btn-html').addEventListener('click', function () { exportHtml().catch(function (e) { exMsg('html failed — ' + e.message); dirty = true; }); });
}

var LS_PRESETS = 'manifold_darkroom_presets';
function loadUserPresets() {
  try { return JSON.parse(localStorage.getItem(LS_PRESETS) || '{}'); } catch (e) { return {}; }
}
function saveUserPresets(p) {
  try { localStorage.setItem(LS_PRESETS, JSON.stringify(p)); } catch (e) { exMsg('could not save — storage full?'); }
}
function renderUserPresets() {
  var box = $('user-presets');
  box.innerHTML = '';
  var all = loadUserPresets();
  Object.keys(all).forEach(function (name) {
    var wrap = document.createElement('span');
    wrap.className = 'upre';
    var apply = document.createElement('button');
    apply.type = 'button'; apply.className = 'btn ghost';
    apply.textContent = name.toUpperCase();
    apply.addEventListener('click', function () {
      var p = all[name];
      Object.keys(p).forEach(function (k) { if (k in S) S[k] = p[k]; });
      syncUI(); fxReset(previewFx); dirty = true;
    });
    var del = document.createElement('a');
    del.className = 'del'; del.textContent = '×'; del.title = 'forget this preset';
    del.addEventListener('click', function () {
      delete all[name];
      saveUserPresets(all);
      renderUserPresets();
    });
    wrap.appendChild(apply); wrap.appendChild(del);
    box.appendChild(wrap);
  });
}

function syncSeg(id, v) {
  $(id).querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === String(v)); });
}

function syncUI() {
  Object.keys(KNOBS).forEach(function (id) { $(id).value = S[KNOBS[id][0]]; knobOut(id, S[KNOBS[id][0]]); });
  Object.keys(SEGS).forEach(function (id) { syncSeg(id, S[SEGS[id]]); });
  Object.keys(TOGS).forEach(function (id) {
    $(id).classList.toggle('on', !!S[TOGS[id]]);
    if (id.indexOf('t-en-') === 0) $(id).textContent = S[TOGS[id]] ? 'ON' : 'OFF';
  });
  Object.keys(COLORS).forEach(function (id) { $(id).value = S[COLORS[id]]; });
  $('f-charset').value = S.custom;
}

/* ---- minimizable panels: dock as chips above the rack ---- */
var LS_MIN = 'manifold_darkroom_min';
function initMinimize() {
  var rackPanels = $('rack-panels'), strip = $('min-strip');
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(LS_MIN) || '{}'); } catch (e) {}
  var panels = Array.prototype.slice.call(rackPanels.querySelectorAll('.panel'));
  function persist() {
    var st = {};
    strip.querySelectorAll('.panel').forEach(function (p) { st[p.dataset.pidx] = 1; });
    try { localStorage.setItem(LS_MIN, JSON.stringify(st)); } catch (e) {}
  }
  function setMin(p, min, skipSave) {
    if (min) {
      p.classList.add('min');
      p._minAt = performance.now();
      strip.appendChild(p);
    } else {
      p.classList.remove('min');
      var idx = +p.dataset.pidx, before = null;
      var sibs = rackPanels.querySelectorAll('.panel');
      for (var i = 0; i < sibs.length; i++) {
        if (+sibs[i].dataset.pidx > idx) { before = sibs[i]; break; }
      }
      rackPanels.insertBefore(p, before);
    }
    if (!skipSave) persist();
  }
  panels.forEach(function (p, idx) {
    p.dataset.pidx = idx;
    var h = p.querySelector('h3');
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'tog mini pmin'; btn.textContent = '–'; btn.title = 'minimize';
    h.appendChild(btn);
    btn.addEventListener('click', function (e) {
      e.stopImmediatePropagation(); e.stopPropagation(); e.preventDefault();
      if (!p.classList.contains('min')) setMin(p, true);
    });
    p.addEventListener('click', function (e) {
      /* restore on chip click — but never from the same click that minimized it */
      if (!p.classList.contains('min')) return;
      if (p._minAt && performance.now() - p._minAt < 250) return;
      e.stopPropagation();
      setMin(p, false);
    });
    if (saved[idx]) setMin(p, true, true);
  });
}

/* ============================== boot =============================== */

wire();
syncUI();
initMinimize();
if (document.fonts && document.fonts.load) {
  document.fonts.load('12px VT323').then(function () { dirty = true; });
}
requestAnimationFrame(function (t) { lastT = t; requestAnimationFrame(loop); });

})();
