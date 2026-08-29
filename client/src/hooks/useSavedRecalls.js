/**
 * useSavedRecalls.js
 * Purpose: Save and remove recall bookmarks in localStorage. No accounts.
 *
 * We persist only { id, product, recallDate }. Opening a bookmark later uses
 * that stub, so detail shows Card 5's "full fields unavailable" message.
 */
import { useCallback, useEffect, useState } from 'react';

export const SAVED_STORAGE_KEY = 'recall-ledger:saved';

function resolveStorage(storage) {
  if (storage) return storage;
  if (typeof localStorage !== 'undefined') return localStorage;
  return {
    getItem() {
      return null;
    },
    setItem() {},
  };
}

export function toBookmark(recall) {
  return {
    id: recall?.id != null ? String(recall.id) : '',
    product: recall?.product != null ? String(recall.product) : '',
    recallDate: recall?.recallDate != null ? String(recall.recallDate) : '',
  };
}

/**
 * Read bookmarks. Corrupt JSON or a non-array value becomes [].
 */
export function readSaved(storage) {
  const store = resolveStorage(storage);
  try {
    const raw = store.getItem(SAVED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item) || !item.id) {
        return [];
      }
      return [toBookmark(item)];
    });
  } catch {
    return [];
  }
}

export function writeSaved(items, storage) {
  const store = resolveStorage(storage);
  const list = Array.isArray(items)
    ? items.map((item) => toBookmark(item)).filter((item) => item.id)
    : [];
  store.setItem(SAVED_STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function useSavedRecalls(storage) {
  const store = resolveStorage(storage);
  const [saved, setSaved] = useState(() => readSaved(store));

  useEffect(() => {
    function onStorage(event) {
      // Other tabs fire this after they write. key === null means clear().
      if (event.key !== SAVED_STORAGE_KEY && event.key !== null) return;
      setSaved(readSaved(store));
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [store]);

  const isSaved = useCallback(
    (id) => saved.some((item) => item.id === id),
    [saved],
  );

  const toggleSave = useCallback(
    (recall) => {
      const bookmark = toBookmark(recall);
      if (!bookmark.id) return;
      setSaved((current) => {
        const exists = current.some((item) => item.id === bookmark.id);
        const next = exists
          ? current.filter((item) => item.id !== bookmark.id)
          : [...current, bookmark];
        writeSaved(next, store);
        return next;
      });
    },
    [store],
  );

  return { saved, isSaved, toggleSave };
}
