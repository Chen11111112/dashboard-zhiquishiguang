"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CABINETS, STATUS_META, type CabinetKey, type Locker } from "../lib/lockers";

// 尺寸（公尺）
const COL_W = 0.42;
const ROW_H = [0.56, 0.42, 0.42, 0.42];
const DEPTH = 0.42;
const BASE = 0.07;
const T = 0.015; // 板材厚度
const DOOR_T = 0.018;
const GAP = 0.03; // 兩座櫃體間距
const CAB_W = COL_W * 5;
const CAB_H = ROW_H.reduce((a, b) => a + b, 0);
const OPEN_ANGLE = 1.7;
const CJK_FONT = '"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif';

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  draw(canvas.getContext("2d")!, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function titleCharTexture(char: string, outline: string) {
  return canvasTexture(256, (ctx, s) => {
    ctx.font = `900 ${s * 0.66}px ${CJK_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.strokeStyle = outline;
    ctx.lineWidth = s * 0.16;
    ctx.strokeText(char, s / 2, s / 2);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillText(char, s / 2, s / 2);
  });
}

function letterTexture(letter: string) {
  return canvasTexture(64, (ctx, s) => {
    ctx.font = `800 ${s * 0.8}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#a9773a";
    ctx.fillText(letter, s / 2, s / 2 + 2);
  });
}

function drawQr(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const n = 21;
  const cell = size / n;
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  ctx.fillStyle = "#111";
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) if (rand() > 0.52) ctx.fillRect(x + i * cell, y + j * cell, cell + 0.5, cell + 0.5);
  // 三個定位角
  for (const [fx, fy] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(x + fx * cell, y + fy * cell, 7 * cell, 7 * cell);
    ctx.fillStyle = "#111";
    ctx.fillRect(x + fx * cell, y + fy * cell, 7 * cell, 7 * cell);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x + (fx + 1) * cell, y + (fy + 1) * cell, 5 * cell, 5 * cell);
    ctx.fillStyle = "#111";
    ctx.fillRect(x + (fx + 2) * cell, y + (fy + 2) * cell, 3 * cell, 3 * cell);
  }
}

function qrTexture() {
  return canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, s, s);
    drawQr(ctx, s * 0.12, s * 0.12, s * 0.76);
  });
}

