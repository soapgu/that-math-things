import { savePracticeRecord, getPracticeRecords, getStats, clearRecords } from './storage';

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
    expect(record.results.every(r => r.isCorrect)).toBe(true);
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
    expect(record.results[1].errors).toContain('进位错误');
  });

  it('借位错误单题', () => {
    const record = savePracticeRecord({
      questions: mockQuestions,
      userAnswers: ['8', '11', '17', '7'],
      timeSpent: 30,
      settings: mockSettings,
    });
    expect(record.results[2].errors).toContain('借位错误');
  });

  it('计算错误单题（无进位退位答错）', () => {
    const record = savePracticeRecord({
      questions: mockQuestions,
      userAnswers: ['0', '11', '7', '7'],
      timeSpent: 30,
      settings: mockSettings,
    });
    expect(record.results[0].errors).toEqual(['计算错误']);
  });

  it('一题可命中多个分类', () => {
    const record = savePracticeRecord({
      questions: [mockQuestions[1], mockQuestions[1], mockQuestions[2]],
      userAnswers: ['9', '0', '0'],
      timeSpent: 30,
      settings: mockSettings,
    });
    expect(record.results[0].errors).toEqual(['严重错误', '进位错误', '凑十法计算错误']);
    expect(record.results[1].errors).toEqual(['进位错误', '凑十法计算错误']);
    // 15-8=7, user=0 → 十位正确（0=0），个位错 → 只命中平十/破十法
    expect(record.results[2].errors).toEqual(['平十/破十法计算错误']);
    expect(record.wrongCount).toBe(3);
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
