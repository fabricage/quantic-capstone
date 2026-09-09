/**
 * recallTileRuntime.js
 * Purpose: One shared WebGLRenderer that paints every visible recall square.
 *
 * Browsers cap WebGL contexts (~8–16). Twenty cards each with their own
 * renderer would go blank. We render off-screen once per frame, then blit
 * into each tile's 2D canvas. Tiles register/unregister themselves.
 */
import * as THREE from 'three';

const tiles = new Set();
let renderer;
let looping = false;
let lastSize = '';

function getRenderer() {
  if (renderer) return renderer;
  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: false,
    powerPreference: 'low-power',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

function startLoop() {
  if (looping) return;
  looping = true;

  function frame(now) {
    if (tiles.size === 0) {
      looping = false;
      return;
    }

    const gl = getRenderer();
    for (const tile of tiles) {
      if (!tile.visible || !tile.ctx || !tile.scene) continue;
      if (!tile.reduceMotion) tile.tick?.(now);

      const key = `${tile.width}x${tile.height}`;
      if (key !== lastSize) {
        gl.setSize(tile.width, tile.height, false);
        lastSize = key;
      }

      gl.render(tile.scene, tile.camera);
      try {
        tile.ctx.drawImage(gl.domElement, 0, 0, tile.width, tile.height);
      } catch {
        // A tainted blit should not kill the whole list.
      }
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

export function registerTile(tile) {
  tiles.add(tile);
  startLoop();
}

export function unregisterTile(tile) {
  tiles.delete(tile);
  tile.dispose?.();
}
