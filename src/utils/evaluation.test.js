import {
  calcQuestionDifficulty,
  calcSessionDifficulty,
  calcAccuracyStars,
  calcSpeedStars,
  calcCompositeEvaluation,
  calcSessionEvaluation,
  calcHistoricalEvaluation,
} from './evaluation';

function q(overrides = {}) {
  return { a: 5, b: 3, op: '+', answer: 8, hasCarry: false, hasBorrow: false, ...overrides };
}

function record(overrides = {}) {
  return {
    questions: [q()],
    settings: { range: 20 },
    score: 100,
    timeSpent: 10,
    ...overrides,
  };
}

// ──────────────────────────────
// calcQuestionDifficulty
// ──────────────────────────────

describe('calcQuestionDifficulty', () => {
  it.each([
    // [range, hasCarry, hasBorrow, expected]
    [10, false, false, 1],
    [20, false, false, 2],
    [50, false, false, 2],
    [100, false, false, 3],
    [10, true, false, 2],
    [10, false, true, 2],
    [20, true, false, 2],
    [20, false, true, 3],
    [50, true, false, 3],
    [50, false, true, 4],
    [100, true, false, 4],
    [100, false, true, 5],
  ])('range=%i hasCarry=%s hasBorrow=%s → %i★', (range, hasCarry, hasBorrow, expected) => {
    expect(calcQuestionDifficulty({ range, hasCarry, hasBorrow })).toBe(expected);
  });
});

// ──────────────────────────────
// calcSessionDifficulty
// ──────────────────────────────

describe('calcSessionDifficulty', () => {
  it('空数组返回 1', () => {
    expect(calcSessionDifficulty([], 20)).toBe(1);
  });

  it('单题平均等于该题难度', () => {
    const questions = [q({ hasCarry: true })];
    expect(calcSessionDifficulty(questions, 20)).toBe(2);
  });

  it('多题取平均四舍五入', () => {
    // 范围20进位：2★；范围20无进退：2★ → 平均 2
    const questions = [q({ hasCarry: true }), q()];
    expect(calcSessionDifficulty(questions, 20)).toBe(2);
  });

  it('多题平均朝上取整', () => {
    // 范围100退位：5★；范围100无进退：3★ → 平均 4
    const questions = [q({ hasBorrow: true }), q()];
    expect(calcSessionDifficulty(questions, 100)).toBe(4);
  });
});

// ──────────────────────────────
// calcAccuracyStars
// ──────────────────────────────

describe('calcAccuracyStars', () => {
  it.each([
    [100, 5],
    [99, 4],
    [90, 4],
    [89, 3],
    [80, 3],
    [79, 2],
    [60, 2],
    [59, 1],
    [0, 1],
  ])('score=%i → %i★', (score, expected) => {
    expect(calcAccuracyStars(score)).toBe(expected);
  });
});

// ──────────────────────────────
// calcSpeedStars
// ──────────────────────────────

describe('calcSpeedStars', () => {
  it('空数组或没有用时返回 1', () => {
    expect(calcSpeedStars([], 20, 10)).toBe(1);
    expect(calcSpeedStars([q()], 20, null)).toBe(1);
  });

  it('速度比 1.5 → 很快 5★', () => {
    // 1题2★难度，预期 5s，实际 3.3s → ratio ≈ 1.5
    expect(calcSpeedStars([q()], 20, 3.3)).toBe(5);
  });

  it('速度比 1.2 → 偏快 4★', () => {
    expect(calcSpeedStars([q()], 20, 4.1)).toBe(4);
  });

  it('速度比 0.9 → 正常 3★', () => {
    expect(calcSpeedStars([q()], 20, 5.5)).toBe(3);
  });

  it('速度比 0.6 → 偏慢 2★', () => {
    expect(calcSpeedStars([q()], 20, 8.3)).toBe(2);
  });

  it('速度比 0.4 → 很慢 1★', () => {
    expect(calcSpeedStars([q()], 20, 12.5)).toBe(1);
  });

  it('多道题累计预期用时计算正确', () => {
    // 2题，各2★，预期各5s，共10s；实际8s → ratio=1.25 → 4★
    const questions = [q(), q({ hasCarry: true })];
    expect(calcSpeedStars(questions, 20, 8)).toBe(4);
  });
});

// ──────────────────────────────
// calcCompositeEvaluation
// ──────────────────────────────

