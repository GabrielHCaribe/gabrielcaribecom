/* =============================================================
   space.js — animated WebGL nebula + starfield background
   Two palettes: "dark" (deep blue + amber) and "fun" (neon magenta,
   orange and cyan). Reacts to time, pointer, scroll depth and mode.

   Performance notes:
   - The nebula is sampled ONCE per pixel. Chromatic aberration is
     faked by running the (cheap, noise-free) colour ramp three times
     at slightly offset densities, which costs almost nothing.
   - Render resolution adapts to measured frame rate, so slower
     machines stay smooth instead of dropping frames.
   ============================================================= */
(function () {
  'use strict';

  var canvas = document.getElementById('space');
  if (!canvas) return;

  var gl =
    canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' }) ||
    canvas.getContext('experimental-webgl', { antialias: false, alpha: false });

  if (!gl) {
    document.documentElement.classList.add('no-webgl');
    return;
  }

  /* ---------------------------------------------------------- shaders */

  var VERT = [
    'attribute vec2 aPos;',
    'void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }'
  ].join('\n');

  var FRAG = [
    'precision highp float;',

    'uniform vec2  uRes;',
    'uniform float uTime;',
    'uniform float uMode;',    /* 0.0 = dark, 1.0 = fun */
    'uniform vec2  uMouse;',
    'uniform float uScroll;',
    'uniform float uMotion;',

    /* palette, filled in main() from uMode */
    'vec3 cVoid; vec3 cDeep; vec3 cMid; vec3 cHot; vec3 cCore;',
    'float gLo; float gHi;',

    /* ---- hash / value noise ---- */
    'float hash21(vec2 p){',
    '  p = fract(p * vec2(123.34, 456.21));',
    '  p += dot(p, p + 45.32);',
    '  return fract(p.x * p.y);',
    '}',

    'float vnoise(vec2 p){',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  float a = hash21(i);',
    '  float b = hash21(i + vec2(1.0, 0.0));',
    '  float c = hash21(i + vec2(0.0, 1.0));',
    '  float d = hash21(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
    '}',

    /* unrolled — no loop overhead, and the octave count is explicit */
    'float fbm3(vec2 p){',
    '  mat2 r = mat2(0.80, 0.60, -0.60, 0.80);',
    '  float v = 0.500 * vnoise(p); p = r * p * 2.03;',
    '  v += 0.250 * vnoise(p);      p = r * p * 2.03;',
    '  v += 0.125 * vnoise(p);',
    '  return v * 1.14;',
    '}',

    'float fbm4(vec2 p){',
    '  mat2 r = mat2(0.80, 0.60, -0.60, 0.80);',
    '  float v = 0.500 * vnoise(p); p = r * p * 2.03;',
    '  v += 0.250 * vnoise(p);      p = r * p * 2.03;',
    '  v += 0.125 * vnoise(p);      p = r * p * 2.03;',
    '  v += 0.0625 * vnoise(p);',
    '  return v * 1.07;',
    '}',

    /* one domain warp — 10 noise lookups total */
    'float nebula(vec2 p, float t){',
    '  vec2 q = vec2(fbm3(p + vec2(0.0, t * 0.030)),',
    '                fbm3(p + vec2(4.7, 1.3) - vec2(t * 0.020, 0.0)));',
    '  return fbm4(p + 2.4 * q + vec2(t * 0.015, -t * 0.011));',
    '}',

    /* the colour ramp — pure arithmetic, safe to call repeatedly */
    'vec3 shade(float d){',
    '  vec3 c = mix(cVoid, cDeep, smoothstep(gLo * 0.55, gHi, d));',
    '  c = mix(c, cMid, smoothstep(gLo, gHi, d));',
    '  c = mix(c, cHot, smoothstep(gHi * 0.90, gHi * 1.20, d));',
    '  c = mix(c, cCore, pow(smoothstep(gHi * 1.06, gHi * 1.34, d), 2.0));',
    '  return c;',
    '}',

    /* crisp stars: tight core + four-point diffraction spike */
    'float starLayer(vec2 uv, float density, float t, float seed){',
    '  vec2 g  = uv * density + seed;',
    '  vec2 id = floor(g);',
    '  vec2 f  = fract(g) - 0.5;',
    '  float h = hash21(id + seed);',
    '  float keep = step(0.905, h);',
    '  vec2 off = (vec2(hash21(id + 1.7), hash21(id + 9.1)) - 0.5) * 0.70;',
    '  vec2 d2 = f - off;',
    '  float r = length(d2);',
    '  float core = pow(smoothstep(0.155, 0.0, r), 3.0);',
    '  float sx = max(0.0, 1.0 - abs(d2.x) * 30.0) * max(0.0, 1.0 - abs(d2.y) * 4.5);',
    '  float sy = max(0.0, 1.0 - abs(d2.y) * 30.0) * max(0.0, 1.0 - abs(d2.x) * 4.5);',
    '  float tw = 0.62 + 0.38 * sin(t * (1.0 + h * 2.2) + h * 60.0);',
    '  return keep * (core + (sx + sy) * 0.30) * tw * (0.35 + 0.65 * fract(h * 41.7));',
    '}',

    /* Five neons swept with a PING-PONG rather than a cycle.
       A cyclic wheel has to wrap orange back round to cyan, and that
       pair blends through grey-green mud. Bouncing instead means only
       hue-adjacent pairs ever meet:
         lime <-> cyan <-> violet <-> pink <-> orange
       The final divide re-saturates, since blending two vivid stops in
       RGB dips through a duller midpoint. */
    'vec3 neon(float h){',
    '  h = abs(fract(h * 0.5) * 2.0 - 1.0) * 4.0;',
    '  float w0 = max(0.0, 1.0 - abs(h - 0.0));',
    '  float w1 = max(0.0, 1.0 - abs(h - 1.0));',
    '  float w2 = max(0.0, 1.0 - abs(h - 2.0));',
    '  float w3 = max(0.0, 1.0 - abs(h - 3.0));',
    '  float w4 = max(0.0, 1.0 - abs(h - 4.0));',
    '  vec3 c = vec3(0.62, 1.00, 0.14) * w0',   /* lime     */
    '         + vec3(0.00, 0.90, 1.00) * w1',   /* cyan     */
    '         + vec3(0.52, 0.18, 1.00) * w2',   /* violet   */
    '         + vec3(1.00, 0.14, 0.62) * w3',   /* hot pink */
    '         + vec3(1.00, 0.45, 0.08) * w4;',  /* orange   */
    '  c /= max(w0 + w1 + w2 + w3 + w4, 0.001);',
    '  return c / max(max(c.r, c.g), max(c.b, 0.001));',
    '}',

    'float halftone(vec2 frag, float lum, float size){',
    '  float c = cos(0.5236), s = sin(0.5236);',
    '  vec2 r = mat2(c, -s, s, c) * frag / size;',
    '  float radius = clamp(lum, 0.0, 1.0) * 0.62;',
    '  return smoothstep(radius, radius - 0.10, length(fract(r) - 0.5));',
    '}',

    'void main(){',
    '  vec2 frag = gl_FragCoord.xy;',
    '  vec2 uv = (frag - 0.5 * uRes) / uRes.y;',
    '  float t = uTime * mix(0.22, 1.0, uMotion);',

    '  vec2 par = uMouse * 0.050;',
    '  float depth = uScroll * 0.62;',

    /* ---- far dust layer, 3 noise lookups.
       Computed first: in fun mode this same field decides which neon
       each region of the sky takes, so the colour variation is free. ---- */
    '  vec2 pFar = uv * 1.10 + par * 0.35 + vec2(0.0, -depth * 0.22) + vec2(12.0, 30.0);',
    '  float df = fbm3(pFar + vec2(t * 0.010, 0.0));',

    /* large, slowly drifting patches of hue */
    '  float hue = df * 2.30 + dot(uv, vec2(0.19, 0.13)) + t * 0.015;',
    '  vec3 nA = neon(hue);',
    '  vec3 nB = neon(hue + 0.13);',
    '  vec3 nC = neon(hue + 0.52);',

    /* ---- palettes ----
       dark: very dark navy. cool highlights, only a trace of warmth
             in the brightest cores.
       fun:  every band takes its colour from the hue wheel, so the sky
             runs cyan / violet / lime / pink rather than all magenta. */
    '  cVoid = mix(vec3(0.006, 0.010, 0.024), vec3(0.020, 0.004, 0.040), uMode);',
    '  cDeep = mix(vec3(0.022, 0.045, 0.105), nC * 0.20, uMode);',
    '  cMid  = mix(vec3(0.075, 0.150, 0.290), nA * 0.86, uMode);',
    '  cHot  = mix(vec3(0.400, 0.470, 0.620), mix(nB, vec3(1.0), 0.28), uMode);',
    '  cCore = mix(vec3(0.920, 0.860, 0.740), vec3(1.000, 0.980, 0.880), uMode);',
    '  gLo = mix(0.40, 0.39, uMode);',
    '  gHi = mix(0.86, 0.74, uMode);',

    /* ---- one nebula sample ---- */
    '  vec2 pNear = uv * 2.05 + par + vec2(0.0, -depth * 0.55) + vec2(3.0, 7.0);',
    '  float dn = nebula(pNear, t);',

    /* chromatic aberration for free: ramp the same density 3x, offset */
    '  float e = (0.012 + 0.052 * uMode) * (0.30 + length(uv));',
    '  vec3 col = vec3(shade(dn + e).r, shade(dn).g, shade(dn - e).b);',

    '  vec3 dustCol = mix(vec3(0.035, 0.062, 0.125), nC * 0.55, uMode);',
    '  col += dustCol * smoothstep(0.48, 0.97, df) * mix(0.45, 0.50, uMode);',

    /* ---- crisp contour lines: ink drawn over the soft cloud ---- */
    '  float band = abs(fract(dn * 11.0) - 0.5);',
    '  float line = smoothstep(0.042, 0.008, band) * smoothstep(0.34, 0.62, dn);',
    '  col += line * mix(vec3(0.42, 0.60, 0.95), nB, uMode)',
    '         * mix(0.035, 0.14, uMode);',

    /* ---- stars ---- */
    '  vec2 sUv = uv + par * 0.55 + vec2(0.0, -depth * 0.85);',
    '  float st = starLayer(sUv, 12.0, t, 0.0)',
    '           + starLayer(sUv * 1.7, 21.0, t, 3.7) * 0.55',
    '           + starLayer(sUv * 2.6, 34.0, t, 9.2) * 0.32;',
    '  vec3 starCol = mix(vec3(0.90, 0.95, 1.00), vec3(1.00, 0.94, 0.86), uMode * 0.6);',
    '  col += st * starCol * mix(1.15, 1.45, uMode);',

    /* ---- halftone screen (fun mode) ---- */
    '  float lum = dot(col, vec3(0.299, 0.587, 0.114));',
    '  float dots = halftone(frag, lum * 1.35, 7.0);',
    '  col = mix(col, col * (0.62 + 0.52 * dots), uMode * 0.28 * smoothstep(0.05, 0.42, lum));',

    /* ---- vignette + dither ---- */
    '  col *= clamp(1.0 - 0.66 * pow(length(uv * vec2(0.78, 1.0)), 1.9), 0.0, 1.0);',
    '  col += (hash21(frag + fract(uTime) * 91.7) - 0.5) * 0.022;',

    '  gl_FragColor = vec4(max(col, 0.0), 1.0);',
    '}'
  ].join('\n');

  /* ---------------------------------------------------------- compile */

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('[space] shader error:', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) {
    document.documentElement.classList.add('no-webgl');
    return;
  }

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('[space] link error:', gl.getProgramInfoLog(prog));
    document.documentElement.classList.add('no-webgl');
    return;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var U = {
    res: gl.getUniformLocation(prog, 'uRes'),
    time: gl.getUniformLocation(prog, 'uTime'),
    mode: gl.getUniformLocation(prog, 'uMode'),
    mouse: gl.getUniformLocation(prog, 'uMouse'),
    scroll: gl.getUniformLocation(prog, 'uScroll'),
    motion: gl.getUniformLocation(prog, 'uMotion')
  };

  /* ---------------------------------------------------------- state */

  var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var motion = reduceQuery.matches ? 0 : 1;
  if (reduceQuery.addEventListener) {
    reduceQuery.addEventListener('change', function (e) { motion = e.matches ? 0 : 1; });
  }

  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  var scroll = 0, scrollTarget = 0;
  var mode = document.documentElement.getAttribute('data-mode') === 'fun' ? 1 : 0;
  var modeTarget = mode;
  var running = true;

  /* Resolution scale, tuned at runtime against real frame times.
     The nebula is soft, so rendering under 1 device pixel per CSS
     pixel is nearly invisible — but it is a large win on weak GPUs. */
  var quality = 0.8;
  var MAX_PIXELS = 2100000;

  function resize() {
    var base = Math.min(window.devicePixelRatio || 1, 1.5) * quality;
    var w = Math.floor(window.innerWidth * base);
    var h = Math.floor(window.innerHeight * base);

    var total = w * h;
    if (total > MAX_PIXELS) {
      var k = Math.sqrt(MAX_PIXELS / total);
      w = Math.floor(w * k);
      h = Math.floor(h * k);
    }

    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U.res, w, h);
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });
  resize();

  window.addEventListener('pointermove', function (e) {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  window.addEventListener('deviceorientation', function (e) {
    if (e.gamma == null || e.beta == null) return;
    mouse.tx = Math.max(-1, Math.min(1, e.gamma / 35));
    mouse.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 35));
  }, { passive: true });

  window.addEventListener('scroll', function () {
    scrollTarget = window.scrollY / Math.max(1, window.innerHeight);
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    var was = running;
    running = !document.hidden;
    if (running && !was) { last = performance.now(); requestAnimationFrame(frame); }
  });

  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    running = false;
  });

  window.addEventListener('mode:change', function (e) {
    modeTarget = e.detail === 'fun' ? 1 : 0;
  });

  /* ---------------------------------------------------------- loop */

  var last = performance.now();
  var clock = 0;
  var frames = 0, elapsed = 0;

  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;

    /* ---- adaptive quality ---- */
    frames++;
    elapsed += dt;
    if (frames >= 50) {
      var fps = frames / elapsed;
      if (fps < 45 && quality > 0.45) {
        quality = Math.max(0.45, quality - 0.15);
        resize();
      } else if (fps > 57 && quality < 1.0) {
        quality = Math.min(1.0, quality + 0.1);
        resize();
      }
      frames = 0;
      elapsed = 0;
    }

    mouse.x += (mouse.tx - mouse.x) * (1 - Math.pow(0.0015, dt));
    mouse.y += (mouse.ty - mouse.y) * (1 - Math.pow(0.0015, dt));
    scroll += (scrollTarget - scroll) * (1 - Math.pow(0.004, dt));
    mode += (modeTarget - mode) * (1 - Math.pow(0.00002, dt));

    gl.uniform1f(U.time, clock);
    gl.uniform1f(U.mode, mode);
    gl.uniform2f(U.mouse, mouse.x, mouse.y);
    gl.uniform1f(U.scroll, scroll);
    gl.uniform1f(U.motion, motion);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  document.documentElement.classList.add('webgl-ready');
})();
