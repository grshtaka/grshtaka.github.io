/* ============================================================
   THE MANIFOLD — editor.html logic
   Build a garden story / library sign with pickers, preview it
   (saved to localStorage so the main site shows it), and export
   a snippet to paste into data/entries.js for real publishing.
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);
  const A = window.Authoring;                 // verse/story/sign helpers (from data/entries.js)
  const KEY = 'manifold_drafts';

  const FLOWERS = ['❀','✿','❁','✾','❃','❋','✽','⚘','✲','❂','✦','✸','✺','❖','✶','✷','✵','❉','❊','✤','✥','❦','❧','⚜','♣','♠','✻','✼','⊛','۞','҂','⁂'];
  const SWATCHES = [
    ['sage', '#9bb08a'], ['gold', '#e8b13a'], ['amber', '#e9923f'],
    ['violet', '#9a6cff'], ['cyan', '#4fd6e0'], ['rust', '#cf8a4a'],
    ['rose', '#e08aa0'], ['leaf', '#6fbf73'],
  ];
  const DEFAULT_COLOR = { garden: '#4fd6e0', library: '#cf8a4a' };   // only used until you pick one
  // fallbacks for loading older entries that have no explicit color/flower (they relied on kind)
  const KINDHEX = { ABOUT:'#9bb08a', COSMOGONY:'#e8b13a', MYTH:'#e9923f', SHADOW:'#9a6cff', DREAM:'#4fd6e0', SIGN:'#cf8a4a' };
  const KINDFLOWER = { ABOUT:'❀', COSMOGONY:'✦', MYTH:'✸', SHADOW:'✺', DREAM:'❂', SIGN:'✲' };

  const state = {
    coll: 'garden', name: '', id: '', idTouched: false,
    kind: 'DREAM', color: '#4fd6e0', colorTouched: false, flower: '✿',
    h: 'auto', w: 'auto',                 // book size; 'auto' = sized from the text
    desc: '', text: '', gif: '', gifData: '',
  };
  // AUTO book size from how much is written
  function autoSize() { const n = state.text.trim().length;
    return { h: Math.max(140, Math.min(248, Math.round(140 + n * 0.16))),
             w: Math.max(30,  Math.min(82,  Math.round(30  + n * 0.06))) }; }
  function resolveH() { return state.h === 'auto' ? autoSize().h : state.h; }
  function resolveW() { return state.w === 'auto' ? autoSize().w : state.w; }
  function setSeg(segId, key, val) { [...$(segId).children].forEach(b => b.classList.toggle('on', b.dataset[key] === String(val))); }

  /* ---------- build pickers ---------- */
  $('flower-picks').innerHTML = FLOWERS.map(f =>
    `<div class="pick${f === state.flower ? ' on' : ''}" data-f="${f}">${f}</div>`).join('');
  $('color-swatches').innerHTML = SWATCHES.map(([n, hex]) =>
    `<div class="swatch" title="${n}" data-c="${hex}" style="background:${hex};color:${hex}"></div>`).join('');

  /* ---------- helpers ---------- */
  function slug(s) {
    return String(s || '').toLowerCase().replace(/\.[a-z0-9]+$/, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  }
  function gifSrc() { return state.gifData || state.gif.trim(); }   // upload preview wins for local
  function readDrafts() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function writeDrafts(d) { localStorage.setItem(KEY, JSON.stringify(d)); }

  function buildEntry(forExport) {
    const src = forExport ? state.gif.trim() : gifSrc();   // export must use a real filename, not a data URL
    if (state.coll === 'garden') {
      return A.story({ id: state.id, name: state.name, kind: state.kind, color: state.color,
        flower: state.flower, desc: state.desc, text: state.text, bg: src || undefined });
    }
    return A.sign({ id: state.id, name: state.name, color: state.color, h: resolveH(), w: resolveW(),
      desc: state.desc, text: state.text, gif: src || undefined });
  }

  /* ---------- live preview ---------- */
  function renderPreview() {
    const c = state.color, stage = $('pv-stage'), page = $('pv-page'), g = gifSrc();
    if (state.coll === 'garden') {
      stage.innerHTML = `<div class="bed"><div class="bloom" style="--c:${c};--stem:90px"><div class="flower">${state.flower}</div></div></div>`;
    } else {
      const sty = `--c:${c};--h:${resolveH()}px;--w:${resolveW()}px;` + (g ? `background-image:url('${g}');` : '');
      stage.innerHTML = `<div class="shelf"><div class="book${g ? ' has-gif' : ''}" style="${sty}"><div class="spine">${state.name || 'UNTITLED'}</div></div></div>`;
    }
    let html = '';
    const src = g;
    if (src) html += `<img src="${src}" alt="" style="max-width:100%;max-height:150px;display:block;margin:0 auto 12px;filter:brightness(.8)">`;
    if (state.coll === 'garden') {
      html += state.text.split('\n').map(l => l.trim()
        ? `<span class="verse-line" style="color:var(--sage)">${escapeHtml(l)}</span>`
        : '<span style="display:block;height:.7em"></span>').join('');
    } else {
      html += `<p style="color:var(--sage);line-height:1.6">${escapeHtml(state.text)}</p>`;
    }
    page.innerHTML = html || '<span class="hint">…your text appears here…</span>';
  }
  function escapeHtml(s) { return String(s).replace(/[&<>]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m])); }

  /* ---------- export snippet ---------- */
  function lit(s) { return '`' + String(s).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`'; }
  function q(s) { return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }
  function exportSnippet() {
    const L = [];
    if (state.coll === 'garden') {
      L.push('  story({');
      L.push('    id: ' + q(state.id) + ',');
      L.push('    name: ' + q(state.name) + ',');
      L.push('    kind: ' + q(state.kind) + ',');
      if (state.flower) L.push('    flower: ' + q(state.flower) + ',');
      L.push('    color: ' + q(state.color) + ',');
      L.push('    desc: ' + q(state.desc) + ',');
      if (state.gif.trim()) L.push('    bg: ' + q(state.gif.trim()) + ',');
      else if (state.gifData) L.push('    // bg: \'assets/your.gif\',  // <- add the gif to assets/ and set this');
      L.push('    text: ' + lit(state.text) + ',');
      L.push('  }),');
    } else {
      L.push('  sign({');
      L.push('    id: ' + q(state.id) + ',');
      L.push('    name: ' + q(state.name) + ',');
      L.push('    color: ' + q(state.color) + ',');
      L.push('    h: ' + resolveH() + ',');
      L.push('    w: ' + resolveW() + ',');
      L.push('    desc: ' + q(state.desc) + ',');
      if (state.gif.trim()) L.push('    gif: ' + q(state.gif.trim()) + ',');
      else if (state.gifData) L.push('    // gif: \'assets/your.gif\',  // <- add the gif to assets/ and set this');
      L.push('    text: ' + lit(state.text) + ',');
      L.push('  }),');
    }
    return L.join('\n');
  }

  /* ---------- drafts list ---------- */
  function renderDrafts() {
    const d = readDrafts();
    $('drafts-list').innerHTML = d.length
      ? d.map(e => `<li><span>${e.collection === 'library' ? '❧' : '❀'} ${escapeHtml(e.name || e.id)}</span>`
          + `<a class="del" data-id="${e.id}">remove</a></li>`).join('')
      : '<li><span class="hint">none yet — Save one to preview it on the site</span></li>';
  }

  /* ---------- actions ---------- */
  function validate() {
    if (!state.name.trim()) { alert('Give it a name first.'); return false; }
    if (!state.id.trim()) { state.id = slug(state.name) || ('page-' + Date.now()); $('f-id').value = state.id; }
    if (!state.text.trim()) { alert('Add some text first.'); return false; }
    return true;
  }
  function save() {
    if (!validate()) return;
    const entry = buildEntry(false);
    const d = readDrafts().filter(e => e.id !== entry.id);
    d.push(entry);
    try { writeDrafts(d); }
    catch (e) { alert('Could not save — the uploaded gif may be too large for browser storage. Use a filename in assets/ instead.'); return; }
    renderDrafts(); buildLoadList(); $('f-load').value = entry.id;
    const f = $('saved-flash'); f.classList.add('show'); setTimeout(() => f.classList.remove('show'), 2200);
  }
  function doExport() {
    if (!validate()) return;
    $('export-panel').style.display = '';
    $('export-box').value = exportSnippet();
    $('export-box').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------- collection toggle / field visibility ---------- */
  function setColl(coll) {
    state.coll = coll;
    [...$('seg-coll').children].forEach(b => b.classList.toggle('on', b.dataset.coll === coll));
    $('garden-only').style.display = coll === 'garden' ? '' : 'none';
    $('library-only').style.display = coll === 'library' ? '' : 'none';
    $('text-label').textContent = coll === 'garden'
      ? 'The poem / fragment (blank line = new stanza)' : 'The meaning (what the sign tells you)';
    $('gif-label').textContent = coll === 'garden' ? 'Background gif — optional' : 'Sign image / gif — optional';
    if (!state.colorTouched) setColor(DEFAULT_COLOR[coll]);   // a starting colour until you pick one
    renderPreview();
  }
  function setColor(hex) {
    state.color = hex; $('f-color').value = hex;
    [...$('color-swatches').children].forEach(s => s.classList.toggle('on', s.dataset.c.toLowerCase() === hex.toLowerCase()));
    renderPreview();
  }

  /* ---------- load an existing page to edit ---------- */
  function allEntries() {
    const map = new Map();
    (window.ENTRIES || []).forEach(e => map.set(e.id, e));
    readDrafts().forEach(e => map.set(e.id, e));       // a saved draft overrides the published one
    return [...map.values()];
  }
  function buildLoadList() {
    const all = allEntries();
    const opt = e => `<option value="${e.id}">${escapeHtml(e.name || e.id)}</option>`;
    const g = all.filter(e => (e.collection || 'garden') === 'garden');
    const l = all.filter(e => e.collection === 'library');
    const sel = $('f-load').value;
    $('f-load').innerHTML = '<option value="">＋ start a new page</option>'
      + (g.length ? `<optgroup label="Garden stories">${g.map(opt).join('')}</optgroup>` : '')
      + (l.length ? `<optgroup label="Library signs">${l.map(opt).join('')}</optgroup>` : '');
    $('f-load').value = sel;
  }
  function verseToText(v) { return (v.lines || []).map(l => l.t === 'stanza' ? '' : (l.text || '')).join('\n'); }
  function blocksToText(blocks) {
    const parts = [];
    (blocks || []).forEach(b => { if (b.t === 'verse') parts.push(verseToText(b)); else if (b.t === 'note') parts.push(b.text || ''); });
    return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function resetForm() {
    state.idTouched = false; state.colorTouched = false;
    state.name = state.id = state.desc = state.text = state.gif = ''; state.gifData = '';
    state.kind = 'DREAM'; state.flower = '✿'; state.h = 'auto'; state.w = 'auto';
    ['f-name', 'f-id', 'f-desc', 'f-text', 'f-gif'].forEach(id => $(id).value = '');
    $('f-kind').value = 'DREAM'; $('f-upload').value = '';
    [...$('flower-picks').children].forEach(x => x.classList.toggle('on', x.dataset.f === '✿'));
    setSeg('seg-h', 'h', 'auto'); setSeg('seg-w', 'w', 'auto');
    $('edit-note').style.display = 'none'; $('f-load').value = '';
    setColl('garden');                 // colorTouched is false -> resets to the default colour
  }
  function loadEntry(id) {
    const e = allEntries().find(x => x.id === id);
    if (!e) { resetForm(); return; }
    setColl(e.collection || 'garden');
    state.idTouched = true;
    state.name = e.name || ''; $('f-name').value = state.name;
    state.id = e.id; $('f-id').value = state.id;
    state.kind = e.kind || ''; $('f-kind').value = state.kind;
    state.flower = e.flower || KINDFLOWER[e.kind] || '✿';
    [...$('flower-picks').children].forEach(x => x.classList.toggle('on', x.dataset.f === state.flower));
    state.h = e.h || 'auto'; state.w = e.w || 'auto';
    setSeg('seg-h', 'h', state.h); setSeg('seg-w', 'w', state.w);
    state.colorTouched = true; setColor(e.color || KINDHEX[e.kind] || '#9bb08a');
    state.desc = e.desc || ''; $('f-desc').value = state.desc;
    const img = (e.blocks || []).find(b => b.t === 'image');
    const src = e.bg || (img && img.src) || '';
    if (/^data:/.test(src)) { state.gifData = src; state.gif = ''; $('f-gif').value = ''; }
    else { state.gif = src; state.gifData = ''; $('f-gif').value = src; }
    state.text = blocksToText(e.blocks); $('f-text').value = state.text;
    const adv = (e.blocks || []).some(b => b.t === 'ascii' || b.t === 'widget');
    const note = $('edit-note'); note.style.display = '';
    note.innerHTML = 'Editing <b>' + escapeHtml(e.name || e.id) + '</b>. Save overrides it in your browser; '
      + 'to publish the edit, Export and replace the old block (same id) in <code>data/entries.js</code>.'
      + (adv ? ' <b>⚠ this page has extra content (ascii / expandable sections) the simple editor can’t show — re-saving will drop it.</b>' : '');
    renderPreview();
  }

  /* ---------- wire everything ---------- */
  $('seg-coll').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setColl(b.dataset.coll); });
  $('seg-h').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
    state.h = b.dataset.h === 'auto' ? 'auto' : +b.dataset.h; setSeg('seg-h', 'h', state.h); renderPreview(); });
  $('seg-w').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
    state.w = b.dataset.w === 'auto' ? 'auto' : +b.dataset.w; setSeg('seg-w', 'w', state.w); renderPreview(); });
  $('flower-picks').addEventListener('click', e => { const p = e.target.closest('.pick'); if (!p) return;
    state.flower = p.dataset.f; [...$('flower-picks').children].forEach(x => x.classList.toggle('on', x === p)); renderPreview(); });
  $('color-swatches').addEventListener('click', e => { const s = e.target.closest('.swatch'); if (s) { state.colorTouched = true; setColor(s.dataset.c); } });
  $('f-color').addEventListener('input', e => { state.colorTouched = true; setColor(e.target.value); });
  $('f-load').addEventListener('change', e => { if (e.target.value) loadEntry(e.target.value); else resetForm(); });

  $('f-name').addEventListener('input', e => {
    state.name = e.target.value;
    if (!state.idTouched) { state.id = slug(state.name); $('f-id').value = state.id; }
    renderPreview();
  });
  $('f-id').addEventListener('input', e => { state.idTouched = true; state.id = slug(e.target.value); e.target.value = state.id; });
  $('f-kind').addEventListener('input', e => { state.kind = e.target.value; });
  $('f-desc').addEventListener('input', e => { state.desc = e.target.value; });
  $('f-text').addEventListener('input', e => { state.text = e.target.value; renderPreview(); });
  $('f-gif').addEventListener('input', e => { state.gif = e.target.value; renderPreview(); });
  $('f-upload').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0]; if (!file) { state.gifData = ''; renderPreview(); return; }
    const r = new FileReader(); r.onload = () => { state.gifData = r.result; renderPreview(); }; r.readAsDataURL(file);
  });

  $('btn-save').addEventListener('click', save);
  $('btn-export').addEventListener('click', doExport);
  $('btn-copy').addEventListener('click', () => { $('export-box').select(); document.execCommand('copy'); });
  $('btn-clear').addEventListener('click', () => { if (confirm('Remove all locally-saved preview pages? (Published pages in data/entries.js are not affected.)')) { writeDrafts([]); renderDrafts(); buildLoadList(); } });
  $('drafts-list').addEventListener('click', e => { const a = e.target.closest('a.del'); if (!a) return;
    writeDrafts(readDrafts().filter(x => x.id !== a.dataset.id)); renderDrafts(); buildLoadList(); });

  /* ---------- init ---------- */
  $('f-kind').value = state.kind; buildLoadList(); setColl('garden'); renderDrafts(); renderPreview();
})();
