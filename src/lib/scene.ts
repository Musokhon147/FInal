/**
 * The 3D particle scene behind the site.
 * home → eight-pointed Samarkand star · articles/pages → open book · archive/issues → stack
 * board → globe · everything else → slow starfield. The cursor pushes particles aside.
 */
import * as THREE from "three";

export type SceneMode = "star" | "book" | "stack" | "globe" | "field" | `text:${string}` | `glyph:${string}`;
export type SceneApi = { setMode(m: SceneMode): void; setTheme(light: boolean): void; burst(): void; dispose(): void };

export function createScene(canvas: HTMLCanvasElement): SceneApi {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const noop: SceneApi = { setMode() {}, setTheme() {}, burst() {}, dispose() {} };
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" }); } catch { return noop; }
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const small = innerWidth < 640 || (mem !== undefined && mem <= 4);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const N = small ? 4500 : 9000;
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const PAL = {
    dark: { gold: "#e8b13a", turq: "#3cc8bb", ivory: "#f6f2e7", lapis: "#5a7ee0" },
    light: { gold: "#b07d10", turq: "#0f8f84", ivory: "#1a2a5c", lapis: "#3557b8" },
  };
  const role = new Uint8Array(N); // 0 gold, 1 turq, 2 ivory, 3 lapis
  const sizes = new Float32Array(N), seeds = new Float32Array(N);

  /* ---------- shape builders: each fills a Float32Array of N*3 */
  const R = 2.6;
  const poly = (n: number, f: (k: number) => number[]) => Array.from({ length: n }, (_, k) => f(k));
  const starPoly = poly(16, (k) => { const a = (k * Math.PI) / 8 + Math.PI / 8, r = k % 2 === 0 ? R : R * 0.7654; return [Math.cos(a) * r, Math.sin(a) * r]; });
  const octa = poly(8, (k) => { const a = (k * Math.PI) / 4; return [Math.cos(a) * R * 0.52, Math.sin(a) * R * 0.52]; });
  const rosette = poly(16, (k) => { const a = (k * Math.PI) / 8, r = k % 2 === 0 ? R * 0.34 : R * 0.22; return [Math.cos(a) * r, Math.sin(a) * r]; });
  const onPoly = (pl: number[][], t: number) => { const n = pl.length, f = t * n, i = Math.floor(f) % n, u = f - Math.floor(f), a = pl[i], b = pl[(i + 1) % n]; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; };

  const star = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = Math.random(); let x: number, y: number, z: number;
    if (r < 0.42) { [x, y] = onPoly(starPoly, Math.random()); z = (Math.random() < 0.5 ? -1 : 1) * 0.18 + rand(-0.04, 0.04); role[i] = 0; sizes[i] = rand(1.2, 2.4); }
    else if (r < 0.6) {
      const sq = Math.random() < 0.5 ? 0 : Math.PI / 4, tt = Math.random() * 4, side = Math.floor(tt), u = tt - side, h = R * 0.62;
      const c = [[-h, -h], [h, -h], [h, h], [-h, h]], a = c[side], b = c[(side + 1) % 4];
      const px = a[0] + (b[0] - a[0]) * u, py = a[1] + (b[1] - a[1]) * u;
      x = px * Math.cos(sq) - py * Math.sin(sq); y = px * Math.sin(sq) + py * Math.cos(sq); z = rand(-0.06, 0.06); role[i] = 1; sizes[i] = rand(0.8, 1.6);
    }
    else if (r < 0.72) { [x, y] = onPoly(octa, Math.random()); z = rand(-0.1, 0.1); role[i] = 1; sizes[i] = rand(1, 2); }
    else if (r < 0.8) { [x, y] = onPoly(rosette, Math.random()); z = rand(-0.05, 0.05); role[i] = 0; sizes[i] = rand(1, 2.2); }
    else if (r < 0.88) { const a = Math.random() * Math.PI * 2, rr = R * 1.22; x = Math.cos(a) * rr; y = Math.sin(a) * rr; z = rand(-0.05, 0.05); role[i] = 2; sizes[i] = rand(0.6, 1.2); }
    else { const a = Math.random() * Math.PI * 2, rr = R * rand(0.2, 1.9); x = Math.cos(a) * rr; y = Math.sin(a) * rr; z = rand(-0.6, 0.6); role[i] = Math.random() < 0.5 ? 3 : 2; sizes[i] = rand(0.4, 1.1); }
    star.set([x, y, z], i * 3); seeds[i] = Math.random() * 100;
  }

  // Open book: two pages curving up from the spine, with lines of "text".
  const book = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const side = i % 2 ? 1 : -1, r = Math.random();
    let u = Math.random(), v = rand(-1, 1);
    if (r < 0.55) { v = Math.round(v * 11) / 11 + rand(-0.008, 0.008); u = rand(0.12, 0.92); } // text lines
    else if (r < 0.75) { const e = Math.floor(Math.random() * 3); if (e === 0) u = 1; else v = e === 1 ? -1 : 1; } // page edges
    const x = side * u * 2.5, y = v * 1.7, z = Math.sin(u * Math.PI * 0.9) * 0.55 - u * 0.25 + rand(-0.02, 0.02);
    book.set([x, y, z], i * 3);
  }

  // Stack of six issues, fanned slightly.
  const stack = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const k = i % 6, w = 1.7, h = 2.3, r = Math.random();
    let x = rand(-w, w), y = rand(-h, h);
    if (r < 0.6) { const e = Math.floor(Math.random() * 4); if (e < 2) x = e ? w : -w; else y = e === 2 ? h : -h; }
    const ang = (k - 2.5) * 0.07, ox = (k - 2.5) * 0.28, oz = (k - 2.5) * 0.32;
    stack.set([x * Math.cos(ang) - y * Math.sin(ang) + ox, x * Math.sin(ang) + y * Math.cos(ang) - (k - 2.5) * 0.12, oz + rand(-0.02, 0.02)], i * 3);
  }

  // Globe with latitude/longitude lines.
  const globe = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = Math.random(), G = 2.4; let lat: number, lon: number;
    if (r < 0.35) { lat = (Math.round(rand(-1, 1) * 4) / 4) * (Math.PI / 2) * 0.95; lon = rand(0, Math.PI * 2); }
    else if (r < 0.7) { lon = (Math.round(rand(0, 12)) / 12) * Math.PI * 2; lat = rand(-Math.PI / 2, Math.PI / 2); }
    else { lat = Math.asin(rand(-1, 1)); lon = rand(0, Math.PI * 2); }
    globe.set([G * Math.cos(lat) * Math.cos(lon), G * Math.sin(lat), G * Math.cos(lat) * Math.sin(lon)], i * 3);
  }

  const field = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) field.set([rand(-11, 11), rand(-7, 7), rand(-9, 2)], i * 3);
  const SHAPES: Record<string, Float32Array> = { star, book, stack, globe, field };

  /** Sample the pixels of rendered text and spread the particles over them. */
  function textShape(text: string, big: boolean): Float32Array | null {
    const c = document.createElement("canvas"), W = 640, H = 320;
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    if (!g) return null;
    const fam = getComputedStyle(document.body).getPropertyValue("--font-serif") || "sans-serif";
    let size = big ? 300 : 210;
    g.font = `400 ${size}px ${fam}`;
    while (g.measureText(text).width > W * 0.92 && size > 40) { size -= 10; g.font = `400 ${size}px ${fam}`; }
    g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, W / 2, H / 2 + size * 0.04);
    const data = g.getImageData(0, 0, W, H).data, pts: number[] = [];
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 128) pts.push(x, y);
    if (pts.length < 20) return null;
    const out = new Float32Array(N * 3), scale = 7 / W;
    for (let i = 0; i < N; i++) {
      const k = (Math.floor(Math.random() * (pts.length / 2))) * 2;
      out[i * 3] = (pts[k] - W / 2) * scale + rand(-0.01, 0.01);
      out[i * 3 + 1] = -(pts[k + 1] - H / 2) * scale + rand(-0.01, 0.01);
      out[i * 3 + 2] = rand(-0.25, 0.25);
    }
    return out;
  }

  /* ---------- particles */
  const pos = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3); // short-lived velocity for the scatter burst
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, b = Math.acos(rand(-1, 1)), rr = rand(14, 22);
    pos.set([rr * Math.sin(b) * Math.cos(a), rr * Math.sin(b) * Math.sin(a), rr * Math.cos(b) - 6], i * 3);
  }
  const colors = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uPR: { value: renderer.getPixelRatio() }, uOpacity: { value: 1 } },
    // depth of field: far particles grow larger, softer and dimmer
    vertexShader: `attribute float size; attribute vec3 color; varying vec3 vColor; varying float vBlur; uniform float uPR;
      void main(){ vColor = color; vec4 mv = modelViewMatrix * vec4(position,1.0);
        vBlur = clamp((-mv.z - 8.5) / 9.0, 0.0, 1.0);
        gl_PointSize = size * uPR * (26.0 / -mv.z) * (1.0 + vBlur * 1.4); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vColor; varying float vBlur; uniform float uOpacity;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); a = mix(a * a, a * 0.55, vBlur); gl_FragColor = vec4(vColor, a * uOpacity * (1.0 - vBlur * 0.45)); }`,
  });
  const group = new THREE.Group();
  group.add(new THREE.Points(geo, mat));
  scene.add(group);

  /* ---------- constellation lines between neighbouring star particles */
  const pairs: number[] = [];
  {
    const cell = 0.32, grid = new Map<string, number[]>();
    for (let i = 0; i < N; i++) {
      if (role[i] > 1) continue;
      const key = Math.floor(star[i * 3] / cell) + "," + Math.floor(star[i * 3 + 1] / cell);
      if (!grid.has(key)) grid.set(key, []); grid.get(key)!.push(i);
    }
    const maxPairs = small ? 350 : 800;
    for (const list of grid.values()) {
      for (let a = 0; a < list.length && pairs.length < maxPairs; a += 6) {
        const i = list[a], j = list[(a + 3) % list.length];
        if (i !== j && Math.random() < 0.5) pairs.push(i, j);
      }
    }
  }
  const linePos = new Float32Array(pairs.length * 3);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0x3cc8bb, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  group.add(new THREE.LineSegments(lineGeo, lineMat));

  /* ---------- theme */
  let light = false, themeMix = 1; // 0..1 progress of a colour change
  const goalColors = new Float32Array(N * 3), fromColors = new Float32Array(N * 3);
  function setTheme(isLight: boolean, instant = false) {
    light = isLight;
    const p = PAL[isLight ? "light" : "dark"];
    const cs = [p.gold, p.turq, p.ivory, p.lapis].map((h) => new THREE.Color(h));
    fromColors.set(colors);
    for (let i = 0; i < N; i++) { const c = cs[role[i]]; goalColors[i * 3] = c.r; goalColors[i * 3 + 1] = c.g; goalColors[i * 3 + 2] = c.b; }
    themeMix = instant || reduce ? 1 : 0;
    if (themeMix === 1) { colors.set(goalColors); geo.attributes.color.needsUpdate = true; }
    mat.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
    lineMat.blending = mat.blending; lineMat.color.set(p.turq);
    mat.needsUpdate = true; lineMat.needsUpdate = true;
  }
  setTheme(false, true);

  /* ---------- layout, input, modes */
  let mode = "star", target: Float32Array = star;
  const mouse = { x: 0, y: 0, sx: 0, sy: 0, active: false, ndc: new THREE.Vector2(), local: new THREE.Vector3() };
  const onMove = (e: PointerEvent) => {
    mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5;
    mouse.ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); mouse.active = true;
  };
  const onLeave = () => (mouse.active = false);
  window.addEventListener("pointermove", onMove);
  document.addEventListener("pointerleave", onLeave);
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();

  let placement: Record<string, { x: number; y: number; s: number; o: number }> = {};
  function layoutGroup() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const wide = w >= 1024;
    placement = {
      star: wide ? { x: 3.3, y: 0.1, s: 1, o: 1 } : { x: 0, y: w < 640 ? 2.6 : 1.8, s: w < 640 ? 0.62 : 0.8, o: 0.42 },
      side: wide ? { x: 3.7, y: -0.3, s: 0.85, o: 0.34 } : { x: 0, y: 2.8, s: 0.6, o: 0.18 },
      field: { x: 0, y: 0, s: 1, o: 0.38 },
      text: wide ? { x: 2.6, y: 0.2, s: 1, o: 0.9 } : { x: 0, y: 2.2, s: 0.7, o: 0.5 },
    };
  }
  layoutGroup();
  window.addEventListener("resize", layoutGroup);

  /** Push every particle outward from the centre; they drift back into the new shape. */
  function scatter(strength = 1) {
    if (reduce) return;
    for (let i = 0; i < N; i++) {
      const j = i * 3, x = pos[j], y = pos[j + 1], z = pos[j + 2];
      const len = Math.hypot(x, y, z) || 1, f = (0.08 + Math.random() * 0.16) * strength;
      vel[j] += (x / len) * f + (Math.random() - 0.5) * 0.06;
      vel[j + 1] += (y / len) * f + (Math.random() - 0.5) * 0.06;
      vel[j + 2] += (z / len) * f + Math.random() * 0.05;
    }
  }

  function setMode(m: string) {
    if (m === mode) return;
    if (!SHAPES[m] && (m.startsWith("text:") || m.startsWith("glyph:"))) {
      const shape = textShape(m.slice(m.indexOf(":") + 1), m.startsWith("glyph:"));
      if (shape) SHAPES[m] = shape;
    }
    if (!SHAPES[m]) return;
    scatter(m === "star" ? 1.2 : 0.9);
    mode = m; target = SHAPES[m];
    if (reduce) { pos.set(target); geo.attributes.position.needsUpdate = true; }
  }

  /* ---------- loop */
  const clock = new THREE.Clock();
  let scrollY = 0, running = true, T = 0;
  let disposed = false, raf = 0;
  const onScroll = () => (scrollY = window.scrollY);
  const onVis = () => {
    running = !document.hidden && !disposed;
    if (running && !reduce) { clock.getDelta(); raf = requestAnimationFrame(frame); }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onVis);
  const inv = new THREE.Matrix4();
  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    T += dt; const t = T;
    const isStar = mode === "star";
    // time-based easing: same speed at 30 fps or 144 fps
    const k = 1 - Math.exp(-dt * (isStar ? Math.min(0.9 + t * 0.6, 3.6) : 2.1));

    // pointer position in the group's local space (for the push-away effect)
    let mx = 1e9, my = 1e9;
    if (mouse.active && mode !== "field") {
      ray.setFromCamera(mouse.ndc, camera);
      if (ray.ray.intersectPlane(plane, hit)) {
        inv.copy(group.matrixWorld).invert();
        mouse.local.copy(hit).applyMatrix4(inv); mx = mouse.local.x; my = mouse.local.y;
      }
    }
    const RAD = 1.1, RAD2 = RAD * RAD;
    const wob = isStar ? 0.025 : mode === "field" ? 0.35 : 0.04;
    for (let i = 0; i < N; i++) {
      const j = i * 3, sd = seeds[i];
      let tx = target[j] + Math.sin(t * 0.6 + sd) * wob;
      let ty = target[j + 1] + Math.cos(t * 0.5 + sd * 1.3) * wob;
      const tz = target[j + 2] + Math.sin(t * 0.4 + sd * 0.7) * wob;
      const dx = pos[j] - mx, dy = pos[j + 1] - my, d2 = dx * dx + dy * dy;
      if (d2 < RAD2) { const d = Math.sqrt(d2) + 1e-4, f = (RAD - d) * 1.6; tx += (dx / d) * f; ty += (dy / d) * f; }
      pos[j] += (tx - pos[j]) * k + vel[j]; pos[j + 1] += (ty - pos[j + 1]) * k + vel[j + 1]; pos[j + 2] += (tz - pos[j + 2]) * k + vel[j + 2];
      vel[j] *= 0.9; vel[j + 1] *= 0.9; vel[j + 2] *= 0.9;
    }
    geo.attributes.position.needsUpdate = true;
    if (themeMix < 1) {
      themeMix = Math.min(1, themeMix + dt / 0.9);
      const e = themeMix * themeMix * (3 - 2 * themeMix);
      for (let i = 0; i < N * 3; i++) colors[i] = fromColors[i] + (goalColors[i] - fromColors[i]) * e;
      geo.attributes.color.needsUpdate = true;
    }
    for (let p = 0; p < pairs.length; p++) { const s = pairs[p] * 3; linePos[p * 3] = pos[s]; linePos[p * 3 + 1] = pos[s + 1]; linePos[p * 3 + 2] = pos[s + 2]; }
    lineGeo.attributes.position.needsUpdate = true;

    mouse.sx += (mouse.x - mouse.sx) * 0.05; mouse.sy += (mouse.y - mouse.sy) * 0.05;
    const pl = isStar ? placement.star : mode === "field" ? placement.field : mode.startsWith("text:") ? placement.text : placement.side;
    const fade = isStar ? Math.min(scrollY / innerHeight, 1) : 0;
    group.position.x += (pl.x - group.position.x) * 0.05;
    group.position.y += (pl.y + fade * 1.6 - group.position.y) * 0.05;
    group.scale.setScalar(group.scale.x + (pl.s * (1 - fade * 0.15) - group.scale.x) * 0.05);
    const spin = mode === "globe" ? t * 0.15 : 0;
    group.rotation.z = isStar ? t * 0.05 : 0;
    const scrollTurn = isStar ? 0 : Math.min(scrollY / 2500, 1) * 0.9; // inner pages turn slowly as you scroll
    group.rotation.y = mouse.sx * 0.9 + Math.sin(t * 0.3) * 0.12 + spin + scrollTurn + (mode === "book" ? -0.35 : mode === "stack" ? -0.5 : 0);
    group.rotation.x = -mouse.sy * 0.7 + Math.cos(t * 0.25) * 0.08 + (mode === "book" ? -0.55 : 0);
    const og = pl.o * (1 - fade * 0.55) * (light ? 0.85 : 1);
    mat.uniforms.uOpacity.value += (og - mat.uniforms.uOpacity.value) * 0.05;
    const lineGoal = isStar ? (light ? 0.22 : 0.16) * (1 - fade) * Math.min(t / 3, 1) : 0;
    lineMat.opacity += (lineGoal - lineMat.opacity) * 0.05;
    renderer.render(scene, camera);
    if (!reduce) raf = requestAnimationFrame(frame);
  }
  if (reduce) { pos.set(star); geo.attributes.position.needsUpdate = true; group.position.set(placement.star.x, placement.star.y, 0); }
  frame();
  return {
    setMode: (m) => { setMode(m); if (reduce) frame(); },
    setTheme: (l) => { setTheme(l); if (reduce) frame(); },
    burst: () => scatter(0.5),
    dispose: () => {
      disposed = true; running = false; cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove); document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll); document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", layoutGroup);
      geo.dispose(); lineGeo.dispose(); mat.dispose(); lineMat.dispose(); renderer.dispose();
    },
  };
}
