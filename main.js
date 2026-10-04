import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ACCENT = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#9c7a3c';

/* =========================================================
   LOADER — starts immediately, waits for fonts + 3D scene
   ========================================================= */
const loader = $('#loader');
const loaderCount = $('#loaderCount');
const loaderBar = $('#loaderBar');
const load = { v: 0 };

$$('.loader__lines path').forEach((p) => {
  const len = p.getTotalLength();
  gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
  gsap.to(p, { strokeDashoffset: 0, duration: 2.6, ease: 'power2.inOut', delay: 0.1 });
});
gsap.from('#loaderBadge', { autoAlpha: 0, y: 18, duration: 1.2, ease: 'expo.out', delay: 0.15 });
gsap.from('.loader__foot', { autoAlpha: 0, duration: 1, delay: 0.3 });

const renderLoad = () => {
  loaderCount.textContent = Math.round(load.v);
  loaderBar.style.transform = `scaleX(${load.v / 100})`;
};
const loadTween = gsap.to(load, { v: 86, duration: 2.2, ease: 'power2.inOut', onUpdate: renderLoad });

/* =========================================================
   THREE — renderer, scene, tattoo pen
   ========================================================= */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
camera.position.set(0, 0, 12);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
keyLight.position.set(-4, 6, 8);
const rimLight = new THREE.DirectionalLight(0xffffff, 1.6);
rimLight.position.set(6, 3, -5);
scene.add(keyLight, rimLight);

// paper plane depth (where the drawing lives)
const PAPER_Z = -1.2;

function makeLabelTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const x = c.getContext('2d');
  x.clearRect(0, 0, c.width, c.height);
  x.save();
  x.translate(512, 256);
  x.rotate(-Math.PI / 2);
  x.fillStyle = 'rgba(240,238,232,0.95)';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.font = 'italic 68px "Instrument Serif", serif';
  x.fillText('Nenno Cunha', 0, -6);
  x.font = '500 15px Inter, sans-serif';
  x.letterSpacing = '6px';
  x.fillStyle = 'rgba(240,238,232,0.6)';
  x.fillText('CURITIBA · PR', 0, 44);
  x.fillRect(-200, -52, 400, 1.5);
  x.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function makeShadowTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 512;
  const x = c.getContext('2d');
  // draw a capsule off-canvas and keep only its blurred shadow (works everywhere, incl. Safari)
  x.shadowColor = 'rgba(0,0,0,1)';
  x.shadowBlur = 28;
  x.shadowOffsetX = 1000;
  x.fillStyle = '#000';
  x.beginPath();
  x.roundRect(-1000 + 40, 60, 48, 392, 24);
  x.fill();
  const t = new THREE.CanvasTexture(c);
  return t;
}

