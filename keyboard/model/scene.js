// 提案B（Choc V2 19mm・右手トラボ）の分解 3D モデル。寸法は概略（mm）。
// 使えるグローバル: THREE, OrbitControls, canvas, width, height
// 自動で「組み立て → 分解 → 組み立て」を繰り返す。ドラッグで回転、ホイール/ピンチで拡大。
const DATA = {"unit": 19.0, "keys": [{"side": "L", "x": 9.5, "y": 16.53, "a": 0, "label": "1"}, {"side": "L", "x": 28.5, "y": 11.78, "a": 0, "label": "2"}, {"side": "L", "x": 47.5, "y": 9.5, "a": 0, "label": "3"}, {"side": "L", "x": 66.5, "y": 11.78, "a": 0, "label": "4"}, {"side": "L", "x": 85.5, "y": 14.06, "a": 0, "label": "5"}, {"side": "L", "x": 9.5, "y": 35.53, "a": 0, "label": "Q"}, {"side": "L", "x": 28.5, "y": 30.78, "a": 0, "label": "W"}, {"side": "L", "x": 47.5, "y": 28.5, "a": 0, "label": "E"}, {"side": "L", "x": 66.5, "y": 30.78, "a": 0, "label": "R"}, {"side": "L", "x": 85.5, "y": 33.06, "a": 0, "label": "T"}, {"side": "L", "x": 9.5, "y": 54.53, "a": 0, "label": "A"}, {"side": "L", "x": 28.5, "y": 49.78, "a": 0, "label": "S"}, {"side": "L", "x": 47.5, "y": 47.5, "a": 0, "label": "D"}, {"side": "L", "x": 66.5, "y": 49.78, "a": 0, "label": "F"}, {"side": "L", "x": 85.5, "y": 52.06, "a": 0, "label": "G"}, {"side": "L", "x": 104.5, "y": 54.53, "a": 0, "label": "Esc"}, {"side": "L", "x": 9.5, "y": 73.53, "a": 0, "label": "Z"}, {"side": "L", "x": 28.5, "y": 68.78, "a": 0, "label": "X"}, {"side": "L", "x": 47.5, "y": 66.5, "a": 0, "label": "C"}, {"side": "L", "x": 66.5, "y": 68.78, "a": 0, "label": "V"}, {"side": "L", "x": 85.5, "y": 71.06, "a": 0, "label": "B"}, {"side": "L", "x": 104.5, "y": 73.53, "a": 0, "label": "Tab"}, {"side": "L", "x": 9.5, "y": 92.53, "a": 0, "label": "Ctrl"}, {"side": "L", "x": 28.5, "y": 87.78, "a": 0, "label": "Win"}, {"side": "L", "x": 47.5, "y": 85.5, "a": 0, "label": "Alt"}, {"side": "L", "x": 71.25, "y": 92.53, "a": 0, "label": "英数"}, {"side": "L", "x": 90.74, "y": 96.5, "a": 10, "label": "Spc"}, {"side": "L", "x": 110.18, "y": 104.71, "a": 20, "label": "かな"}, {"side": "R", "x": 190.0, "y": 14.06, "a": 0, "label": "6"}, {"side": "R", "x": 209.0, "y": 11.78, "a": 0, "label": "7"}, {"side": "R", "x": 228.0, "y": 9.5, "a": 0, "label": "8"}, {"side": "R", "x": 247.0, "y": 11.78, "a": 0, "label": "9"}, {"side": "R", "x": 266.0, "y": 16.53, "a": 0, "label": "0"}, {"side": "R", "x": 190.0, "y": 33.06, "a": 0, "label": "Y"}, {"side": "R", "x": 209.0, "y": 30.78, "a": 0, "label": "U"}, {"side": "R", "x": 228.0, "y": 28.5, "a": 0, "label": "I"}, {"side": "R", "x": 247.0, "y": 30.78, "a": 0, "label": "O"}, {"side": "R", "x": 266.0, "y": 35.53, "a": 0, "label": "P"}, {"side": "R", "x": 171.0, "y": 54.53, "a": 0, "label": "-"}, {"side": "R", "x": 190.0, "y": 52.06, "a": 0, "label": "H"}, {"side": "R", "x": 209.0, "y": 49.78, "a": 0, "label": "J"}, {"side": "R", "x": 228.0, "y": 47.5, "a": 0, "label": "K"}, {"side": "R", "x": 247.0, "y": 49.78, "a": 0, "label": "L"}, {"side": "R", "x": 266.0, "y": 54.53, "a": 0, "label": ";"}, {"side": "R", "x": 171.0, "y": 73.53, "a": 0, "label": "="}, {"side": "R", "x": 190.0, "y": 71.06, "a": 0, "label": "N"}, {"side": "R", "x": 209.0, "y": 68.78, "a": 0, "label": "M"}, {"side": "R", "x": 228.0, "y": 66.5, "a": 0, "label": ","}, {"side": "R", "x": 247.0, "y": 68.78, "a": 0, "label": "."}, {"side": "R", "x": 266.0, "y": 73.53, "a": 0, "label": "/"}, {"side": "R", "x": 164.18, "y": 98.21, "a": -20, "label": "BS"}, {"side": "R", "x": 184.47, "y": 93.21, "a": -10, "label": "Ent"}, {"side": "R", "x": 266.0, "y": 92.53, "a": 0, "label": "Del"}], "sides": {"L": {"pcb": [[-0.5, 6.53], [47.0, -9.5], [86.0, -9.5], [95.5, 4.06], [114.5, 44.53], [123.0, 98.73], [116.16, 117.53], [-0.5, 102.53]], "case": [[-4.0, 3.03], [43.5, -13.0], [89.5, -13.0], [99.0, 0.56], [118.0, 41.03], [127.48, 96.64], [118.25, 122.01], [-4.0, 106.03]], "controller": {"x": 66.5, "y": 0.0, "w": 38.0, "h": 18.0}, "battery": {"x": 66.5, "y": 40.0, "w": 31, "h": 52, "t": 6}}, "R": {"pcb": [[151.36, 92.23], [161.0, 44.53], [180.0, 4.06], [246.5, -9.5], [285.5, -9.5], [285.5, 9.5], [276.0, 102.53], [237.3, 124.15], [232.36, 126.2], [227.05, 126.9], [221.74, 126.2], [158.2, 111.03]], "case": [[146.88, 90.14], [157.5, 41.03], [176.5, 0.56], [243.0, -13.0], [289.0, -13.0], [289.0, 13.0], [279.5, 106.03], [239.05, 127.18], [233.26, 129.58], [227.05, 130.4], [220.84, 129.58], [156.11, 115.51]], "controller": {"x": 266.0, "y": 0.0, "w": 38.0, "h": 18.0}, "battery": {"x": 266.0, "y": 40.0, "w": 31, "h": 52, "t": 6}}}, "ball": {"x": 227.05, "y": 106.4, "r": 17.0}, "center": [142.5, 58.7]};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, width / height, 1, 5000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
renderer.setClearColor(0x000000, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
camera.position.set(-60, 320, 540);
controls.target.set(-45, 15, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(-150, 300, 200);
scene.add(sun);

const [CX, CY] = DATA.center;
// レイアウト座標 (x 右, y 手前) → three.js (x 右, z 手前, y 上)
const P = (x, y) => [x - CX, y - CY];

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...extra });
const M = {
  caseBottom: mat(0x9aa3ad), caseTop: mat(0xb8c0c8), pcb: mat(0x1f7a4d, { roughness: 0.4 }),
  sw: mat(0x2b2b30), stem: mat(0xd9534f), cap: mat(0xf4f4f0), capThumb: mat(0x9ec5e8),
  ctrl: mat(0x3d3a8f), bat: mat(0xc9ccd1, { metalness: 0.4 }), ball: mat(0xe0663b, { roughness: 0.25 }),
  sensor: mat(0x2f6f9f), socket: mat(0x111111),
};

