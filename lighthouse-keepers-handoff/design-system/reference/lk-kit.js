/* Lighthouse Keepers pixel-art kit: palette reader, sprite drawing and the harbour scene renderer. */
(function () {
  'use strict';

  var THEMES = [
    { id: 'harbour-night', name: 'Harbour Night', mood: 'Deep navy water and a muted-amber lamp. The classic: the beam is the only warm thing on screen.' },
    { id: 'sea-glass', name: 'Sea Glass', mood: 'Soft teal and sage like frosted beach glass, with a terracotta stripe. The calmest of the set.' },
    { id: 'slate-lantern', name: 'Slate & Lantern', mood: 'Almost-grey blue slate and one golden lantern. Least visual noise: the beam does all the talking.' },
    { id: 'deep-fjord', name: 'Deep Fjord', mood: 'All blue: spruce-dark water and a cool moonlight beam. Warm sand-coloured routes for the Pilot.' },
    { id: 'dusk-harbour', name: 'Dusk Harbour', mood: 'Dusty periwinkle-blue with a peach-coral lamp. Gentle and storybook-like.' },
    { id: 'foggy-dawn', name: 'Foggy Dawn', mood: 'A light palette: pale sky, slate fog that darkens as it thickens. Suits bright rooms and daytime play.' },
    { id: 'storm-ink', name: 'Storm Ink', mood: 'High-contrast option: inky night, white tower, bright beam. For low-vision players or glare.' }
  ];

  var KEYS = ['sky-deep', 'sky', 'sea-deep', 'sea', 'sea-light', 'crest', 'fog', 'fog-thick', 'beam', 'beam-core', 'lamp',
    'rock', 'rock-light', 'land', 'grass', 'tower', 'stripe', 'roof', 'hull', 'hull-dark', 'sail', 'star', 'frost', 'outline',
    'ink', 'ink-muted', 'surface', 'surface-raised', 'border', 'accent', 'on-accent', 'success', 'route',
    'skin-1', 'skin-2', 'skin-3', 'skin-4'];

  /* ---------- colour helpers ---------- */
  function parse(c) {
    c = (c || '').trim();
    if (c.charAt(0) === '#') {
      var h = c.slice(1);
      if (h.length === 3 || h.length === 4) h = h.split('').map(function (x) { return x + x; }).join('');
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    var m = c.match(/rgba?\(([^)]+)\)/);
    if (m) { var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2]]; }
    return [255, 0, 255];
  }
  function hex(rgb) {
    return '#' + rgb.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join('');
  }
  function mixRGB(A, B, t) { return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]; }
  function mix(a, b, t) { return hex(mixRGB(parse(a), parse(b), t)); }

  /* ---------- palettes ---------- */
  var jsonPal = null;
  function currentTheme() { return document.documentElement.getAttribute('data-theme') || THEMES[0].id; }
  function readVars(themeId) {
    var el = document.createElement('div');
    el.setAttribute('data-theme', themeId);
    el.style.display = 'none';
    (document.body || document.documentElement).appendChild(el);
    var cs = getComputedStyle(el), out = {};
    KEYS.forEach(function (k) { out[k] = cs.getPropertyValue('--' + k).trim(); });
    el.remove();
    return out;
  }
  function pal(themeId) {
    themeId = themeId || currentTheme();
    var p = readVars(themeId);
    if (!p.sea && jsonPal) p = jsonPal[themeId] || jsonPal[THEMES[0].id];
    return p;
  }
  function buildJson(tokens) {
    var themes = tokens.color.themes.map(function (t) { return t.id; }), out = {};
    themes.forEach(function (id) { out[id] = {}; });
    tokens.color.tokens.forEach(function (t) {
      themes.forEach(function (id) {
        var v = typeof t.value === 'string' ? t.value : (t.value[id] || t.value[themes[0]]);
        out[id][t.name] = v;
      });
    });
    return out;
  }
  /* call cb once colours are readable (CSS vars, else tokens.json) */
  function ready(cb) {
    function go() { if (document.fonts && document.fonts.ready) document.fonts.ready.then(cb); else cb(); }
    if (pal().sea) return go();
    fetch('../../tokens.json').then(function (r) { return r.json(); }).then(function (j) { jsonPal = buildJson(j); go(); })
      .catch(function () { go(); });
  }
  function onTheme(cb) {
    var t = null;
    function fire() { clearTimeout(t); t = setTimeout(cb, 30); }
    new MutationObserver(fire).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style', 'class'] });
    if (document.head) new MutationObserver(fire).observe(document.head, { childList: true, subtree: true, characterData: true });
  }

  /* ---------- noise + dithering ---------- */
  var BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  function bay(x, y) { return (BAYER[y & 3][x & 3] + 0.5) / 16; }
  function hash(x, y, s) {
    var h = (x * 374761393 + y * 668265263 + (s || 0) * 982451653) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    h = h ^ (h >>> 16);
    return ((h >>> 0) % 10000) / 10000;
  }
  function vnoise(x, y, sc, s) {
    var fx = x / sc, fy = y / sc, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    var a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
    return (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
  }
  function fbm(x, y, s) { return vnoise(x * 0.6, y, 22, s) * 0.65 + vnoise(x, y, 9, s + 5) * 0.35; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------- sprites ---------- */
  var MAP = { o: 'outline', w: 'tower', r: 'stripe', k: 'roof', l: 'lamp', b: 'beam-core', y: 'beam', h: 'hull', H: 'hull-dark',
    s: 'sail', g: 'grass', d: 'land', c: 'rock', C: 'rock-light', f: 'frost', e: 'skin-2', i: 'outline', m: 'hull-dark',
    a: 'sea-light', t: 'crest', u: 'success', q: 'route', n: 'accent', S: 'star' };

  var SPRITES = {
    row: [
      '....e....',
      '...ere...',
      'ohhhhhhho',
      '.oHHHHHo.',
      '..ooooo..'],
    sail: [
      '.....o.....',
      '.....os....',
      '.....oss...',
      '.....osss..',
      '.....ossss.',
      '..e..osssss',
      '.ere.o.....',
      'ohhhhhhhhho',
      '.oHHHHHHHo.',
      '..ooooooo..'],
    fish: [
      '....o.......',
      '....o.......',
      '...owwwo....',
      '...owlwo.e..',
      'ohhhhhhhhhho',
      'ohhhhhhhhhho',
      '.oHHHHHHHHo.',
      '..oooooooo..'],
    storm: [
      '.........o..................',
      '.........o..................',
      '........ooo........oo.......',
      '.......owwwo......orro......',
      '.......owlwo......orro......',
      '..oooooooooooooooooooooooo..',
      '..owlwwlwwlwwlwwlwwlwwlwwo..',
      '..owwwwwwwwwwwwwwwwwwwwwwo..',
      'ohhhhhhhhhhhhhhhhhhhhhhhhhho',
      'ohhhhhhhhhhhhhhhhhhhhhhhhhho',
      '.oHHHHHHHHHHHHHHHHHHHHHHHHo.',
      '..oHHHHHHHHHHHHHHHHHHHHHHo..',
      '...oooooooooooooooooooooo...'],
    rock: [
      '...oo...',
      '..oCco..',
      '.oCCcco.',
      'oCCcccco'],
    flag: [
      'o.......',
      'orrrrr..',
      'orrrrrr.',
      'orrrrr..',
      'o.......',
      'o.......',
      'o.......',
      'oo......'],
    pot: [
      '.y...r.',
      'yly.rlr',
      '.yg.gr.',
      '..ggg..',
      'ohhhhho',
      '.ohhho.',
      '..ooo..'],
    gull: [
      'ss.....ss',
      '.ss...ss.',
      '...sos...',
      '....s....'],
    crab: [
      'r.r...r.r',
      '.r.....r.',
      '..rrrrr..',
      '.rroroor.',
      'r.r...r.r'],
    lantern: [
      '...o...',
      '..ooo..',
      '.olllo.',
      'olbbblo',
      '.olllo.',
      '..ooo..'],
    bunting: [
      'ooooooooooooooooo',
      '.rrr.sss.lll.rrr.',
      '..r...s...l...r..'],
    star: [
      '...y...',
      '...y...',
      '.yyyyy.',
      '..yby..',
      '.y...y.']
  };

  var HATS = {
    souwester: [
      '....oooo....',
      '...oHHHHo...',
      '..oHHHHHHo..',
      '.ooHHHHHHoo.',
      'oHHHHHHHHHHo'],
    beanie: [
      '.....oo.....',
      '....oHHo....',
      '..ooHHHHoo..',
      '.oHHHHHHHHo.',
      '.osHsHsHsHo.'],
    captain: [
      '............',
      '...oooooo...',
      '..osssssso..',
      '..oHHHHHHo..',
      '.oooooooooo.']
  };
  var BODY = [
    '.oeeeeeeeeo.',
    '.oeieeeeieo.',
    '.oeeeeeeeeo.',
    '.oeeemmeeeo.',
    '..oeeeeeeo..',
    '..oCCCCCCo..',
    '.oCCCCCCCCo.',
    'oCCoCCCCoCCo',
    'oeoCCCCCCoeo',
    '.ooCCCCCCoo.',
    '...oPPoPPo..',
    '...oPPoPPo..',
    '..oBBBoBBBo.',
    '..ooooooooo.'];

  function drawSprite(ctx, rows, x, y, p, opt) {
    opt = opt || {};
    var map = Object.assign({}, MAP, opt.map || {});
    var dimTo = opt.dimTo ? parse(p[opt.dimTo]) : null;
    for (var j = 0; j < rows.length; j++) {
      var row = rows[j];
      for (var i = 0; i < row.length; i++) {
        var ch = row.charAt(i);
        if (ch === '.' || ch === ' ') continue;
        var key = map[ch]; if (!key) continue;
        var col = p[key] || '#ff00ff';
        if (dimTo && opt.dim) col = hex(mixRGB(parse(col), dimTo, opt.dim));
        ctx.fillStyle = col;
        var xx = opt.flip ? x + (row.length - 1 - i) : x + i;
        ctx.fillRect(xx, y + j, 1, 1);
      }
    }
  }
  function spriteSize(rows) { return { w: Math.max.apply(null, rows.map(function (r) { return r.length; })), h: rows.length }; }

  function avatar(ctx, x, y, p, o) {
    o = o || {};
    var map = { H: o.hat || 'lamp', C: o.coat || 'stripe', e: o.skin || 'skin-2', P: 'roof', B: 'hull-dark', s: 'sail' };
    drawSprite(ctx, HATS[o.style || 'souwester'], x, y, p, { map: map });
    drawSprite(ctx, BODY, x, y + 5, p, { map: map });
  }

  /* ---------- lighthouse ---------- */
  var LH = { classic: { h: 34, lampY: 39 }, stubby: { h: 22, lampY: 28 }, stone: { h: 30, lampY: 35 } };

  function px(ctx, c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(x, y, w || 1, h || 1); }

  function lighthouse(ctx, p, bx, by, style, lit, frost) {
    style = style || 'classic';
    var g = LH[style], Ht = g.h, shade = function (c) { return mix(c, p.outline, 0.28); };
    var hw0 = style === 'stubby' ? 7 : style === 'stone' ? 5 : 6, hw1 = style === 'stubby' ? 6 : 4;
    if (style === 'stone') {
      // keeper's cottage
      var cx = bx + 6, cw = 13, ch = 8;
      px(ctx, p.outline, cx - 1, by - ch - 1, cw + 2, ch + 1);
      px(ctx, p.tower, cx, by - ch, cw, ch);
      px(ctx, shade(p.tower), cx + cw - 3, by - ch, 3, ch);
      for (var r = 0; r < 5; r++) px(ctx, r === 0 ? p.outline : p.stripe, cx - 1 + r, by - ch - 2 - r, cw + 2 - r * 2, 1);
      px(ctx, p.outline, cx + 2, by - 6, 4, 4);
      px(ctx, lit > 0.15 ? p.lamp : mix(p.lamp, p.outline, 0.4), cx + 3, by - 5, 2, 2);
      px(ctx, p.roof, cx + 8, by - 5, 3, 5);
    }
    for (var j = 0; j < Ht; j++) {
      var hw = Math.round(hw0 - (hw0 - hw1) * j / Ht), y = by - 1 - j, x0 = bx - hw, w = hw * 2;
      var base;
      if (style === 'classic') base = (Math.floor(j / 6) % 2 === 1) ? p.stripe : p.tower;
      else if (style === 'stubby') base = (j >= 7 && j <= 13) ? p.stripe : p.tower;
      else base = p['rock-light'];
      px(ctx, base, x0, y, w, 1);
      px(ctx, shade(base), x0 + Math.ceil(w * 0.62), y, w - Math.ceil(w * 0.62), 1);
      if (style === 'stone') {
        for (var i = 1; i < w - 1; i++) if (hash(i + j * 3, j, 4) > 0.8 || (j % 4 === 0 && i % 3 === (j / 4 % 2))) px(ctx, p.rock, x0 + i, y);
      }
      px(ctx, p.outline, x0 - 1, y); px(ctx, p.outline, x0 + w, y);
    }
    // door + window
    px(ctx, p.roof, bx - 1, by - 5, 2, 5);
    px(ctx, p.outline, bx - 1, by - Math.round(Ht * 0.6), 2, 3);
    if (style !== 'stone') px(ctx, mix(p.lamp, p.outline, 0.15), bx - 1, by - Math.round(Ht * 0.6) + 1, 1, 1);
    // gallery
    var gy = by - Ht - 1, gw = style === 'stubby' ? 16 : 14;
    px(ctx, p.outline, bx - gw / 2, gy, gw, 1);
    px(ctx, p.roof, bx - gw / 2 + 1, gy - 1, gw - 2, 1);
    for (var k = 0; k < gw; k += 2) px(ctx, p.roof, bx - gw / 2 + k, gy - 2, 1, 1);
    // lantern room
    var lw = style === 'stubby' ? 10 : 8, lh = style === 'stubby' ? 6 : 5, ly = gy - 2 - lh, lx = bx - lw / 2;
    var glass = lit > 0.55 ? p['beam-core'] : lit > 0.2 ? p.beam : mix(p.lamp, p.outline, 0.25);
    px(ctx, p.outline, lx - 1, ly, lw + 2, lh);
    px(ctx, glass, lx, ly, lw, lh);
    px(ctx, mix(glass, p.outline, 0.25), lx + lw / 2 - 1, ly, 1, lh);
    px(ctx, p.lamp, lx + lw / 2 - 1, ly + Math.floor(lh / 2) - 1, 2, 2);
    if (lit > 0.55) px(ctx, p['beam-core'], lx + lw / 2 - 1, ly + Math.floor(lh / 2) - 1, 2, 2);
    if (frost) {
      for (var fy = 0; fy < lh; fy++) for (var fx = 0; fx < lw; fx++) {
        if (fy === 0 || fx === 0 || fx === lw - 1 || ((fx + fy) % 3 === 0 && hash(fx, fy, 9) > 0.35)) px(ctx, p.frost, lx + fx, ly + fy);
      }
    }
    // roof
    if (style === 'stubby') {
      [12, 10, 8, 4].forEach(function (w, i) { px(ctx, p.roof, bx - w / 2, ly - 1 - i, w, 1); });
      px(ctx, p.outline, bx - 7, ly - 1, 1, 1); px(ctx, p.outline, bx + 6, ly - 1, 1, 1);
      px(ctx, p.outline, bx, ly - 6, 1, 2);
    } else {
      [12, 8, 4].forEach(function (w, i) { px(ctx, i === 0 ? p.outline : p.roof, bx - w / 2, ly - 1 - i, w, 1); });
      px(ctx, p.roof, bx - 5, ly - 1, 10, 1);
      px(ctx, p.outline, bx, ly - 5, 1, 2);
    }
    return { lx: bx, ly: ly + Math.floor(lh / 2) };
  }

  function island(ctx, p, bx, by) {
    for (var r = 0; r < 8; r++) {
      var hw = Math.round(15 + r * 1.4), y = by + r;
      if (r < 2) { px(ctx, r === 0 ? mix(p.grass, p.beam, 0.2) : p.grass, bx - hw, y, hw * 2, 1); }
      else {
        px(ctx, p.land, bx - hw, y, hw * 2, 1);
        for (var x = -hw; x < hw; x++) if (hash(x, r, 2) > 0.72) px(ctx, (x < 0) ? p['rock-light'] : p.rock, bx + x, y);
      }
      px(ctx, p.outline, bx - hw - 1, y); px(ctx, p.outline, bx + hw, y);
    }
    for (var f = -27; f < 27; f++) if ((f & 3) !== 3) px(ctx, p.crest, bx + f, by + 8);
    // dock
    var dx = bx + 22, dy = by + 3;
    px(ctx, p.hull, dx, dy, 22, 1); px(ctx, p['hull-dark'], dx, dy + 1, 22, 1);
    for (var k = 0; k < 22; k += 5) px(ctx, p['hull-dark'], dx + k, dy + 2, 1, 4);
    return { x: dx + 21, y: dy + 2 };
  }

  /* ---------- scene ---------- */
  var BOATS = {
    tide: [{ t: 'sail', x: 0.56, y: 0.56 }, { t: 'fish', x: 0.82, y: 0.8 }, { t: 'row', x: 0.38, y: 0.86 }, { t: 'row', x: 0.92, y: 0.47 }, { t: 'sail', x: 0.7, y: 0.42 }],
    storm: [{ t: 'storm', x: 0.7, y: 0.5 }, { t: 'row', x: 0.42, y: 0.84 }],
    dawn: [{ t: 'sail', x: 0.33, y: 0.78, docked: true }, { t: 'fish', x: 0.46, y: 0.8, docked: true }, { t: 'row', x: 0.58, y: 0.84 }, { t: 'row', x: 0.27, y: 0.86 }],
    none: []
  };
  var ROCKS = [{ x: 0.62, y: 0.66 }, { x: 0.76, y: 0.6 }, { x: 0.5, y: 0.74 }, { x: 0.88, y: 0.66 }];

  function harbour(canvas, o) {
    o = Object.assign({ w: 240, h: 135, attention: 0.6, steady: false, flare: false, fog: 'bands', fogDensity: 0.72, phase: 'tide',
      lighthouse: 'classic', frost: false, route: true, theme: null, seed: 7 }, o || {});
    var p = o.palette || pal(o.theme);
    var W = o.w, H = o.h;
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    var C = {}; KEYS.forEach(function (k) { C[k] = parse(p[k]); });
    var sy = H / 135, horizon = Math.round(H * 0.36);
    var bx = Math.round(W * 0.15), by = Math.round(H * 0.62);
    var g = LH[o.lighthouse] || LH.classic;
    var lampX = bx, lampY = by - g.lampY;
    var phase = o.phase;
    var att = o.flare ? 1 : (phase === 'lighting' ? Math.min(o.attention, 0.15) : (phase === 'dawn' ? 0.25 : o.attention));
    var a0 = Math.atan2(H * 0.68 - lampY, W * 0.8 - lampX);
    var half = 0.035 + 0.3 * att, len = W * (0.32 + 0.78 * att);
    var dens = o.fogDensity * ({ lighting: 1.0, calm: 0.55, tide: 1, storm: 1.3, dawn: 0.22 }[phase] || 1);

    function lit(x, y) {
      var dx = x - lampX, dy = y - lampY, dist = Math.sqrt(dx * dx + dy * dy), L = 0;
      var ang = Math.atan2(dy, dx) - a0;
      while (ang > Math.PI) ang -= 2 * Math.PI; while (ang < -Math.PI) ang += 2 * Math.PI;
      if (dist > 1 && Math.abs(ang) < half && dist < len) {
        var edge = 1 - Math.abs(ang) / half, fall = 1 - dist / len;
        L = Math.min(1, Math.pow(edge, 0.45) * (0.3 + 0.7 * Math.pow(fall, 0.6))) * clamp((att - 0.08) / 0.17, 0, 1);
        if (o.steady) L = Math.min(1, L * 1.25);
      }
      var gr = (4 + 10 * att) * sy, gl = Math.max(0, 1 - dist / gr);
      L = Math.max(L, gl);
      return { L: L, dist: dist, gl: gl };
    }

    var skyTop = C['sky-deep'], skyBot = C.sky;
    if (phase === 'dawn') { skyTop = mixRGB(C.sky, C['sky-deep'], 0.4); skyBot = mixRGB(C.sky, C.lamp, 0.5); }
    if (phase === 'storm') { skyTop = mixRGB(C['sky-deep'], C.outline, 0.5); skyBot = C['sky-deep']; }
    var seaTop = phase === 'dawn' ? mixRGB(C.sea, C.lamp, 0.18) : C.sea;
    var sunX = W * 0.72, sunR = 10 * sy;

    var img = ctx.createImageData(W, H), d = img.data;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var b = bay(x, y), c;
        if (y < horizon) {
          var t = y / horizon;
          c = t > b ? skyBot : skyTop;
          if (t * 2 - 1 > b && phase === 'dawn') c = mixRGB(skyBot, C.beam, 0.25);
          if (phase !== 'storm' && hash(x, y, 3) > (phase === 'calm' || phase === 'dawn' ? 0.982 : 0.99) && y < horizon - 5) c = C.star;
          if (phase === 'dawn') { var sd = Math.hypot(x - sunX, (y - horizon) * 1.1); if (sd < sunR) c = sd < sunR - 2 ? C.beam : C['beam-core']; }
        } else {
          var row = y - horizon, ts = row / (H - horizon);
          c = ts > b ? C['sea-deep'] : seaTop;
          if (row % 5 === 2 && ((x + row * 3) % 7) < 3 && hash(Math.floor((x + row * 3) / 7), row, 11) > 0.62) c = row < 10 ? C.crest : C['sea-light'];
          if (phase === 'dawn' && Math.abs(x - sunX) < sunR * (1 - row / (H - horizon)) && row % 3 !== 0 && hash(x >> 1, row, 6) > 0.4) c = C.beam;
        }
        var Lr = lit(x, y), L = Lr.L;
        // fog
        var n = fbm(x / sy, y / sy, o.seed);
        var depth = y < horizon ? 0.12 : 0.12 * (1 - (y - horizon) / (H - horizon));
        var fogA = clamp(dens * (n * 1.5 - 0.3) + depth * dens, 0, 1);
        var fv = clamp(fogA * (1 - 1.35 * L), 0, 1) * (o.flare ? 0.35 : 1);
        if (o.fog === 'bands') {
          var bandF = function (yy) {
            var nb = vnoise(x / sy * 0.3, yy / sy, 5, o.seed + 1) * 0.6 + vnoise(x / sy * 0.15, yy / sy, 12, o.seed + 2) * 0.4;
            return clamp(dens * (nb * 1.6 - 0.35) + depth * dens, 0, 1) * clamp(1 - 1.35 * lit(x, yy).L, 0, 1) * (o.flare ? 0.35 : 1);
          };
          var fb = bandF(y), fbUp = bandF(y - 1);
          if (fb > 0.55) c = C['fog-thick']; else if (fb > 0.28) c = C.fog;
          if (fb > 0.28 && fbUp <= 0.28) c = C['fog-thick'];
        } else if (o.fog === 'clouds') {
          var n2 = vnoise(x / sy, y * 1.6 / sy, 7, o.seed + 3) * 0.5 + n * 0.5;
          var m = fv * (0.55 + n2);
          var above = fogA * (1 - 1.35 * lit(x, y - 1).L) * (0.55 + vnoise(x / sy, (y - 1) * 1.6 / sy, 7, o.seed + 3) * 0.5 + fbm(x / sy, (y - 1) / sy, o.seed) * 0.5);
          if (m > 0.62) c = C['fog-thick']; else if (m > 0.4) c = C.fog;
          if (m > 0.4 && above <= 0.4) c = C['fog-thick'];
        } else {
          var lv = fv * 2;
          if (lv > b) c = C.fog;
          if (lv - 1 > b) c = C['fog-thick'];
        }
        // beam light
        if (o.flare) c = mixRGB(c, C.beam, 0.32);
        if (L > 0.02) {
          if (Lr.gl > 0.55) c = C['beam-core'];
          else {
            if (L * 1.1 > b) c = mixRGB(c, C.beam, 0.38);
            if (L * 1.1 - 0.55 > b * 0.6) c = mixRGB(c, C.beam, 0.7);
            if (o.steady && L > 0.82 && b < 0.2) c = C['beam-core'];
          }
        }
        // storm rain
        if (phase === 'storm' && ((x + y * 2) % 11 === 0) && hash(Math.floor((x + y * 2) / 11), Math.floor(y / 5), 13) > 0.55) c = mixRGB(c, C.crest, 0.6);
        var k = (y * W + x) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    // island, lighthouse, dock
    var dock = island(ctx, p, bx, by);
    lighthouse(ctx, p, bx, by, o.lighthouse, o.flare ? 1 : att, o.frost);

    // hidden rocks: only a steady beam (or flare) reveals them
    (o.hiddenRocks || ROCKS).forEach(function (r) {
      var rx = Math.round(r.x * W), ry = Math.round(r.y * H), Lv = lit(rx + 4, ry + 2).L;
      if (o.flare || (o.steady && Lv > 0.25)) {
        for (var f = -2; f < 10; f++) if ((f & 1) === 0) px(ctx, p.crest, rx + f, ry + 4);
        drawSprite(ctx, SPRITES.rock, rx, ry, p);
      }
    });

    // obstacles and islands drawn by the caller, under the boats
    if (o.underlay) o.underlay(ctx, p, function (x, y) { return lit(x, y).L; }, { W: W, H: H, steady: o.steady, flare: o.flare });

    // boats
    var list = o.boats || BOATS[phase === 'lighting' || phase === 'calm' ? 'none' : phase] || BOATS.tide;
    var first = null;
    list.forEach(function (bt, i) {
      var spr = SPRITES[bt.t], sz = spriteSize(spr), x = Math.round(bt.x * W - sz.w / 2), y = Math.round(bt.y * H - sz.h);
      if (bt.docked) { x = dock.x - 30 + i * 13; y = dock.y - sz.h + 3; }
      var Lv = lit(x + sz.w / 2, y + sz.h / 2).L, inLight = Lv > 0.22 || o.flare || phase === 'dawn' || bt.docked;
      drawSprite(ctx, spr, x, y, p, inLight ? { flip: bt.x > 0.5 && !bt.docked } : { dim: 0.6, dimTo: 'fog', flip: bt.x > 0.5 });
      if (!inLight) { px(ctx, p.lamp, x + Math.floor(sz.w / 2), y - 2, 1, 1); px(ctx, mix(p.lamp, p.fog, 0.5), x + Math.floor(sz.w / 2), y - 1, 1, 1); }
      for (var f = 0; f < sz.w; f += 3) px(ctx, p.crest, x + f, y + sz.h);
      if (inLight && !first && !bt.docked && bt.t !== 'storm') first = { x: x + sz.w / 2, y: y + sz.h - 1 };
      if (bt.t === 'storm') first = { x: x, y: y + sz.h - 1, storm: true };
    });

    // Pilot's route (dashed)
    if (o.route && first) {
      var pts = [[first.x, first.y], [(first.x + dock.x) / 2 + 6, Math.max(first.y, dock.y) + 8], [dock.x + 3, dock.y + 1]];
      var step = 0;
      for (var s = 0; s < pts.length - 1; s++) {
        var A = pts[s], B = pts[s + 1], n2 = Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]));
        for (var u = 0; u < n2; u++, step++) {
          if (step % 5 < 3) px(ctx, p.route, Math.round(A[0] + (B[0] - A[0]) * u / n2), Math.round(A[1] + (B[1] - A[1]) * u / n2));
        }
      }
      px(ctx, p.route, dock.x + 2, dock.y - 1, 3, 3); px(ctx, p.outline, dock.x + 3, dock.y, 1, 1);
    }

    // steady glints
    if (o.steady && !o.flare) {
      [0.35, 0.55, 0.75].forEach(function (f, i) {
        var gx = Math.round(lampX + Math.cos(a0 + (i - 1) * half * 0.5) * len * f), gy = Math.round(lampY + Math.sin(a0 + (i - 1) * half * 0.5) * len * f);
        px(ctx, p['beam-core'], gx, gy - 1); px(ctx, p['beam-core'], gx - 1, gy, 3, 1); px(ctx, p['beam-core'], gx, gy + 1);
      });
    }
    if (phase === 'dawn') { drawSprite(ctx, SPRITES.gull, Math.round(W * 0.48), Math.round(H * 0.16), p); drawSprite(ctx, SPRITES.gull, Math.round(W * 0.56), Math.round(H * 0.22), p); }
    return { lamp: { x: lampX, y: lampY }, dock: dock };
  }

  /* draw a canvas at an integer scale that fits a box width */
  function fit(canvas, maxW) {
    var s = Math.max(1, Math.floor(maxW / canvas.width));
    canvas.style.width = canvas.width * s + 'px';
    canvas.style.height = canvas.height * s + 'px';
    return s;
  }

  /* a canvas holding one sprite (or a custom draw fn) at an integer scale */
  function spriteCanvas(w, h, scale, drawFn, bgKey) {
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h; cv.className = 'lk-pixel-canvas';
    cv.style.width = w * scale + 'px'; cv.style.height = h * scale + 'px';
    var ctx = cv.getContext('2d'), p = pal();
    if (bgKey) { ctx.fillStyle = p[bgKey]; ctx.fillRect(0, 0, w, h); }
    drawFn(ctx, p);
    return cv;
  }

  window.LK = {
    spriteCanvas: spriteCanvas,
    THEMES: THEMES, KEYS: KEYS, pal: pal, ready: ready, onTheme: onTheme, currentTheme: currentTheme,
    mix: mix, parse: parse, hex: hex, drawSprite: drawSprite, spriteSize: spriteSize, SPRITES: SPRITES, HATS: HATS,
    avatar: avatar, lighthouse: lighthouse, island: island, harbour: harbour, fit: fit, px: px
  };
})();