function buildPen() {
  const pen = new THREE.Group();
  const model = new THREE.Group();
  pen.add(model);

  const mat = {
    body: new THREE.MeshStandardMaterial({ color: 0x151515, metalness: 0.85, roughness: 0.3 }),
    grip: new THREE.MeshStandardMaterial({ color: 0x0c0c0c, metalness: 0.35, roughness: 0.55 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.1 }),
    satin: new THREE.MeshStandardMaterial({ color: 0xbdbdbd, metalness: 1, roughness: 0.32 }),
    clear: new THREE.MeshStandardMaterial({
      color: 0xf4f4f4, metalness: 0, roughness: 0.18, transparent: true, opacity: 0.42,
      side: THREE.DoubleSide, depthWrite: false,
    }),
    white: new THREE.MeshStandardMaterial({ color: 0xf1f1ef, metalness: 0, roughness: 0.38 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0b0b0b, metalness: 0, roughness: 0.62 }),
    line: new THREE.MeshStandardMaterial({ color: new THREE.Color(ACCENT), metalness: 0.2, roughness: 0.4 }),
  };

  const lathe = (pts, m, seg = 72) => {
    const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
    const mesh = new THREE.Mesh(g, m);
    model.add(mesh);
    return mesh;
  };

  // needle (seen through the clear nose)
  lathe([[0, 0], [0.003, 0.015], [0.0065, 0.05], [0.0065, 1.0], [0, 1.0]], mat.chrome, 16);

  // cartridge nose — translucent
  const nose = lathe(
    [[0.012, 0.16], [0.028, 0.24], [0.058, 0.4], [0.094, 0.6], [0.124, 0.8], [0.145, 0.95], [0.152, 1.05], [0.152, 1.1]],
    mat.clear,
  );
  nose.renderOrder = 2;

  // cartridge body
  lathe([[0.152, 1.06], [0.158, 1.1], [0.158, 1.42], [0.172, 1.45], [0.172, 1.53], [0, 1.53]], mat.white);
  lathe([[0.1595, 1.22], [0.1595, 1.3]], mat.rubber);

  // grip with rings
  const grip = [[0.172, 1.53], [0.214, 1.58], [0.232, 1.65]];
  for (let y = 1.68; y < 2.42; y += 0.042) {
    grip.push([0.232, y], [0.224, y + 0.012], [0.224, y + 0.026], [0.232, y + 0.036]);
  }
  grip.push([0.232, 2.47], [0.222, 2.55]);
  lathe(grip, mat.grip, 64);

  // chrome collar
  lathe([[0.222, 2.55], [0.25, 2.56], [0.253, 2.6], [0.253, 2.64], [0.24, 2.665]], mat.chrome);

  // main body
  lathe([[0.24, 2.665], [0.262, 2.7], [0.27, 2.78], [0.27, 3.92], [0.266, 3.98]], mat.body);
  lathe([[0.2708, 2.83], [0.2708, 2.838]], mat.line);
  lathe([[0.2708, 3.86], [0.2708, 3.868]], mat.line);

  // stroke adjust ring (satin, grooved)
  const ring = [[0.266, 3.98], [0.278, 4.0]];
  for (let y = 4.01; y < 4.15; y += 0.024) ring.push([0.278, y], [0.271, y + 0.008], [0.278, y + 0.016]);
  ring.push([0.278, 4.16], [0.262, 4.18]);
  lathe(ring, mat.satin, 64);

  // back cap + RCA + plug
  lathe([[0.262, 4.18], [0.258, 4.26], [0.236, 4.36], [0.19, 4.43], [0.12, 4.47], [0, 4.48]], mat.body);
  lathe([[0.075, 4.46], [0.075, 4.6], [0.06, 4.62], [0, 4.62]], mat.chrome, 32);
  lathe([[0.06, 4.6], [0.095, 4.64], [0.095, 4.82], [0.07, 4.9], [0.045, 4.95], [0, 4.95]], mat.rubber, 32);

  // cable
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 4.92, 0),
    new THREE.Vector3(0, 5.4, 0),
    new THREE.Vector3(0.12, 6.1, -0.15),
    new THREE.Vector3(0.55, 7.0, -0.5),
    new THREE.Vector3(1.5, 8.0, -1.0),
    new THREE.Vector3(3.2, 8.9, -1.6),
  ]);
  model.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 90, 0.038, 8, false), mat.rubber));

  // printed label on the body
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2712, 0.2712, 0.9, 72, 1, true),
    new THREE.MeshStandardMaterial({
      map: makeLabelTexture(), transparent: true, metalness: 0.1, roughness: 0.5,
      polygonOffset: true, polygonOffsetFactor: -2,
    }),
  );
  label.position.y = 3.36;
  label.rotation.y = Math.PI;
  model.add(label);

  const CENTER = 2.45;
  model.position.y = -CENTER;

  return {
    pen,
    tipLocal: new THREE.Vector3(0, -CENTER, 0),
    backLocal: new THREE.Vector3(0, 4.48 - CENTER, 0),
  };
}

let PEN; // filled after fonts are ready so the label renders with the right typeface

const shadow = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, depthWrite: false, opacity: 0.3 }),
);
shadow.renderOrder = -1;
shadow.position.z = PAPER_Z - 0.01;
scene.add(shadow);

/* =========================================================
   POSES — hero → zoom → drawing → final
   ========================================================= */
const isMobile = () => window.innerWidth <= 820;
let POSES;
let DRAW_ROT;

function buildPoses() {
  if (isMobile()) {
    POSES = [
      { x: 0.05, y: -0.3, z: 0, rx: 0.12, ry: 0.0, rz: -0.22, s: 0.55 },
      { x: 0.1, y: 1.0, z: 2.6, rx: 0.4, ry: 0.6, rz: -0.75, s: 0.85 },
      null, // drawing pose — computed from the needle tip
      { x: 1.0, y: 1.2, z: 0.2, rx: 0.2, ry: 1.2, rz: 0.3, s: 0.55 },
    ];
    DRAW_ROT = { rx: 0.55, ry: 0.3, rz: -0.55, s: 0.42 };
  } else {
    POSES = [
      { x: 0.1, y: -0.12, z: 0, rx: 0.12, ry: 0.0, rz: -0.16, s: 0.9 },
      { x: -1.9, y: -0.45, z: 3.4, rx: 0.38, ry: 0.6, rz: -0.6, s: 1.0 },
      null,
      { x: 3.0, y: -0.15, z: 0.4, rx: 0.2, ry: 1.2, rz: 0.34, s: 0.92 },
    ];
    DRAW_ROT = { rx: 0.55, ry: 0.3, rz: -0.52, s: 0.62 };
  }
}
buildPoses();

