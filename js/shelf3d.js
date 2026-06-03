/* ───────────────────────────────────────────────────────────────────────────
   THE MANIFOLD · 3D shelf  (SPIKE / Phase 0)
   A vintage shelf where each entry is an object you pick: hover → wobble, click →
   the camera flies in → the real CRT reader opens. Placeholder geometry for now;
   later, real hand-made .glb models drop in per entry (GLTFLoader). Build-free —
   Three.js is dynamic-import()ed from a CDN only when the shelf is first opened,
   so the main page stays light. Reuses the app via window.Manifold.
   ─────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var THREE = null, renderer, scene, camera, raycaster, ndc;
  var objects = [];                 // one mesh per entry
  var hovered = null, running = false, built = false;
  var camHome, camLook, zoom = null;   // camera tween state
  var canvas, label, screenEl;
  var pointer = { x: -2, y: -2, cx: 0, cy: 0, has: false };
  var reduceMotion = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

  function vw() { return window.innerWidth; }
  function vh() { return window.innerHeight; }

  async function build() {
    if (built) return true;
    canvas = document.getElementById('shelf3d-canvas');
    label = document.getElementById('shelf3d-label');
    screenEl = document.getElementById('shelf3d');
    if (!canvas) return false;
    try { THREE = await import(THREE_URL); }
    catch (e) { console.warn('shelf3d: Three.js failed to load', e); if (label) { label.textContent = '3D unavailable'; label.style.opacity = 1; } return false; }

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, vw() / vh(), 0.1, 100);
    camHome = new THREE.Vector3(0, 1.35, 7.2);
    camLook = new THREE.Vector3(0, 1.2, 0);
    resize();

    scene.add(new THREE.HemisphereLight(0xcdd8c4, 0x0c100b, 1.0));
    var key = new THREE.DirectionalLight(0xfff1d4, 1.15); key.position.set(3.5, 6, 5); scene.add(key);
    var rim = new THREE.DirectionalLight(0x9fd08a, 0.4); rim.position.set(-4, 2, 3); scene.add(rim);

    buildCase();
    layout((window.Manifold && window.Manifold.entries) || []);

    raycaster = new THREE.Raycaster();
    ndc = new THREE.Vector2();
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('resize', resize);
    built = true;
    return true;
  }

  function resize() {
    if (!renderer) return;
    renderer.setSize(vw(), vh(), false);
    camera.aspect = vw() / vh(); camera.updateProjectionMatrix();
  }

  function buildCase() {
    var wood = new THREE.MeshStandardMaterial({ color: 0x3b2c1b, roughness: 0.85 });
    var back = new THREE.Mesh(new THREE.BoxGeometry(8.4, 3.6, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x141711, roughness: 1 }));
    back.position.set(0, 1.4, -0.62); scene.add(back);
    [0.18, 2.05].forEach(function (y) {                      // two shelf planks
      var p = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.16, 1.25), wood);
      p.position.set(0, y, 0); scene.add(p);
    });
    [-4.1, 4.1].forEach(function (x) {                        // side panels
      var s = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.6, 1.25), wood);
      s.position.set(x, 1.4, 0); scene.add(s);
    });
  }

  function layout(ents) {
    var lib = ents.filter(function (e) { return (e.collection || 'garden') === 'library'; });
    var gar = ents.filter(function (e) { return (e.collection || 'garden') !== 'library'; });
    placeRow(lib, 2.05 + 0.08, 'library');
    placeRow(gar, 0.18 + 0.08, 'garden');
  }

  function placeRow(list, shelfTop, coll) {
    var n = list.length; if (!n) return;
    var span = 7.2, step = n > 1 ? span / (n - 1) : 0, x0 = n > 1 ? -span / 2 : 0;
    list.forEach(function (e, i) {
      var c = new THREE.Color((window.Manifold && window.Manifold.color(e)) || '#9bb08a');
      var mesh, baseY;
      if (coll === 'library') {
        var h = 0.85 + (i % 3) * 0.14;
        mesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, h, 0.72),
          new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.05 }));
        baseY = shelfTop + h / 2;
      } else {
        mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0),   // a faceted "seed/bloom"
          new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, emissive: c, emissiveIntensity: 0.18 }));
        baseY = shelfTop + 0.26;
      }
      mesh.position.set(x0 + i * step, baseY, 0.05);
      mesh.rotation.y = (Math.random() - 0.5) * 0.3;
      var note = (window.Manifold ? window.Manifold.entries.indexOf(e) : 0); if (note < 0) note = 0;
      mesh.userData = { id: e.id, name: (e.name || '').replace('.TXT', ''), collection: coll, baseY: baseY, lift: 0, note: note };
      scene.add(mesh); objects.push(mesh);
    });
  }

  /* ---- interaction ---- */
  function setNdc(ev) {
    var r = canvas.getBoundingClientRect();
    ndc.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    pointer.cx = ev.clientX; pointer.cy = ev.clientY; pointer.has = true;
  }
  function hit() { raycaster.setFromCamera(ndc, camera); var x = raycaster.intersectObjects(objects, false); return x.length ? x[0].object : null; }
  function onMove(ev) {
    if (zoom) return;
    setNdc(ev);
    var m = hit();
    if (m !== hovered) {
      hovered = m;
      if (m && window.Sound) window.Sound.hover(m.userData.note);
      if (label) {
        if (m) { label.textContent = m.userData.name; label.style.opacity = 1; }
        else { label.style.opacity = 0; }
      }
    }
    if (label && m) { label.style.left = (pointer.cx + 16) + 'px'; label.style.top = (pointer.cy + 14) + 'px'; }
  }
  function onDown(ev) { if (zoom) return; setNdc(ev); var m = hit(); if (m) startZoom(m); }

  function startZoom(mesh) {
    if (label) label.style.opacity = 0;
    var to = mesh.position.clone(); to.z += 1.5; to.y += 0.15;            // sit in front of the item
    zoom = { p0: camera.position.clone(), p1: to, l0: camLook.clone(), l1: mesh.position.clone(),
             t0: performance.now(), dur: reduceMotion ? 1 : 800, id: mesh.userData.id, coll: mesh.userData.collection, fired: false };
  }

  function updateZoom() {
    if (!zoom) return;
    var k = Math.min(1, (performance.now() - zoom.t0) / zoom.dur);
    var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;        // easeInOutQuad
    camera.position.lerpVectors(zoom.p0, zoom.p1, e);
    var look = zoom.l0.clone().lerp(zoom.l1, e); camera.lookAt(look);
    if (k >= 1 && !zoom.fired) {
      zoom.fired = true;
      if (window.Sound) { (zoom.coll === 'library') ? window.Sound.pages() : window.Sound.open(); }
      if (window.Manifold) window.Manifold.open(zoom.id);                 // → the real reader (leaves this screen)
      zoom = null;
    }
  }

  function updateHover() {
    for (var i = 0; i < objects.length; i++) {
      var o = objects[i], want = (o === hovered && !zoom) ? 1 : 0;
      o.userData.lift += (want - o.userData.lift) * (reduceMotion ? 1 : 0.18);
      o.position.y = o.userData.baseY + o.userData.lift * 0.18;
      if (!reduceMotion) o.rotation.y += o.userData.lift * 0.02;          // gentle wobble while hovered
    }
  }

  function loop() {
    if (!screenEl || !screenEl.classList.contains('active')) { running = false; return; }   // pause off-screen
    updateHover(); updateZoom();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  function resetCam() { if (camera) { camera.position.copy(camHome); camera.lookAt(camLook); } hovered = null; zoom = null; if (label) label.style.opacity = 0; }

  window.Shelf3D = {
    open: async function () {
      var ok = await build(); if (!ok) return;
      resetCam();
      if (!running) { running = true; requestAnimationFrame(loop); }
    },
    _pick: function (id) {                                                // dev/test: run the zoom+open for an entry
      var m = objects.find(function (o) { return o.userData.id === id; });
      if (m) startZoom(m); else if (window.Manifold) window.Manifold.open(id);
    },
    _count: function () { return objects.length; }
  };
})();
