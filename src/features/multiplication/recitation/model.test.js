import {
  ORDERING_MODES,
  RECITATION_PHRASES,
  buildRecitationMatrixView,
  buildRecitationTableView,
  completeCurrentPhrase,
  coordinateToPhrase,
  createEmptyRecitationSession,
  createPhraseId,
  findFirstIncompletePhrase,
  getExpandedCoordinates,
  getPhraseById,
  isPhraseGroupComplete,
  isRecitationComplete,
  isValidRecitationSession,
  normalizeRecitationSession,
  selectRecitationCoordinate,
  switchRecitationMode,
} from './model';

describe('recitation model', () => {
  it('生成传统顺序45句和正确中文读法', () => {
    expect(RECITATION_PHRASES).toHaveLength(45);
    expect(Array.from({ length: 9 }, (_, index) => RECITATION_PHRASES.filter(({ group }) => group === index + 1).length)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(getPhraseById('1×1').text).toBe('一一得一');
    expect(getPhraseById('1×9').text).toBe('一九得九');
    expect(getPhraseById('3×4').text).toBe('三四十二');
    expect(getPhraseById('9×9').text).toBe('九九八十一');
  });

  it('将81个坐标映射为45个规范ID并展开81格', () => {
    const ids = [];
    const expanded = [];
    for (let a = 1; a <= 9; a += 1) for (let b = 1; b <= 9; b += 1) ids.push(createPhraseId(a, b));
    expect(new Set(ids)).toHaveLength(45);
    expect(createPhraseId(9, 1)).toBe('1×9');
    expect(coordinateToPhrase(9, 1)).toMatchObject({ id: '1×9', text: '一九得九', selectedCoordinate: { a: 9, b: 1 } });
    RECITATION_PHRASES.forEach(({ id }) => expanded.push(...getExpandedCoordinates(id)));
    expect(expanded).toHaveLength(81);
    expect(getExpandedCoordinates('3×4')).toHaveLength(2);
    expect(getExpandedCoordinates('4×4')).toHaveLength(1);
  });

  it('顺序和自定义共享进度并保持点击方向', () => {
    let session = createEmptyRecitationSession('2026-01-01T00:00:00.000Z');
    session = completeCurrentPhrase(session, '2026-01-01T00:00:01.000Z');
    expect(session.currentPhraseId).toBe('1×2');
    session = switchRecitationMode(session, ORDERING_MODES.CUSTOM, '2026-01-01T00:00:02.000Z');
    expect(session.currentPhraseId).toBeNull();
    session = selectRecitationCoordinate(session, { a: 9, b: 1 }, '2026-01-01T00:00:03.000Z');
    expect(session).toMatchObject({ currentPhraseId: '1×9', selectedCoordinate: { a: 9, b: 1 } });
    session = completeCurrentPhrase(session, '2026-01-01T00:00:04.000Z');
    expect(session.completedPhraseIds).toEqual(['1×1', '1×9']);
    session = switchRecitationMode(session, ORDERING_MODES.SEQUENTIAL, '2026-01-01T00:00:05.000Z');
    expect(session.currentPhraseId).toBe('1×2');
  });

  it('拒绝重复选择与重复确认', () => {
    let session = switchRecitationMode(createEmptyRecitationSession(), ORDERING_MODES.CUSTOM);
    session = selectRecitationCoordinate(session, { a: 2, b: 1 });
    const completed = completeCurrentPhrase(session);
    expect(selectRecitationCoordinate(completed, { a: 1, b: 2 })).toEqual(completed);
    expect(completeCurrentPhrase(completed)).toEqual(completed);
  });

  it('顺序模式用期望口诀ID阻止旧确认完成下一句', () => {
    const session = createEmptyRecitationSession('2026-01-01T00:00:00.000Z');
    const first = completeCurrentPhrase(session, '2026-01-01T00:00:01.000Z', '1×1');
    const duplicate = completeCurrentPhrase(first, '2026-01-01T00:00:02.000Z', '1×1');
    expect(duplicate).toEqual(first);
    expect(duplicate.completedPhraseIds).toEqual(['1×1']);
    expect(duplicate.currentPhraseId).toBe('1×2');
  });

  it('顺序非平方口诀只有规范方向为当前，对称方向为关联', () => {
    let session = createEmptyRecitationSession();
    for (let index = 0; index < 8; index += 1) session = completeCurrentPhrase(session);
    expect(session.currentPhraseId).toBe('3×4');
    const matrix = buildRecitationMatrixView(session);
    expect(matrix.filter(({ state }) => state === 'current').map(({ key }) => key)).toEqual(['3×4']);
    expect(matrix.filter(({ state }) => state === 'related').map(({ key }) => key)).toEqual(['4×3']);
  });

  it('派生表格状态且不泄露未背乘积', () => {
    const session = createEmptyRecitationSession();
    const phraseView = buildRecitationTableView(session);
    const matrixView = buildRecitationMatrixView(session);
    expect(phraseView.cells.filter(({ kind }) => kind === 'phrase')).toHaveLength(45);
    expect(phraseView.cells.filter(({ kind }) => kind === 'placeholder')).toHaveLength(36);
    expect(phraseView.headers).toHaveLength(9);
    expect(matrixView).toHaveLength(81);
    matrixView.filter(({ state }) => state !== 'done').forEach((cell) => {
      expect(cell).not.toHaveProperty('value');
      expect(cell.ariaLabel).not.toMatch(/等于|结果|答案/);
    });
  });

  it('整组完成后更新标题，45句完成后状态闭合', () => {
    const completedPhraseIds = RECITATION_PHRASES.slice(0, 3).map(({ id }) => id);
    expect(isPhraseGroupComplete(1, completedPhraseIds)).toBe(true);
    expect(isPhraseGroupComplete(2, completedPhraseIds)).toBe(true);
    expect(isPhraseGroupComplete(3, completedPhraseIds)).toBe(false);
    const complete = normalizeRecitationSession({
      schemaVersion: 1,
      orderingMode: 'sequential',
      currentPhraseId: null,
      selectedCoordinate: null,
      completedPhraseIds: RECITATION_PHRASES.map(({ id }) => id),
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(isRecitationComplete(complete)).toBe(true);
    expect(findFirstIncompletePhrase(complete.completedPhraseIds)).toBeNull();
    expect(buildRecitationMatrixView(complete).filter(({ state }) => state === 'done')).toHaveLength(81);
    expect(buildRecitationTableView(complete).headers.every(({ done }) => done)).toBe(true);
  });

  it.each([
    null,
    { schemaVersion: 2 },
    { schemaVersion: 1, orderingMode: 'bad', completedPhraseIds: [], updatedAt: 'bad' },
    { schemaVersion: 1, orderingMode: 'sequential', currentPhraseId: '9×1', selectedCoordinate: null, completedPhraseIds: [], updatedAt: '2026-01-01T00:00:00.000Z' },
  ])('损坏会话安全回退 %#', (value) => {
    expect(normalizeRecitationSession(value)).toMatchObject({ orderingMode: 'sequential', currentPhraseId: '1×1', completedPhraseIds: [] });
  });

  it.each(['1', '2026/01/01', '2026-02-31T00:00:00.000Z', 123])('非标准ISO时间安全回退：%s', (updatedAt) => {
    expect(normalizeRecitationSession({
      ...createEmptyRecitationSession('2026-01-01T00:00:00.000Z'),
      updatedAt,
    })).toMatchObject({ currentPhraseId: '1×1', completedPhraseIds: [] });
    expect(isValidRecitationSession({
      ...createEmptyRecitationSession('2026-01-01T00:00:00.000Z'),
      updatedAt,
    })).toBe(false);
  });
});