/* =========================================================
   DRAWING — svg path the needle follows
   ========================================================= */
const artSvg = $('#artSvg');
// every <path> is one stroke; between strokes the needle lifts and travels
const STROKE_GAP = 70;
const strokes = $$('.art__path').map((el) => {
  const len = el.getTotalLength();
  el.style.strokeDasharray = `${len}`;
  el.style.strokeDashoffset = `${len}`;
  return { el, len, start: 0, p0: el.getPointAtLength(0), p1: el.getPointAtLength(len), last: -1 };
});
let artTotal = 0;
strokes.forEach((s, i) => {
  s.start = artTotal;
  artTotal += s.len + (i < strokes.length - 1 ? STROKE_GAP : 0);
});

const _ndc = new THREE.Vector3();
const _dir = new THREE.Vector3();
const tipTarget = new THREE.Vector3();
let canvasRect = canvas.getBoundingClientRect();

function screenToPaper(px, py, out) {
  _ndc.set(((px - canvasRect.left) / canvasRect.width) * 2 - 1, -((py - canvasRect.top) / canvasRect.height) * 2 + 1, 0.5);
  _ndc.unproject(camera);
  _dir.copy(_ndc).sub(camera.position).normalize();
  const t = (PAPER_Z - camera.position.z) / _dir.z;
  return out.copy(camera.position).addScaledVector(_dir, t);
}

const _svgPt = new DOMPoint();
let tangentX = 0;
let penLift = 0;
function pathPointOnPaper(t, out) {
  const d = clamp(t, 0, 1) * artTotal;
  let px = 0;
  let py = 0;
  let tx = 0;
  penLift = 0;
  for (let i = 0; i < strokes.length; i++) {
    const s = strokes[i];
    const next = strokes[i + 1];
    if (d <= s.start + s.len || !next) {
      const l = clamp(d - s.start, 0, s.len);
      const p = s.el.getPointAtLength(l);
      const p2 = s.el.getPointAtLength(Math.min(s.len, l + 2));
      px = p.x;
      py = p.y;
      tx = (p2.x - p.x) / 2;
      break;
    }
    if (d < next.start) {
      // travelling between strokes, needle up
      const k = (d - s.start - s.len) / STROKE_GAP;
      const ks = k * k * (3 - 2 * k);
      px = lerp(s.p1.x, next.p0.x, ks);
      py = lerp(s.p1.y, next.p0.y, ks);
      tx = clamp((next.p0.x - s.p1.x) / 40, -1, 1);
      penLift = Math.sin(k * Math.PI);
      break;
    }
  }
  tangentX = lerp(tangentX, clamp(tx, -1, 1), 0.12);
  const m = artSvg.getScreenCTM();
  _svgPt.x = px;
  _svgPt.y = py;
  const sp = _svgPt.matrixTransform(m);
  screenToPaper(sp.x, sp.y, out);
  out.z += penLift * 0.45;
  return out;
}

function renderInk(t) {
  const d = clamp(t, 0, 1) * artTotal;
  for (const s of strokes) {
    const v = clamp(d - s.start, 0, s.len);
    if (v !== s.last) {
      s.el.style.strokeDashoffset = `${s.len - v}`;
      s.last = v;
    }
  }
}

/* =========================================================
   STATE + RENDER LOOP
   ========================================================= */
const st = { phase: 0, draw: 0, enter: 0 };
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
window.addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

const pose = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 };
const drawPose = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 };
const KEYS = ['x', 'y', 'z', 'rx', 'ry', 'rz', 's'];
const _q = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'ZXY');
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _tipW = new THREE.Vector3();
const _backW = new THREE.Vector3();
const LIGHT = new THREE.Vector3(0.32, -0.42, -1); // direction light travels (towards the paper)

let lastDraw = 0;
let vib = 0;

function computeDrawPose() {
  pathPointOnPaper(st.draw, tipTarget);
  drawPose.rx = DRAW_ROT.rx;
  drawPose.ry = DRAW_ROT.ry;
  drawPose.rz = DRAW_ROT.rz + tangentX * 0.1;
  drawPose.s = DRAW_ROT.s;
  _e.set(drawPose.rx, drawPose.ry, drawPose.rz);
  _q.setFromEuler(_e);
  _v.copy(PEN.tipLocal).multiplyScalar(drawPose.s).applyQuaternion(_q);
  drawPose.x = tipTarget.x - _v.x;
  drawPose.y = tipTarget.y - _v.y;
  drawPose.z = tipTarget.z - _v.z;
}

