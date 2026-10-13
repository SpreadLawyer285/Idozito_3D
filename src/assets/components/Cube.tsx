import { useEffect, useRef } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const IDS = ["hero", "flip", "display", "back", "use", "specs"];
const H = Math.PI / 2;
// A kijelző korongja a modell +Z lapján. Ha elcsúszik, ezt a kettőt hangold.
export const DISPLAY_R = 0.55;
export const DISPLAY_Z = 0.94;

type Vec3 = [number, number, number];
type Key = { g: number; r: Vec3; x: number; s: number };

// g = szekció indexe + haladás benne. r = forgatás, x = vízszintes eltolás
// (a fél viewport-szélesség törtrésze), s = méret.
const KEYS: Key[] = [
  { g: 0, r: [0.4, -0.6, 0], x: 0.5, s: 1 },
  { g: 1.15, r: [0, -H, 0], x: -0.5, s: 1 }, // +X lap: 10 min
  { g: 1.5, r: [0, H, 0], x: -0.5, s: 1 }, // -X lap: 50 min
  { g: 1.85, r: [H, 0, 0], x: -0.5, s: 1 }, // +Y lap: 5 min
  { g: 2.5, r: [0, 0, 0], x: 0.45, s: 1.35 }, // kijelző
  { g: 3.5, r: [0, Math.PI, 0], x: -0.45, s: 1.1 }, // hátoldal
  { g: 4.5, r: [0.35, 0.5, 0], x: 0, s: 0.7 }, // használat
  { g: 5.5, r: [0.4, -0.6, 0], x: -0.5, s: 1 }, // specifikáció
];

const std = (color: string, roughness: number) =>
  new THREE.MeshStandardMaterial({ color, roughness });
const MATS: Record<string, THREE.Material> = {
  Material: new THREE.MeshPhysicalMaterial({
    color: "#f1f0ec",
    roughness: 0.5,
    clearcoat: 0.4,
    clearcoatRoughness: 0.4,
  }),
  "Material.001": std("#6b6b6b", 0.6), // feliratok
  "Material.002": std("#232323", 0.5), // fekete panelek
  "Material.003": std("#6a6a6a", 0.35), // kapcsoló
  "Material.004": std("#f08a4b", 0.5), // narancs gyűrű
};
export const pick = (m: THREE.Material): THREE.Material => {
  const own = MATS[m.name.split("\0")[0]];
  if (own) return own;
  (m as THREE.MeshPhongMaterial).emissive?.set(0x000000);
  return m;
};

export function drawDisplay(
  ctx: CanvasRenderingContext2D,
  remaining: number,
  total: number
) {
  const S = 512,
    c = S / 2;
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = "#2b2b2b";
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();
  const N = 40,
    lit = Math.ceil((N * remaining) / total);
  for (let i = 0; i < N; i++) {
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate((i / N) * Math.PI * 2 - H);
    ctx.fillStyle = i < lit ? "#f08a4b" : "#454545";
    ctx.beginPath();
    ctx.roundRect(c * 0.78, -6, c * 0.14, 12, 6);
    ctx.fill();
    ctx.restore();
  }
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  ctx.fillStyle = "#ececec";
  ctx.font = "600 112px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${mm}:${ss}`, c, c + 6);
}

function sample(g: number): Omit<Key, "g"> {
  const i = KEYS.findIndex((k) => k.g > g);
  if (i === -1) return KEYS[KEYS.length - 1];
  if (i === 0) return KEYS[0];
  const a = KEYS[i - 1],
    b = KEYS[i];
  let t = (g - a.g) / (b.g - a.g);
  t = t * t * (3 - 2 * t);
  const m = (p: number, q: number) => p + (q - p) * t;
  return {
    r: a.r.map((v, k) => m(v, b.r[k])) as Vec3,
    x: m(a.x, b.x),
    s: m(a.s, b.s),
  };
}

function scrollG() {
  const mid = window.scrollY + window.innerHeight / 2;
  let g = 0;
  IDS.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    if (mid >= top) g = i + Math.min(1, (mid - top) / el.offsetHeight);
  });
  return g;
}

