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
    ABOUT:     { varName: '--bloom-about',     sig: '❖' },
    COSMOGONY: { varName: '--bloom-cosmogony', sig: '✦' },
    MYTH:      { varName: '--bloom-myth',      sig: '✸' },
    SHADOW:    { varName: '--bloom-shadow',    sig: '✷' },
    DREAM:     { varName: '--bloom-dream',     sig: '❂' },
  };

  const rootStyle = getComputedStyle(document.documentElement);
  function bloomHex(kind) {
    const s = SECTION[kind] || SECTION.ABOUT;
    return rootStyle.getPropertyValue(s.varName).trim() || '#9bb08a';
  }
  function sigil(kind) { return (SECTION[kind] || SECTION.ABOUT).sig; }
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
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
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
    $('status-time').textContent = [n.getHours(), n.getMinutes(), n.getSeconds()]
      .map(x => String(x).padStart(2, '0')).join(':');
  }
  setInterval(tick, 1000); tick();

  /* ---- boot ---- */
  const BOOT_LINES = [
    'THE GARDEN v0.2.0',
    'INITIALIZING...',
    'LOADING MEMORY FRAGMENTS...',
    'CALIBRATING PATTERN ENGINE...',
    'SHADOW ARCHIVE: MOUNTED',
    'DREAM BUFFER: READY',
    'BLOOM WEATHER: NOMINAL',
    '> ALL SYSTEMS NOMINAL.',
  ];
  function runBoot() {
    const c = $('boot-lines'); let i = 0;
    (function step() {
      if (i >= BOOT_LINES.length) {
        setTimeout(() => {
          $('boot-title').style.opacity = '1';
          setTimeout(() => { $('boot-sub').style.opacity = '1'; }, 300);
          setTimeout(() => { $('boot-prompt').classList.add('lit'); }, 700);
        }, 400);
        return;
      }
      const el = document.createElement('div');
      el.className = 'boot-line'; el.textContent = BOOT_LINES[i];
      c.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('lit')));
      i++; setTimeout(step, 190);
    })();
  }
  function enterGarden() {
    show('dash'); buildDashboard(); clearBloom();
    $('status-file').textContent = 'THE GARDEN -- BROWSING';
  }
  $('boot-title').addEventListener('click', enterGarden);
  $('boot-prompt').addEventListener('click', enterGarden);

  /* ---- dashboard ---- */
  function buildDashboard() {
    const t = $('file-table');
    if (t.children.length) return;
    ENTRIES.forEach((e, i) => {
      const tr = document.createElement('tr');
      tr.style.setProperty('--row-bloom', bloomHex(e.kind));
      tr.innerHTML =
        `<td class="col-idx">${String(i + 1).padStart(2, '0')}</td>` +
        `<td class="col-sig">${sigil(e.kind)}</td>` +
        `<td class="col-name">${e.name}</td>` +
        `<td class="col-kind">[ ${e.kind} ]</td>`;
      tr.addEventListener('click', () => openEntry(e.id, false));
      t.appendChild(tr);
    });
  }
  $('dash-btn-manifold').addEventListener('click', e => { e.preventDefault(); openManifold(); });

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
    const idx = ENTRIES.findIndex(e => e.id === id);
    if (idx < 0) return;
    curIdx = idx;
    const e = ENTRIES[idx];
    prevEntry = ENTRIES[idx - 1] || null;
    nextEntry = ENTRIES[idx + 1] || null;

    const hex = bloomHex(e.kind);
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

  /* breadcrumb: C:/GARDEN/LIBRARY/<NAME> — each segment navigates */
  function buildBreadcrumb(e) {
    const bc = $('breadcrumb');
    bc.innerHTML = '';
    const parts = [
      { label: 'C:',      go: goHome },
      { label: 'GARDEN',  go: backToDash },
      { label: 'LIBRARY', go: backToDash },
      { label: e.name,    current: true },
    ];
    parts.forEach((p, i) => {
      if (i) { const s = document.createElement('span'); s.className = 'sep'; s.textContent = '/'; bc.appendChild(s); }
      const seg = document.createElement('span');
      seg.className = 'seg' + (p.current ? ' current' : '') + (p.go ? ' clickable' : '');
      seg.textContent = p.label;
      if (p.go) seg.addEventListener('click', p.go);
      bc.appendChild(seg);
    });
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
    if (block.kind === 'map') {
      const w = document.createElement('div'); w.className = 'widget map';
      const lab = document.createElement('div'); lab.className = 'widget-label';
      lab.textContent = block.label || 'THE ROOTS FROM HERE';
      const map = document.createElement('div'); map.className = 'manifold-map';
      w.appendChild(lab); w.appendChild(map);
      buildRoots(map, block.focus || null);
      return w;
    }
    // default: reveal (collapsible)
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
      if (e.target.closest('a, .widget, .manifold-node')) return;
      const side = sideAt(e.clientX);
      if (side === 'left' && prevEntry) openEntry(prevEntry.id, true);
      else if (side === 'right' && nextEntry) openEntry(nextEntry.id, true);
    });
  })();

  function backToDash() {
    show('dash'); clearBloom();
    $('status-file').textContent = 'THE GARDEN -- BROWSING';
  }
  function goHome() {
    show('boot'); clearBloom();
    $('status-file').textContent = 'THE GARDEN';
  }

  /* ---- roots map (full screen + embeddable widget) ---- */
  function openManifold() {
    show('manifold'); clearBloom();
    $('status-file').textContent = 'THE ROOTS -- MAPPING';
    buildRoots($('manifold-map'), null);
  }
  // focus = entry id to highlight (or null for the whole garden)
  function buildRoots(map, focus) {
    map.innerHTML = '';
    const rows = focus ? ENTRIES.filter(e => e.id === focus) : ENTRIES;
    rows.forEach(e => {
      const row = document.createElement('div');
      row.appendChild(nodeSpan(e));
      const links = (e.links || []).map(id => byId[id]).filter(Boolean);
      if (links.length) {
        const arrow = document.createElement('span');
        arrow.textContent = '  ──→  '; arrow.style.color = 'var(--fern)';
        row.appendChild(arrow);
        links.forEach((rel, i) => {
          if (i) { const sep = document.createElement('span'); sep.textContent = ' · '; sep.style.color = 'var(--dim)'; row.appendChild(sep); }
          row.appendChild(nodeSpan(rel));
        });
      }
      map.appendChild(row);
    });
  }
  function nodeSpan(e) {
    const s = document.createElement('span');
    s.className = 'manifold-node';
    s.style.setProperty('--node-bloom', bloomHex(e.kind));
    s.textContent = sigil(e.kind) + ' ' + e.name.replace('.TXT', '');
    s.addEventListener('click', () => openEntry(e.id, true));
    return s;
  }
  $('manifold-back').addEventListener('click', e => { e.preventDefault(); backToDash(); });

  /* ---- go ---- */
  addEventListener('load', runBoot);
})();
