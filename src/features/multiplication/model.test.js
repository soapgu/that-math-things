import {
  DEFAULT_MULTIPLICATION_SETTINGS,
  DIFFICULTIES,
  QUESTION_COUNTS,
  SPEED_TARGETS,
  buildMatrixCells,
  calculateMultiplicationResult,
  generateAnswerChoices,
  generateMultiplicationQuestions,
  getCellKey,
  questionFromCoordinateId,
  recordAnsweredCell,
} from './model';

const fixedRng = (value = 0) => () => value;

describe('乘法配置', () => {
  it('提供三档难度、四档题量和默认设置', () => {
    expect(Object.values(DIFFICULTIES)).toEqual(['easy', 'medium', 'hard']);
    expect(QUESTION_COUNTS).toEqual([10, 20, 50, 81]);
    expect(SPEED_TARGETS).toEqual({ easy: 8, medium: 10, hard: 12 });
    expect(DEFAULT_MULTIPLICATION_SETTINGS).toEqual({ difficulty: 'easy', questionCount: 10 });
  });
});

describe('无放回题目生成', () => {
  it('0–80 映射完整九九表并保留有序算式', () => {
    const all = Array.from({ length: 81 }, (_, id) => questionFromCoordinateId(id));
    expect(all[0]).toEqual({ a: 1, b: 1, op: '*', answer: 1 });
    expect(all[80]).toEqual({ a: 9, b: 9, op: '*', answer: 81 });
    expect(all).toContainEqual({ a: 3, b: 7, op: '*', answer: 21 });
    expect(all).toContainEqual({ a: 7, b: 3, op: '*', answer: 21 });
    expect(new Set(all.map(({ a, b }) => getCellKey(a, b))).size).toBe(81);
  });

  it.each(QUESTION_COUNTS)('生成 %i 题且不重复', (count) => {
    const questions = generateMultiplicationQuestions(count, fixedRng(0.25));
    expect(questions).toHaveLength(count);
    expect(new Set(questions.map(({ a, b }) => getCellKey(a, b))).size).toBe(count);
  });

  it('81题无遗漏，固定随机源结果可预测', () => {
    const questions = generateMultiplicationQuestions(81, fixedRng(0));
    expect(new Set(questions.map(({ a, b }) => getCellKey(a, b))).size).toBe(81);
    expect(questions[0]).toEqual(questionFromCoordinateId(1));
    expect(questions.at(-1)).toEqual(questionFromCoordinateId(0));
  });

  it('拒绝非法题量和随机值', () => {
    expect(() => generateMultiplicationQuestions(12)).toThrow('题量必须是');
    expect(() => generateMultiplicationQuestions(10, fixedRng(1))).toThrow('[0, 1)');
  });
});

describe('四选一生成', () => {
  it.each([
    { a: 5, b: 5, op: '*', answer: 25 },
    { a: 1, b: 1, op: '*', answer: 1 },
    { a: 1, b: 9, op: '*', answer: 9 },
    { a: 9, b: 5, op: '*', answer: 45 },
  ])('为 $a×$b 生成唯一正整数选项', (question) => {
    const choices = generateAnswerChoices(question, fixedRng(0.3));
    expect(choices).toHaveLength(4);
    expect(new Set(choices).size).toBe(4);
    expect(choices.filter((value) => value === question.answer)).toHaveLength(1);
    choices.forEach((value) => {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    });
  });
});

describe('累计开图记录', () => {
  const question = { a: 3, b: 4, op: '*', answer: 12 };

  it('不可变地保存首次答案和顺序', () => {
    const original = {};
    const answered = recordAnsweredCell(original, question, 11);
    expect(original).toEqual({});
    expect(answered['3×4']).toEqual({
      a: 3,
      b: 4,
      answer: 12,
      submittedValue: 11,
      correct: false,
      order: 1,
    });
  });

  it('拒绝同一坐标重复提交', () => {
    const answered = recordAnsweredCell({}, question, 12);
    expect(() => recordAnsweredCell(answered, question, 12)).toThrow('不能重复提交');
  });

  it.each([
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
  ])('拒绝非安全整数答案 %s', (submittedValue) => {
    expect(() => recordAnsweredCell({}, question, submittedValue)).toThrow('提交答案必须是正整数');
  });

  it('允许大于81的普通正安全整数作为错误答案', () => {
    const answered = recordAnsweredCell({}, question, 99);
    expect(answered['3×4']).toMatchObject({ submittedValue: 99, correct: false });
  });

  it('81次提交后恰好记录81格', () => {
    const questions = generateMultiplicationQuestions(81, fixedRng(0.5));
    const answered = questions.reduce(
      (current, item) => recordAnsweredCell(current, item, item.answer),
      {}
    );
    expect(Object.keys(answered)).toHaveLength(81);
  });
});

