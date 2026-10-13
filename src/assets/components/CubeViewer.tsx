import { useEffect, useRef } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { pick, drawDisplay, DISPLAY_R, DISPLAY_Z } from "./Cube";

export type FaceKey = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";
// Melyik lapon hány perc áll. A +Z a kijelző, a -Z a hátoldal: azokon nincs idő.
// A -Y (alsó) lap értéke a képekből nem derült ki: írd át a valódira.
export const FACE_MINUTES: Partial<Record<FaceKey, number>> = {
  "+y": 5,
  "+x": 10,
  "-y": 30,
  "-x": 50,
};

const AX = ["x", "y", "z"] as const;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// A legközelebbi "asztalon álló" helyzet: pontosan egy lap felül, egy lap elöl.
function snapQuat(q: THREE.Quaternion, force?: FaceKey) {
  const W = [V(1), V(0, 1), V(0, 0, 1)].map((v) => v.applyQuaternion(q));
  let u = 0,
    su = 1;
  if (force) {
    u = AX.indexOf(force[1] as "x" | "y" | "z");
    su = force[0] === "+" ? 1 : -1;
  } else {
    u = [0, 1, 2].reduce(
      (b, i) => (Math.abs(W[i].y) > Math.abs(W[b].y) ? i : b),
      0
    );
    su = Math.sign(W[u].y) || 1;
  }
  const rest = [0, 1, 2].filter((i) => i !== u);
  const f = Math.abs(W[rest[0]].z) > Math.abs(W[rest[1]].z) ? rest[0] : rest[1];
  const sf = Math.sign(W[f].z) || 1;
  const k = 3 - u - f;
  const cols = [V(), V(), V()];
  cols[u].set(0, su, 0);
  cols[f].set(0, 0, sf);
  cols[k] =
    f === (u + 1) % 3
      ? cols[u].clone().cross(cols[f])
      : cols[f].clone().cross(cols[u]);
  const quat = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(cols[0], cols[1], cols[2])
  );
  return { quat, face: `${su > 0 ? "+" : "-"}${AX[u]}` as FaceKey };
}

type Props = {
  remaining: number;
  total: number;
  onFace: (minutes: number | null) => void; // a kocka megállt egy lapján
  goTo?: { key: FaceKey; n: number }; // adott lap felülre fordítása
};