describe('calcCompositeEvaluation', () => {
  it('三项全 5★ → UR', () => {
    const result = calcCompositeEvaluation(5, 5, 5);
    expect(result.grade).toBe('UR');
    expect(result.totalStars).toBe(5);
    expect(result.comment).toBe('无可挑剔的完美表现！');
  });

  it('总评 5★ 但非全满 → SSR', () => {
    const result = calcCompositeEvaluation(5, 5, 4);
    expect(result.grade).toBe('SSR');
    expect(result.totalStars).toBe(5);
  });

  it('加权高但准确 3★ 封顶 → 4★ SR', () => {
    // 5×0.25 + 3×0.50 + 5×0.25 = 1.25+1.5+1.25 = 4.0
    // 封顶 cap=4 → totalStars=4 → SR
    const result = calcCompositeEvaluation(5, 3, 5);
    expect(result.totalStars).toBe(4);
    expect(result.grade).toBe('SR');
  });

  it('准确 2★ 封顶 3★ → R', () => {
    // 即使其他全 5★，加权= (5×0.25+2×0.5+5×0.25)=3.25 → round=3 → cap=3
    const result = calcCompositeEvaluation(5, 2, 5);
    expect(result.totalStars).toBe(3);
    expect(result.grade).toBe('R');
  });

  it('准确 1★ 封顶 2★ → N', () => {
    const result = calcCompositeEvaluation(5, 1, 5);
    expect(result.totalStars).toBe(2);
    expect(result.grade).toBe('N');
  });

  it('SR 时最弱维度低于 4★ 给出针对性建议', () => {
    const result = calcCompositeEvaluation(2, 5, 5);
    expect(result.comment).toContain('难度方面还有提升空间');
  });

  it('SR 时所有维度 ≥ 4★ 鼓励冲刺 SSR', () => {
    const result = calcCompositeEvaluation(4, 4, 4);
    expect(result.comment).toContain('向 SSR 冲刺');
  });

  it('R 时速度最弱正确提示', () => {
    const result = calcCompositeEvaluation(3, 3, 1);
    expect(result.comment).toContain('速度偏慢');
  });

  it('R 时准确最弱正确提示', () => {
    const result = calcCompositeEvaluation(3, 2, 3);
    expect(result.comment).toContain('准确率有提升空间');
  });

  it('R 时难度最弱正确提示', () => {
    const result = calcCompositeEvaluation(1, 3, 3);
    expect(result.comment).toContain('挑战更大的运算范围');
  });

  it('N 时速度最弱正确提示', () => {
    const result = calcCompositeEvaluation(2, 2, 1);
    expect(result.comment).toContain('先保证准确率，再逐步提高速度');
  });

  it('N 时准确最弱正确提示', () => {
    const result = calcCompositeEvaluation(2, 1, 2);
    expect(result.comment).toContain('放慢速度，确保每一步计算准确');
  });

  it('N 时难度最弱正确提示', () => {
    const result = calcCompositeEvaluation(1, 2, 2);
    expect(result.comment).toContain('更简单的题目');
  });
});

// ──────────────────────────────
// calcSessionEvaluation
// ──────────────────────────────

describe('calcSessionEvaluation', () => {
  it('返回完整评价结构', () => {
    const result = calcSessionEvaluation(record());
    expect(result).toHaveProperty('difficulty');
    expect(result).toHaveProperty('accuracy');
    expect(result).toHaveProperty('speed');
    expect(result).toHaveProperty('composite');
    expect(result.composite).toHaveProperty('totalStars');
    expect(result.composite).toHaveProperty('grade');
    expect(result.composite).toHaveProperty('comment');
  });

  it('准确指数与得分一致', () => {
    let result = calcSessionEvaluation(record({ score: 100 }));
    expect(result.accuracy).toBe(5);

    result = calcSessionEvaluation(record({ score: 60 }));
    expect(result.accuracy).toBe(2);
  });

  it('难度指数取决于题目和范围', () => {
    const questions = [q({ hasBorrow: true })];
    const result = calcSessionEvaluation(record({ questions, settings: { range: 100 } }));
    expect(result.difficulty).toBe(5);
  });
});

// ──────────────────────────────
// calcHistoricalEvaluation
// ──────────────────────────────

describe('calcHistoricalEvaluation', () => {
  it('空数组返回 null', () => {
    expect(calcHistoricalEvaluation([])).toBeNull();
  });

  it('没有任何记录有 evaluation 字段返回 null', () => {
    const records = [{ id: 1, score: 90 }];
    expect(calcHistoricalEvaluation(records)).toBeNull();
  });

  it('计算有 evaluation 记录的平均值', () => {
    const records = [
      { evaluation: { difficulty: 2, accuracy: 3, speed: 4 } },
      { evaluation: { difficulty: 4, accuracy: 5, speed: 2 } },
      { id: 1, score: 90 }, // 没有 evaluation，应被忽略
    ];
    const result = calcHistoricalEvaluation(records);
    expect(result).toEqual({ difficulty: 3, accuracy: 4, speed: 3 });
  });

  it('单条记录返回该记录的值', () => {
    const records = [{ evaluation: { difficulty: 3, accuracy: 5, speed: 2 } }];
    expect(calcHistoricalEvaluation(records)).toEqual({ difficulty: 3, accuracy: 5, speed: 2 });
  });
});
