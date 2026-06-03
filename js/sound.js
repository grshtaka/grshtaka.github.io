/* ───────────────────────────────────────────────────────────────────────────
   THE MANIFOLD · sound
   A subtle, build-free audio layer. Every sound can be a REAL FILE you drop in
   assets/ (see the FILES map below) or, if the file is absent, a built-in synth
   fallback. Files support VARIANTS by numbering: book-open.mp3, book-open2.mp3,
   book-open3.mp3 … — one is picked at random each time (all equally likely).
   The ambient bed is continuous but its volume drifts slowly around
   ~10% (never past ~20%). Autoplay-safe: the AudioContext starts only on the
   ENTER click; everything routes through a master gain the ♪ toggle controls.
   ─────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════════════
     DROP-IN AUDIO FILES — put files in assets/ named EXACTLY like this.
     VARIANTS: add a number with no separator and the system picks one at random
     each time (all equally likely) — e.g.  book-open.mp3 , book-open2.mp3 , book-open3.mp3
     (number them contiguously from 2). Any slot with no file → built-in synth.
     Use .mp3. Ambient/rain clips should loop seamlessly.
     ═══════════════════════════════════════════════════════════════════════════ */
  var FILES = {
    // —— one-shot cues ——
    enter:     'assets/enter.mp3',        // the ENTER chime
    bookOpen:  'assets/book-open.mp3',    // opening a book on the shelf (page flip)
    storyOpen: 'assets/story-open.mp3',   // opening a story in the garden
    pageTurn:  'assets/page-turn.mp3',    // turning a page in the reader
    hover:     'assets/hover.mp3',        // mousing over a bloom / book in the hub
    thunder:   'assets/thunder.mp3',      // the storm rumble
    // —— continuous ambient beds, one per time of day ——
    ambientDawn:  'assets/ambient-dawn.mp3',
    ambientDay:   'assets/ambient-day.mp3',
    ambientDusk:  'assets/ambient-dusk.mp3',
    ambientNight: 'assets/ambient-night.mp3',
    // —— rain (loops while it's actually raining) ——
    rain:         'assets/rain.mp3',
    // —— power-on (plays when you click the power button) ——
    boot:         'assets/boot.mp3',
    // —— overlay ambience: occasional, any time of day, very low (0–10%), over anything ——
    overlay:      'assets/ambient.mp3',
  };

  var ctx = null, master = null, started = false;
  var muted = false;
  try { muted = localStorage.getItem('manifold_muted') === '1'; } catch (e) {}

  var MASTER_VOL = 0.26;          // overall ceiling — keeps the layer ambient
  var AMB_CENTER = 0.10;          // the bed hovers around ~10% …
  var AMB_MIN = 0.05, AMB_MAX = 0.18;   // … drifting between these, never past 0.20
  var CUE_VOL = 0.9;
  var MAX_ONESHOT_SEC = 6;        // cap one-shot playback so long files don't drone (you needn't trim them)

  var world = { phase: 'day', full: false, season: 'summer', rain: 0 };
  var ambient = null;                              // synth bed nodes
  var ambGain = null, loopGain = null;             // shared ambient volume + file-loop bus
  var curLoopSrc = null, curLoopKey = null;
  var rainFileGain = null, rainSrc = null, rainStarted = false;
  var breatheTimer = null, overlayTimer = null, preloaded = false;

  function now() { return ctx ? ctx.currentTime : 0; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER_VOL;
    master.connect(ctx.destination);
    return ctx;
  }

  function makeNoise(seconds) {
    var len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0), last = 0;
    for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    return buf;
  }

  /* ─── variant pools: probe <base>.mp3, <base>2.mp3, … stop at first gap ─── */
  var pools = {};   // slot -> [{ buffer, weight:1/i }]
  function probeSlot(slot, base) {
    if (!ctx || !base) return;
    var dot = base.lastIndexOf('.'), stem = base.slice(0, dot), ext = base.slice(dot);
    pools[slot] = [];
    var i = 1;
    (function next() {
      if (i > 8) return;
      var url = stem + (i === 1 ? '' : String(i)) + ext, idx = i;
      fetch(url).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); })
        .then(function (a) { return ctx.decodeAudioData(a); })
        .then(function (buf) { pools[slot].push({ buffer: buf }); if (pendingPlay[slot]) pendingPlay[slot](buf); i++; next(); updateAmbientSource(); updateRainSource(); })
        .catch(function () { /* first missing index ends the pool */ });
    })();
  }
  function preloadFiles() { Object.keys(FILES).forEach(function (s) { probeSlot(s, FILES[s]); }); }
  function poolReady(slot) { return pools[slot] && pools[slot].length > 0; }
  function pickBuffer(slot) {
    var pool = pools[slot]; if (!pool || !pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)].buffer;   // plain uniform random — every variant equally likely
  }

  function playBuffer(buf, vol, maxSec) {
    var t = now(), g = ctx.createGain(); g.gain.value = (vol == null ? CUE_VOL : vol);
    var src = ctx.createBufferSource(); src.buffer = buf; src.connect(g); g.connect(master); src.start(t);
    var cap = (maxSec === undefined) ? MAX_ONESHOT_SEC : maxSec;   // 0 / false = no cap
    if (cap && buf.duration > cap) {                              // stop long files early with a quick fade
      var end = t + cap;
      g.gain.setValueAtTime(g.gain.value, end - 0.3);
      g.gain.linearRampToValueAtTime(0.0001, end);
      src.stop(end + 0.03);
    }
  }
  // a cue: a file variant if any are loaded, else the synth fallback
  function cue(slot, synthFn, vol, maxSec) {
    if (!ctx) return;
    var b = pickBuffer(slot);
    if (b) playBuffer(b, vol, maxSec); else synthFn();
  }
  // like cue(), but if a file is configured yet still loading (the power-on/ENTER race), wait for it
  // and play it the moment it decodes — falling back to synth only if it's slow/missing.
  var pendingPlay = {};
  function cueOrWait(slot, synthFn, vol, waitMs, maxSec) {
    if (!ctx) return;
    var b = pickBuffer(slot);
    if (b) { playBuffer(b, vol, maxSec); return; }
    if (!FILES[slot] || pendingPlay[slot]) { synthFn(); return; }   // no file → synth now
    var done = false, t = setTimeout(function () { if (!done) { done = true; delete pendingPlay[slot]; synthFn(); } }, waitMs || 1200);
    pendingPlay[slot] = function (buf) { if (done) return; done = true; clearTimeout(t); delete pendingPlay[slot]; playBuffer(buf, vol, maxSec); };
  }

  /* ─── synth fallbacks ─── */
  function synthTone(freqs, dur, vol, type, attack) {
    var t = now(), g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + (attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(master);
    freqs.forEach(function (f, i) {
      var o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.value = f;
      var og = ctx.createGain(); og.gain.value = 1 / (i + 1);
      o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.05);
    });
  }
  function paperTick(t, vol, freq) {
    var src = ctx.createBufferSource(); src.buffer = makeNoise(0.14);
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq || 2600; bp.Q.value = 0.8;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    src.connect(bp); bp.connect(g); g.connect(master); src.start(t); src.stop(t + 0.16);
  }
  function synthHover() {                            // a tiny soft tick when mousing over an item
    var t = now(), o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 880;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.1);
  }
  function synthChime() { synthTone([660, 990, 1320], 1.1, 0.22, 'sine', 0.01); }
  function synthBell()  { synthTone([330, 494, 659, 880], 2.1, 0.20, 'sine', 0.012); }
  function synthTurn()  { paperTick(now(), 0.12, 2600); }
  function synthPages() { var t0 = now(); for (var i = 0; i < 6; i++) paperTick(t0 + i * 0.07 + Math.random() * 0.02, 0.11 - i * 0.009, 2100 + Math.random() * 1000); }
  function synthThunder(level) {
    level = level || 1;
    var t = now(), dur = (level >= 2) ? 2.4 : 1.6, peak = (level >= 2) ? 0.5 : 0.3;
    var src = ctx.createBufferSource(); src.buffer = makeNoise(dur + 0.3);
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 120; lp.Q.value = 0.7;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(lp); lp.connect(g); g.connect(master); src.start(t); src.stop(t + dur + 0.3);
  }
  function synthBoot() {                            // a retro power-on: low thunk + rising sweep + hum tail
    var t = now(), o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(420, t + 0.5);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    o.connect(lp); lp.connect(g); g.connect(master); o.start(t); o.stop(t + 1.3);
  }

  /* ─── public cues (file-or-synth) ─── */
  function chime()      { cueOrWait('enter', synthChime, CUE_VOL, 1500); }   // ENTER fires before files load → wait for it
  function bootSnd()    { cueOrWait('boot',  synthBoot, CUE_VOL, 1500, 0); }  // power-on; uncapped (0) so a longer jingle plays out
  function turn()       { cue('pageTurn',  synthTurn, 0.8); }
  var lastHover = 0;
  function hover()      { var n = performance.now(); if (n - lastHover < 70) return; lastHover = n; cue('hover', synthHover, 0.5); }
  function pages()      { cue('bookOpen',  synthPages, 0.9); }   // opening a book
  function open()       { cue('storyOpen', synthTurn, 0.85); }   // opening a story
  function bell()       { cue('bookOpen',  synthBell); }
  function thunder(lvl) { cue('thunder',   function () { synthThunder(lvl); }, 0.9); }

  // occasional overlay ambience — plays over anything, any time, at a low random volume
  function overlayTick() {
    if (!ctx) return;
    var b = pickBuffer('overlay');
    if (b) playBuffer(b, 0.03 + Math.random() * 0.07);            // 0.03–0.10
    overlayTimer = setTimeout(overlayTick, (30 + Math.random() * 50) * 1000);   // every ~30–80 s
  }

  /* ─── ambient bed (continuous, breathing volume) ─── */
  function buildAmbient() {
    if (!ctx || ambient) return;
    ambGain = ctx.createGain(); ambGain.gain.value = AMB_CENTER; ambGain.connect(master);   // the breathing volume
    loopGain = ctx.createGain(); loopGain.gain.value = 0; loopGain.connect(ambGain);          // file-loop source bus

    var bus = ctx.createGain(); bus.gain.value = 1; bus.connect(ambGain);                      // synth-bed source bus
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; lp.Q.value = 0.6; lp.connect(bus);
    [55, 55.3, 82.4].forEach(function (f, i) {                                                 // normalized ~unit drone
      var o = ctx.createOscillator(); o.type = (i === 2) ? 'sine' : 'triangle'; o.frequency.value = f;
      var g = ctx.createGain(); g.gain.value = (i === 2) ? 0.22 : 0.32;
      o.connect(g); g.connect(lp); o.start();
    });
    var flo = ctx.createOscillator(); flo.frequency.value = 0.05;
    var floG = ctx.createGain(); floG.gain.value = 170; flo.connect(floG); floG.connect(lp.frequency); flo.start();
    var trem = ctx.createOscillator(); trem.frequency.value = 6.2;                             // nightly "crickets" wobble
    var tremG = ctx.createGain(); tremG.gain.value = 0; trem.connect(tremG); tremG.connect(bus.gain); trem.start();

    // synth rain hiss (fallback when there's no rain file)
    var rsrc = ctx.createBufferSource(); rsrc.buffer = makeNoise(2); rsrc.loop = true;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 0.5;
    var rgain = ctx.createGain(); rgain.gain.value = 0; rsrc.connect(bp); bp.connect(rgain); rgain.connect(master); rsrc.start();

    ambient = { bus: bus, lp: lp, tremG: tremG, rgain: rgain };
    applyWorld();
  }

  // slow random drift of the bed's volume around ~10% (re-targets every 20–45 s)
  function breatheTick() {
    if (!ctx || !ambGain) return;
    var t = now(), target = AMB_MIN + Math.random() * (AMB_MAX - AMB_MIN), dur = 20 + Math.random() * 25;
    ambGain.gain.cancelScheduledValues(t);
    ambGain.gain.setValueAtTime(ambGain.gain.value, t);
    ambGain.gain.linearRampToValueAtTime(target, t + dur);
    breatheTimer = setTimeout(breatheTick, dur * 1000);
  }

  // per-phase timbre (volume is the breathing ambGain; this only shapes the synth bed)
  function applyWorld() {
    if (!ambient || !ctx) return;
    var t = now(), R = 0.9, p = world.phase, cutoff = 700, trem = 0;
    if (p === 'night')       { cutoff = 380; trem = (world.season === 'summer') ? 0.12 : 0.06; }
    else if (p === 'dusk' || p === 'dawn') { cutoff = 520; }
    else                     { cutoff = 720; }
    if (world.full) cutoff += 120;
    if (world.season === 'winter') cutoff -= 130; else if (world.season === 'spring') cutoff += 80;
    ambient.lp.frequency.setTargetAtTime(cutoff, t, R);
    ambient.tremG.gain.setTargetAtTime(trem, t, R);
    updateAmbientSource();
    updateRainSource();
  }

  // pick synth bed vs a per-phase file loop; the chosen one feeds the breathing ambGain
  function updateAmbientSource() {
    if (!ctx || !ambient) return;
    var t = now(), slot = 'ambient' + cap(world.phase), b = poolReady(slot) ? pickBuffer(slot) : null;
    if (b) {
      if (curLoopKey !== slot) {
        if (curLoopSrc) { try { curLoopSrc.stop(t + 1.2); } catch (e) {} }
        var src = ctx.createBufferSource(); src.buffer = b; src.loop = true; src.connect(loopGain); src.start(t);
        curLoopSrc = src; curLoopKey = slot;
      }
      loopGain.gain.setTargetAtTime(1, t, 1.0);
      ambient.bus.gain.setTargetAtTime(0.0001, t, 1.0);
      ambient.tremG.gain.setTargetAtTime(0, t, 1.0);   // no synth wobble while a file plays
    } else {
      if (loopGain) loopGain.gain.setTargetAtTime(0, t, 1.0);
      curLoopKey = null;
      ambient.bus.gain.setTargetAtTime(1, t, 1.0);
    }
  }

  /* ─── rain layer (file loop or synth hiss), independent of the bed's breathing ─── */
  function updateRainSource() {
    if (!ctx) return;
    var t = now(), lvl = world.rain;
    if (lvl > 0 && poolReady('rain')) {
      if (!rainStarted) {
        rainFileGain = ctx.createGain(); rainFileGain.gain.value = 0; rainFileGain.connect(master);
        rainSrc = ctx.createBufferSource(); rainSrc.buffer = pickBuffer('rain'); rainSrc.loop = true;
        rainSrc.connect(rainFileGain); rainSrc.start(t); rainStarted = true;
      }
      rainFileGain.gain.setTargetAtTime(lvl >= 2 ? 0.18 : 0.10, t, 1.0);
      if (ambient) ambient.rgain.gain.setTargetAtTime(0, t, 1.0);     // duck synth hiss
    } else {
      if (rainFileGain) rainFileGain.gain.setTargetAtTime(0, t, 1.0);
      if (ambient) ambient.rgain.gain.setTargetAtTime(lvl >= 2 ? 0.10 : lvl >= 1 ? 0.05 : 0, t, 1.0);   // synth fallback
    }
  }

  /* ─── control ─── */
  function doPreload() { if (!preloaded) { preloaded = true; preloadFiles(); } }
  // the POWER button: unlock audio + play the boot sound (no ambient yet — that begins at ENTER)
  function powerOn() {
    if (!ensureCtx()) return;
    if (ctx.state === 'suspended') ctx.resume();
    doPreload();
    bootSnd();
  }
  function start() {
    if (!ensureCtx()) return;
    if (ctx.state === 'suspended') ctx.resume();
    doPreload();
    if (!started) { started = true; buildAmbient(); breatheTick(); overlayTimer = setTimeout(overlayTick, (12 + Math.random() * 20) * 1000); }
    chime();
  }
  function applyMute() {
    if (!master) return;
    master.gain.cancelScheduledValues(now());
    master.gain.setTargetAtTime(muted ? 0 : MASTER_VOL, now(), 0.3);
  }
  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('manifold_muted', muted ? '1' : '0'); } catch (e) {}
    applyMute();
    return muted;
  }

  function setWorld(phase, full) { world.phase = phase || 'day'; world.full = !!full; applyWorld(); }
  function setRain(level)        { world.rain = level | 0; applyWorld(); }
  function setSeason(s)          { world.season = s || 'summer'; applyWorld(); }

  /* ─── the faint ♪ toggle in the status bar ─── */
  function wireIcon() {
    var el = document.getElementById('sound-link'); if (!el) return;
    function paint() { el.classList.toggle('muted', muted); el.setAttribute('title', muted ? 'sound off' : 'sound on'); }
    paint();
    el.addEventListener('click', function (e) { e.preventDefault(); toggleMute(); paint(); });
  }
  if (document.readyState !== 'loading') wireIcon();
  else document.addEventListener('DOMContentLoaded', wireIcon);

  window.Sound = {
    start: start, powerOn: powerOn, toggleMute: toggleMute, isMuted: function () { return muted; },
    setWorld: setWorld, setRain: setRain, setSeason: setSeason,
    chime: chime, boot: bootSnd, hover: hover, turn: turn, pages: pages, open: open, bell: bell, thunder: thunder,
    state: function () { return ctx ? ctx.state : 'none'; },
    ambLevel: function () { return ambGain ? ambGain.gain.value : null; },
    rainGain: function () { return Math.max(rainFileGain ? rainFileGain.gain.value : 0, ambient ? ambient.rgain.gain.value : 0); },
    poolSize: function (slot) { return pools[slot] ? pools[slot].length : 0; },
    _pools: pools, _pick: pickBuffer, _pending: function () { return Object.keys(pendingPlay); }
  };
  window.__sound = window.Sound;
})();
