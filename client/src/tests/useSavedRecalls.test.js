/**
 * useSavedRecalls.test.js
 * Purpose: Read/write helpers, corrupt data, toggle, and storage-event sync.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  SAVED_STORAGE_KEY,
  readSaved,
  useSavedRecalls,
  writeSaved,
} from '../hooks/useSavedRecalls.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    removeItem(key) {
      delete data[key];
    },
  };
}

afterEach(() => {
  localStorage.clear();
});

describe('readSaved / writeSaved', () => {
  it('round-trips bookmarks and stores only id, product, and recallDate', () => {
    const storage = memoryStorage();
    writeSaved(
      [
        {
          id: 'F-1',
          product: 'Infant formula',
          recallDate: '20240115',
          firm: 'should not persist',
          reason: 'nope',
        },
      ],
      storage,
    );
    const stored = JSON.parse(storage.getItem(SAVED_STORAGE_KEY));
    expect(stored).toEqual([
      { id: 'F-1', product: 'Infant formula', recallDate: '20240115' },
    ]);
    expect(readSaved(storage)).toEqual(stored);
  });

  it('returns [] for missing, corrupt JSON, or a non-array value', () => {
    expect(readSaved(memoryStorage())).toEqual([]);
    expect(readSaved(memoryStorage({ [SAVED_STORAGE_KEY]: '{not json' }))).toEqual([]);
    expect(
      readSaved(memoryStorage({ [SAVED_STORAGE_KEY]: JSON.stringify({ id: 'F-1' }) })),
    ).toEqual([]);
  });
});

describe('useSavedRecalls', () => {
  it('toggles a recall in and out of the saved list', () => {
    const storage = memoryStorage();
    const { result } = renderHook(() => useSavedRecalls(storage));
    const recall = {
      id: 'F-9',
      product: 'Cheddar',
      recallDate: '20240201',
      firm: 'Dairy Co',
    };

    expect(result.current.isSaved('F-9')).toBe(false);

    act(() => {
      result.current.toggleSave(recall);
    });
    expect(result.current.isSaved('F-9')).toBe(true);
    expect(result.current.saved).toEqual([
      { id: 'F-9', product: 'Cheddar', recallDate: '20240201' },
    ]);
    expect(JSON.parse(storage.getItem(SAVED_STORAGE_KEY))[0].firm).toBeUndefined();

    act(() => {
      result.current.toggleSave(recall);
    });
    expect(result.current.isSaved('F-9')).toBe(false);
    expect(result.current.saved).toEqual([]);
  });

  it('reloads when another tab writes storage', () => {
    const { result } = renderHook(() => useSavedRecalls(localStorage));
    const next = [{ id: 'F-tab', product: 'Milk', recallDate: '20240301' }];

    act(() => {
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(
        new StorageEvent('storage', { key: SAVED_STORAGE_KEY, storageArea: localStorage }),
      );
    });

    expect(result.current.saved).toEqual(next);
    expect(result.current.isSaved('F-tab')).toBe(true);
  });
});