function render(time) {
  if (!PEN) return;
  const t = time; // seconds (gsap ticker)

  computeDrawPose();

  const ph = clamp(st.phase, 0, 3);
  const i = Math.min(2, Math.floor(ph));
  const f = ph - i;
  const A = i === 2 ? drawPose : POSES[i];
  const B = i + 1 === 2 ? drawPose : POSES[i + 1];
  for (const k of KEYS) pose[k] = lerp(A[k], B[k], f);

  // how "locked" the needle is to the paper (1 while drawing)
  const lock = ph <= 1 ? 0 : ph <= 2 ? (ph - 1) ** 3 : 1 - (ph - 2);
  const free = 1 - clamp(lock, 0, 1);

  // idle float + mouse parallax when free
  mouse.sx = lerp(mouse.sx, mouse.x, 0.06);
  mouse.sy = lerp(mouse.sy, mouse.y, 0.06);
  pose.y += Math.sin(t * 0.9) * 0.06 * free;
  pose.rz += Math.sin(t * 0.7) * 0.025 * free;
  pose.ry += mouse.sx * 0.35 * free;
  pose.rx += mouse.sy * 0.12 * free;

  // intro (after loader): rise + spin
  const en = 1 - st.enter;
  pose.y -= en * 5.5;
  pose.rz += en * 0.9;
  pose.ry -= en * 4.2;

  // needle vibration while it is moving on the paper
  const dv = Math.abs(st.draw - lastDraw);
  lastDraw = st.draw;
  vib = lerp(vib, clamp(dv * 600, 0, 1) * clamp(lock, 0, 1) * (1 - penLift), 0.2);

  const pen = PEN.pen;
  pen.position.set(pose.x, pose.y, pose.z);
  if (vib > 0.01) {
    pen.position.x += (Math.random() - 0.5) * 0.006 * vib;
    pen.position.y += (Math.random() - 0.5) * 0.006 * vib;
  }
  pen.rotation.set(pose.rx, pose.ry, pose.rz, 'ZXY');
  pen.scale.setScalar(pose.s);
  pen.updateMatrixWorld();

  // soft projected contact shadow on the paper
  _tipW.copy(PEN.tipLocal).applyMatrix4(pen.matrixWorld);
  _backW.copy(PEN.backLocal).applyMatrix4(pen.matrixWorld);
  const projTip = (p) => p.addScaledVector(LIGHT, (p.z - PAPER_Z) / -LIGHT.z);
  const hTip = _tipW.z - PAPER_Z;
  const hBack = _backW.z - PAPER_Z;
  projTip(_tipW);
  projTip(_backW);
  const dx = _backW.x - _tipW.x;
  const dy = _backW.y - _tipW.y;
  const len = Math.hypot(dx, dy);
  const avgH = Math.max(0, (hTip + hBack) * 0.5);
  shadow.position.x = (_tipW.x + _backW.x) * 0.5;
  shadow.position.y = (_tipW.y + _backW.y) * 0.5;
  shadow.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
  shadow.scale.set(0.95 * pose.s * (1 + avgH * 0.35), len * 1.25 + 0.4 * pose.s);
  shadow.material.opacity = (0.34 / (1 + avgH * 0.55)) * st.enter;

  // ink
  renderInk(st.draw);

  renderer.render(scene, camera);
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  canvasRect = canvas.getBoundingClientRect();
  buildPoses();
}
window.addEventListener('resize', resize);
resize();

/* =========================================================
   SCROLL — Lenis + pinned scrubbed timeline
   ========================================================= */
const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
lenis.stop();
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
  render(time);
});
gsap.ticker.lagSmoothing(0);