/* ===== Lighthouse Keepers kit, part 2: obstacles, islands, decorations, progression ===== */
(function () {
  'use strict';
  var LK = window.LK, px = LK.px, mix = LK.mix;

  /* extra colour keys for sprite strings (base keys: see MAP in part 1) */
  var XMAP = { x: 'sea', D: 'sea-deep', F: 'fog', B: 'border', p: 'skin-1', P: 'skin-3' };
  function spr(ctx, rows, x, y, p, opt) {
    opt = Object.assign({}, opt || {}); opt.map = Object.assign({}, XMAP, opt.map || {});
    LK.drawSprite(ctx, rows, x, y, p, opt);
  }
  function size(rows) { return LK.spriteSize(rows); }

  /* ---------- obstacle sprites ---------- */
  var OB = {
    buoy: ['..o..', '.oro.', '.owo.', '.oro.', 'orrro', '.ooo.'],
    driftwood: ['.oooooooooo.', 'ohhHhhhhHhho', '.oooooooooo.'],
    jelly: ['.ttt.', 'taaat', 'tatat', '.a.a.', 'a.a.a'],
    floe: ['..fffff..', '.ffffftf.', 'oaaaaaaao'],
    traps: ['.r.......r.', 'oro.....oro', '.okkkkkkko.'],
    rockCluster: ['...oo.........', '..oCco....oo..', '.oCCcco..oCco.', 'oCCcccco.oCCco'],
    kelp: ['.g...g....g...g.', '.g..g.g...g..g..', 'g.g.g.g..g.g.g.g', 'g.g..g.g.g.g..g.', '.gg..gg..gg..gg.', '..g...g...g...g.'],
    sandbar: ['....ssssssssss......', '..sshssssshsssssss..', 'tssssssssssssshsssst', '.tttttttttttttttttt.'],
    net: ['r...r...r...r', 'tt.t.t.t.t.tt', 't.t.t.t.t.t.t', '.t.t.t.t.t.t.', 't.t.t.t.t.t.t'],
    whale: ['....t.t.............', '.....t..............', '...ooooooo..........', '..oaaaaaaaoo......oo', '.oaaiaaaaaaaoo...oao', 'oaaaaaaaaaaaaaoooao.', 'tttttttttttttttttttt'],
    current: ['t...t...t...', '.t...t...t..', '..t...t...t.', '.t...t...t..', 't...t...t...'],
    wreck: ['....o.......', '...rro......', '....o.......', '..ooooooo...', '....o.......', '....o.......', '..hhHhh.....', 'thhHHhhht...', 'tttttttttt..'],
    stack: ['...oooo...', '..oggggo..', '..oCccco..', '.oCCccco..', '.oCcccco..', '.oCCcccco.', '..oCccco..', '.oCCcccco.', '.oCcccccco', 'oCCcccccco', 'tttttttttt'],
    iceberg: ['.........oo..........', '........offo.........', '.......offffo........', '......offftffo.......', '.....offfffftfo......', '....offfftfffffo.....', '...offffffffftffo....', '..offfffffffffffffo..', 'ttttttttttttttttttttt'],
    pine: ['..g..', '.gdg.', '..g..', '.gdg.', 'ggdgg', '..h..'],
    seal: ['.CCC....', 'CiCCC...', '.CCCCCCo', '..oo.oo.'],
    cabin: ['...rrrr...', '..rrrrrr..', '.rrrrrrrr.', '..wwwwww..', '..wlwwHw..', '..wwwwHw..'],
    ruin: ['.C...', 'oCo.C', 'oCooC', 'oCCCC', 'oCcCC']
  };

  function whirlpool(ctx, p, cx, cy, r, litv) {
    for (var y = -r; y <= r; y++) for (var x = -r * 2; x <= r * 2; x++) {
      var d = Math.sqrt((x / 2) * (x / 2) + y * y); if (d > r) continue;
      var a = Math.atan2(y, x / 2), band = (d * 1.1 + a * 1.6 + 20) % 3;
      var c = band < 1 ? p.crest : band < 2 ? p['sea-light'] : p['sea-deep'];
      if (d < 1.5) c = p.outline;
      px(ctx, litv < 0.2 ? mix(c, p.fog, 0.5) : c, cx + x, cy + y);
    }
  }
  function stormWave(ctx, p, x, y, w) {
    for (var i = 0; i < w; i++) {
      var h = Math.round(2 + 2 * Math.sin(i / 3));
      px(ctx, p.crest, x + i, y - h, 1, 1); px(ctx, p['sea-light'], x + i, y - h + 1, 1, h);
    }
  }

  /* obstacle catalogue: size small | medium | large; reveal: always | steady (hidden until a steady beam) */
  var OBSTACLES = [
    { id: 'buoy', name: 'Channel buoy', size: 'small', tides: [1, 2, 3], reveal: 'always', moves: 'bobs in place',
      effect: 'Marks a safe lane. Boats steer around it; lit buoys glow so the Pilot can plan.' },
    { id: 'rock', name: 'Hidden rock', size: 'small', tides: [1, 2, 3], reveal: 'steady',
      effect: 'Invisible until a steady beam finds it, then stays on the Bay Chart. A boat that bumps one stops and bobs for 2 s, then waits for a new route. Never sinks.' },
    { id: 'driftwood', name: 'Driftwood log', size: 'small', tides: [1, 2], reveal: 'always', moves: 'drifts slowly across',
      effect: 'Slow moving blocker. Teaches the Pilot to time routes.' },
    { id: 'jelly', name: 'Jellyfish bloom', size: 'small', tides: [2], reveal: 'always', moves: 'pulses slowly',
      effect: 'Boats go half speed through it. Soft crest-coloured glow, never brighter than the beam.' },
    { id: 'traps', name: 'Lobster trap line', size: 'small', tides: [2], reveal: 'always',
      effect: 'Two floats and a rope. Routes may not cross the rope.' },
    { id: 'floe', name: 'Ice floe', size: 'small', tides: [3], reveal: 'always', moves: 'drifts with the current',
      effect: 'Small drifting blocker for the cold storm night.' },
    { id: 'rockCluster', name: 'Rock cluster', size: 'medium', tides: [2, 3], reveal: 'steady',
      effect: 'Three hidden rocks close together. One steady beam reveals the whole cluster.' },
    { id: 'kelp', name: 'Kelp bed', size: 'medium', tides: [2], reveal: 'always',
      effect: 'Boats move at half speed. Pilot dilemma: short slow route or long fast one.' },
    { id: 'sandbar', name: 'Sandbar', size: 'medium', tides: [2], reveal: 'always', moves: 'appears at low tide, mid-round',
      effect: 'Rises out of the water halfway through Tide 2 and blocks a lane until the tide turns.' },
    { id: 'net', name: 'Fishing net', size: 'medium', tides: [2], reveal: 'always',
      effect: 'Floating net. Boats must go around.' },
    { id: 'whale', name: 'Friendly whale', size: 'medium', tides: [2, 3], reveal: 'always', moves: 'surfaces, then dives',
      effect: 'Surfaces for ~8 s and blocks a lane, then dives. A fun moment, not a threat. Counts toward the Rescue Album "Special guests".' },
    { id: 'current', name: 'Current', size: 'medium', tides: [3], reveal: 'steady',
      effect: 'Pushes boats sideways along the arrows. Only shown under a steady beam, so the Keeper helps the Pilot read the water.' },
    { id: 'wreck', name: 'Old shipwreck', size: 'medium', tides: [3], reveal: 'always',
      effect: 'The mast shows; the hull under water is revealed by a steady beam. Explorer badge target.' },
    { id: 'stack', name: 'Sea stack', size: 'large', tides: [3], reveal: 'always',
      effect: 'Tall rock pillar. Narrows the bay into channels.' },
    { id: 'whirlpool', name: 'Whirlpool', size: 'large', tides: [3], reveal: 'always', moves: 'turns slowly',
      effect: 'Boats routed through it spin once and come out where they started — lost time, never lost boats.' },
    { id: 'iceberg', name: 'Iceberg', size: 'large', tides: [3], reveal: 'steady',
      effect: 'The tip is visible; its wide underwater shelf only shows under a steady beam. Routes over the shelf bump.' },
    { id: 'stormWave', name: 'Storm swell', size: 'large', tides: [3], reveal: 'always', moves: 'rolls across every ~20 s',
      effect: 'A slow swell crosses the bay before the Storm Ship. Boats in its path pause until it passes.' }
  ];

  function drawObstacle(ctx, p, id, x, y, opt) {
    opt = opt || {};
    var dim = opt.dim ? { dim: 0.55, dimTo: 'fog' } : {};
    if (id === 'rock') return spr(ctx, LK.SPRITES.rock, x, y, p, dim);
    if (id === 'whirlpool') return whirlpool(ctx, p, x + 10, y + 5, 5, opt.dim ? 0 : 1);
    if (id === 'stormWave') return stormWave(ctx, p, x, y + 5, 26);
    if (id === 'iceberg' && opt.revealed) {
      for (var i = -2; i < 25; i++) if ((i & 1) === 0) { px(ctx, p['sea-light'], x + i, y + 10); px(ctx, p['sea-light'], x + i + 1, y + 13); }
      px(ctx, p['sea-light'], x - 3, y + 11, 1, 2); px(ctx, p['sea-light'], x + 25, y + 11, 1, 2);
    }
    if (id === 'wreck' && opt.revealed) { for (var k = 0; k < 14; k++) if (k % 2 === 0) px(ctx, p['sea-light'], x - 1 + k, y + 10); }
    spr(ctx, OB[id], x, y, p, dim);
  }
  function obstacleSize(id) {
    if (id === 'rock') return size(LK.SPRITES.rock);
    if (id === 'whirlpool') return { w: 21, h: 11 };
    if (id === 'stormWave') return { w: 26, h: 7 };
    return size(OB[id]);
  }

  /* ---------- the three tides ---------- */
  var TIDES = [
    { n: 1, name: 'Still Water', goal: 'Learn the loop', boats: '3–4 (rowboats, sailboats)', fog: 0.65,
      newThing: 'Hidden rocks and the first steady beam',
      summary: 'Light fog, one small island, buoys marking an easy lane and a few hidden rocks. The Keeper learns that holding the light reveals things; the Pilot learns to draw routes.',
      place: [{ id: 'buoy', x: 0.46, y: 0.6 }, { id: 'buoy', x: 0.66, y: 0.74 }, { id: 'driftwood', x: 0.74, y: 0.5 }, { id: 'rock', x: 0.6, y: 0.66, hidden: true }, { id: 'rock', x: 0.82, y: 0.62, hidden: true }],
      islands: [{ id: 'pebble', x: 0.54, y: 0.86 }] },
    { n: 2, name: 'Kelp & Currents', goal: 'Make choices', boats: '4–5 (adds fishing boats)', fog: 0.8,
      newThing: 'Slow zones and a sandbar that appears mid-round',
      summary: 'Kelp beds and jellyfish slow boats down, a fishing net and trap lines block lanes, a sandbar rises at low tide, and a friendly whale surfaces once. Medium islands split the bay.',
      place: [{ id: 'kelp', x: 0.5, y: 0.7 }, { id: 'jelly', x: 0.72, y: 0.82 }, { id: 'net', x: 0.8, y: 0.56 }, { id: 'sandbar', x: 0.4, y: 0.9 }, { id: 'whale', x: 0.66, y: 0.46 }, { id: 'rockCluster', x: 0.6, y: 0.62, hidden: true }],
      islands: [{ id: 'crescent', x: 0.88, y: 0.8 }] },
    { n: 3, name: 'Storm Rising', goal: 'Hold the light', boats: '3 + the Storm Ship', fog: 1.0,
      newThing: 'Currents and an iceberg shelf only a steady beam shows',
      summary: 'Thick fog and rain. A whirlpool, an iceberg with a hidden shelf, a shipwreck, sea stacks and currents that only show under a steady beam. Ends with the Storm Ship.',
      place: [{ id: 'whirlpool', x: 0.55, y: 0.72 }, { id: 'iceberg', x: 0.76, y: 0.5 }, { id: 'stack', x: 0.42, y: 0.62 }, { id: 'wreck', x: 0.88, y: 0.76 }, { id: 'current', x: 0.66, y: 0.62, hidden: true }, { id: 'floe', x: 0.36, y: 0.86 }],
      islands: [{ id: 'arch', x: 0.9, y: 0.92 }] }
  ];

  /* ---------- islands: footprint = union of ellipses minus holes, then cliff + foam ---------- */
  var ISLANDS = [
    { id: 'pebble', name: 'Pebble Islet', size: 'small', w: 16, h: 10, top: 'grass', cliff: 2,
      blobs: [[8, 4, 6, 3]], deco: [['pine', 6, -3]], role: 'A single bump in the water. Good first-tide landmark.' },
    { id: 'sealRock', name: 'Seal Rock', size: 'small', w: 18, h: 10, top: 'rock', cliff: 2,
      blobs: [[6, 5, 5, 3], [12, 4, 4, 2]], deco: [['seal', 3, -1], ['seal', 10, -2]], role: 'Bare rock with seals. Rescue Album special guests live here.' },
    { id: 'pineIslet', name: 'Pine Islet', size: 'small', w: 16, h: 14, top: 'grass', cliff: 2,
      blobs: [[8, 8, 6, 3]], deco: [['pine', 3, 0], ['pine', 8, -2]], role: 'Tiny and tall. Hides boats behind it from the beam.' },
    { id: 'crescent', name: 'Crescent Isle', size: 'medium', w: 30, h: 16, top: 'grass', cliff: 3,
      blobs: [[15, 8, 13, 6]], holes: [[15, 11, 8, 5]], deco: [['pine', 4, 0], ['pine', 23, 0]], role: 'Its cove is a safe harbour: boats parked inside never drift.' },
    { id: 'twin', name: 'Twin Isles', size: 'medium', w: 34, h: 14, top: 'grass', cliff: 3,
      blobs: [[8, 7, 7, 4], [26, 6, 7, 4]], deco: [['pine', 4, 0], ['cabin', 21, -2]], role: 'A narrow channel between them is a shortcut, but only when lit.' },
    { id: 'spit', name: 'Long Spit', size: 'medium', w: 40, h: 8, top: 'sand', cliff: 1,
      blobs: [[20, 4, 18, 2], [6, 4, 5, 3]], deco: [], role: 'A long low sandbar that walls off half the bay.' },
    { id: 'birdCliff', name: 'Gull Cliff', size: 'medium', w: 26, h: 18, top: 'grass', cliff: 6,
      blobs: [[13, 6, 10, 4]], deco: [['gull', 4, -8], ['gull', 15, -10]], role: 'Tall cliffs that cast a shadow: the beam can\'t reach water right behind it.' },
    { id: 'lagoon', name: 'Horseshoe Lagoon', size: 'large', w: 46, h: 24, top: 'grass', cliff: 3,
      blobs: [[23, 11, 21, 9]], holes: [[23, 11, 14, 5], [23, 19, 6, 6]], deco: [['pine', 4, 2], ['pine', 38, 2], ['pine', 20, -3]], role: 'A ring with one gap. Boats inside the lagoon are safe from currents.' },
    { id: 'arch', name: 'Arch Rock', size: 'large', w: 40, h: 22, top: 'rock', cliff: 7, arch: [20, 4, 3],
      blobs: [[20, 7, 18, 5]], deco: [['gull', 30, -6]], role: 'Boats can sail through the arch — but only while the beam lights it.' },
    { id: 'forest', name: 'Pine Forest Isle', size: 'large', w: 44, h: 22, top: 'grass', cliff: 3,
      blobs: [[16, 10, 14, 6], [30, 9, 12, 5]], deco: [['pine', 6, 0], ['pine', 11, -2], ['pine', 33, -1], ['pine', 38, 1], ['cabin', 18, -1]], role: 'Big and cosy, with a cabin whose window lights when boats dock.' },
    { id: 'ruins', name: 'Old Keeper\'s Ruins', size: 'large', w: 38, h: 20, top: 'grass', cliff: 4,
      blobs: [[19, 9, 16, 6]], deco: [['ruin', 10, -2], ['ruin', 22, -1], ['pine', 30, 0]], role: 'The ruins of the first lighthouse. Lighting them unlocks a Logbook badge.' },
    { id: 'turtle', name: 'Turtle Island', size: 'large', w: 44, h: 22, top: 'grass', cliff: 3, turtle: true,
      blobs: [[22, 10, 13, 7], [38, 9, 4, 3], [12, 4, 4, 2], [12, 17, 4, 2], [32, 4, 4, 2], [32, 17, 4, 2], [6, 10, 3, 2]], deco: [], role: 'Shaped like a sleeping turtle. Kids spot it straight away; a favourite chart landmark.' }
  ];
  var ISLAND_BY_ID = {}; ISLANDS.forEach(function (i) { ISLAND_BY_ID[i.id] = i; });

  function drawIsland(ctx, p, id, ox, oy, opt) {
    opt = opt || {};
    var I = ISLAND_BY_ID[id];
    var inE = function (e, x, y) { var dx = (x - e[0]) / e[2], dy = (y - e[1]) / e[3]; return dx * dx + dy * dy <= 1; };
    var m = function (x, y) {
      if (x < 0 || y < 0 || x >= I.w || y >= I.h) return false;
      var ok = I.blobs.some(function (e) { return inE(e, x, y); });
      if (ok && I.holes) ok = !I.holes.some(function (e) { return inE(e, x, y); });
      return ok;
    };
    var cliffAt = function (x, y) { for (var k = 1; k <= I.cliff; k++) if (m(x, y - k) && !m(x, y)) return k; return 0; };
    var solid = function (x, y) { return m(x, y) || cliffAt(x, y) > 0; };
    var topC = I.top === 'rock' ? p['rock-light'] : I.top === 'sand' ? mix(p.sail, p.hull, 0.25) : p.grass;
    var dimC = function (c) { return opt.dim ? mix(c, p.fog, 0.55) : c; };
    for (var y = -2; y < I.h + I.cliff + 2; y++) for (var x = -2; x < I.w + 2; x++) {
      var c = null;
      if (m(x, y)) {
        c = topC;
        if (!m(x, y - 1)) c = mix(topC, p.tower, 0.18);
        if (I.turtle && (x * 7 + y * 3) % 9 === 0 && x > 12 && x < 32) c = p.land;
        if (I.top === 'rock' && ((x + y * 3) % 7 === 0)) c = p.rock;
      } else {
        var k = cliffAt(x, y);
        if (k) {
          c = (x * 5 + y * 3) % 11 === 0 ? p['rock-light'] : (I.top === 'sand' ? mix(p.sail, p.hull, 0.45) : (I.top === 'rock' ? p.rock : p.land));
          if (!solid(x, y + 1)) c = p.outline;
        } else if (solid(x, y - 1) && !solid(x, y)) { if ((x & 1) === 0) c = p.crest; }
        else if ((solid(x - 1, y) || solid(x + 1, y)) && (y & 1) === 0) c = p.crest;
      }
      if (c) px(ctx, dimC(c), ox + x, oy + y);
    }
    if (I.arch) { // carve a passage through the cliff
      var ax = I.arch[0], aw = I.arch[2];
      for (var yy = 0; yy < I.cliff; yy++) for (var xx = -aw; xx <= aw; xx++) {
        var ty = I.blobs[0][1] + I.blobs[0][3] + yy - 1;
        if (Math.abs(xx) <= aw - (yy < 2 ? 2 - yy : 0)) px(ctx, opt.lit ? mix(p.sea, p.beam, 0.4) : p['sea-deep'], ox + ax + xx, oy + ty);
      }
    }
    (I.deco || []).forEach(function (d) {
      var s = OB[d[0]] || LK.SPRITES[d[0]]; if (!s) return;
      var sx = ox + d[1], sy = oy + d[2];
      spr(ctx, s, sx, sy, p, opt.dim ? { dim: 0.55, dimTo: 'fog' } : {});
    });
  }

  /* ---------- decorations ---------- */
  var DS = {
    pennant: ['o........', 'oqqqqqqq.', 'oqqqqq...', 'oqqq.....', 'o........', 'o........', 'o........', 'oo.......'],
    weathervane: ['....o....', '..ooooo.o', '.oCCCCCoo', 'oCiCCCCCo', '.oCCCCCoo', '..ooooo.o', '....o....', '...ooo...', '....o....'],
    starTopper: ['...l...', '..lSl..', 'lllSlll', '.llSll.', '..lll..', '.ll.ll.', '...o...', '...o...'],
    bell: ['...o...', '..ooo..', '.olllo.', '.olllo.', 'olllllo', 'ooooooo', '...l...'],
    windsock: ['o.........', 'orrwwrrw..', 'orrwwrrww.', 'orrwwrr...', 'o.........', 'o.........', 'oo........'],
    crown: ['l...l...l', 'll.lll.ll', 'lllllllll', 'lrllqllrl', 'lllllllll'],
    stringLights: ['oo.....ooo.....oo', '..ooooo...ooooo..', '..l..q..u..l..q..'],
    lanternRow: ['ooooooooooooooooo', '.o...o...o...o...', 'olo.olo.olo.olo..', 'olo.olo.olo.olo..', '.o...o...o...o...'],
    paperLanterns: ['ooooooooooooooooo', '..o.....o.....o..', '.rrr...qqq...uuu.', '.rrr...qqq...uuu.', '..r.....q.....u..'],
    garland: ['ggggggggggggggggg', '.r.g.u.g.q.g.r.g.', '..g...g...g...g..'],
    icicles: ['fffffffffffffffff', '.f.f..f.f..f.f..f', '.f....f....f.....'],
    wreath: ['.ggg.', 'g...g', 'g...g', '.grg.', '..r..'],
    mat: ['rrrrrr', 'rwrwrw'],
    doorLantern: ['.o.', 'olo', 'olo', '.o.'],
    flowerArch: ['..rgur..', '.g....g.', 'r......u', 'g......g', 'g......g', 'g......g', 'g......g'],
    boots: ['HH.HH', 'HH.HH', 'oo.oo'],
    curtains: ['rrrr', 'r..r', 'r..r'],
    windowPlant: ['.u.', 'ggg', 'hhh'],
    windowStar: ['.l.', 'lll', '.l.'],
    sunflower: ['.lll.', 'llhll', '.lll.', '..g..', 'gg.g.', '..ggg', '..g..', '..g..'],
    bench: ['hhhhhhhhh', 'HHHHHHHHH', 'hhhhhhhhh', 'H.......H', 'H.......H'],
    mailbox: ['.ooo.', 'oqqqo', 'oqqqo', 'ooooo', '..h..', '..h..', '..h..', '..H..'],
    birdhouse: ['..r..', '.rrr.', 'rrrrr', '.www.', '.wow.', '.www.', '..h..', '..h..', '..H..'],
    telescope: ['......oo', '....oCCo', '..oCCCo.', '.oCCo...', '...h....', '..h.h...', '.h...h..'],
    sandcastle: ['.s.....s.', 'sss.r.sss', 'sssssssss', 'shssossss', 'sssooosss', 'hhhhhhhhh'],
    tent: ['....o....', '...oro...', '..orrro..', '.orrorro.', 'orrooorro', 'ooooooooo'],
    snowman: ['..kkk..', '.kkkkk.', '..www..', '.wiwiw.', '..wlw..', '.wwwww.', 'wwwwwww', '.wwwww.', 'wwwwwww', '.wwwww.'],
    pumpkin: ['...g...', '.lllll.', 'lllllll', 'lhllhll', '.lllll.'],
    picnic: ['rwrwrwrwr', 'wrwrwrwrw', 'rwrwrwrwr'],
    birdbath: ['oaaaaao', '.ooooo.', '...C...', '...C...', '..CCC..', '.ooooo.'],
    signpost: ['ooooo..', 'ohhhhho', 'ooooo..', '..h....', '..h....', '..h....', '..H....'],
    gnome: ['..r..', '.rrr.', 'rrrrr', '.ppp.', '.sss.', 'qqsqq', '.qqq.', '.H.H.'],
    shells: ['..l...', '.sls.r', 'ssssrr'],
    sapling: OB.pine,
    cat: ['o...o..', 'oCoCo..', 'CiCiC..', '.CCC..o', '.CCCC.C', '.CCCCCo', '.C.C...'],
    dog: ['oo......', 'hho.....', 'hihhh...', '.hhhhhhh', '..hhhhh.', '..h.h.h.'],
    puffin: ['.ooo.', 'owiwo', 'owwrl', 'ooww.', 'ooww.', '.ow..', '.ll..'],
    sealPup: ['.CCC....', 'CiCCC...', '.CCCCCCo', '..oo.oo.'],
    turtle: ['..uuuu...', '.uggugu..', 'uguuuguoo', '.oo..oo..'],
    otter: ['.hh....', 'hihh...', '.hhhh..', '.hshhh.', '..hhhhh', '..h..h.'],
    goose: ['.oo...', 'owo...', '.o....', '.o....', '.hhhh.', 'hhhhhhh', '.hhhh..', '..o.o..'],
    trap: ['ooooooo', 'oh.h.ho', 'ohhhhho', 'oh.h.ho', 'ooooooo'],
    lifeRing: ['.rwr.', 'w...w', 'r...r', 'w...w', '.rwr.'],
    anchor: ['..C..', '.C.C.', '..C..', 'CCCCC', '..C..', 'C.C.C', '.CCC.'],
    rod: ['......o', '.....o.', '....o.t', '...o..t', '..o...t', '.o....l', 'h......'],
    crates: ['ooooo..', 'ohHho..', 'ooooooo', 'ohHhohH', 'ooooooo'],
    dockLantern: ['.o.', 'olo', 'olo', '.o.', '.h.', '.h.', '.H.'],
    kite: ['...q...', '..qqq..', '.qqnqq.', 'qqnnnqq', '.qqnqq.', '..qqq..', '...q...', '....o..', '...r...', '....o..'],
    balloon: ['..rrrrr..', '.rwrwrwr.', 'rwrwrwrwr', 'rwrwrwrwr', '.rwrwrwr.', '..rwrwr..', '...o.o...', '...o.o...', '...hhh...', '...hhh...'],
    plane: ['www....', '.wwwwww', '..www..'],
    fireflies: ['l.......l', '.........', '...l.....', '.......l.', 'l........', '....l....', '.l.....l.']
  };
  Object.keys(DS).forEach(function (k) { LK.SPRITES[k] = DS[k]; });
  Object.keys(OB).forEach(function (k) { if (!LK.SPRITES[k]) LK.SPRITES[k] = OB[k]; });

  /* slots on the decorated lighthouse (classic tower, base at bx,by). Each slot holds one item. */
  var SLOTS = [
    { id: 'topper', name: 'Roof top', ax: 0, ay: -47, anchor: 'bottom' },
    { id: 'gallery', name: 'Balcony', ax: -8, ay: -34, anchor: 'top-left' },
    { id: 'tower', name: 'Tower paint', ax: 0, ay: -20, anchor: 'paint' },
    { id: 'window', name: 'Window', ax: -2, ay: -22, anchor: 'top-left' },
    { id: 'door', name: 'Door', ax: 0, ay: 0, anchor: 'door' },
    { id: 'gardenL', name: 'Garden (left)', ax: -10, ay: 1, anchor: 'bottom' },
    { id: 'gardenR', name: 'Garden (right)', ax: 12, ay: 1, anchor: 'bottom' },
    { id: 'pet', name: 'Friend', ax: 6, ay: 2, anchor: 'bottom' },
    { id: 'dock', name: 'Dock', ax: 33, ay: 3, anchor: 'bottom' },
    { id: 'sky', name: 'Sky', ax: 30, ay: -30, anchor: 'bottom' }
  ];
  var SLOT_BY_ID = {}; SLOTS.forEach(function (s) { SLOT_BY_ID[s.id] = s; });

  var CATS = [
    { id: 'toppers', name: 'Toppers' }, { id: 'lights', name: 'Lights' }, { id: 'paint', name: 'Paint' },
    { id: 'garden', name: 'Garden' }, { id: 'friends', name: 'Friends' }, { id: 'dock', name: 'Dock' },
    { id: 'sky', name: 'Sky' }, { id: 'seasonal', name: 'Seasonal' }
  ];

  // [id, name, category, slot(s), price, sprite, blurb, extra]
  var RAW = [
    ['flag', 'Flag', 'toppers', 'topper', 3, 'flag', 'Waves hello to every boat.'],
    ['pennant', 'Long pennant', 'toppers', 'topper', 4, 'pennant', 'A long ribbon flag.'],
    ['weathervane', 'Fish weathervane', 'toppers', 'topper', 6, 'weathervane', 'Points where the wind blows.'],
    ['starTopper', 'Star topper', 'toppers', 'topper', 8, 'starTopper', 'A golden star on the roof.'],
    ['bell', 'Harbour bell', 'toppers', 'topper', 5, 'bell', 'Rings softly when a boat docks.'],
    ['windsock', 'Windsock', 'toppers', 'topper', 4, 'windsock', 'Striped and floppy.'],
    ['crown', 'Golden crown', 'toppers', 'topper', 12, 'crown', 'For the Keeper of all Keepers.', { tag: 'rare' }],
    ['bunting', 'Bunting', 'lights', 'gallery', 5, 'bunting', 'Little flags on the balcony.'],
    ['stringLights', 'String lights', 'lights', 'gallery', 7, 'stringLights', 'Tiny coloured bulbs.'],
    ['lanternRow', 'Lantern row', 'lights', 'gallery', 8, 'lanternRow', 'Four warm lanterns.'],
    ['paperLanterns', 'Paper lanterns', 'lights', 'gallery', 8, 'paperLanterns', 'Round and colourful.', { tag: 'new' }],
    ['garland', 'Flower garland', 'lights', 'gallery', 6, 'garland', 'Flowers all the way round.'],
    ['paintClassic', 'Classic stripes', 'paint', 'tower', 0, null, 'The stripes you start with.', { paint: 'bands', color: 'stripe', owned: true }],
    ['paintBlue', 'Blue stripes', 'paint', 'tower', 6, null, 'Stripes in sky blue.', { paint: 'bands', color: 'route' }],
    ['paintSpiral', 'Candy spiral', 'paint', 'tower', 10, null, 'Twisty like a candy cane.', { paint: 'spiral', color: 'stripe' }],
    ['paintDots', 'Polka dots', 'paint', 'tower', 8, null, 'Dotty all over.', { paint: 'dots', color: 'route' }],
    ['paintChecker', 'Checkers', 'paint', 'tower', 10, null, 'Like a game board.', { paint: 'checker', color: 'stripe' }],
    ['paintWaves', 'Waves', 'paint', 'tower', 10, null, 'Waves that match the sea.', { paint: 'waves', color: 'sea-light' }],
    ['paintGreen', 'Two-tone green', 'paint', 'tower', 8, null, 'Green top, white bottom.', { paint: 'twotone', color: 'success' }],
    ['paintWhite', 'All white', 'paint', 'tower', 4, null, 'Clean and simple.', { paint: 'none', color: 'stripe' }],
    ['wreath', 'Door wreath', 'garden', 'door', 4, 'wreath', 'A green ring for the door.'],
    ['mat', 'Welcome mat', 'garden', 'door', 2, 'mat', 'Wipe your boots!'],
    ['doorLantern', 'Door lantern', 'lights', 'door', 5, 'doorLantern', 'Lights the way in.'],
    ['flowerArch', 'Flower arch', 'garden', 'door', 7, 'flowerArch', 'Flowers over the door.'],
    ['boots', 'Rain boots', 'garden', 'door', 3, 'boots', 'Left by the door.'],
    ['curtains', 'Curtains', 'garden', 'window', 3, 'curtains', 'Cosy window curtains.'],
    ['windowPlant', 'Window plant', 'garden', 'window', 4, 'windowPlant', 'A plant on the sill.'],
    ['windowStar', 'Window star', 'lights', 'window', 4, 'windowStar', 'A paper star in the window.'],
    ['pot', 'Flower pot', 'garden', 'gardenL gardenR', 4, 'pot', 'Bright flowers.'],
    ['sunflower', 'Sunflower', 'garden', 'gardenL gardenR', 5, 'sunflower', 'Tall and sunny.'],
    ['bench', 'Bench', 'garden', 'gardenL gardenR', 6, 'bench', 'Sit and watch the boats.'],
    ['mailbox', 'Mailbox', 'garden', 'gardenL gardenR', 4, 'mailbox', 'Letters from rescued passengers.'],
    ['birdhouse', 'Birdhouse', 'garden', 'gardenL gardenR', 5, 'birdhouse', 'A home for small birds.'],
    ['telescope', 'Telescope', 'garden', 'gardenL gardenR', 9, 'telescope', 'Spot boats far away.'],
    ['sandcastle', 'Sandcastle', 'garden', 'gardenL gardenR', 4, 'sandcastle', 'With a tiny flag.'],
    ['tent', 'Camping tent', 'garden', 'gardenL gardenR', 8, 'tent', 'Sleep under the stars.'],
    ['picnic', 'Picnic blanket', 'garden', 'gardenL gardenR', 5, 'picnic', 'Snack time!'],
    ['birdbath', 'Bird bath', 'garden', 'gardenL gardenR', 6, 'birdbath', 'Gulls love a splash.'],
    ['signpost', 'Signpost', 'garden', 'gardenL gardenR', 3, 'signpost', 'Points the way home.'],
    ['gnome', 'Garden gnome', 'garden', 'gardenL gardenR', 5, 'gnome', 'Keeps watch at night.'],
    ['shells', 'Shell pile', 'garden', 'gardenL gardenR', 2, 'shells', 'Found on the beach.'],
    ['sapling', 'Pine sapling', 'garden', 'gardenL gardenR', 3, 'sapling', 'It will grow tall one day.'],
    ['cat', 'Lighthouse cat', 'friends', 'pet', 8, 'cat', 'Naps in the warm lamp room.'],
    ['dog', 'Harbour pup', 'friends', 'pet', 8, 'dog', 'Barks happily at boats.'],
    ['puffin', 'Puffin', 'friends', 'pet', 10, 'puffin', 'Small, round, very proud.', { tag: 'new' }],
    ['sealPup', 'Seal pup', 'friends', 'pet', 10, 'sealPup', 'Flops on the rocks.'],
    ['crab', 'Crab friend', 'friends', 'pet', 4, 'crab', 'Walks sideways.'],
    ['turtle', 'Sea turtle', 'friends', 'pet', 9, 'turtle', 'Slow and steady.'],
    ['otter', 'Otter', 'friends', 'pet', 12, 'otter', 'Holds a shell.', { tag: 'rare' }],
    ['goose', 'Canada goose', 'friends', 'pet', 7, 'goose', 'Honk.'],
    ['buoy', 'Red buoy', 'dock', 'dock', 3, 'buoy', 'Bobs by the dock.'],
    ['trap', 'Lobster trap', 'dock', 'dock', 4, 'trap', 'Empty, the lobster went home.'],
    ['lifeRing', 'Life ring', 'dock', 'dock', 4, 'lifeRing', 'Safety first.'],
    ['anchor', 'Anchor', 'dock', 'dock', 6, 'anchor', 'Heavy and shiny.'],
    ['rowboat', 'Little rowboat', 'dock', 'dock', 8, 'row', 'Your very own boat.'],
    ['rod', 'Fishing rod', 'dock', 'dock', 5, 'rod', 'For quiet mornings.'],
    ['crates', 'Crates', 'dock', 'dock', 3, 'crates', 'Supplies for the keeper.'],
    ['dockLantern', 'Dock lantern', 'lights', 'dock', 5, 'dockLantern', 'Glows at the end of the dock.'],
    ['kite', 'Kite', 'sky', 'sky', 6, 'kite', 'Flies over the island.'],
    ['balloon', 'Hot-air balloon', 'sky', 'sky', 12, 'balloon', 'Floats past at dawn.', { tag: 'rare' }],
    ['gulls', 'Seagulls', 'sky', 'sky', 2, 'gull', 'Two noisy friends.'],
    ['plane', 'Paper plane', 'sky', 'sky', 3, 'plane', 'Folded from a chart.'],
    ['fireflies', 'Fireflies', 'sky', 'sky', 6, 'fireflies', 'Tiny lights that drift slowly.'],
    ['icicles', 'Icicle lights', 'seasonal', 'gallery', 6, 'icicles', 'Winter sparkle.', { season: 'winter' }],
    ['snowman', 'Snowman', 'seasonal', 'gardenL gardenR', 6, 'snowman', 'Winter only.', { season: 'winter' }],
    ['pumpkin', 'Pumpkin', 'seasonal', 'gardenL gardenR', 4, 'pumpkin', 'Autumn only.', { season: 'autumn' }]
  ];
  var DECOR = RAW.map(function (r) {
    var e = r[7] || {};
    return Object.assign({ id: r[0], name: r[1], category: r[2], slots: r[3].split(' '), price: r[4], sprite: r[5], blurb: r[6] }, e);
  });
  var DECOR_BY_ID = {}; DECOR.forEach(function (d) { DECOR_BY_ID[d.id] = d; });

  function itemSprite(id) { var d = DECOR_BY_ID[id]; return d && d.sprite ? LK.SPRITES[d.sprite] : null; }

  /* painted classic tower: redraws the tower body over LK.lighthouse */
  function paintTower(ctx, p, bx, by, paint, colorKey) {
    var Ht = 34, col = p[colorKey] || p.stripe;
    for (var j = 0; j < Ht; j++) {
      var hw = Math.round(6 - 2 * j / Ht), y = by - 1 - j, x0 = bx - hw, w = hw * 2;
      for (var i = 0; i < w; i++) {
        var on;
        switch (paint) {
          case 'spiral': on = ((i + j) % 8) < 3; break;
          case 'dots': on = (i % 4 === 1 && j % 4 === 1); break;
          case 'checker': on = ((Math.floor(i / 2) + Math.floor(j / 3)) % 2) === 0; break;
          case 'waves': on = ((j + Math.round(Math.sin(i * 1.1) * 1.4) + 12) % 6) < 2; break;
          case 'twotone': on = j > Ht / 2; break;
          case 'none': on = false; break;
          default: on = Math.floor(j / 6) % 2 === 1;
        }
        var c = on ? col : p.tower;
        if (i >= Math.ceil(w * 0.62)) c = mix(c, p.outline, 0.28);
        px(ctx, c, x0 + i, y);
      }
    }
    px(ctx, p.roof, bx - 1, by - 5, 2, 5);
    px(ctx, p.outline, bx - 1, by - 20, 2, 3);
    px(ctx, mix(p.lamp, p.outline, 0.15), bx - 1, by - 19, 1, 1);
  }

  function placeItem(ctx, p, slotId, itemId, bx, by, opt) {
    var s = SLOT_BY_ID[slotId], d = DECOR_BY_ID[itemId]; if (!s || !d) return;
    if (s.anchor === 'paint') return;
    var rows = itemSprite(itemId); if (!rows) return;
    var sz = size(rows), x, y;
    if (s.anchor === 'bottom') { x = bx + s.ax - Math.floor(sz.w / 2); y = by + s.ay - sz.h; }
    else if (s.anchor === 'door') {
      var doorPos = { wreath: [-3, -10], mat: [-3, 0], doorLantern: [2, -7], flowerArch: [-4, -7], boots: [2, -3] }[itemId] || [-2, -6];
      x = bx + doorPos[0]; y = by + doorPos[1];
    } else { x = bx + s.ax; y = by + s.ay; }
    spr(ctx, rows, x, y, p, opt);
  }

  /* the whole decorate view: sky, sea, island, painted tower, items, optional slot markers */
  function decoratedScene(ctx, p, placed, opt) {
    opt = opt || {};
    var W = opt.w || 84, H = opt.h || 72, bx = opt.bx || 30, by = opt.by || 56;
    for (var y = 0; y < H; y++) {
      var c = y < by - 2 ? (y < (by - 2) / 2 ? p['sky-deep'] : p.sky) : (y < by + 9 ? p.sea : p['sea-deep']);
      ctx.fillStyle = c; ctx.fillRect(0, y, W, 1);
    }
    for (var s = 0; s < 18; s++) { var sx = (s * 37) % W, sy = (s * 23) % (by - 14); px(ctx, p.star, sx, sy); }
    LK.island(ctx, p, bx, by);
    LK.lighthouse(ctx, p, bx, by, 'classic', 0.4, false);
    var paintItem = DECOR_BY_ID[placed.tower] || DECOR_BY_ID.paintClassic;
    paintTower(ctx, p, bx, by, paintItem.paint, paintItem.color);
    SLOTS.forEach(function (sl) { if (placed[sl.id]) placeItem(ctx, p, sl.id, placed[sl.id], bx, by); });
    if (opt.markers) SLOTS.forEach(function (sl) {
      if (sl.id === 'tower' || placed[sl.id]) return;
      var mx = bx + sl.ax + (sl.anchor === 'top-left' ? 2 : 0), my = by + sl.ay - (sl.anchor === 'bottom' ? 3 : 0) + (sl.anchor === 'door' ? -3 : 0);
      var hi = opt.highlight === sl.id;
      var c = hi ? p.beam : p.crest;
      // corner brackets around a plus sign
      [[-3, -3, 1, 1], [3, -3, -1, 1], [-3, 3, 1, -1], [3, 3, -1, -1]].forEach(function (k) { px(ctx, c, mx + k[0], my + k[1]); px(ctx, c, mx + k[0] + k[2], my + k[1]); px(ctx, c, mx + k[0], my + k[1] + k[3]); });
      px(ctx, hi ? p.beam : p['beam-core'], mx, my - 1, 1, 3); px(ctx, hi ? p.beam : p['beam-core'], mx - 1, my, 3, 1);
    });
    return { bx: bx, by: by };
  }

  /* a shop / bag tile for one item */
  function itemTile(ctx, p, id, w, h) {
    var d = DECOR_BY_ID[id];
    if (d.paint) { // small tower swatch
      var bx = Math.floor(w / 2), by = h - 2;
      for (var j = 0; j < 14; j++) for (var i = 0; i < 8; i++) {
        var jj = Math.round(j * 34 / 14), on;
        switch (d.paint) {
          case 'spiral': on = ((i + jj) % 8) < 3; break;
          case 'dots': on = (i % 4 === 1 && jj % 4 === 1); break;
          case 'checker': on = ((Math.floor(i / 2) + Math.floor(jj / 3)) % 2) === 0; break;
          case 'waves': on = ((jj + Math.round(Math.sin(i * 1.1) * 1.4) + 12) % 6) < 2; break;
          case 'twotone': on = jj > 17; break;
          case 'none': on = false; break;
          default: on = Math.floor(jj / 6) % 2 === 1;
        }
        var c = on ? p[d.color] : p.tower; if (i >= 5) c = mix(c, p.outline, 0.28);
        px(ctx, c, bx - 4 + i, by - j);
      }
      px(ctx, p.outline, bx - 5, by - 13, 1, 14); px(ctx, p.outline, bx + 4, by - 13, 1, 14); px(ctx, p.roof, bx - 5, by - 15, 10, 2);
      return;
    }
    var rows = itemSprite(id), sz = size(rows);
    spr(ctx, rows, Math.floor((w - sz.w) / 2), Math.floor((h - sz.h) / 2), p);
  }

  /* ---------- progression ---------- */
  var ECONOMY = {
    currency: 'Sea stars',
    earn: [
      { what: 'Every 2 passengers brought home', stars: 1 },
      { what: 'Each steady beam', stars: 1 },
      { what: 'Each flare', stars: 3 },
      { what: 'Storm Ship brought home', stars: 5 },
      { what: 'First visit to a new island on the Bay Chart', stars: 2 },
      { what: 'Badge earned (Logbook)', stars: '5–20 by tier' },
      { what: 'Every 7th lantern on the Lantern String', stars: 10 }
    ],
    typicalNight: '12–20 sea stars (e.g. 14 passengers = 7, 6 steady beams = 6, 1 flare = 3)',
    priceBands: [{ band: 'Small', range: '2–4' }, { band: 'Nice', range: '5–8' }, { band: 'Special', range: '9–12' }, { band: 'Rank rewards', range: 'not for sale — unlocked by Keeper Rank' }],
    rules: ['Sea stars are never taken away.', 'Prices never change and there are no random boxes.', 'Shop opens only between tides and at Dawn — never during a tide.']
  };

  var BADGES = [
    { id: 'firstLight', name: 'First Light', group: 'Light', icon: 'starTopper', goal: 1, have: 1, tier: 'gold', text: 'Make your first steady beam.' },
    { id: 'steadyHand', name: 'Steady Hand', group: 'Light', icon: 'lantern', goal: 25, have: 25, tier: 'silver', text: '25 steady beams.' },
    { id: 'lighthouseHeart', name: 'Heart of the Lighthouse', group: 'Light', icon: 'lantern', goal: 100, have: 41, tier: 'gold', text: '100 steady beams.' },
    { id: 'flareMaker', name: 'Flare Maker', group: 'Light', icon: 'star', goal: 10, have: 6, tier: 'silver', text: 'Light the whole bay 10 times.' },
    { id: 'firstRescue', name: 'Welcome Home', group: 'Rescue', icon: 'row', goal: 1, have: 1, tier: 'bronze', text: 'Bring your first boat home.' },
    { id: 'harbourFull', name: 'Full Harbour', group: 'Rescue', icon: 'fish', goal: 100, have: 100, tier: 'silver', text: '100 passengers home.' },
    { id: 'thousand', name: 'Thousand Lights', group: 'Rescue', icon: 'sail', goal: 1000, have: 312, tier: 'gold', text: '1,000 passengers home.' },
    { id: 'stormChaser', name: 'Storm Chaser', group: 'Rescue', icon: 'storm', goal: 5, have: 2, tier: 'gold', text: 'Bring the Storm Ship home 5 times.' },
    { id: 'rockSpotter', name: 'Rock Spotter', group: 'Explorer', icon: 'rock', goal: 25, have: 25, tier: 'bronze', text: 'Reveal 25 hidden rocks.' },
    { id: 'whaleWatcher', name: 'Whale Watcher', group: 'Explorer', icon: 'whale', goal: 3, have: 1, tier: 'silver', text: 'See the friendly whale 3 times.' },
    { id: 'chartMaker', name: 'Chart Maker', group: 'Explorer', icon: 'signpost', goal: 4, have: 2, tier: 'gold', text: 'Finish all 4 regions of the Bay Chart.' },
    { id: 'archSailor', name: 'Through the Arch', group: 'Explorer', icon: 'sail', goal: 1, have: 0, tier: 'silver', text: 'Sail a boat through Arch Rock.' },
    { id: 'teamNight', name: 'Team Night', group: 'Together', icon: 'bench', goal: 1, have: 1, tier: 'bronze', text: 'Finish your first night together.' },
    { id: 'tenNights', name: 'Ten Nights', group: 'Together', icon: 'lanternRow', goal: 10, have: 10, tier: 'silver', text: 'Play 10 nights together (any days!).' },
    { id: 'pilotPro', name: 'Pilot\'s Pride', group: 'Together', icon: 'anchor', goal: 50, have: 33, tier: 'silver', text: '50 routes drawn that brought boats home.' },
    { id: 'decorator', name: 'Home Sweet Home', group: 'Keeper', icon: 'flag', goal: 10, have: 7, tier: 'bronze', text: 'Put 10 decorations on your lighthouse.' },
    { id: 'collector', name: 'Collector', group: 'Keeper', icon: 'crown', goal: 40, have: 18, tier: 'gold', text: 'Own 40 different decorations.' },
    { id: 'friends', name: 'Island Friends', group: 'Keeper', icon: 'puffin', goal: 4, have: 2, tier: 'silver', text: 'Adopt 4 different friends.' }
  ];

  var RANKS = [
    { n: 1, name: 'Deckhand', need: 0, unlock: 'Classic lighthouse' },
    { n: 2, name: 'Lamp Lighter', need: 150, unlock: 'Captain cap for your Keeper' },
    { n: 3, name: 'Keeper', need: 400, unlock: 'Stubby lighthouse style' },
    { n: 4, name: 'Head Keeper', need: 800, unlock: 'Stone lighthouse + cottage' },
    { n: 5, name: 'Harbour Master', need: 1400, unlock: 'Golden lamp glass' },
    { n: 6, name: 'Lighthouse Legend', need: 2200, unlock: 'Your name on the lighthouse door' }
  ];
  var LAMP_LIGHT = { what: 'Lamp light (rank points)', earn: '1 per passenger home, 2 per steady beam, 5 per flare, 10 per night finished, 15 per Storm Ship', current: 560 };

  var REGIONS = [
    { id: 'gullPoint', name: 'Gull Point', cells: [0, 0, 6, 4], done: 1.0, reward: '10 sea stars + Seagulls' },
    { id: 'kelpShallows', name: 'Kelp Shallows', cells: [6, 0, 12, 4], done: 0.75, reward: '10 sea stars + Window plant' },
    { id: 'whaleDeep', name: 'Whale Deep', cells: [0, 4, 6, 8], done: 0.4, reward: '15 sea stars + Whale badge' },
    { id: 'stormReach', name: 'Storm Reach', cells: [6, 4, 12, 8], done: 0.1, reward: '20 sea stars + Hot-air balloon' }
  ];

  var PASSENGERS = [
    { name: 'Fisher Fran', group: 'Fishers', style: 'souwester', hat: 'lamp', coat: 'stripe', skin: 'skin-2', met: true },
    { name: 'Old Gus', group: 'Fishers', style: 'beanie', hat: 'roof', coat: 'hull', skin: 'skin-1', met: true },
    { name: 'Marisol', group: 'Fishers', style: 'souwester', hat: 'route', coat: 'sea-light', skin: 'skin-3', met: true },
    { name: 'Big Ike', group: 'Fishers', style: 'beanie', hat: 'stripe', coat: 'success', skin: 'skin-4', met: false },
    { name: 'The Baker Twins', group: 'Families', style: 'beanie', hat: 'success', coat: 'lamp', skin: 'skin-1', met: true },
    { name: 'Grandma Lou', group: 'Families', style: 'beanie', hat: 'sail', coat: 'route', skin: 'skin-4', met: true },
    { name: 'Tomás', group: 'Families', style: 'captain', hat: 'stripe', coat: 'stripe', skin: 'skin-3', met: false },
    { name: 'Priya', group: 'Families', style: 'souwester', hat: 'success', coat: 'route', skin: 'skin-2', met: true },
    { name: 'Captain Rowe', group: 'Sailors', style: 'captain', hat: 'roof', coat: 'roof', skin: 'skin-2', met: true },
    { name: 'Skipper Ada', group: 'Sailors', style: 'captain', hat: 'route', coat: 'sea-light', skin: 'skin-1', met: false },
    { name: 'Nils', group: 'Sailors', style: 'beanie', hat: 'lamp', coat: 'hull', skin: 'skin-1', met: true },
    { name: 'Mei', group: 'Sailors', style: 'souwester', hat: 'stripe', coat: 'lamp', skin: 'skin-2', met: false }
  ];

  /* badge medallion: ring in tier colour, sprite in the middle */
  var TIER = { bronze: 'hull', silver: 'crest', gold: 'lamp' };
  function badge(ctx, p, b, x, y, earned) {
    var R = 9, ring = earned ? p[TIER[b.tier]] : p.border;
    for (var yy = -R; yy <= R; yy++) for (var xx = -R; xx <= R; xx++) {
      var d = Math.sqrt(xx * xx + yy * yy);
      if (d <= R - 0.2) px(ctx, d > R - 2.2 ? ring : (d > R - 3 ? p.outline : (earned ? p['surface'] : p['surface-raised'])), x + R + xx, y + R + yy);
    }
    var rows = LK.SPRITES[b.icon] || OB[b.icon] || LK.SPRITES.star, sz = size(rows);
    if (sz.w > 13) { rows = LK.SPRITES.star; sz = size(rows); }
    spr(ctx, rows, x + R - Math.floor(sz.w / 2), y + R - Math.floor(sz.h / 2), p, earned ? {} : { dim: 0.75, dimTo: 'surface-raised' });
    if (earned && b.tier === 'gold') { px(ctx, p['beam-core'], x + 4, y + 3); px(ctx, p['beam-core'], x + 3, y + 4); }
  }

  /* the Bay Chart, drawn on chart paper (sail) with ink (hull-dark) */
  function bayChart(ctx, p, W, H, opt) {
    opt = opt || {};
    var paper = mix(p.sail, p.hull, 0.08), ink = p['hull-dark'], water = mix(p.sail, p['sea-light'], 0.35);
    ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = water; ctx.fillRect(2, 2, W - 4, H - 4);
    for (var x = 2; x < W - 2; x += 12) for (var y = 2; y < H - 2; y++) if (y % 2 === 0) px(ctx, mix(water, ink, 0.18), x, y);
    for (var y2 = 2; y2 < H - 2; y2 += 12) for (var x2 = 2; x2 < W - 2; x2++) if (x2 % 2 === 0) px(ctx, mix(water, ink, 0.18), x2, y2);
    // charted islands as ink outlines
    var marks = [['pebble', 20, 18], ['crescent', 70, 10], ['twin', 100, 34], ['turtle', 18, 50], ['arch', 96, 62], ['sealRock', 60, 44]];
    var cw = (W - 4) / 12, ch = (H - 4) / 8;
    marks.forEach(function (mk) {
      var I = ISLAND_BY_ID[mk[0]], ox = mk[1], oy = mk[2];
      var cx = Math.floor((ox + I.w / 2 - 2) / cw), cy = Math.floor((oy + I.h / 2 - 2) / ch);
      var reg = REGIONS.filter(function (r) { return cx >= r.cells[0] && cx < r.cells[2] && cy >= r.cells[1] && cy < r.cells[3]; })[0];
      var known = reg && ((cx * 7 + cy * 3) % 10) / 10 < reg.done;
      if (!known) return;
      for (var yy = 0; yy < I.h; yy++) for (var xx = 0; xx < I.w; xx++) {
        var inE = function (e, a, b) { var dx = (a - e[0]) / e[2], dy = (b - e[1]) / e[3]; return dx * dx + dy * dy <= 1; };
        var m = function (a, b) { var ok = I.blobs.some(function (e) { return inE(e, a, b); }); if (ok && I.holes) ok = !I.holes.some(function (e) { return inE(e, a, b); }); return ok; };
        if (m(xx, yy)) px(ctx, (m(xx - 1, yy) && m(xx + 1, yy) && m(xx, yy - 1) && m(xx, yy + 1)) ? mix(paper, p.grass, 0.35) : ink, ox + xx, oy + yy);
      }
    });
    // rock crosses
    [[40, 30], [52, 24], [84, 52], [30, 70], [110, 20], [74, 76]].forEach(function (r) {
      var cx = Math.floor((r[0] - 2) / cw), cy = Math.floor((r[1] - 2) / ch);
      var reg = REGIONS.filter(function (g) { return cx >= g.cells[0] && cx < g.cells[2] && cy >= g.cells[1] && cy < g.cells[3]; })[0];
      if (reg && ((cx * 5 + cy * 7) % 10) / 10 < reg.done) { px(ctx, ink, r[0] - 1, r[1] - 1); px(ctx, ink, r[0] + 1, r[1] - 1); px(ctx, ink, r[0], r[1]); px(ctx, ink, r[0] - 1, r[1] + 1); px(ctx, ink, r[0] + 1, r[1] + 1); }
    });
    // fog over uncharted cells
    for (var cy2 = 0; cy2 < 8; cy2++) for (var cx2 = 0; cx2 < 12; cx2++) {
      var rg = REGIONS.filter(function (g) { return cx2 >= g.cells[0] && cx2 < g.cells[2] && cy2 >= g.cells[1] && cy2 < g.cells[3]; })[0];
      if (((cx2 * 7 + cy2 * 3) % 10) / 10 < rg.done) continue;
      var x0 = Math.round(2 + cx2 * cw), y0 = Math.round(2 + cy2 * ch);
      for (var yy2 = 0; yy2 < Math.ceil(ch); yy2++) for (var xx2 = 0; xx2 < Math.ceil(cw); xx2++) {
        px(ctx, ((xx2 + yy2) % 3 === 0) ? p['fog-thick'] : p.fog, x0 + xx2, y0 + yy2);
      }
    }
    // region borders
    ctx.fillStyle = ink;
    ctx.fillRect(Math.round(2 + 6 * cw), 2, 1, H - 4); ctx.fillRect(2, Math.round(2 + 4 * ch), W - 4, 1);
    // frame
    ctx.fillRect(0, 0, W, 1); ctx.fillRect(0, H - 1, W, 1); ctx.fillRect(0, 0, 1, H); ctx.fillRect(W - 1, 0, 1, H);
    // compass
    var kx = W - 12, ky = H - 12; px(ctx, ink, kx, ky - 5, 1, 11); px(ctx, ink, kx - 5, ky, 11, 1); px(ctx, p.stripe, kx, ky - 5, 1, 4);
  }

  Object.assign(LK, {
    OBSTACLE_SPRITES: OB, drawObstacle: drawObstacle, obstacleSize: obstacleSize, drawIsland: drawIsland,
    paintTower: paintTower, placeItem: placeItem, decoratedScene: decoratedScene, itemTile: itemTile, badge: badge, bayChart: bayChart,
    DATA: {
      obstacles: OBSTACLES, tides: TIDES, islands: ISLANDS, decorations: DECOR, categories: CATS, slots: SLOTS,
      economy: ECONOMY, badges: BADGES, ranks: RANKS, lampLight: LAMP_LIGHT, chartRegions: REGIONS, passengers: PASSENGERS
    }
  });
})();
