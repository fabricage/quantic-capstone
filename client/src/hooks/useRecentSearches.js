/**
 * useRecentSearches.js
 * Purpose: Remember recent keyword searches in localStorage as clickable chips.
 *
 * A later firm chip (Card 13) is still just q=<firm phrase>. openFDA already
 * ORs recalling_firm — do not add a separate firm endpoint.
 */
import { useCallback, useEffect, useState } from 'react';

export const RECENT_SEARCHES_KEY = 'recall-ledger:recent-searches';
export const MAX_RECENT_SEARCHES = 16;

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

export function normalizeSearchQuery(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function asQueryList(items) {
  const seen = new Set();
  const list = [];
  for (const item of items) {
    const q = normalizeSearchQuery(typeof item === 'string' ? item : '');
    if (!q) continue;
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(q);
    if (list.length >= MAX_RECENT_SEARCHES) break;
  }
  return list;
}

export function readRecentSearches(storage) {
  const store = resolveStorage(storage);
  try {
    const raw = store.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return asQueryList(parsed);
  } catch {
    return [];
  }
}

export function writeRecentSearches(items, storage) {
  const store = resolveStorage(storage);
  const list = Array.isArray(items) ? asQueryList(items) : [];
  store.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
  return list;
}

export function pushRecentSearch(query, current = []) {
  const q = normalizeSearchQuery(query);
  if (!q) return asQueryList(current);
  const rest = asQueryList(current).filter((item) => item.toLowerCase() !== q.toLowerCase());
  return [q, ...rest].slice(0, MAX_RECENT_SEARCHES);
}

export function useRecentSearches(storage) {
  const store = resolveStorage(storage);
  const [recent, setRecent] = useState(() => readRecentSearches(store));

  useEffect(() => {
    function onStorage(event) {
      if (event.key !== RECENT_SEARCHES_KEY && event.key !== null) return;
      setRecent(readRecentSearches(store));
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [store]);

  const rememberSearch = useCallback(
    (query) => {
      setRecent((current) => {
        const next = pushRecentSearch(query, current);
        writeRecentSearches(next, store);
        return next;
      });
    },
    [store],
  );

  const clearRecent = useCallback(() => {
    writeRecentSearches([], store);
    setRecent([]);
  }, [store]);

  return { recent, rememberSearch, clearRecent };
}