describe('矩阵安全视图模型', () => {
  const question = { a: 3, b: 4, op: '*', answer: 12 };
  const byKey = (cells, key) => cells.find((cell) => cell.key === key);

  it.each([
    ['easy', 16],
    ['medium', 4],
    ['hard', 0],
  ])('%s 难度提示格数量正确', (difficulty, hintCount) => {
    const cells = buildMatrixCells({ question, difficulty, phase: 'READY' });
    expect(cells).toHaveLength(81);
    expect(cells.filter(({ kind }) => kind === 'hint')).toHaveLength(hintCount);
    expect(byKey(cells, '3×4')).toEqual({
      key: '3×4',
      row: 3,
      column: 4,
      kind: 'target',
      ariaLabel: '3乘4目标格，答案待填写',
    });
  });

  it('中等角落只显示两个真实相邻格', () => {
    const corner = { a: 1, b: 1, op: '*', answer: 1 };
    const cells = buildMatrixCells({ question: corner, difficulty: 'medium' });
    expect(cells.filter(({ kind }) => kind === 'hint')).toHaveLength(2);
  });

  it('作答前目标和隐藏格不携带答案', () => {
    const cells = buildMatrixCells({ question, difficulty: 'hard', phase: 'READY' });
    const target = byKey(cells, '3×4');
    expect(target).not.toHaveProperty('value');
    expect(target.ariaLabel).not.toContain('12');
    cells.filter(({ kind }) => kind === 'hidden').forEach((cell) => {
      expect(cell).not.toHaveProperty('value');
    });
  });

  it('反馈阶段临时显示未作答对称格', () => {
    const answered = recordAnsweredCell({}, question, 12);
    const cells = buildMatrixCells({
      question,
      difficulty: 'hard',
      phase: 'FEEDBACK_CORRECT',
      answeredCells: answered,
    });
    expect(byKey(cells, '3×4').kind).toBe('target-correct');
    expect(byKey(cells, '4×3')).toMatchObject({ kind: 'symmetric', value: 12 });
  });

  it('已作答历史格优先于临时对称格和难度提示', () => {
    const symmetricQuestion = { a: 4, b: 3, op: '*', answer: 12 };
    let answered = recordAnsweredCell({}, symmetricQuestion, 11);
    answered = recordAnsweredCell(answered, question, 12);
    const cells = buildMatrixCells({
      question,
      difficulty: 'easy',
      phase: 'FEEDBACK_CORRECT',
      answeredCells: answered,
    });
    expect(byKey(cells, '4×3')).toMatchObject({ kind: 'history-wrong', value: 12 });
  });
});

describe('评星', () => {
  it.each([
    ['easy', 10, 9, 80, 3],
    ['medium', 20, 18, 200, 3],
    ['hard', 50, 45, 600, 3],
    ['easy', 81, 73, 649, 2],
    ['hard', 10, 8, 200, 2],
    ['easy', 10, 7, 0, 1],
  ])('%s total=%i correct=%i time=%i → %i星', (difficulty, total, correct, timeSpent, stars) => {
    expect(calculateMultiplicationResult({ difficulty, total, correct, timeSpent }).stars).toBe(stars);
  });

  it('分数四舍五入并允许零秒', () => {
    expect(calculateMultiplicationResult({
      difficulty: 'easy',
      total: 81,
      correct: 73,
      timeSpent: 0,
    })).toEqual({ score: 90, averageSeconds: 0, stars: 3 });
  });

  it('拒绝非法配置和统计值', () => {
    expect(() => calculateMultiplicationResult({
      difficulty: 'unknown',
      total: 10,
      correct: 8,
      timeSpent: 10,
    })).toThrow('不支持');
    expect(() => calculateMultiplicationResult({
      difficulty: 'easy',
      total: 12,
      correct: 8,
      timeSpent: 10,
    })).toThrow('题量');
    expect(() => calculateMultiplicationResult({
      difficulty: 'easy',
      total: 10,
      correct: 11,
      timeSpent: 10,
    })).toThrow('正确题数');
    expect(() => calculateMultiplicationResult({
      difficulty: 'easy',
      total: 10,
      correct: 8,
      timeSpent: Number.NaN,
    })).toThrow('作答用时');
  });
});