function shapeFrom(poly) {
  const s = new THREE.Shape();
  poly.forEach(([x, y], i) => { const [px, pz] = P(x, y); i ? s.lineTo(px, -pz) : s.moveTo(px, -pz); });
  s.closePath();
  return s;
}
function rotatedRectPath(x, y, a, w, h, path) {
  const t = (a * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].forEach(([dx, dy], i) => {
    const [px, pz] = P(x + dx * c - dy * s, y + dx * s + dy * c);
    i ? path.lineTo(px, -pz) : path.moveTo(px, -pz);
  });
  path.closePath();
  return path;
}
// Shape は xy 平面に作るので、x 軸まわりに -90° 回して床に寝かせる
function slab(shape, thickness, material, y0) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 24 });
  const m = new THREE.Mesh(g, material);
  m.rotation.x = -Math.PI / 2;
  m.position.y = y0;
  return m;
}

const groups = {};
function group(name, explode, label, labelColor) {
  const g = new THREE.Group();
  g.userData = { explode, label, labelColor };
  scene.add(g);
  groups[name] = g;
  return g;
}
// explode = 分解したときに上下へ動く量（mm）
const gCase = group('case', -70, 'ボトムケース（3Dプリント）');
const gBat = group('bat', -38, 'Li-Po電池 ×2（6×31×52mm以内）');
const gPcb = group('pcb', 0, '基板＋コントローラ（nRF52840）');
const gSw = group('sw', 34, 'Choc V2 スイッチ ×53');
const gTop = group('top', 62, 'トップケース');
const gCap = group('cap', 96, 'キーキャップ ×53（MX軸・薄型）');
const gBall = group('ball', 74, 'トラックボール 34mm');

