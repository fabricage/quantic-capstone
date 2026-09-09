/**
 * webgl.js
 * Purpose: Feature-detect WebGL once. jsdom has no GPU, so tests take the
 * 2D fallback path without mocking Three.
 */
let cached;

export function canUseWebGL() {
  if (cached !== undefined) return cached;
  if (typeof document === 'undefined') {
    cached = false;
    return cached;
  }
  try {
    const canvas = document.createElement('canvas');
    cached = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    cached = false;
  }
  return cached;
}

/** Tests only — reset the memo after stubbing canvas. */
export function resetWebGLDetection() {
  cached = undefined;
}
