import {
  BORROW_ONES_METHODS,
  DEFAULT_PRACTICE_SETTINGS,
  PRACTICE_SETTINGS_KEY,
  loadPracticeSettings,
  normalizePracticeSettings,
  savePracticeSettings,
} from './practiceSettings';

beforeEach(() => localStorage.clear());

describe('practiceSettings', () => {
  it('没有存储时返回默认设置的新副本', () => {
    const settings = loadPracticeSettings();
    expect(settings).toEqual(DEFAULT_PRACTICE_SETTINGS);
    expect(settings).not.toBe(DEFAULT_PRACTICE_SETTINGS);
  });

  it('做题页可要求没有存储时返回 null', () => {
    expect(loadPracticeSettings({ useDefaults: false })).toBeNull();
  });

  it('读取旧 flatTen 时迁移为平十法并补齐默认值', () => {
    localStorage.setItem(PRACTICE_SETTINGS_KEY, JSON.stringify({
      range: 20,
      assistEnabled: true,
      assistMethod: 'flatTen',
    }));

    const settings = loadPracticeSettings();
    expect(settings).toEqual({
      ...DEFAULT_PRACTICE_SETTINGS,
      range: 20,
      assistEnabled: true,
      borrowOnesMethod: BORROW_ONES_METHODS.BRIDGE_TEN,
    });
    expect(JSON.parse(localStorage.getItem(PRACTICE_SETTINGS_KEY))).toEqual(settings);
  });

  it('旧 breakTen 迁移为破十法且不写回废弃字段', () => {
    const saved = savePracticeSettings({
      ...DEFAULT_PRACTICE_SETTINGS,
      assistEnabled: true,
      assistMethod: 'breakTen',
    });
    expect(saved).not.toHaveProperty('assistMethod');
    expect(saved.borrowOnesMethod).toBe(BORROW_ONES_METHODS.BREAK_TEN);
    expect(JSON.parse(localStorage.getItem(PRACTICE_SETTINGS_KEY))).toEqual(saved);
  });

  it('无效输入不能规范化', () => {
    expect(normalizePracticeSettings(null)).toBeNull();
    expect(normalizePracticeSettings([])).toBeNull();
  });

  it('无效方法回退为破十法', () => {
    expect(normalizePracticeSettings({ borrowOnesMethod: 'unknown' }).borrowOnesMethod)
      .toBe(BORROW_ONES_METHODS.BREAK_TEN);
  });
});
