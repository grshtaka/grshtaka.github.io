/* ============================================================
   THE GARDEN — engine
   boot -> dashboard -> illuminated reader, plus the manifold map.
   Content comes from window.ENTRIES (data/entries.js).
   ============================================================ */
(function () {
  const ENTRIES = window.ENTRIES || [];
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
    // CRT beam: slow warm-up band on the boot screen, fast thin line everywhere else
    const crt = $('crt');
    if (crt) {
      crt.classList.toggle('crt-boot', id === 'boot');
      crt.classList.toggle('crt-run', id !== 'boot');
    }
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
  function tick() {
    const n = new Date();
    const t = [n.getHours(), n.getMinutes(), n.getSeconds()].map(x => String(x).padStart(2, '0')).join(':');
    $('status-time').textContent = t;
    const dt = $('door-time'); if (dt) dt.textContent = 'T+' + t;
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
      log.appendChild(d);
      setTimeout(step, (item.after || 110) + Math.random() * 60);
    })();
  }
  function runBar(log, item, done) {           // cmd-style box bar that fills to 100%
    const d = document.createElement('div'); d.className = 'bar-line';
    log.appendChild(d);
    const width = 22, dur = item.dur || 2000, t0 = performance.now();
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
      setTimeout(() => { $('boot').dataset.phase = 'door'; }, 620);
    }, 480);
  }
  // ENTER -> open the whole page in place (part the doors); no screen swap, so the title can't move
  function openDoor() {
    const boot = $('boot');
    if (boot.dataset.phase !== 'door') return;
    boot.dataset.phase = 'open';
    idleManifold();
  }
  $('hero').addEventListener('click', openDoor);

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
    $('ht-garden').textContent = '❧  THE GARDEN';
    $('ht-library').textContent = 'THE LIBRARY  ❧';
    $('hub-stage').innerHTML = '';
    $('hub-hint').textContent = 'choose a realm';
    buildMpBreadcrumb(null);
  }
  function pick(coll) {
    collection = coll;
    $('boot').classList.add('chosen');
    $('mp-title').textContent = coll === 'garden' ? 'THE GARDEN' : 'THE LIBRARY';
    const g = $('ht-garden'), l = $('ht-library');
    g.classList.toggle('active', coll === 'garden');
    l.classList.toggle('active', coll === 'library');
    g.textContent = coll === 'garden' ? '✦  THE GARDEN' : '❧  THE GARDEN';
    l.textContent = coll === 'library' ? 'THE LIBRARY  ✦' : 'THE LIBRARY  ❧';
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
    stage.innerHTML = '<div class="stage-info" id="stage-info"></div><div class="bed">' + seeds + list.map((e, i) => {
      const c = entryBloom(e);
      return `<div class="bloom" data-id="${e.id}" style="--c:${c};--stem:${stems[i % stems.length]}px;">`
        + `<div class="flower">${flower(e.kind)}</div></div>`;
    }).join('') + '</div>';
    wireStageItems(stage, '.bloom');
  }
  function renderShelf(stage, list) {
    const heights = [176, 150, 192, 160, 184, 144];
    stage.innerHTML = '<div class="stage-info" id="stage-info"></div><div class="shelf">' + list.map((e, i) => {
      const c = entryBloom(e);
      return `<div class="book" data-id="${e.id}" style="--c:${c};--h:${heights[i % heights.length]}px;">`
        + `<div class="spine">${e.name}</div></div>`;
    }).join('') + '</div>';
    wireStageItems(stage, '.book');
  }
  // shared: hovering a bloom/book shows centered name (in its colour, underlined) + desc
  function wireStageItems(stage, sel) {
    const info = stage.querySelector('#stage-info');
    stage.querySelectorAll(sel).forEach(el => {
      const e = byId[el.dataset.id]; const c = entryBloom(e);
      el.addEventListener('mouseenter', () => {
        info.innerHTML = `<span class="si-name" style="color:${c}">${e.name.replace('.TXT', '')}</span>`
          + `<span class="si-desc">${e.desc || ''}</span>`;
      });
      el.addEventListener('mouseleave', () => { info.innerHTML = ''; });
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

  /* ---- go ---- */
  addEventListener('load', runBoot);
})();
