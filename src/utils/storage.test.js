import {
  savePracticeRecord,
  getPracticeRecords,
  getStats,
  clearRecords,
  normalizePracticeRecord,
} from './storage';

const mockQuestions = [
  { a: 5, b: 3, op: '+', answer: 8, hasCarry: false, hasBorrow: false },
  { a: 9, b: 2, op: '+', answer: 11, hasCarry: true, hasBorrow: false },
  { a: 15, b: 8, op: '-', answer: 7, hasCarry: false, hasBorrow: true },
  { a: 3, b: 4, op: '+', answer: 7, hasCarry: false, hasBorrow: false },
];

const mockSettings = { range: 20, addRatio: 70, carryBorrowProb: 60, questionCount: 4, assistEnabled: false };

beforeEach(() => {
  localStorage.clear();
});

describe('savePracticeRecord / getPracticeRecords', () => {
  it('全对时结果正确', () => {
    const record = savePracticeRecord({
      questions: mockQuestions,
      userAnswers: ['8', '11', '7', '7'],
      timeSpent: 30,
      settings: mockSettings,
    });

    expect(record.score).toBe(100);
    expect(record.total).toBe(4);
    expect(record.correct).toBe(4);
    expect(record.wrongCount).toBe(0);
    expect(record.schemaVersion).toBe(2);
    expect(record.items.every(({ result }) => result.isCorrect)).toBe(true);
    expect(record).not.toHaveProperty('questions');
    expect(record).not.toHaveProperty('userAnswers');
    expect(record).not.toHaveProperty('results');
    expect(record.timeSpent).toBe(30);
    expect(record.settings).toEqual(mockSettings);
    expect(record.id).toBeDefined();
    expect(record.date).toBeDefined();
  });

  it('持久化存储', () => {
    savePracticeRecord({ questions: mockQuestions, userAnswers: ['8', '11', '7', '7'], timeSpent: 30, settings: mockSettings });
    const records = getPracticeRecords();
    expect(records).toHaveLength(1);
  });

  it('新记录在最前面', () => {
    const r1 = savePracticeRecord({ questions: [mockQuestions[0]], userAnswers: ['8'], timeSpent: 10, settings: mockSettings });
    const r2 = savePracticeRecord({ questions: [mockQuestions[0]], userAnswers: ['8'], timeSpent: 20, settings: mockSettings });
    const records = getPracticeRecords();
    expect(records[0].id).toBe(r2.id);
    expect(records[1].id).toBe(r1.id);
  });
});

describe('错误分类', () => {
  it('进位错误单题', () => {
    const record = savePracticeRecord({
      questions: mockQuestions,
      userAnswers: ['8', '1', '7', '7'],
      timeSpent: 30,
      settings: mockSettings,
    });
    expect(record.items[1].result.errors).toContain('进位错误');
  });

  it('借位错误单题', () => {
    const record = savePracticeRecord({
      questions: mockQuestions,
      userAnswers: ['8', '11', '17', '7'],
      timeSpent: 30,
      settings: mockSettings,
    });
    expect(record.items[2].result.errors).toContain('借位错误');
  });

  it('计算错误单题（无进位退位答错）', () => {
    const record = savePracticeRecord({
      questions: mockQuestions,
      userAnswers: ['0', '11', '7', '7'],
      timeSpent: 30,
      settings: mockSettings,
    });
    expect(record.items[0].result.errors).toEqual(['计算错误']);
  });

  it('一题可命中多个分类', () => {
    const record = savePracticeRecord({
      questions: [mockQuestions[1], mockQuestions[1], mockQuestions[2]],
      userAnswers: ['9', '0', '0'],
      timeSpent: 30,
      settings: mockSettings,
    });
    expect(record.items[0].result.errors).toEqual(['严重错误', '进位错误', '凑十法计算错误']);
    expect(record.items[1].result.errors).toEqual(['进位错误', '凑十法计算错误']);
    // 15-8=7, user=0 → 十位正确（0=0），个位错 → 只命中平十/破十法
    expect(record.items[2].result.errors).toEqual(['平十/破十法计算错误']);
    expect(record.wrongCount).toBe(3);
  });
});