export default function CubeViewer({ remaining, total, onFace, goTo }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const api = useRef<{
    ctx?: CanvasRenderingContext2D;
    tex?: THREE.CanvasTexture;
    go?: (k: FaceKey) => void;
  }>({});
  const cb = useRef(onFace);
  cb.current = onFace;

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    const sun = new THREE.DirectionalLight(0xffffff, 1.3);
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
      new THREE.ShadowMaterial({ opacity: 0.4 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.9;
    ground.receiveShadow = true;
    scene.add(ground);

    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    cam.position.set(0, 1.5, 7);
    cam.lookAt(0, 0, 0);

    const floatG = new THREE.Group(); // lebegés
    const pivot = new THREE.Group(); // forgatás
    floatG.add(pivot);
    scene.add(floatG);

    const cv = document.createElement("canvas");
    cv.width = cv.height = 512;
    const ctx = cv.getContext("2d")!;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const display = new THREE.Mesh(
      new THREE.CircleGeometry(DISPLAY_R, 64),
      new THREE.MeshBasicMaterial({
        map: tex,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    // az eredeti kijelző fölött egy hajszállal, a +Z lapon: mereven forog a kockával,
    // a kocka teste takarja, ha a lap elfordul
    display.position.z = DISPLAY_Z + 0.01;
    display.visible = false;
    pivot.add(display);

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

    // --- húzás, kifutás, leesés a legközelebbi lapra ---
    let mode: "rest" | "drag" | "coast" | "snap" = "rest";
    let notify = false;
    let target = new THREE.Quaternion();
    let targetFace: FaceKey = "+y";
    const vel = { x: 0, y: 0 };
    const last = { x: 0, y: 0 };
    const spin = (dx: number, dy: number) =>
      pivot.quaternion.premultiply(
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(dy * 0.008, dx * 0.008, 0)
        )
      );
    const dom = renderer.domElement;
    dom.style.touchAction = "none";
    dom.style.cursor = "grab";
    const down = (e: PointerEvent) => {
      mode = "drag";
      vel.x = vel.y = 0;
      last.x = e.clientX;
      last.y = e.clientY;
      dom.setPointerCapture(e.pointerId);
      dom.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (mode !== "drag") return;
      vel.x = e.clientX - last.x;
      vel.y = e.clientY - last.y;
      last.x = e.clientX;
      last.y = e.clientY;
      spin(vel.x, vel.y);
    };
    const up = () => {
      if (mode !== "drag") return;
      mode = "coast";
      dom.style.cursor = "grab";
    };
    dom.addEventListener("pointerdown", down);
    dom.addEventListener("pointermove", move);
    dom.addEventListener("pointerup", up);
    dom.addEventListener("pointercancel", up);

    const settle = (force?: FaceKey) => {
      const s = snapQuat(pivot.quaternion, force);
      target = s.quat;
      targetFace = s.face;
      mode = "snap";
      notify = true;
    };
    api.current = { ctx, tex, go: (k) => settle(k) };

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      cam.aspect = window.innerWidth / window.innerHeight;
      cam.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);
    onResize();

    const clock = new THREE.Timer();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      clock.update();
      const dt = Math.min(clock.getDelta(), 0.05);
      if (mode === "coast") {
        spin(vel.x, vel.y);
        const d = Math.exp(-dt * 3.5);
        vel.x *= d;
        vel.y *= d;
        if (Math.hypot(vel.x, vel.y) < 0.25) settle();
      } else if (mode === "snap") {
        pivot.quaternion.slerp(target, 1 - Math.exp(-dt * 7));
        if (pivot.quaternion.angleTo(target) < 0.002) {
          pivot.quaternion.copy(target);
          mode = "rest";
          if (notify) {
            notify = false;
            cb.current(FACE_MINUTES[targetFace] ?? null);
          }
        }
      }
      const portrait = cam.aspect < 1;
      floatG.scale.setScalar(portrait ? 0.75 : 0.85);
      floatG.position.y =
        Math.sin(clock.getElapsed() * 1.3) * 0.05 + (portrait ? -0.1 : -0.1);
      // a kijelző a +Z lappal együtt dől (jobbra-balra, fel-le), de a saját tengelye körül
      // nem forog, így a felirat mindig vízszintes marad
      const pq = pivot.getWorldQuaternion(new THREE.Quaternion());
      const n = V(0, 0, 1).applyQuaternion(pq);
      const xAxis = V(0, 1, 0).cross(n);
      if (xAxis.lengthSq() < 1e-4) xAxis.set(1, 0, 0).applyQuaternion(pq); // a lap fel/le néz: nincs "fent"
      xAxis.normalize();
      const yAxis = n.clone().cross(xAxis);
      const upright = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(xAxis, yAxis, n)
      );
      display.quaternion.copy(pq.clone().invert().multiply(upright));
      renderer.render(scene, cam);
    };
    tick();

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      dom.removeEventListener("pointerdown", down);
      dom.removeEventListener("pointermove", move);
      dom.removeEventListener("pointerup", up);
      dom.removeEventListener("pointercancel", up);
      renderer.dispose();
      el.removeChild(dom);
    };
  }, []);

  useEffect(() => {
    api.current.go && goTo && api.current.go(goTo.key);
  }, [goTo]);

  useEffect(() => {
    const { ctx, tex } = api.current;
    if (!ctx || !tex) return;
    drawDisplay(ctx, remaining, total);
    tex.needsUpdate = true;
  }, [remaining, total]);

  return <div ref={mount} className="fixed inset-0 z-10" />;
}
