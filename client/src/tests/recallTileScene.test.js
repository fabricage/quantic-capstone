/**
 * recallTileScene.test.js
 * Purpose: Scene factory returns a camera + a rotating root without opening WebGL.
 */
import { describe, expect, it } from 'vitest';
import { createTileScene } from '../lib/recallTileScene.js';

describe('createTileScene', () => {
  it('builds a scene for each kind and can tick and dispose', () => {
    const dairy = createTileScene({ kind: 'dairy', classification: 'Class II' });
    expect(dairy.scene).toBeTruthy();
    expect(dairy.camera).toBeTruthy();
    expect(dairy.root).toBeTruthy();
    const before = dairy.root.rotation.y;
    dairy.tick(1000);
    expect(dairy.root.rotation.y).not.toBe(before);
    dairy.dispose();

    const consumer = createTileScene({ kind: 'consumer', classification: 'Consumer Product' });
    expect(consumer.glyph).toBeTruthy();
    consumer.dispose();
  });
});
