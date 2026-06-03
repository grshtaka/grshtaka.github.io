/* ============================================================
   THE GARDEN — engine
   boot -> dashboard -> illuminated reader, plus the manifold map.
   Content comes from window.ENTRIES (data/entries.js).
   ============================================================ */
(function () {
  const ENTRIES = window.ENTRIES || [];
  // merge pages saved locally by editor.html (preview mode); a draft id overrides a published one
  try {
    const drafts = JSON.parse(localStorage.getItem('manifold_drafts') || '[]');
    if (Array.isArray(drafts)) {
      const ids = new Set(drafts.map(d => d && d.id));
      for (let i = ENTRIES.length - 1; i >= 0; i--) if (ids.has(ENTRIES[i].id)) ENTRIES.splice(i, 1);
      drafts.forEach(d => { if (d && d.id && Array.isArray(d.blocks)) ENTRIES.push(d); });
    }
  } catch (e) { /* ignore bad/empty drafts */ }
  const byId = Object.fromEntries(ENTRIES.map(e => [e.id, e]));

  /* section -> bloom css var + small sigil */
  const SECTION = {
    ABOUT:     { varName: '--bloom-about',     sig: '❖', flower: '❀' },
    COSMOGONY: { varName: '--bloom-cosmogony', sig: '✦', flower: '✦' },
    MYTH:      { varName: '--bloom-myth',      sig: '✸', flower: '✸' },
    SHADOW:    { varName: '--bloom-shadow',    sig: '✷', flower: '✺' },
    DREAM:     { varName: '--bloom-dream',     sig: '❂', flower: '❂' },
    SIGN:      { varName: '--bloom-sign',      sig: '※', flower: '✲' },
  };

  const rootStyle = getComputedStyle(document.documentElement);
  function bloomHex(kind) {
    const s = SECTION[kind] || SECTION.ABOUT;
    return rootStyle.getPropertyValue(s.varName).trim() || '#9bb08a';
  }
  function sigil(kind)   { return (SECTION[kind] || SECTION.ABOUT).sig; }
  function flower(kind)  { return (SECTION[kind] || SECTION.ABOUT).flower; }
  // a library sign carries its own `color`; a garden story uses its section bloom
  function entryBloom(e) { return (e && e.color) || bloomHex(e.kind); }
  // the entry's gif (if any): an image block's src, else the page background — used as the bed/shelf marker
  function entryGif(e) {
    if (!e) return '';
    const img = (e.blocks || []).find(b => b.t === 'image' && b.src);
    return (img && img.src) || e.bg || '';
  }
  function hexToHue(hex) {
    const m = hex.replace('#', '');
    const v = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
    const r = parseInt(v.slice(0, 2), 16) / 255,
          g = parseInt(v.slice(2, 4), 16) / 255,
          b = parseInt(v.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return h;
  }

  /* ---- ambient weather ---- */
  function setBloom(hex, weight) {
    document.documentElement.style.setProperty('--bloom', hex);
    if (window.Atmosphere) window.Atmosphere.setBloom(hex, weight);
  }
  function clearBloom() { setBloom('#9bb08a', 0.05); }

  /* ---- screens ---- */
  const $ = id => document.getElementById(id);
  function show(id) {
    const next = $(id);
    const cur = document.querySelector('.screen.active');
    if (cur && cur !== next) {            // cross-fade: ease the old one out
      cur.classList.remove('active');
      cur.classList.add('leaving');
      setTimeout(() => cur.classList.remove('leaving'), 280);
    }
    next.classList.add('active');
    scrollTo(0, 0);
    // CRT mode is driven by the boot phase (warm band only while actually booting; set in finishBoot)
    // swaying wheat is heavy — only render it on the boot screen
    if (window.Atmosphere) window.Atmosphere.setGrass(id === 'boot');
  }

  /* ---- cursor + clock ---- */
  const cur = $('cursor');
  let mx = -50, my = -50, curQueued = false;
  addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    if (!curQueued) { curQueued = true; requestAnimationFrame(drawCursor); }
  });
  function drawCursor() {
    curQueued = false;
    cur.style.transform = 'translate(' + (mx - 9) + 'px,' + (my - 9) + 'px)';
  }
  /* ---- the breathing world: real time-of-day + moon phase ---- */
  function timeOfDay(h) { return (h >= 5 && h < 8) ? 'dawn' : (h >= 8 && h < 17) ? 'day' : (h >= 17 && h < 20) ? 'dusk' : 'night'; }
  function moonIsFull(d) {                       // ~±1 day of full, from a known new moon + synodic month
    const NEW = Date.UTC(2000, 0, 6, 18, 14), SYN = 29.53058867;
    let age = ((d.getTime() - NEW) / 86400000) % SYN; if (age < 0) age += SYN;
    return Math.abs(age - 14.7653) < 1.2;
  }
  const WEATHER = {
    dawn: '☼ dawn · the blooms are waking',
    day: 'THE WORLD CONTINUES ELSEWHERE',
    dusk: '☼ dusk · the field turns to amber',
    night: '☾ night · the blooms have folded',
    'night-full': '○ full moon · the garden is silvered',
  };
  const RAIN_LINE = { 1: '⛆ rain · the garden drinks', 2: '⛈ storm · the garden trembles' };
  let lastWorld = '', timeKey = 'day', rainState = 0;
  function setWeatherLine() {
    const sb = document.querySelector('#statusbar .sb-right'); if (!sb) return;
    sb.textContent = rainState ? (RAIN_LINE[rainState] || RAIN_LINE[1]) : (WEATHER[timeKey] || WEATHER.day);
  }
  function applyWorld(phase, full) {
    const key = phase + (phase === 'night' && full ? '-full' : '');
    if (key === lastWorld) return; lastWorld = key; timeKey = key;
    const root = document.documentElement;
    root.dataset.tod = phase;
    if (phase === 'night' && full) root.dataset.moon = 'full'; else root.removeAttribute('data-moon');
    if (window.Atmosphere) window.Atmosphere.setNight(phase === 'night');
    setWeatherLine();
  }
  function setRain(level) {
    level = level | 0; if (level === rainState) return; rainState = level;
    const root = document.documentElement;
    if (level) root.dataset.weather = 'rain'; else root.removeAttribute('data-weather');
    if (window.Atmosphere) window.Atmosphere.setRain(level);
    setWeatherLine();
  }
  window.__setTOD = function (phase, full) { lastWorld = '__'; applyWorld(phase, !!full); };   // dev/testing hook
  window.__setRain = function (level) { setRain(level); };

  /* real weather for Belgrade, Serbia -> open-meteo (free, no key, no location prompt) */
  const WEATHER_LAT = 44.79, WEATHER_LON = 20.45;   // Belgrade
  function rainLevelFromCode(code, precip) {
    if (code >= 95) return 2;                                                  // thunderstorm
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || precip > 0) return 1;
    return 0;
  }
  function checkWeather() {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + WEATHER_LAT + '&longitude=' + WEATHER_LON + '&current=precipitation,weather_code')
      .then(r => r.json())
      .then(j => { const c = j && j.current; if (c) setRain(rainLevelFromCode(+c.weather_code, +c.precipitation || 0)); })
      .catch(() => {});
  }
  addEventListener('load', () => { checkWeather(); setInterval(checkWeather, 15 * 60 * 1000); });

  function tick() {
    const n = new Date();
    const t = [n.getHours(), n.getMinutes(), n.getSeconds()].map(x => String(x).padStart(2, '0')).join(':');
    $('status-time').textContent = t;
    const dt = $('door-time'); if (dt) dt.textContent = 'T+' + t;
    applyWorld(timeOfDay(n.getHours()), moonIsFull(n));
  }
  setInterval(tick, 1000); tick();

  /* ---- entrance · the door : long old-PC boot, then blinking ENTER THE MANIFOLD ---- */
  // boot sequence — strings are typed lines (each with its own pause), {bar} is a CMD loading bar
  const BOOT_SEQ = [
    { text: 'THE MANIFOLD // SYSTEM 0xC.7', after: 90 },
    { text: '(c) the garden archive -- all rights remembered', after: 540 },
    { text: '', after: 120 },
    { text: 'BIOS ROM v2.04 ........................ <span class="ok">OK</span>', after: 70 },
    { text: 'CPU · PATTERN ENGINE @ 7.77 MHz ....... <span class="ok">OK</span>', after: 70 },
    { text: 'MEMORY TEST : 000640K ................. <span class="ok">OK</span>', after: 55 },
    { text: '            : 065536K ................. <span class="ok">OK</span>', after: 420 },
    { text: '', after: 130 },
    { text: 'detecting fixed disk C: .............. THE MANIFOLD', after: 520 },
    { bar: 'mounting archive volumes', dur: 2300 },
    { text: 'mounting /GARDEN   (stories) .......... <span class="ok">OK</span>', after: 95 },
    { text: 'mounting /LIBRARY  (signs) ............ <span class="ok">OK</span>', after: 95 },
    { text: 'mounting /SHADOW   (sealed) ........... <span class="ok">OK</span>', after: 95 },
    { text: 'mounting /DREAM    (volatile) ......... <span class="ok">READY</span>', after: 470 },
    { text: '', after: 130 },
    { text: 'loading memory fragments ............. <span class="ok">OK</span>', after: 80 },
    { text: 'calibrating shadow archive ........... <span class="ok">OK</span>', after: 80 },
    { text: 'priming dream buffer ................. <span class="ok">READY</span>', after: 80 },
    { text: 'indexing signs &amp; omens ............... <span class="ok">1428</span>', after: 80 },
    { text: 'bloom weather ........................ <span class="ok">NOMINAL</span>', after: 540 },
    { text: '', after: 130 },
    { text: '&gt; <span class="k">DIVISION</span> ·· THE MANIFOLD', after: 130 },
    { text: '&gt; <span class="k">CLEARANCE</span> · VISITOR', after: 320 },
    { text: '&gt; establishing handshake ............ <span class="ok">OK</span>', after: 300 },
    { bar: 'unsealing the manifold', dur: 1700 },
    { text: '&gt; <span class="grant">ACCESS GRANTED</span>', after: 720 },
  ];
  function runBoot() {
    const log = $('bootlog'); if (!log) return;
    log.innerHTML = ''; let i = 0;
    (function step() {
      if (i >= BOOT_SEQ.length) { finishBoot(); return; }
      const item = BOOT_SEQ[i++];
      if (item.bar) { runBar(log, item, step); return; }
      const d = document.createElement('div');
      d.innerHTML = item.text === '' ? '&nbsp;' : item.text;
      log.appendChild(d); log.scrollTop = log.scrollHeight;   // keep newest at the bottom (lines push up)
      setTimeout(step, (item.after || 110) + Math.random() * 60);
    })();
  }
  function runBar(log, item, done) {           // cmd-style box bar that fills to 100%
    const d = document.createElement('div'); d.className = 'bar-line';
    log.appendChild(d); log.scrollTop = log.scrollHeight;
    const width = (window.innerWidth < 640 ? 14 : 22), dur = item.dur || 2000, t0 = performance.now();
    (function tick() {
      const p = Math.min(1, (performance.now() - t0) / dur);
      const filled = Math.round(p * width);
      const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
      const pct = String(Math.round(p * 100)).padStart(3, ' ');
      d.textContent = item.bar + ' [' + bar + '] ' + pct + '%';
      if (p < 1) requestAnimationFrame(tick);
      else setTimeout(done, 360);
    })();
  }
  function finishBoot() {                       // close the whole terminal, then reveal ENTER THE MANIFOLD
    const term = $('terminal');
    setTimeout(() => {
      term.classList.add('powering-off');
      setTimeout(() => {
        $('boot').dataset.phase = 'door';
        const crt = $('crt'); if (crt) { crt.classList.remove('crt-boot'); crt.classList.add('crt-run'); }   // warm band off; idle scan (random sweeps)
      }, 620);
    }, 480);
  }
  // ENTER -> open the whole page in place (part the doors); no screen swap, so the title can't move
  function openDoor() {
    const boot = $('boot');
    if (boot.dataset.phase !== 'door') return;
    boot.dataset.phase = 'open';
    idleManifold();
  }
  $('hero').addEventListener('click', openDoor);   // the title opens the doors
  $('gate').addEventListener('click', openDoor);   // ...and so do the doors themselves

  /* ---- THE MANIFOLD PAGE : choose a realm; it grows in, the rest gives way ---- */
  let collection = 'garden';
  function enterManifold() { showManifold(null); }
  function showManifold(coll) {            // land back on the (already-open) hub, e.g. from the reader
    show('boot'); $('boot').dataset.phase = 'open'; clearBloom();
    $('status-file').textContent = 'THE MANIFOLD -- BROWSING';
    if (coll) pick(coll); else idleManifold();
  }
  function idleManifold() {
    $('boot').classList.remove('chosen');
    $('mp-title').textContent = 'THE MANIFOLD';
    $('ht-garden').classList.remove('active'); $('ht-library').classList.remove('active');
    /* mark set via CSS */ void'❧  THE GARDEN';
    /* mark set via CSS */ void'THE LIBRARY  ❧';
    $('hub-stage').innerHTML = '';
    $('hub-hint').textContent = 'choose a realm';
    buildMpBreadcrumb(null);
  }
  function pick(coll) {
    if ($('boot').dataset.phase !== 'open') return;   // ignore realm clicks while the doors are still closed
    collection = coll;
    $('boot').classList.add('chosen');
    $('mp-title').textContent = coll === 'garden' ? 'THE GARDEN' : 'THE LIBRARY';
    const g = $('ht-garden'), l = $('ht-library');
    g.classList.toggle('active', coll === 'garden');
    l.classList.toggle('active', coll === 'library');
    /* mark set via CSS */ void coll === 'garden' ? void'✦  THE GARDEN' : '❧  THE GARDEN';
    /* mark set via CSS */ void coll === 'library' ? void'THE LIBRARY  ✦' : 'THE LIBRARY  ❧';
    const active = coll === 'garden' ? g : l;
    active.classList.remove('blink'); void active.offsetWidth; active.classList.add('blink');
    const list = ENTRIES.filter(e => (e.collection || 'garden') === coll);
    if (coll === 'library') renderShelf($('hub-stage'), list);
    else renderBed($('hub-stage'), list);
    $('hub-hint').textContent = coll === 'library'
      ? 'draw a book to read the sign' : 'tend a bloom to open it';
    buildMpBreadcrumb(coll);
  }
  function buildMpBreadcrumb(coll) {
    const parts = [
      { label: 'C:', go: goHome },
      { label: 'MANIFOLD', current: !coll, go: coll ? () => showManifold(null) : null },
    ];
    if (coll) parts.push({ label: coll.toUpperCase(), current: true });
    renderCrumbs($('mp-breadcrumb'), parts);
  }
  function renderBed(stage, list) {
    const stems = [60, 150, 96, 128, 74, 112, 84, 140];
    let seeds = '';
    for (let i = 0; i < 5; i++)
      seeds += `<span class="bed-seed" style="left:${8 + Math.random() * 84}%;top:${8 + Math.random() * 40}%"></span>`;
    stage.innerHTML = '<div class="bed">' + seeds + list.map((e, i) => {
      const c = entryBloom(e);
      return `<div class="bloom" data-id="${e.id}" style="--c:${c};--stem:${stems[i % stems.length]}px;">`
        + `<div class="flower">${e.flower || flower(e.kind)}</div></div>`;
    }).join('') + '</div>';
    wireStageItems(stage, '.bloom');
  }
  function renderShelf(stage, list) {
    const heights = [176, 150, 192, 160, 184, 144];
    stage.innerHTML = '<div class="shelf">' + list.map((e, i) => {
      const c = entryBloom(e); const g = entryGif(e);
      const sty = `--c:${c};--h:${(e.h || heights[i % heights.length])}px;--w:${(e.w || 44)}px;`
        + (g ? `background-image:url('${g}');` : '');
      return `<div class="book${g ? ' has-gif' : ''}" data-id="${e.id}" style="${sty}"><div class="spine">${e.name}</div></div>`;
    }).join('') + '</div>';
    wireStageItems(stage, '.book');
  }
  // shared: hovering a bloom/book fills the placard with its name + desc, tinted to its colour
  function placardIdle() {
    const card = $('placard'); if (!card) return;
    card.classList.remove('lit'); card.removeAttribute('style');
    card.innerHTML = '<span class="placard-hint">— hover to read —</span>';
  }
  function wireStageItems(stage, sel) {
    const card = $('placard');
    placardIdle();
    stage.querySelectorAll(sel).forEach(el => {
      const e = byId[el.dataset.id]; const c = entryBloom(e);
      el.addEventListener('mouseenter', () => {
        card.classList.add('lit');
        card.style.borderColor = `color-mix(in srgb, ${c} 50%, var(--line))`;
        card.style.background = `color-mix(in srgb, ${c} 9%, transparent)`;
        card.innerHTML = `<div class="placard-name" style="color:${c}">${e.name.replace('.TXT', '')}</div>`
          + `<div class="placard-desc">${e.desc || ''}</div>`;
      });
      el.addEventListener('mouseleave', placardIdle);
      el.addEventListener('click', () => openEntry(e.id, true));
    });
  }
  $('ht-garden').addEventListener('click', e => { e.preventDefault(); pick('garden'); });
  $('ht-library').addEventListener('click', e => { e.preventDefault(); pick('library'); });

  /* ---- vines / corners ---- */
  const CORNER = '╔═◈';
  function vineString(seed) {
    const glyphs = ['❀', '│', '╰┐', ' ╰❧', '│', '┌╯', '❀┘', '│', '╰❀', '❧', '│', '┊', '✿'];
    let out = [];
    for (let i = 0; i < 16; i++) out.push(glyphs[(i + seed) % glyphs.length]);
    return out.join('\n');
  }

  /* ---- reader ---- */
  let curIdx = 0;
  let typeTimer = null;
  let prevEntry = null, nextEntry = null;

  function openEntry(id, flip) {
    const e = byId[id];
    if (!e) return;
    const idx = ENTRIES.indexOf(e);
    curIdx = idx;
    // prev/next stay WITHIN the same collection — turning pages never crosses
    // from a library sign into a garden story (or vice-versa)
    const coll = e.collection || 'garden';
    const sibs = ENTRIES.filter(x => (x.collection || 'garden') === coll);
    const si = sibs.indexOf(e);
    prevEntry = sibs[si - 1] || null;
    nextEntry = sibs[si + 1] || null;

    const hex = entryBloom(e);
    setBloom(hex, 0.32);

    show('reader');
    buildBreadcrumb(e);
    $('reader-kind').textContent = '[ ' + e.kind + ' ]';
    $('status-file').textContent = e.name + ' -- OPEN';

    // page-turn catchwords (left = back, right = forward)
    $('catch-prev').textContent = prevEntry ? prevEntry.name : '';
    $('catch-next').textContent = nextEntry ? nextEntry.name : '';
    $('codex').dataset.side = '';

    // optional page-background image/gif — colourised to the bloom hue with a
    // cheap filter (no mix-blend-mode, which was costing ~13fps over the gif)
    const bgEl = $('codex-bg');
    if (e.bg) {
      bgEl.style.backgroundImage = 'url("' + e.bg + '")';
      $('codex').classList.add('has-bg');
    } else {
      bgEl.style.backgroundImage = 'none';
      $('codex').classList.remove('has-bg');
    }

    // corners + vines
    $('codex-tl').textContent = CORNER;
    $('codex-tr').textContent = CORNER;
    $('codex-bl').textContent = CORNER;
    $('codex-br').textContent = CORNER;
    $('vine-left').textContent = vineString(idx);
    $('vine-right').textContent = vineString(idx + 3);

    // page-flip
    const codex = $('codex');
    if (flip) { codex.classList.remove('flip'); void codex.offsetWidth; codex.classList.add('flip'); }
    else codex.classList.remove('flip');

    renderBlocks(e);
  }

  /* shared breadcrumb renderer (reader + manifold page) */
  function renderCrumbs(bc, parts) {
    bc.innerHTML = '';
    parts.forEach((p, i) => {
      if (i) { const s = document.createElement('span'); s.className = 'sep'; s.textContent = '/'; bc.appendChild(s); }
      const seg = document.createElement('span');
      seg.className = 'seg' + (p.current ? ' current' : '') + (p.go ? ' clickable' : '');
      seg.textContent = p.label;
      if (p.go) seg.addEventListener('click', p.go);
      bc.appendChild(seg);
    });
  }
  /* breadcrumb: C:/MANIFOLD/<COLLECTION>/<NAME> — each segment navigates */
  function buildBreadcrumb(e) {
    const coll = e.collection || 'garden';
    renderCrumbs($('breadcrumb'), [
      { label: 'C:', go: goHome },
      { label: 'MANIFOLD', go: () => showManifold(null) },
      { label: coll.toUpperCase(), go: () => showManifold(coll) },
      { label: e.name, current: true },
    ]);
  }

  function renderBlocks(e) {
    const body = $('reader-body');
    body.innerHTML = '';
    if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; }
    const typeTargets = [];

    const blocks = e.blocks || [];
    // illustrations (image / ascii figure) float top-left, so the verse wraps
    // around them like a manuscript miniature. Render them first in the DOM.
    const isFloat = b => (b.t === 'image' || b.t === 'ascii') && b.float !== false;
    const floats = blocks.filter(isFloat);
    const flow   = blocks.filter(b => !isFloat(b));
    // the verse always opens with an illuminated drop-cap; illustrations sit to
    // the right as a clean aside (rendered first so the text flows beside them)
    let firstVerseLineDone = false;

    floats.concat(flow).forEach(block => {
      if (block.t === 'verse') {
        let stanza = document.createElement('div');
        stanza.className = 'verse-stanza';
        const flush = () => { if (stanza.children.length) body.appendChild(stanza); };
        (block.lines || []).forEach(item => {
          if (item.t === 'stanza') {
            flush(); stanza = document.createElement('div'); stanza.className = 'verse-stanza';
            return;
          }
          const line = document.createElement('span');
          line.className = item.t === 'refrain' ? 'refrain' : 'verse-line';
          let txt = item.text;

          if (!firstVerseLineDone && item.t !== 'refrain') {
            firstVerseLineDone = true;
            const drop = document.createElement('span');
            drop.className = 'dropcap';
            drop.textContent = txt.charAt(0);
            line.appendChild(drop);
            txt = txt.slice(1);
          }
          const tspan = document.createElement('span');
          tspan.className = 'ln-text';
          tspan.dataset.text = txt;
          line.appendChild(tspan);
          stanza.appendChild(line);
          typeTargets.push(tspan);
        });
        flush();
      }
      else if (block.t === 'ascii') { body.appendChild(asciiEl(block)); }
      else if (block.t === 'note')  { body.appendChild(noteEl(block)); }
      else if (block.t === 'image') { body.appendChild(imageEl(block)); }
      else if (block.t === 'widget') {
        body.appendChild(renderWidget(block));
      }
    });

    // Reserve each line's final (wrapped) height BEFORE typing, so the page is
    // already its correct height and nothing shifts down as you read.
    typeTargets.forEach(t => { t.textContent = t.dataset.text; });
    void body.offsetHeight; // force layout
    typeTargets.forEach(t => {
      const line = t.parentElement;
      if (line) line.style.minHeight = line.offsetHeight + 'px';
      t.textContent = '';
    });

    typeRun(typeTargets);
  }

  /* ---- block element helpers (also used inside widgets, rendered static) ---- */
  function imageEl(block) {
    const wrap = document.createElement('div'); wrap.className = 'img-block';
    const frame = document.createElement('span'); frame.className = 'img-frame';
    const img = document.createElement('img'); img.src = block.src; img.alt = block.cap || '';
    img.loading = 'lazy';
    if (block.treat && block.treat !== 'crt') img.classList.add('img-plain');
    frame.appendChild(img); wrap.appendChild(frame);
    if (block.cap) { const c = document.createElement('span'); c.className = 'img-cap'; c.textContent = block.cap; wrap.appendChild(c); }
    return wrap;
  }
  function asciiEl(block) {
    const wrap = document.createElement('div'); wrap.className = 'ascii-block';
    const pre = document.createElement('pre'); pre.className = 'ascii-art'; pre.textContent = block.art;
    wrap.appendChild(pre);
    if (block.cap) { const c = document.createElement('span'); c.className = 'ascii-cap'; c.textContent = block.cap; wrap.appendChild(c); }
    return wrap;
  }
  function noteEl(block) {
    const n = document.createElement('div'); n.className = 'note-block'; n.textContent = block.text;
    return n;
  }
  // static (no typewriter, no drop-cap) — for content nested inside widgets
  function verseStaticEl(block) {
    const frag = document.createDocumentFragment();
    let stanza = document.createElement('div'); stanza.className = 'verse-stanza';
    const flush = () => { if (stanza.children.length) frag.appendChild(stanza); };
    (block.lines || []).forEach(item => {
      if (item.t === 'stanza') { flush(); stanza = document.createElement('div'); stanza.className = 'verse-stanza'; return; }
      const line = document.createElement('span');
      line.className = item.t === 'refrain' ? 'refrain' : 'verse-line';
      line.textContent = item.text;
      stanza.appendChild(line);
    });
    flush();
    return frag;
  }
  function staticBlockEl(block) {
    switch (block.t) {
      case 'verse': return verseStaticEl(block);
      case 'ascii': return asciiEl(block);
      case 'note':  return noteEl(block);
      case 'image': return imageEl(block);
      default: return document.createTextNode('');
    }
  }

  /* ---- interactive widgets ---- */
  function renderWidget(block) {
    // reveal (collapsible)
    const w = document.createElement('div'); w.className = 'widget reveal';
    const toggle = document.createElement('div'); toggle.className = 'reveal-toggle';
    const label = block.label || 'UNFOLD';
    toggle.innerHTML = '<span class="caret">&#9656;</span>' + label;
    const bodyEl = document.createElement('div'); bodyEl.className = 'reveal-body';
    (block.blocks || []).forEach(b => bodyEl.appendChild(staticBlockEl(b)));
    toggle.addEventListener('click', () => w.classList.toggle('open'));
    w.appendChild(toggle); w.appendChild(bodyEl);
    return w;
  }

  function typeRun(targets) {
    let li = 0;
    (function typeLine() {
      if (li >= targets.length) return;
      const el = targets[li];
      const full = el.dataset.text;
      let ci = 0;
      (function typeChar() {
        if (ci < full.length) {
          el.textContent += full[ci++];
          typeTimer = setTimeout(typeChar, 3 + Math.random() * 3);
        } else { li++; typeTimer = setTimeout(typeLine, 10); }
      })();
    })();
  }

  /* turn pages by clicking the sides of the page (left = back, right = forward) */
  (function bindPageTurn() {
    const codex = $('codex');
    const sideAt = clientX => {
      const r = codex.getBoundingClientRect();
      return (clientX - r.left) < r.width / 2 ? 'left' : 'right';
    };
    codex.addEventListener('mousemove', e => {
      const side = sideAt(e.clientX);
      const next = (side === 'left' ? !!prevEntry : !!nextEntry) ? side : '';
      if (codex.dataset.side !== next) codex.dataset.side = next; // write only on change
    });
    codex.addEventListener('mouseleave', () => { if (codex.dataset.side) codex.dataset.side = ''; });
    codex.addEventListener('click', e => {
      // don't hijack clicks on real links/interactive elements inside the page
      if (e.target.closest('a, .widget')) return;
      const side = sideAt(e.clientX);
      if (side === 'left' && prevEntry) openEntry(prevEntry.id, true);
      else if (side === 'right' && nextEntry) openEntry(nextEntry.id, true);
    });
  })();

  function goHome() {                      // back to the closed-door entrance (no re-boot)
    show('boot');
    $('terminal').classList.remove('powering-off');
    $('boot').classList.remove('chosen');
    $('boot').dataset.phase = 'door';
    idleManifold();
    clearBloom();
    $('status-file').textContent = 'THE MANIFOLD';
  }

  /* ---- the refresh beam: one slow sweep at a random 1–2 minute interval (not constant) ---- */
  (function scanBeam() {
    if (matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    function sweep() {
      const crt = $('crt'), scan = crt && crt.querySelector('.crt-scan');
      if (scan && crt.classList.contains('crt-run')) {
        scan.classList.remove('sweeping'); void scan.offsetWidth; scan.classList.add('sweeping');
        setTimeout(() => scan.classList.remove('sweeping'), 1700);
      }
      setTimeout(sweep, 60000 + Math.random() * 60000);   // next in 1–2 min
    }
    setTimeout(sweep, 20000 + Math.random() * 40000);     // first a while after arrival
  })();

  /* ---- go ---- */
  addEventListener('load', runBoot);
})();
