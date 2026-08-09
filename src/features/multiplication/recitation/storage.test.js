import { createEmptyRecitationSession } from './model';
import { RECITATION_STORAGE_KEY, clearRecitationSession, loadRecitationSession, saveRecitationSession } from './storage';

describe('recitation storage', () => {
  beforeEach(() => localStorage.clear());

  it('保存、恢复和清除独立会话', () => {
    const session = createEmptyRecitationSession('2026-01-01T00:00:00.000Z');
    expect(saveRecitationSession(session)).toEqual({ ok: true });
    expect(loadRecitationSession()).toEqual({ session, status: 'loaded' });
    expect(clearRecitationSession()).toEqual({ ok: true });
    expect(loadRecitationSession().status).toBe('empty');
  });

  it('损坏数据回退且不接触其他键', () => {
    localStorage.setItem('practice-records', 'sentinel');
    localStorage.setItem('multiplication-sound-enabled', 'sentinel-sound');
    localStorage.setItem(RECITATION_STORAGE_KEY, '{bad');
    expect(loadRecitationSession()).toMatchObject({ status: 'recovered', session: { completedPhraseIds: [] } });
    expect(localStorage.getItem('practice-records')).toBe('sentinel');
    expect(localStorage.getItem('multiplication-sound-enabled')).toBe('sentinel-sound');
  });

  it('合法JSON但会话字段损坏时报告已恢复', () => {
    localStorage.setItem(RECITATION_STORAGE_KEY, JSON.stringify({
      schemaVersion: 1,
      orderingMode: 'sequential',
      currentPhraseId: '9×1',
      selectedCoordinate: null,
      completedPhraseIds: [],
      updatedAt: '2026-01-01T00:00:00.000Z',
    }));
    expect(loadRecitationSession()).toMatchObject({ status: 'recovered', session: { currentPhraseId: '1×1', completedPhraseIds: [] } });
  });

  it('存储失败返回明确结果', () => {
    const storage = { getItem: () => null, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
    expect(saveRecitationSession(createEmptyRecitationSession(), storage)).toEqual({ ok: false, reason: 'write-failed' });
    expect(clearRecitationSession(storage)).toEqual({ ok: false, reason: 'write-failed' });
  });
});
