import { createAssistance } from './assistGenerator';
import { BORROW_ONES_METHODS } from './practiceSettings';
import { createAssistUsage, promoteAssistUsage, summarizeAssistUsage } from './assistUsage';

describe('会话内辅助使用状态', () => {
  it('分别初始化不可辅助题和未使用的进位题', () => {
    const plain = createAssistance({ a: 12, b: 5, op: '+', answer: 17 });
    const carry = createAssistance({ a: 27, b: 5, op: '+', answer: 32 });

    expect(createAssistUsage(plain)).toEqual({
      eligible: false,
      kind: null,
      used: false,
      level: 0,
      method: null,
      strategy: null,
    });
    expect(createAssistUsage(carry)).toEqual({
      eligible: true,
      kind: 'carry',
      used: false,
      level: 0,
      method: null,
      strategy: null,
    });
  });

  it('第一层只记录查看提醒，并且不能被后续操作降级', () => {
    const assistance = createAssistance({ a: 27, b: 5, op: '+', answer: 32 });
    const initial = createAssistUsage(assistance);
    const hinted = promoteAssistUsage(initial, 1, assistance);

    expect(hinted).toMatchObject({ used: true, level: 1, method: null, strategy: null });
    expect(promoteAssistUsage(hinted, 0, assistance)).toBe(hinted);
    expect(promoteAssistUsage(hinted, 1, assistance)).toBe(hinted);
  });

  it('第二层记录进位方法，但不记录退位策略', () => {
    const assistance = createAssistance({ a: 27, b: 5, op: '+', answer: 32 });
    const usage = promoteAssistUsage(createAssistUsage(assistance), 2, assistance);

    expect(usage).toMatchObject({
      used: true,
      level: 2,
      method: 'placeValueCarry',
      strategy: null,
    });
  });

  it.each([
    BORROW_ONES_METHODS.BREAK_TEN,
    BORROW_ONES_METHODS.BRIDGE_TEN,
  ])('第二层记录退位方法及实际个位策略：%s', (borrowOnesMethod) => {
    const assistance = createAssistance(
      { a: 43, b: 18, op: '-', answer: 25 },
      { borrowOnesMethod },
    );
    const usage = promoteAssistUsage(createAssistUsage(assistance), 2, assistance);

    expect(usage).toMatchObject({
      used: true,
      level: 2,
      method: 'placeValueBorrow',
      strategy: borrowOnesMethod,
    });
  });
});

describe('辅助使用摘要', () => {
  it('只统计有记录且符合辅助条件的题目', () => {
    const items = [
      { assistUsage: { eligible: true, level: 0 } },
      { assistUsage: { eligible: true, level: 1 } },
      { assistUsage: { eligible: true, level: 2 } },
      { assistUsage: { eligible: false, level: 0 } },
      { assistUsage: null },
      {},
    ];

    expect(summarizeAssistUsage(items)).toEqual({
      eligible: 3,
      independent: 1,
      reminder: 1,
      method: 1,
    });
  });

  it('旧记录、普通题和无效数据不会制造摘要分母', () => {
    expect(summarizeAssistUsage([
      { assistUsage: null },
      { assistUsage: { eligible: false, level: 0 } },
      { assistUsage: { eligible: true, level: 3 } },
    ])).toEqual({
      eligible: 0,
      independent: 0,
      reminder: 0,
      method: 0,
    });
  });
});
