/**
 * recallTileScene.js
 * Purpose: One Three.js scene per recall square — a clay plate + a category glyph.
 *
 * Geometries are shared across tiles (20 cards must not allocate 20 sphere
 * buffers). Materials are per-tile so Class I rims can be a different color.
 * The shared WebGL renderer lives in recallTileRuntime.js; this file never
 * creates a canvas.
 */
import * as THREE from 'three';
import { tileAccent, tilePlateColor, tileRimColor } from './recallTileTheme.js';

const geoms = {
  plate: new THREE.BoxGeometry(1.7, 0.14, 1.7),
  sphere: new THREE.SphereGeometry(0.52, 24, 16),
  nut: new THREE.SphereGeometry(0.22, 14, 10),
  bottle: new THREE.CylinderGeometry(0.22, 0.26, 0.78, 18),
  cap: new THREE.CylinderGeometry(0.16, 0.16, 0.1, 16),
  glass: new THREE.CylinderGeometry(0.28, 0.22, 0.7, 18),
  box: new THREE.BoxGeometry(0.72, 0.72, 0.28),
  slab: new THREE.BoxGeometry(0.78, 0.32, 0.5),
  fruit: new THREE.IcosahedronGeometry(0.52, 0),
  ring: new THREE.TorusGeometry(0.78, 0.035, 8, 32),
  frame: new THREE.TorusGeometry(0.62, 0.06, 8, 24),
  photo: new THREE.PlaneGeometry(0.85, 0.85),
};

function clay(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.08,
    ...extra,
  });
}

function addLights(scene) {
  scene.add(new THREE.AmbientLight(0xf7fff9, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(1.4, 2.2, 1.6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd9e4cc, 0.45);
  fill.position.set(-1.6, 0.4, 1.2);
  scene.add(fill);
}

function glyphGroup(kind, accent) {
  const group = new THREE.Group();
  const mat = clay(accent);

  if (kind === 'dairy') {
    group.add(new THREE.Mesh(geoms.sphere, mat));
  } else if (kind === 'formula') {
    const bottle = new THREE.Mesh(geoms.bottle, mat);
    const cap = new THREE.Mesh(geoms.cap, clay(0xf7fff9));
    cap.position.y = 0.44;
    group.add(bottle, cap);
  } else if (kind === 'beverage') {
    group.add(new THREE.Mesh(geoms.glass, mat));
  } else if (kind === 'produce') {
    group.add(new THREE.Mesh(geoms.fruit, mat));
  } else if (kind === 'meat') {
    group.add(new THREE.Mesh(geoms.slab, mat));
  } else if (kind === 'seafood') {
    const fish = new THREE.Mesh(geoms.sphere, mat);
    fish.scale.set(1.25, 0.42, 0.7);
    group.add(fish);
  } else if (kind === 'nuts') {
    const a = new THREE.Mesh(geoms.nut, mat);
    const b = new THREE.Mesh(geoms.nut, mat);
    const c = new THREE.Mesh(geoms.nut, mat);
    a.position.set(-0.22, -0.05, 0.1);
    b.position.set(0.24, 0.02, 0.05);
    c.position.set(0.02, 0.18, -0.12);
    group.add(a, b, c);
  } else if (kind === 'consumer') {
    const plane = new THREE.Mesh(geoms.photo, clay(0xf7fff9, { roughness: 0.35 }));
    const frame = new THREE.Mesh(geoms.frame, mat);
    frame.rotation.x = Math.PI / 2;
    plane.position.y = 0.02;
    group.add(plane, frame);
    group.rotation.x = -0.35;
  } else {
    group.add(new THREE.Mesh(geoms.box, mat));
  }

  group.position.y = 0.18;
  return group;
}

export function createTileScene({ kind = 'packaged', classification = '' } = {}) {
  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
  camera.position.set(0, 0.85, 2.55);
  camera.lookAt(0, 0.05, 0);

  addLights(scene);

  const root = new THREE.Group();
  const plate = new THREE.Mesh(geoms.plate, clay(tilePlateColor(classification)));
  plate.position.y = -0.52;
  plate.rotation.y = Math.PI / 8;
  root.add(plate);

  const glyph = glyphGroup(kind, tileAccent(kind));
  root.add(glyph);

  const rim = new THREE.Mesh(geoms.ring, clay(tileRimColor(classification)));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.44;
  root.add(rim);

  scene.add(root);

  const materials = [];
  root.traverse((obj) => {
    if (obj.isMesh && obj.material) materials.push(obj.material);
  });

  return {
    scene,
    camera,
    root,
    glyph,
    tick(elapsedMs) {
      const t = elapsedMs / 1000;
      root.rotation.y = t * 0.35;
      glyph.rotation.y = t * 0.55;
      glyph.position.y = 0.18 + Math.sin(t * 1.4) * 0.04;
    },
    dispose() {
      for (const material of materials) material.dispose();
    },
  };
}