function posterTexture() {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#111";
    ctx.font = `700 ${s * 0.085}px ${CJK_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("校園應用系統入口網站", s / 2, s * 0.14);
    drawQr(ctx, s * 0.17, s * 0.2, s * 0.66);
  });
}

interface DoorEntry {
  id: string;
  pivot: THREE.Group;
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  angle: number;
}

export default function LockerScene({
  lockers,
  selectedId,
  onSelect,
}: {
  lockers: Locker[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<string | null>(selectedId);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    selectedRef.current = selectedId;
    onSelectRef.current = onSelect;
  }, [selectedId, onSelect]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    const target = new THREE.Vector3(0, BASE + CAB_H / 2 - 0.05, 0);
    const viewDir = new THREE.Vector3(-0.42, 0.14, 1).normalize();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(target);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minPolarAngle = 1.0;
    controls.maxPolarAngle = 1.6;
    controls.minAzimuthAngle = -1.0;
    controls.maxAzimuthAngle = 1.0;

    // 燈光
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d2c3, 1.5));
    const sun = new THREE.DirectionalLight(0xfff4e2, 1.8);
    sun.position.set(2.5, 4.5, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -2, near: 0.5, far: 14 });
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    // 地面只接陰影，背景交給 CSS
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.16 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 共用材質與貼圖
    const shellMat = new THREE.MeshStandardMaterial({ color: 0xd4d1c8, roughness: 0.85 });
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x8f8c84, roughness: 0.95 });
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x77746d, roughness: 0.9 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xb4b8bd, roughness: 0.35, metalness: 0.6 });
    const sensorMat = new THREE.MeshStandardMaterial({ color: 0xb98a3e, roughness: 0.6 });
    const parcelMat = new THREE.MeshStandardMaterial({ color: 0xc69c6d, roughness: 0.9 });
    const trimMats: Record<CabinetKey, THREE.Material> = {
      campus: new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.3, metalness: 0.8 }),
      food: new THREE.MeshStandardMaterial({ color: 0xe2b93b, roughness: 0.3, metalness: 0.8 }),
    };
    const qrMat = new THREE.MeshBasicMaterial({ map: qrTexture() });
    const letterMats = new Map<string, THREE.Material>();
    const letterMat = (l: string) => {
      if (!letterMats.has(l))
        letterMats.set(l, new THREE.MeshBasicMaterial({ map: letterTexture(l), transparent: true }));
      return letterMats.get(l)!;
    };
    const plane = (w: number, h: number, mat: THREE.Material) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    const box = (w: number, h: number, d: number, mat: THREE.Material) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    };

    const doors: DoorEntry[] = [];
    const doorMeshes: THREE.Mesh[] = [];

    (Object.keys(CABINETS) as CabinetKey[]).forEach((key, ci) => {
      const cab = new THREE.Group();
      cab.position.x = ci === 0 ? -CAB_W - GAP / 2 : GAP / 2;
      scene.add(cab);

      // 櫃體：背板、立板、層板、底座
      const yMid = BASE + CAB_H / 2;
      const back = box(CAB_W, CAB_H, T, innerMat);
      back.position.set(CAB_W / 2, yMid, -DEPTH / 2);
      cab.add(back);
      for (let i = 0; i <= 5; i++) {
        const v = box(T, CAB_H, DEPTH, i === 0 || i === 5 ? shellMat : innerMat);
        v.position.set(i * COL_W, yMid, 0);
        cab.add(v);
      }
      let y = BASE + CAB_H;
      for (let r = 0; r <= 4; r++) {
        const s = box(CAB_W + T, T, DEPTH, r === 0 ? shellMat : innerMat);
        s.position.set(CAB_W / 2, y, 0);
        cab.add(s);
        y -= ROW_H[r] ?? 0;
      }
      const base = box(CAB_W - 0.04, BASE, DEPTH - 0.05, baseMat);
      base.position.set(CAB_W / 2, BASE / 2, 0);
      cab.add(base);

      // 正面飾條（食光＝金色、校園＝不鏽鋼）
      const zTrim = DEPTH / 2 + DOOR_T / 2;
      const tw = 0.022;
      const trims: [number, number, number, number][] = [
        [CAB_W + tw * 2, tw, CAB_W / 2, BASE + CAB_H + tw / 2],
        [tw, CAB_H, -tw / 2, yMid],
        [tw, CAB_H, CAB_W + tw / 2, yMid],
      ];
      for (const [w, h, x, ty] of trims) {
        const t = box(w, h, DOOR_T + 0.012, trimMats[key]);
        t.position.set(x, ty, zTrim);
        cab.add(t);
      }

      // 門
      const title = CABINETS[key].title;
      const outline = key === "campus" ? "#cfe6d6" : "#f7d038";
      let rowTop = BASE + CAB_H;
      for (let r = 0; r < 4; r++) {
        const h = ROW_H[r];
        for (let c = 0; c < 5; c++) {
          const locker = lockers.find((l) => l.cabinet === key && l.row === r && l.col === c);
          if (!locker) continue;
          const dw = COL_W - 0.012;
          const dh = h - 0.012;
          const front = DOOR_T / 2 + 0.0015;

          const pivot = new THREE.Group(); // 鉸鏈在右側
          pivot.position.set((c + 1) * COL_W - 0.006, rowTop - h / 2, DEPTH / 2 + DOOR_T / 2);
          cab.add(pivot);

          const material = new THREE.MeshStandardMaterial({ color: 0xe8e5de, roughness: 0.78 });
          const door = box(dw, dh, DOOR_T, material);
          door.position.x = -dw / 2;
          door.userData.id = locker.id;
          pivot.add(door);

          const letter = plane(0.07, 0.07, letterMat(locker.letter));
          letter.position.set(-dw / 2 + 0.055, dh / 2 - 0.06, front);
          door.add(letter);

          const sensor = box(0.07, 0.045, 0.004, sensorMat);
          sensor.position.set(dw / 2 - 0.135, dh / 2 - 0.055, front);
          door.add(sensor);

          const qr = plane(0.055, 0.055, qrMat);
          qr.position.set(dw / 2 - 0.05, dh / 2 - 0.055, front);
          door.add(qr);

          const handle = box(0.018, 0.09, 0.03, handleMat);
          handle.position.set(-dw / 2 + 0.04, r === 0 ? 0.02 : 0, DOOR_T / 2 + 0.015);
          door.add(handle);

          // 狀態燈條
          const strip = plane(dw * 0.5, 0.016, new THREE.MeshBasicMaterial({ color: STATUS_META[locker.status].color }));
          strip.position.set(0, -dh / 2 + 0.035, front);
          door.add(strip);

          if (r === 0) {
            if (c < title.length) {
              const ch = plane(
                0.27,
                0.27,
                new THREE.MeshBasicMaterial({ map: titleCharTexture(title[c], outline), transparent: true }),
              );
              ch.position.set(0.025, -0.03, front);
              door.add(ch);
            } else {
              const poster = plane(0.2, 0.2, new THREE.MeshBasicMaterial({ map: posterTexture() }));
              poster.position.set(0.03, -0.04, front);
              door.add(poster);
            }
          }

          if (locker.status === "occupied" || locker.status === "overdue") {
            const parcel = box(0.2, 0.15, 0.2, parcelMat);
            parcel.position.set(c * COL_W + COL_W / 2, rowTop - h + T / 2 + 0.075, 0);
            cab.add(parcel);
          }

          doors.push({ id: locker.id, pivot, mesh: door, material, angle: 0 });
          doorMeshes.push(door);
        }
        rowTop -= h;
      }
    });

    // 視窗尺寸 → 相機距離
    const fit = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const halfW = CAB_W + GAP + 0.12;
      const halfH = CAB_H / 2 + 0.45;
      const dist = Math.max(halfH / tan, halfW / (tan * camera.aspect)) + DEPTH;
      camera.position.copy(target).addScaledVector(viewDir, dist);
      controls.minDistance = dist * 0.45;
      controls.maxDistance = dist * 1.4;
      camera.updateProjectionMatrix();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);

    // 滑鼠互動
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered: string | null = null;
    let downAt: [number, number] | null = null;
    const pick = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(doorMeshes, false)[0];
      return (hit?.object.userData.id as string | undefined) ?? null;
    };
    const onMove = (e: PointerEvent) => {
      hovered = pick(e);
      renderer.domElement.style.cursor = hovered ? "pointer" : "grab";
    };
    const onLeave = () => (hovered = null);
    const onDown = (e: PointerEvent) => (downAt = [e.clientX, e.clientY]);
    const onUp = (e: PointerEvent) => {
      if (!downAt) return;
      const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
      downAt = null;
      if (moved > 5) return; // 拖曳旋轉，不算點擊
      const id = pick(e);
      onSelectRef.current(id === selectedRef.current ? null : id);
    };
    const el = renderer.domElement;
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);

    // 路人：時不時從櫃子前面走過
    const limbGeo = new THREE.CapsuleGeometry(0.055, 0.5, 4, 8).translate(0, -0.305, 0);
    const armGeo = new THREE.CapsuleGeometry(0.045, 0.42, 4, 8).translate(0, -0.255, 0);
    const torsoGeo = new THREE.CapsuleGeometry(0.15, 0.38, 4, 12);
    const headGeo = new THREE.SphereGeometry(0.115, 16, 12);
    const hairGeo = new THREE.SphereGeometry(0.122, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const bagGeo = new THREE.BoxGeometry(0.24, 0.3, 0.12);
    const SHIRTS = [0x4f7cac, 0xd98a5f, 0x6b9e78, 0xc9b458, 0x8c6bb1, 0xf1ede3, 0x3d4a5c, 0xc8565b];
    const PANTS = [0x2f3b52, 0x4a4a4a, 0x6b5b4b, 0x8a8f98];
    const SKINS = [0xe6bf9f, 0xd9a880, 0xf0cdb0];
    const HAIRS = [0x1f1a17, 0x3a2a20, 0x2b2b2b];
    const pickOne = (list: number[]) => list[Math.floor(Math.random() * list.length)];
    const WALK_END = 5.5;

    interface Walker {
      group: THREE.Group;
      legs: THREE.Mesh[];
      arms: THREE.Mesh[];
      materials: THREE.Material[];
      dir: number;
      speed: number;
      phase: number;
      height: number;
    }
    const walkers: Walker[] = [];

    const spawnWalker = () => {
      const mat = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
      const shirt = mat(pickOne(SHIRTS));
      const pants = mat(pickOne(PANTS));
      const skin = mat(pickOne(SKINS));
      const hair = mat(pickOne(HAIRS));
      const materials: THREE.Material[] = [shirt, pants, skin, hair];
      const part = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z = 0) => {
        const mesh = new THREE.Mesh(geo, m);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        return mesh;
      };
      // 區域座標：+z 為前進方向
      const group = new THREE.Group();
      const legs = [part(limbGeo, pants, -0.08, 0.63), part(limbGeo, pants, 0.08, 0.63)];
      const arms = [part(armGeo, shirt, -0.2, 1.22), part(armGeo, shirt, 0.2, 1.22)];
      group.add(...legs, ...arms, part(torsoGeo, shirt, 0, 0.97), part(headGeo, skin, 0, 1.44));
      group.add(part(hairGeo, hair, 0, 1.45, -0.01));
      if (Math.random() < 0.6) {
        const bag = mat(pickOne(PANTS));
        materials.push(bag);
        group.add(part(bagGeo, bag, 0, 1.02, -0.2));
      }
      const dir = Math.random() < 0.5 ? 1 : -1;
      group.rotation.y = (dir * Math.PI) / 2;
      group.position.set(-dir * WALK_END, 0, 0.85 + Math.random() * 0.7);
      scene.add(group);
      walkers.push({
        group,
        legs,
        arms,
        materials,
        dir,
        speed: 0.85 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        height: 0.96 + Math.random() * 0.14,
      });
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clock = new THREE.Clock();
    let spawnIn = 1.5;

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.1);
      if (!reducedMotion) {
        spawnIn -= dt;
        if (spawnIn <= 0 && walkers.length < 3) {
          spawnWalker();
          spawnIn = 4 + Math.random() * 8;
        }
      }
      for (let i = walkers.length - 1; i >= 0; i--) {
        const w = walkers[i];
        w.group.position.x += w.dir * w.speed * dt;
        w.phase += dt * w.speed * 5.2;
        const swing = Math.sin(w.phase) * 0.55;
        w.legs[0].rotation.x = swing;
        w.legs[1].rotation.x = -swing;
        w.arms[0].rotation.x = -swing * 0.7;
        w.arms[1].rotation.x = swing * 0.7;
        w.group.position.y = Math.abs(Math.sin(w.phase)) * 0.015;
        // 在兩端淡入淡出，避免突然出現
        const edge = THREE.MathUtils.clamp((WALK_END - Math.abs(w.group.position.x)) / 0.6, 0.001, 1);
        w.group.scale.setScalar(w.height * edge);
        if (w.group.position.x * w.dir > WALK_END) {
          scene.remove(w.group);
          w.materials.forEach((m) => m.dispose());
          walkers.splice(i, 1);
        }
      }
      const selected = selectedRef.current;
      for (const d of doors) {
        const isSel = d.id === selected;
        d.angle += ((isSel ? OPEN_ANGLE : 0) - d.angle) * 0.12;
        d.pivot.rotation.y = d.angle;
        d.material.emissive.setHex(isSel ? 0x4a3000 : d.id === hovered ? 0x202020 : 0x000000);
      }
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      controls.dispose();
      for (const g of [limbGeo, armGeo, torsoGeo, headGeo, hairGeo, bagGeo]) g.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
            (m as THREE.MeshBasicMaterial).map?.dispose();
            m.dispose();
          }
        }
      });
      renderer.dispose();
      el.remove();
    };
  }, [lockers]);

  return <div ref={hostRef} className="absolute inset-0" />;
}