for (const side of ['L', 'R']) {
  const S = DATA.sides[side];
  // ボトムケース: 外形の板＋薄い壁
  const caseShape = shapeFrom(S.case);
  gCase.add(slab(caseShape, 3, M.caseBottom, -12));
  const wallShape = shapeFrom(S.case);
  const inner = new THREE.Path();
  S.pcb.forEach(([x, y], i) => { const [px, pz] = P(x, y); i ? inner.lineTo(px, -pz) : inner.moveTo(px, -pz); });
  inner.closePath();
  wallShape.holes.push(inner);
  gCase.add(slab(wallShape, 10, M.caseBottom, -9));

  // 基板
  gPcb.add(slab(shapeFrom(S.pcb), 1.6, M.pcb, -1.6));
  // コントローラ（コンスルーで基板の上に載る）
  const c = S.controller;
  const ctrl = new THREE.Mesh(new THREE.BoxGeometry(c.w, 1.6, c.h), M.ctrl);
  const [cx, cz] = P(c.x, c.y);
  ctrl.position.set(cx, 3.3, cz);
  gPcb.add(ctrl);
  // 電池（基板の下）
  const b = S.battery;
  const bat = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.t, b.h), M.bat);
  const [bx, bz] = P(b.x, b.y);
  bat.position.set(bx, -6, bz);
  gBat.add(bat);

  // トップケース: 外形からスイッチの穴を抜いた板
  const top = shapeFrom(S.case);
  DATA.keys.filter((k) => k.side === side).forEach((k) => top.holes.push(rotatedRectPath(k.x, k.y, k.a, 15, 15, new THREE.Path())));
  if (side === 'R') {
    const [ox, oz] = P(DATA.ball.x, DATA.ball.y);
    const hole = new THREE.Path();
    hole.absarc(ox, -oz, DATA.ball.r + 1.5, 0, Math.PI * 2, true);
    top.holes.push(hole);
  }
  gTop.add(slab(top, 2.2, M.caseTop, 3.0));
}

