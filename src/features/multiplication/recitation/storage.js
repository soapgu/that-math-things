import { createEmptyRecitationSession, isValidRecitationSession, normalizeRecitationSession } from './model';

/**
 * 背诵模式只保存当前一轮会话，并与闯关、计算训练等既有数据完全隔离。
 * 存储异常会转换为显式状态返回给页面，不抛出错误阻断本次背诵。
 */
export const RECITATION_STORAGE_KEY = 'multiplication-recitation-session-v1';

// 允许测试注入Storage实现；服务端渲染或无window环境下返回不可用。
function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

/**
 * 读取并严格验证本机会话。
 * status用于区分首次使用、成功恢复、损坏回退和存储不可用。
 */
export function loadRecitationSession(storage) {
  let target;
  try {
    target = getStorage(storage);
  } catch {
    return { session: createEmptyRecitationSession(), status: 'unavailable' };
  }
  if (!target) return { session: createEmptyRecitationSession(), status: 'unavailable' };
  let raw;
  try {
    raw = target.getItem(RECITATION_STORAGE_KEY);
  } catch {
    return { session: createEmptyRecitationSession(), status: 'unavailable' };
  }
  if (raw === null) return { session: createEmptyRecitationSession(), status: 'empty' };
  try {
    const parsed = JSON.parse(raw);
    if (!isValidRecitationSession(parsed)) {
      return { session: createEmptyRecitationSession(), status: 'recovered' };
    }
    return { session: normalizeRecitationSession(parsed), status: 'loaded' };
  } catch {
    return { session: createEmptyRecitationSession(), status: 'recovered' };
  }
}

/** 保存规范化后的会话；失败时保留调用方的内存状态。 */
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

/** 清除当前一轮背诵进度，不触碰其他localStorage键。 */
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