describe('schema v2 与旧记录兼容', () => {
  it('按题聚合答案、结果和辅助使用记录', () => {
    const assistUsage = [
      null,
      {
        eligible: true,
        kind: 'carry',
        used: false, // 存储层必须根据 level 修正这个不一致值。
        level: 2,
        method: 'placeValueCarry',
        strategy: 'breakTen', // 进位不能携带退位策略。
      },
      {
        eligible: true,
        kind: 'borrow',
        used: true,
        level: 1,
        method: 'placeValueBorrow', // 第一层不能提前记录完整方法。
        strategy: 'bridgeTen',
      },
      {
        eligible: false,
        kind: 'carry',
        used: true,
        level: 2,
        method: 'placeValueCarry',
        strategy: null,
      },
    ];

    const record = savePracticeRecord({
      questions: mockQuestions,
      userAnswers: ['8', '11', '7', '7'],
      assistUsage,
      timeSpent: 30,
      settings: mockSettings,
    });

    expect(record.items[0]).toMatchObject({
      index: 0,
      question: mockQuestions[0],
      userAnswer: '8',
      assistUsage: null,
    });
    expect(record.items[1].assistUsage).toEqual({
      eligible: true,
      kind: 'carry',
      used: true,
      level: 2,
      method: 'placeValueCarry',
      strategy: null,
    });
    expect(record.items[2].assistUsage).toMatchObject({
      used: true,
      level: 1,
      method: null,
      strategy: null,
    });
    expect(record.items[3].assistUsage).toEqual({
      eligible: false,
      kind: null,
      used: false,
      level: 0,
      method: null,
      strategy: null,
    });
  });

  it('读取 v1 并列数组时转换为 items，辅助使用情况保持未知', () => {
    const legacy = {
      id: 1,
      date: '2026-01-01T00:00:00.000Z',
      total: 1,
      score: 100,
      correct: 1,
      wrongCount: 0,
      questions: [mockQuestions[0]],
      userAnswers: ['8'],
      results: [{ isCorrect: true, errors: [], detail: null }],
      settings: mockSettings,
    };
    localStorage.setItem('practice-records', JSON.stringify([legacy]));

    const [record] = getPracticeRecords();
    expect(record.schemaVersion).toBe(2);
    expect(record.items).toEqual([{
      index: 0,
      question: mockQuestions[0],
      userAnswer: '8',
      result: legacy.results[0],
      assistUsage: null,
    }]);
    expect(record).not.toHaveProperty('questions');
    expect(record).not.toHaveProperty('userAnswers');
    expect(record).not.toHaveProperty('results');
  });

  it('schema v2 保存后可无损读取', () => {
    const usage = {
      eligible: true,
      kind: 'borrow',
      used: true,
      level: 2,
      method: 'placeValueBorrow',
      strategy: 'bridgeTen',
    };
    const saved = savePracticeRecord({
      questions: [mockQuestions[2]],
      userAnswers: ['7'],
      assistUsage: [usage],
      timeSpent: 10,
      settings: mockSettings,
    });

    expect(getPracticeRecords()[0]).toEqual(saved);
  });

  it('公开规范化函数拒绝无效记录', () => {
    expect(normalizePracticeRecord(null)).toBeNull();
    expect(normalizePracticeRecord([])).toBeNull();
  });

  it('缺失或损坏的辅助字段统一降为未知，不误算为独立完成或查看方法', () => {
    const record = normalizePracticeRecord({
      schemaVersion: 2,
      items: [
        { question: mockQuestions[0], assistUsage: undefined },
        { question: mockQuestions[1], assistUsage: 'bad data' },
        { question: mockQuestions[1], assistUsage: { eligible: true, kind: 'carry', level: 9 } },
        {
          question: mockQuestions[2],
          assistUsage: {
            eligible: true,
            kind: 'borrow',
            used: true,
            level: 2,
            method: 'placeValueBorrow',
            strategy: 'unknown',
          },
        },
      ],
    });

    expect(record.items.map(({ assistUsage }) => assistUsage)).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });
});

describe('getStats', () => {
  it('无记录时返回零值', () => {
    const stats = getStats();
    expect(stats).toEqual({
      totalPractices: 0,
      totalQuestions: 0,
      avgScore: 0,
      bestScore: 0,
      errorDistribution: [],
    });
  });

  it('累加所有错题的 errors 计算错误分布', () => {
    savePracticeRecord({ questions: mockQuestions, userAnswers: ['8', '11', '7', '7'], timeSpent: 30, settings: mockSettings });
    savePracticeRecord({ questions: mockQuestions, userAnswers: ['0', '1', '17', '7'], timeSpent: 20, settings: mockSettings });

    const stats = getStats();
    expect(stats.totalPractices).toBe(2);
    expect(stats.totalQuestions).toBe(8);
    expect(stats.avgScore).toBe(63);
    expect(stats.bestScore).toBe(100);
    // 第一场全对；第二场：Q0→计算错误，Q1→进位错误，Q2→借位错误
    expect(stats.errorDistribution).toHaveLength(3);
    expect(stats.errorDistribution).toEqual(
      expect.arrayContaining([
        { type: '计算错误', count: 1, ratio: 33 },
        { type: '进位错误', count: 1, ratio: 33 },
        { type: '借位错误', count: 1, ratio: 33 },
      ])
    );
  });
});

describe('clearRecords', () => {
  it('清空所有记录', () => {
    savePracticeRecord({ questions: [mockQuestions[0]], userAnswers: ['8'], timeSpent: 30, settings: mockSettings });
    expect(getPracticeRecords()).toHaveLength(1);
    clearRecords();
    expect(getPracticeRecords()).toHaveLength(0);
    expect(getStats().totalPractices).toBe(0);
  });
});

describe('storage 防御', () => {
  it('损坏数据返回空数组', () => {
    localStorage.setItem('practice-records', '{bad json');
    expect(getPracticeRecords()).toEqual([]);
  });

  it('无数据返回空数组', () => {
    expect(getPracticeRecords()).toEqual([]);
  });
});

describe('容量清理', () => {
  it('QuotaExceededError 时自动清理最旧的 100 条并写入', () => {
    const original = Storage.prototype.setItem;
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    let callCount = 0;
    setItem.mockImplementation((key, val) => {
      callCount++;
      if (callCount === 1) {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      }
      original.call(localStorage, key, val);
    });

    const data = { questions: [mockQuestions[0]], userAnswers: ['8'], timeSpent: 10, settings: mockSettings };
    const record = savePracticeRecord(data);

    expect(record._pruned).toBeGreaterThan(0);
    setItem.mockRestore();
  });

  it('正常写入无 _pruned', () => {
    const data = { questions: [mockQuestions[0]], userAnswers: ['8'], timeSpent: 10, settings: mockSettings };
    const record = savePracticeRecord(data);
    expect(record._pruned).toBeUndefined();
  });
});
