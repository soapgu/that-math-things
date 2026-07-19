export const PRACTICE_SETTINGS_KEY = 'practice-settings';

export const DEFAULT_PRACTICE_SETTINGS = {
  range: 50,
  addRatio: 50,
  carryBorrowProb: 40,
  assistEnabled: false,
  questionCount: 10,
};

/**
 * 合并缺省值，并移除 v2.4 已废弃的 assistMethod。
 * 保留其他未知字段，避免未来新增设置在旧版本迁移时丢失。
 */
export function normalizePracticeSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null;
  const { assistMethod: _obsoleteAssistMethod, ...rest } = settings;
  return { ...DEFAULT_PRACTICE_SETTINGS, ...rest };
}

export function savePracticeSettings(settings) {
  const normalized = normalizePracticeSettings(settings);
  if (!normalized) return null;
  localStorage.setItem(PRACTICE_SETTINGS_KEY, JSON.stringify(normalized));
  return normalized;
}

export function loadPracticeSettings({ useDefaults = true } = {}) {
  try {
    const raw = localStorage.getItem(PRACTICE_SETTINGS_KEY);
    if (!raw) return useDefaults ? { ...DEFAULT_PRACTICE_SETTINGS } : null;

    const parsed = JSON.parse(raw);
    const normalized = normalizePracticeSettings(parsed);
    if (!normalized) return useDefaults ? { ...DEFAULT_PRACTICE_SETTINGS } : null;

    // 读取时直接回写规范结构，完成旧 assistMethod 数据的一次性迁移。
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      localStorage.setItem(PRACTICE_SETTINGS_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return useDefaults ? { ...DEFAULT_PRACTICE_SETTINGS } : null;
  }
}