type Props = { remaining?: number; total?: number };

export default function Cube3D({ remaining = 300, total = 300 }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const api = useRef<{
    ctx?: CanvasRenderingContext2D;
    tex?: THREE.CanvasTexture;
  }>({});

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(2, 6, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -4,
      right: 4,
      top: 4,
      bottom: -4,
    });
    sun.shadow.radius = 6;
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShadowMaterial({ opacity: 0.16 })
    );
    ground.rotation.x = -H;
    ground.position.y = -2.3;
    ground.receiveShadow = true;
    scene.add(ground);

    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    cam.position.z = 7;

    const pivot = new THREE.Group();
    scene.add(pivot);

    // saját kijelző a modell +Z lapja elé (élő visszaszámláláshoz)
    const cv = document.createElement("canvas");
    cv.width = cv.height = 512;
    const ctx = cv.getContext("2d")!;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const display = new THREE.Mesh(
      new THREE.CircleGeometry(DISPLAY_R, 64),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
    );
    display.position.z = DISPLAY_Z;
    display.visible = false;
    pivot.add(display);
    api.current = { ctx, tex };

    let dead = false;
    new FBXLoader().load(
      `${import.meta.env.BASE_URL}stopper.fbx`,
      (obj) => {
        if (dead) return;
        const junk: THREE.Object3D[] = [];
        obj.traverse((o) => {
          if (o instanceof THREE.Light || o instanceof THREE.Camera)
            junk.push(o);
        });
        junk.forEach((o) => o.parent?.remove(o));
        obj.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          o.castShadow = true;
          o.material = Array.isArray(o.material)
            ? o.material.map(pick)
            : pick(o.material);
        });
        // a modell ~200 egység: normalizáljuk, hogy a kocka fél éle 1 legyen
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const k = 2 / Math.max(size.x, size.y, size.z);
        obj.scale.setScalar(k);
        obj.position
          .copy(box.getCenter(new THREE.Vector3()))
          .multiplyScalar(-k);
        pivot.add(obj);
        display.visible = true;
      },
      undefined,
      console.error
    );

    const ptr = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      ptr.x = (e.clientX / window.innerWidth - 0.5) * 2;
      ptr.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      cam.aspect = window.innerWidth / window.innerHeight;
      cam.updateProjectionMatrix();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("resize", onResize);
    onResize();

    const clock = new THREE.Timer();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      clock.update();
      const dt = Math.min(clock.getDelta(), 0.05);
      const f = 1 - Math.exp(-dt * 5);
      const t = clock.getElapsed();
      const k = sample(scrollG());
      const wide = cam.aspect > 1;
      const halfW =
        Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) *
        cam.position.z *
        cam.aspect;
      const tx = wide ? k.x * halfW : 0;
      const ty = (wide ? 0 : 0.9) + Math.sin(t * 1.2) * 0.05;
      const ts = wide ? k.s : k.s * 0.7;
      pivot.position.x += (tx - pivot.position.x) * f;
      pivot.position.y += (ty - pivot.position.y) * f;
      pivot.scale.setScalar(pivot.scale.x + (ts - pivot.scale.x) * f);
      const tr = [
        k.r[0] + ptr.y * 0.1,
        k.r[1] + ptr.x * 0.15 + Math.sin(t * 0.5) * 0.06,
        k.r[2],
      ];
      pivot.rotation.x += (tr[0] - pivot.rotation.x) * f;
      pivot.rotation.y += (tr[1] - pivot.rotation.y) * f;
      pivot.rotation.z += (tr[2] - pivot.rotation.z) * f;
      renderer.render(scene, cam);
    };
    tick();

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const { ctx, tex } = api.current;
    if (!ctx || !tex) return;
    drawDisplay(ctx, remaining, total);
    tex.needsUpdate = true;
  }, [remaining, total]);

  return <div ref={mount} className="pointer-events-none fixed inset-0 z-10" />;
}