// キーごとの部品: ソケット(基板裏)・スイッチ・キーキャップ
const capGeo = new THREE.CylinderGeometry(17.0 / Math.SQRT2, 18.0 / Math.SQRT2, 4.5, 4, 1);
const thumbs = new Set(['英数', 'Spc', 'かな', 'BS', 'Ent']);
for (const k of DATA.keys) {
  const [x, z] = P(k.x, k.y);
  const rot = (-k.a * Math.PI) / 180;

  const sock = new THREE.Mesh(new THREE.BoxGeometry(13, 1.8, 6), M.socket);
  sock.position.set(x, -2.5, z); sock.rotation.y = rot; gPcb.add(sock);

  const sw = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(15, 5, 15), M.sw); body.position.y = 2.5; sw.add(body);
  const stem = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), M.stem); stem.position.y = 6.5; sw.add(stem);
  sw.position.set(x, 0, z); sw.rotation.y = rot; gSw.add(sw);

  const cap = new THREE.Group();
  const capMesh = new THREE.Mesh(capGeo, thumbs.has(k.label) ? M.capThumb : M.cap);
  capMesh.rotation.y = Math.PI / 4; cap.add(capMesh);
  // ラベル
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const cx2 = cv.getContext('2d');
  cx2.fillStyle = '#333'; cx2.textAlign = 'center'; cx2.textBaseline = 'middle';
  cx2.font = `bold ${k.label.length > 2 ? 38 : 60}px sans-serif`;
  cx2.fillText(k.label, 64, 66);
  const tex = new THREE.CanvasTexture(cv);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  plane.rotation.x = -Math.PI / 2; plane.position.y = 2.3; cap.add(plane);
  cap.position.set(x, 10.5, z); cap.rotation.y = rot; gCap.add(cap);
}

// トラックボールとセンサー
{
  const [x, z] = P(DATA.ball.x, DATA.ball.y);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(DATA.ball.r, 48, 32), M.ball);
  ball.position.set(x, 9, z); gBall.add(ball);
  const sensor = new THREE.Mesh(new THREE.BoxGeometry(14, 1.6, 14), M.sensor);
  sensor.position.set(x, -9, z); gPcb.add(sensor);
  const cup = new THREE.Mesh(new THREE.TorusGeometry(DATA.ball.r + 1, 1.6, 12, 48), M.caseTop);
  cup.rotation.x = Math.PI / 2; cup.position.set(x, 2, z); gTop.add(cup);
}

// 部品名ラベル（分解したときだけ表示）
function makeLabel(text) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 96;
  const c2 = cv.getContext('2d');
  c2.font = 'bold 52px sans-serif';
  const w = Math.min(1000, c2.measureText(text).width + 48);
  c2.fillStyle = 'rgba(30,30,36,0.85)';
  c2.beginPath(); c2.roundRect(0, 8, w, 80, 18); c2.fill();
  c2.fillStyle = '#fff'; c2.textBaseline = 'middle'; c2.fillText(text, 24, 50);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false }));
  sp.scale.set(128, 12, 1);
  return sp;
}
const minX = Math.min(...DATA.sides.L.case.map((p) => p[0])) - CX;
const maxX = Math.max(...DATA.sides.R.case.map((p) => p[0])) - CX;
const labelY = { case: -8, bat: -6, pcb: 0, sw: 4, top: 4, cap: 11, ball: 9 };
const labels = [];
for (const [name, g] of Object.entries(groups)) {
  const sp = makeLabel(g.userData.label);
  const yBase = labelY[name];
  sp.userData = { name, yBase };
  // 左手の外側に右寄せで並べる。トラボだけ右手の外側に左寄せ
  if (name === 'ball') { sp.center.set(0, 0.5); sp.position.set(maxX + 8, yBase, 40); }
  else { sp.center.set(1, 0.5); sp.position.set(minX - 8, yBase, 0); }
  scene.add(sp);
  labels.push(sp);
}

// 組み立て ⇄ 分解 のアニメーション
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const CYCLE = 9.0; // 秒: 組立2 → 分解へ2 → 分解3 → 組立へ2
function explodeAt(sec) {
  const t = sec % CYCLE;
  if (t < 2) return 0;
  if (t < 4) return ease((t - 2) / 2);
  if (t < 7) return 1;
  return 1 - ease((t - 7) / 2);
}
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const e = explodeAt(clock.getElapsedTime());
  for (const g of Object.values(groups)) g.position.y = g.userData.explode * e;
  for (const sp of labels) {
    sp.position.y = sp.userData.yBase + groups[sp.userData.name].userData.explode * e;
    sp.material.opacity = Math.max(0, (e - 0.6) / 0.4);
  }
  controls.update();
  renderer.render(scene, camera);
}
animate();
