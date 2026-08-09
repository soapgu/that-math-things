import { createEmptyRecitationSession, isValidRecitationSession, normalizeRecitationSession } from './model';

export const RECITATION_STORAGE_KEY = 'multiplication-recitation-session-v1';

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function loadRecitationSession(storage) {
  try {
    const target = getStorage(storage);
    if (!target) return { session: createEmptyRecitationSession(), status: 'unavailable' };
    const raw = target.getItem(RECITATION_STORAGE_KEY);
    if (raw === null) return { session: createEmptyRecitationSession(), status: 'empty' };
    const parsed = JSON.parse(raw);
    if (!isValidRecitationSession(parsed)) {
      return { session: createEmptyRecitationSession(), status: 'recovered' };
    }
    return { session: normalizeRecitationSession(parsed), status: 'loaded' };
  } catch {
    return { session: createEmptyRecitationSession(), status: 'recovered' };
  }
}

export function saveRecitationSession(session, storage) {
  try {
    const target = getStorage(storage);
    if (!target) return { ok: false, reason: 'unavailable' };
    target.setItem(RECITATION_STORAGE_KEY, JSON.stringify(normalizeRecitationSession(session)));
    return { ok: true };
  } catch {
    return { ok: false, reason: 'write-failed' };
  }
}

export function clearRecitationSession(storage) {
  try {
    const target = getStorage(storage);
    if (!target) return { ok: false, reason: 'unavailable' };
    target.removeItem(RECITATION_STORAGE_KEY);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'write-failed' };
  }
}
