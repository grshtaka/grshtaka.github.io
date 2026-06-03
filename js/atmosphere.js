/* ============================================================
   THE GARDEN — atmosphere
   Falling leaves, twigs, dust, wind and swaying grass on a
   full-screen canvas. Retinted to the botanical greens and
   made "bloom-aware": a fraction of drifting petals take the
   active section's bloom color, scaling up when an entry is open.

   Public API:
     Atmosphere.setBloom(hexColor, weight)   weight 0..1
   ============================================================ */
(function () {
  const canvas = document.getElementById('petals');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H;
  function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
  resize();
  addEventListener('resize', () => { resize(); initGrass(); });

  /* ---- bloom state ---- */
  let bloom = { r: 155, g: 176, b: 138 };  // sage default
  let bloomWeight = 0.05;
  function hexToRgb(hex) {
    const m = hex.replace('#', '');
    const v = m.length === 3
      ? m.split('').map(c => c + c).join('')
      : m;
    return { r: parseInt(v.slice(0, 2), 16), g: parseInt(v.slice(2, 4), 16), b: parseInt(v.slice(4, 6), 16) };
  }
  let showGrass = true;   // the swaying wheat — only drawn on the boot screen
  let nightOn = false, nightFade = 0;   // fireflies appear at night
  const reduceMotion = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- seasons: the wheat + leaf hues change with the month (the wheat is the indicator) ---- */
  let season = 'summer';
  const SEASON = {
    spring: { grass: [120, 170, 85],  head: 'small', leaf: [150, 200, 120], leafAlpha: 0.75, petalBoost: 0.16 },
    summer: { grass: [78, 128, 58],   head: 'big',   leaf: [120, 165, 105], leafAlpha: 1.0,  petalBoost: 0.0  },
    autumn: { grass: [176, 128, 46],  head: 'full',  leaf: [206, 124, 48],  leafAlpha: 1.0,  petalBoost: 0.06 },
    winter: { grass: [122, 126, 110], head: 'none',  leaf: [150, 168, 150], leafAlpha: 0.22, petalBoost: 0.0  },
  };
  const S = () => SEASON[season] || SEASON.summer;

  const Atmosphere = {
    setBloom(hex, weight) {
      if (hex) bloom = hexToRgb(hex);
      if (typeof weight === 'number') bloomWeight = Math.max(0, Math.min(1, weight));
    },
    setGrass(on) { showGrass = !!on; },
    setNight(on) { nightOn = !!on; if (nightOn && !flies.length) initFlies(); },
    setRain(level) { rainLevel = Math.max(0, Math.min(2, level | 0)); if (rainLevel && !drops.length) initRain(); },
    setSeason(s) { if (SEASON[s]) { season = s; if (s === 'winter' && !snow.length) initSnow(); } }
  };
  window.Atmosphere = Atmosphere;

  /* ---- snow (winter): soft drifting flakes; ambient when dry, heavier when it precipitates ---- */
  const snow = [];
  let snowFade = 0;
  function initSnow() {
    snow.length = 0;
    const n = reduceMotion ? 28 : 90;
    for (let i = 0; i < n; i++) snow.push({
      x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2.2,
      sp: 0.35 + Math.random() * 1.0, sway: Math.random() * Math.PI * 2,
      swSp: 0.008 + Math.random() * 0.02, a: 0.45 + Math.random() * 0.55,
    });
  }
  function snowLive() { return Math.floor(snow.length * (0.42 + 0.58 * Math.min(1, rainLevel * 0.5))); }
  function updateSnow() {
    snowFade += ((season === 'winter' ? 1 : 0) - snowFade) * 0.02;
    if (snowFade < 0.01) return;
    const speed = 1 + rainLevel * 0.5, live = snowLive();
    for (let i = 0; i < live; i++) {
      const s = snow[i]; s.sway += s.swSp;
      s.y += s.sp * speed; s.x += Math.sin(s.sway) * 0.5 + windStrength * 0.35;
      if (s.y > H + 6) { s.y = -6; s.x = Math.random() * W; }
      if (s.x < -12) s.x = W + 12; else if (s.x > W + 12) s.x = -12;
    }
  }
  function drawSnow() {
    if (snowFade < 0.01) return;
    const live = snowLive();
    for (let i = 0; i < live; i++) {
      const s = snow[i];
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(228,238,252,${s.a * snowFade * 0.85})`; ctx.fill();
    }
  }

  /* ---- rain (mirrors real weather) + subtle thunder ---- */
  let rainLevel = 0, rainFade = 0, flash = 0, thunderTimer = 600;
  const drops = [];
  function initRain() {
    drops.length = 0;
    const count = reduceMotion ? 40 : 150;
    for (let i = 0; i < count; i++) {
      drops.push({ x: Math.random() * W, y: Math.random() * H,
        len: 8 + Math.random() * 14, sp: 7 + Math.random() * 9, a: 0.12 + Math.random() * 0.22 });
    }
  }
  function updateRain() {
    if (season === 'winter') { rainFade += (0 - rainFade) * 0.05; flash += (0 - flash) * 0.2; return; }  // winter precip falls as snow
    rainFade += ((rainLevel ? 1 : 0) - rainFade) * 0.02;
    if (rainFade < 0.01) { flash += (0 - flash) * 0.2; return; }
    const slant = windStrength * 1.2, intens = rainLevel >= 2 ? 1 : 0.62;
    const live = Math.floor(drops.length * intens);
    for (let i = 0; i < live; i++) {
      const d = drops[i];
      d.y += d.sp * (rainLevel >= 2 ? 1.25 : 1); d.x += slant;
      if (d.y > H + 14 || d.x < -20 || d.x > W + 20) { d.y = -14; d.x = Math.random() * W; }
    }
    // thunder: occasional pale flash (rarer for drizzle, more for storms)
    if (!reduceMotion && --thunderTimer <= 0) {
      flash = rainLevel >= 2 ? 0.32 : 0.16;
      if (window.Sound) window.Sound.thunder(rainLevel);   // rumble synced to the flash
      thunderTimer = (rainLevel >= 2 ? 360 : 900) + Math.floor(Math.random() * 1200);
    }
    flash += (0 - flash) * 0.08;
  }
  function drawRain() {
    if (season === 'winter') return;   // snow handles winter
    if (rainFade > 0.01) {
      const slant = windStrength * 1.2, intens = rainLevel >= 2 ? 1 : 0.62;
      const live = Math.floor(drops.length * intens);
      ctx.lineWidth = 1; ctx.lineCap = 'round';
      for (let i = 0; i < live; i++) {
        const d = drops[i];
        ctx.strokeStyle = `rgba(176,200,222,${d.a * rainFade})`;
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - slant * 1.6, d.y - d.len); ctx.stroke();
      }
    }
    if (flash > 0.004) { ctx.fillStyle = `rgba(200,212,235,${flash})`; ctx.fillRect(0, 0, W, H); }
  }

  /* ---- fireflies (night only) ---- */
  const flies = [];
  function initFlies() {
    flies.length = 0;
    const count = reduceMotion ? 8 : 24;
    for (let i = 0; i < count; i++) {
      flies.push({
        x: Math.random() * W, y: H * (0.25 + Math.random() * 0.6),
        r: 1.1 + Math.random() * 1.6,
        vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.14,
        drift: Math.random() * Math.PI * 2, driftSp: 0.004 + Math.random() * 0.01,
        tw: Math.random() * Math.PI * 2, twSp: 0.02 + Math.random() * 0.05,
      });
    }
  }
  function updateFlies() {
    nightFade += ((nightOn ? 1 : 0) - nightFade) * 0.02;
    if (nightFade < 0.01) return;
    flies.forEach(f => {
      f.drift += f.driftSp; f.tw += f.twSp;
      f.x += f.vx + Math.cos(f.drift) * 0.25 + windStrength * 0.15;
      f.y += f.vy + Math.sin(f.drift * 0.7) * 0.18;
      if (f.x < -10) f.x = W + 10; else if (f.x > W + 10) f.x = -10;
      if (f.y < H * 0.12) f.y = H * 0.12; else if (f.y > H - 10) f.y = H - 10;
    });
  }
  function drawFlies() {
    if (nightFade < 0.01) return;
    flies.forEach(f => {
      const a = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(f.tw))) * nightFade;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 5);
      g.addColorStop(0, `rgba(208,238,150,${a})`);
      g.addColorStop(1, 'rgba(208,238,150,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(225,245,180,${Math.min(1, a + 0.15)})`;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
    });
  }

  /* ---- leaves & petals ---- */
  let petals = [];
  let petalOpacity = 0;

  function makePetal() {
    const size = 4 + Math.random() * 7;
    const depth = Math.random();
    const isBloom = Math.random() < (bloomWeight + S().petalBoost);   // spring sprinkles a few colour petals
    return {
      type: 'leaf', isBloom,
      x: Math.random() * W, y: -20,
      size: size * (0.6 + depth * 0.6),
      variant: Math.floor(Math.random() * 4),
      speedY: (0.2 + Math.random() * 0.4) + depth * 0.5,
      speedX: (Math.random() - 0.5) * 0.3,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.018 * (0.4 + depth * 0.8),
      alpha: (0.06 + depth * 0.28) * (isBloom ? 1.7 : 1),
      depth,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.003 + depth * 0.008,
    };
  }
  function makeTwig() {
    return {
      type: 'twig',
      x: Math.random() * W, y: -20,
      len: 12 + Math.random() * 20,
      speedY: 0.3 + Math.random() * 0.5,
      speedX: (Math.random() - 0.5) * 0.25,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.008,
      alpha: 0.06 + Math.random() * 0.1,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.003 + Math.random() * 0.005,
      branches: Math.floor(Math.random() * 2) + 1,
      depth: 0.5,
    };
  }
  for (let i = 0; i < 22; i++) { const p = makePetal(); p.y = Math.random() * H; petals.push(p); }
  for (let i = 0; i < 6; i++)  { const t = makeTwig();  t.y = Math.random() * H; petals.push(t); }

  /* ---- wind ---- */
  let windStrength = 0, windTarget = 0, windTimer = 0, isGusting = false, gustTimer = 0;
  function updateWind() {
    if (--windTimer <= 0) {
      if (!isGusting && Math.random() < 0.15) {
        isGusting = true;
        windTarget = (Math.random() < 0.5 ? 1 : -1) * (2.5 + Math.random() * 2);
        windTimer = 180 + Math.random() * 240;
      } else {
        isGusting = false;
        windTarget = (Math.random() - 0.5) * 0.2;
        windTimer = 1200 + Math.random() * 2400;
      }
    }
    windStrength += (windTarget - windStrength) * 0.003;
    if (isGusting && --gustTimer <= 0) {
      const b = makePetal(); b.y = Math.random() * H * 0.8; b.speedY = 0.8 + Math.random() * 1.2;
      petals.push(b); gustTimer = 8 + Math.floor(Math.random() * 12);
    }
  }

  /* ---- dust ---- */
  const dust = [];
  function makeDust() {
    return {
      x: Math.random() * W, y: H - 2 - Math.random() * 18,
      r: 0.5 + Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 0.3, vy: -(Math.random() * 0.2),
      alpha: 0.05 + Math.random() * 0.15, life: 1,
      decay: 0.003 + Math.random() * 0.005,
    };
  }
  for (let i = 0; i < 40; i++) dust.push(makeDust());
  function updateDust() {
    const wf = Math.abs(windStrength);
    for (let i = dust.length - 1; i >= 0; i--) {
      const d = dust[i];
      d.x += d.vx + windStrength * 0.6; d.y += d.vy;
      d.life -= d.decay * (1 + wf * 0.5);
      if (d.life <= 0 || d.y < H - 60) {
        dust[i] = makeDust();
        dust[i].x = windStrength > 0 ? Math.random() * W * 0.3 : W * 0.7 + Math.random() * W * 0.3;
      }
    }
    if (isGusting && dust.length < 120) dust.push(makeDust());
  }
  function drawDust() {
    dust.forEach(d => {
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(150,185,135,${d.alpha * d.life * petalOpacity})`;
      ctx.fill();
    });
  }

  /* ---- grass ---- */
  const grass = [];
  let grassOpacity = 0;
  function initGrass() {
    grass.length = 0;
    const count = Math.floor(W / 5);
    for (let i = 0; i < count; i++) {
      const depth = Math.random();
      grass.push({
        x: (i / count) * W + (Math.random() - 0.5) * 10,
        h: 40 + Math.random() * 60,
        lean: (Math.random() - 0.5) * 0.4,
        thick: 0.6 + Math.random() * 1.0,
        alpha: (0.03 + Math.random() * 0.05) + depth * 0.32,
        depth, sway: Math.random() * Math.PI * 2,
        swayAmt: 0.03 + Math.random() * 0.06,
      });
    }
  }
  initGrass();
  function grassColor(a) {
    const gc = S().grass;   // spring green / summer lush / autumn gold / winter grey twig
    return `rgba(${gc[0]},${gc[1]},${gc[2]},${a})`;
  }
  function drawGrass() {
    if (grassOpacity < 1) grassOpacity = Math.min(1, grassOpacity + 0.004);
    const windLean = windStrength * 0.05;
    grass.forEach(g => {
      g.sway += 0.009;
      const sway = Math.sin(g.sway) * g.swayAmt + windLean * g.depth;
      const tipX = g.x + sway * g.h * 4 + g.lean * g.h;
      const tipY = H - g.h;
      const midX = g.x + sway * g.h * 2;
      const midY = H - g.h * 0.55;
      const a = g.alpha * grassOpacity;

      ctx.beginPath();
      ctx.moveTo(g.x, H);
      ctx.quadraticCurveTo(midX, midY, tipX, tipY);
      ctx.strokeStyle = grassColor(a); ctx.lineWidth = g.thick; ctx.stroke();

      // the ear of wheat — summer fruity / autumn full / spring small bud / winter none (bare twig)
      const head = S().head;
      if (head !== 'none') {
        const hf = head === 'big' ? 1.5 : head === 'full' ? 1.15 : 0.6;
        const headLen = g.h * 0.18 * hf;
        const angle = Math.atan2(tipY - midY, tipX - midX);
        ctx.save(); ctx.translate(tipX, tipY); ctx.rotate(angle + Math.PI / 2);
        ctx.beginPath(); ctx.ellipse(0, 0, g.thick * 1.4 * hf, headLen, 0, 0, Math.PI * 2);
        ctx.fillStyle = grassColor(a * 0.5); ctx.fill();
        ctx.strokeStyle = grassColor(a * 0.7); ctx.lineWidth = 0.5; ctx.stroke();
        for (let b = -2; b <= 2; b++) {
          const bY = b * headLen * 0.3, bLen = headLen * 0.25;
          ctx.beginPath(); ctx.moveTo(-g.thick, bY); ctx.lineTo(-bLen - g.thick, bY - bLen * 0.6);
          ctx.strokeStyle = grassColor(a * 0.55); ctx.lineWidth = 0.5; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(g.thick, bY); ctx.lineTo(bLen + g.thick, bY - bLen * 0.6);
          ctx.strokeStyle = grassColor(a * 0.55); ctx.lineWidth = 0.5; ctx.stroke();
        }
        ctx.restore();
      }
    });
  }

  /* ---- drawing leaves / petals ---- */
  function drawLeaf(p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha * petalOpacity * (p.isBloom ? 1 : S().leafAlpha);   // winter leaves fade out
    const s = p.size, v = p.variant;
    const lf = S().leaf;   // seasonal leaf hue (summer green / autumn amber / etc.)
    const fill = p.isBloom ? `rgba(${bloom.r},${bloom.g},${bloom.b},0.32)` : `rgba(${lf[0]},${lf[1]},${lf[2]},0.13)`;
    const stroke = p.isBloom ? `rgba(${bloom.r},${bloom.g},${bloom.b},0.6)` : `rgba(${lf[0]},${lf[1]},${lf[2]},0.26)`;
    ctx.beginPath();
    if (v === 0) {
      ctx.moveTo(0, -s); ctx.bezierCurveTo(s*.55,-s*.35, s*.55,s*.35, 0,s);
      ctx.bezierCurveTo(-s*.55,s*.35, -s*.55,-s*.35, 0,-s);
    } else if (v === 1) {
      ctx.moveTo(0,-s); ctx.bezierCurveTo(s*.8,-s*.2, s*.4,s*.5, 0,s);
      ctx.bezierCurveTo(-s*.3,s*.4, -s*.3,-s*.4, 0,-s);
    } else if (v === 2) {
      ctx.moveTo(0,-s*.6); ctx.bezierCurveTo(s*.9,-s*.1, s*.7,s*.5, 0,s*.7);
      ctx.bezierCurveTo(-s*.7,s*.5, -s*.9,-s*.1, 0,-s*.6);
    } else {
      ctx.moveTo(0,-s*1.2); ctx.bezierCurveTo(s*.3,-s*.4, s*.3,s*.4, 0,s*1.2);
      ctx.bezierCurveTo(-s*.3,s*.4, -s*.3,-s*.4, 0,-s*1.2);
    }
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = 0.7; ctx.stroke();
    if (p.isBloom) {  // glowing pistil for bloom flowers
      ctx.beginPath(); ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${bloom.r},${bloom.g},${bloom.b},0.85)`; ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(0,-s*.8); ctx.lineTo(0,s*.8);
    ctx.strokeStyle = 'rgba(140,185,120,0.08)'; ctx.lineWidth = 0.4; ctx.stroke();
    ctx.restore();
  }
  function drawTwig(p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha * petalOpacity;
    ctx.strokeStyle = 'rgba(110,150,95,0.2)'; ctx.lineWidth = 0.6;
    const l = p.len;
    ctx.beginPath(); ctx.moveTo(0,-l*.5); ctx.lineTo(0,l*.5); ctx.stroke();
    for (let b = 0; b < p.branches; b++) {
      const by = -l*.1 + b*l*.3, blen = l*.3 + Math.random()*l*.15, bdir = b % 2 ? -1 : 1;
      ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(bdir*blen*.7, by-blen*.6); ctx.stroke();
    }
    ctx.restore();
  }

  /* ---- loop ---- */
  function frame() {
    ctx.clearRect(0, 0, W, H);
    if (petalOpacity < 1) petalOpacity = Math.min(1, petalOpacity + 0.0015);
    updateWind(); updateDust();
    if (!isGusting && petals.length > 34) petals.splice(34);
    petals.forEach((p, i) => {
      p.sway += p.swaySpeed;
      p.x += p.speedX + Math.sin(p.sway) * 0.35 + windStrength * (p.depth || 0.5);
      p.y += p.speedY;
      p.rot += p.rotSpeed + windStrength * 0.015;
      if (p.type === 'leaf') drawLeaf(p); else drawTwig(p);
      if (p.y > H + 20 || p.x < -60 || p.x > W + 60) {
        petals[i] = Math.random() < 0.2 ? makeTwig() : makePetal();
      }
    });
    drawDust();
    if (showGrass) drawGrass();
    updateFlies(); drawFlies();
    updateRain(); drawRain();
    updateSnow(); drawSnow();
    requestAnimationFrame(frame);
  }
  frame();
})();