function buildScroll() {
  const rise = (sel) => $$(sel);
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '#stage',
      start: 'top top',
      end: () => `+=${window.innerHeight * 5}`,
      pin: true,
      scrub: 1,
      onUpdate: (self) => { $('#railBar').style.transform = `scaleY(${self.progress})`; },
      onRefresh: () => { canvasRect = canvas.getBoundingClientRect(); },
    },
  });

  // 1 — hero out, pen zooms in
  tl.to(st, { phase: 1, duration: 1.6, ease: 'power2.inOut' }, 0)
    .to(rise('.hero [data-rise]'), { yPercent: -110, duration: 0.6, stagger: 0.04, ease: 'power2.in' }, 0)
    .to('.hero__scroll', { autoAlpha: 0, duration: 0.3 }, 0)
    .set('#beat1', { autoAlpha: 1 }, 0.8)
    .fromTo(rise('#beat1 .mask > span'), { yPercent: 110 }, { yPercent: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 0.85)
    .fromTo(rise('#beat1 .beat__text, #beat1 .beat__cols'), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' }, 1.1);

  // 2 — pen moves to the paper, beat out
  tl.to(rise('#beat1 .mask > span'), { yPercent: -110, duration: 0.5, stagger: 0.05, ease: 'power2.in' }, 2.4)
    .to(rise('#beat1 .beat__text, #beat1 .beat__cols'), { autoAlpha: 0, y: -16, duration: 0.4 }, 2.4)
    .set('#beat1', { autoAlpha: 0 }, 3.0)
    .to(st, { phase: 2, duration: 1.6, ease: 'power2.inOut' }, 2.4)
    .to('#art', { autoAlpha: 1, duration: 0.4 }, 3.4);

  // 3 — needle traces the drawing, attributes appear
  tl.to(st, { draw: 1, duration: 3.2, ease: 'none' }, 4.0);
  $$('.attr').forEach((el, i) => {
    tl.fromTo(el, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 4.3 + i * 0.55);
  });
  tl.fromTo('#artDots circle', { opacity: 0, scale: 0, transformOrigin: 'center' }, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.04 }, 6.6);

  // 4 — pen lifts away, final CTA
  tl.to('.attr', { autoAlpha: 0, y: -18, duration: 0.5, stagger: 0.05 }, 7.5)
    .to(st, { phase: 3, duration: 1.6, ease: 'power2.inOut' }, 7.7)
    .to('#art', isMobile()
      ? { scale: 0.78, yPercent: -64, x: '-14vw', duration: 1.6, ease: 'power2.inOut' }
      : { scale: 0.82, x: '7vw', duration: 1.6, ease: 'power2.inOut' }, 7.7)
    .set('#final', { autoAlpha: 1 }, 8.5)
    .fromTo(rise('#final .mask > span'), { yPercent: 110 }, { yPercent: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out' }, 8.55)
    .fromTo(rise('#final .beat__text, #final .btn'), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' }, 8.8)
    .to({}, { duration: 0.8 }, 9.4);

  return tl;
}

/* =========================================================
   BOOT
   ========================================================= */
gsap.set('.hero [data-rise]', { yPercent: 110 });
gsap.set('.nav', { autoAlpha: 0, y: -12 });
gsap.set('.hero__scroll', { xPercent: -50, autoAlpha: 0, y: 20 });
gsap.set('#art', { x: 0, y: 0, xPercent: -50, yPercent: -50, autoAlpha: 0 });

const fontsReady = Promise.race([
  document.fonts.ready,
  new Promise((r) => setTimeout(r, 2500)),
]);

fontsReady
  .then(() => document.fonts.load('italic 68px "Instrument Serif"').catch(() => {}))
  .then(() => {
    PEN = buildPen();
    scene.add(PEN.pen);
    renderer.compile(scene, camera);
    render(0);
    return new Promise((r) => (loadTween.isActive() ? loadTween.eventCallback('onComplete', r) : r()));
  })
  .then(() => new Promise((r) => {
    gsap.to(load, { v: 100, duration: 0.6, ease: 'power2.out', onUpdate: renderLoad, onComplete: r });
  }))
  .then(intro);

function intro() {
  const tl = gsap.timeline({
    onComplete: () => {
      document.body.classList.remove('is-loading');
      loader.remove();
      buildScroll();
      ScrollTrigger.refresh();
      lenis.start();
    },
  });

  tl.to('#loaderBadge, .loader__foot, .loader__bar', { autoAlpha: 0, y: -24, duration: 0.6, ease: 'power2.in', stagger: 0.05 })
    .to('.loader__lines', { autoAlpha: 0, duration: 0.5 }, '<')
    .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.25, ease: 'expo.inOut' }, '-=0.15')
    .to(st, { enter: 1, duration: 2.2, ease: 'expo.out' }, '-=0.75')
    .to('.hero [data-rise]', { yPercent: 0, duration: 1.2, stagger: 0.07, ease: 'expo.out' }, '-=1.9')
    .to('.nav', { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out' }, '-=1.5')
    .to('.hero__scroll', { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out' }, '-=1.1');
}
