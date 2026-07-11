import { markQuestion } from './marking';

describe('markQuestion', () => {
  describe('正确回答', () => {
    it('returns isCorrect=true 无 errors 无 detail', () => {
      const q = { a: 5, b: 3, op: '+', answer: 8, hasCarry: false, hasBorrow: false };
      expect(markQuestion(q, 8)).toEqual({ isCorrect: true, errors: [], detail: null });
    });
  });

  describe('无进位退位', () => {
    it('答错归为计算错误', () => {
      const q = { a: 3, b: 4, op: '+', answer: 7, hasCarry: false, hasBorrow: false };
      expect(markQuestion(q, 5)).toEqual({
        isCorrect: false,
        errors: ['计算错误'],
        detail: [{ text: '计算结果不正确', bold: false }],
      });
    });
  });

  describe('加法进位（hasCarry）', () => {
    const q = { a: 9, b: 2, op: '+', answer: 11, hasCarry: true, hasBorrow: false };

    it('十位差 1 且个位正确 → 进位错误', () => {
      expect(markQuestion(q, 1)).toEqual({
        isCorrect: false,
        errors: ['进位错误'],
        detail: [{ text: '忘记进位', bold: false }],
      });
    });

    it('个位算错且十位正确 → 凑十法计算错误', () => {
      expect(markQuestion(q, 12)).toEqual({
        isCorrect: false,
        errors: ['凑十法计算错误'],
        detail: [{ text: '个位凑十计算错误', bold: false }],
      });
    });

    it('十位差 1 且个位算错 → 同时匹配两种', () => {
      expect(markQuestion(q, 3)).toEqual({
        isCorrect: false,
        errors: ['进位错误', '凑十法计算错误'],
        detail: [{ text: '忘记进位', bold: false }, { text: '个位凑十计算错误', bold: false }],
      });
    });

    it('十位差非 1 → 只命中凑十法 + 所有数位全错', () => {
      expect(markQuestion(q, 20)).toEqual({
        isCorrect: false,
        errors: ['严重错误', '凑十法计算错误'],
        detail: [
          { text: '每一位计算结果都不正确', bold: true },
          { text: '个位凑十计算错误', bold: false },
        ],
      });
    });
  });

  describe('多位数加法进位', () => {
    const q1 = { a: 23, b: 28, op: '+', answer: 51, hasCarry: true, hasBorrow: false };

    it('23+28=51, user=41 → 进位错误', () => {
      expect(markQuestion(q1, 41)).toEqual({
        isCorrect: false,
        errors: ['进位错误'],
        detail: [{ text: '忘记进位', bold: false }],
      });
    });

    it('23+28=51, user=42 → 进位+凑十 + 所有数位全错', () => {
      expect(markQuestion(q1, 42)).toEqual({
        isCorrect: false,
        errors: ['严重错误', '进位错误', '凑十法计算错误'],
        detail: [
          { text: '每一位计算结果都不正确', bold: true },
          { text: '忘记进位', bold: false },
          { text: '个位凑十计算错误', bold: false },
        ],
      });
    });

    it('50+50=100, user=50 → 严重错误(直接抄数) + 进位错误', () => {
      const q2 = { a: 50, b: 50, op: '+', answer: 100, hasCarry: true, hasBorrow: false };
      expect(markQuestion(q2, 50)).toEqual({
        isCorrect: false,
        errors: ['严重错误', '进位错误'],
        detail: [
          { text: '直接抄了题目中的数字', bold: true },
          { text: '忘记进位', bold: false },
        ],
      });
    });
  });

  describe('减法退位（hasBorrow）', () => {
    const q = { a: 15, b: 8, op: '-', answer: 7, hasCarry: false, hasBorrow: true };

    it('十位多 1 且个位正确 → 借位错误', () => {
      expect(markQuestion(q, 17)).toEqual({
        isCorrect: false,
        errors: ['借位错误'],
        detail: [{ text: '忘记退位', bold: false }],
      });
    });

    it('个位算错且十位正确 → 平十/破十法计算错误', () => {
      expect(markQuestion(q, 4)).toEqual({
        isCorrect: false,
        errors: ['平十/破十法计算错误'],
        detail: [{ text: '个位平十/破十计算错误', bold: false }],
      });
    });

    it('十位多 1 且个位算错 → 同时匹配两种', () => {
      expect(markQuestion(q, 13)).toEqual({
        isCorrect: false,
        errors: ['借位错误', '平十/破十法计算错误'],
        detail: [
          { text: '忘记退位', bold: false },
          { text: '个位平十/破十计算错误', bold: false },
        ],
      });
    });

    it('十位差非 1 → 只命中平十/破十法', () => {
      expect(markQuestion(q, 20)).toEqual({
        isCorrect: false,
        errors: ['平十/破十法计算错误'],
        detail: [{ text: '个位平十/破十计算错误', bold: false }],
      });
    });

    it('十位差非 1 且个位正确 → 计算错误', () => {
      expect(markQuestion(q, 27)).toEqual({
        isCorrect: false,
        errors: ['计算错误'],
        detail: [{ text: '计算结果不正确', bold: false }],
      });
    });
  });

  describe('a=10 减法退位降级', () => {
    const q = { a: 10, b: 2, op: '-', answer: 8, hasCarry: false, hasBorrow: true };

    it('user=3 → 仅个位错 → 计算错误（降级）', () => {
      expect(markQuestion(q, 3)).toEqual({
        isCorrect: false,
        errors: ['计算错误'],
        detail: [{ text: '计算结果不正确', bold: false }],
      });
    });

    it('user=13 → 十位多1 + 个位错 → 仅借位错误', () => {
      expect(markQuestion(q, 13)).toEqual({
        isCorrect: false,
        errors: ['借位错误'],
        detail: [{ text: '忘记退位', bold: false }],
      });
    });

    it('user=17 → 十位多1 + 个位正确 → 仅借位错误', () => {
      expect(markQuestion(q, 17)).toEqual({
        isCorrect: false,
        errors: ['借位错误'],
        detail: [{ text: '忘记退位', bold: false }],
      });
    });
  });

  describe('多位数减法退位', () => {
    const q = { a: 42, b: 18, op: '-', answer: 24, hasCarry: false, hasBorrow: true };

    it('user=34 → 借位错误', () => {
      expect(markQuestion(q, 34)).toEqual({
        isCorrect: false,
        errors: ['借位错误'],
        detail: [{ text: '忘记退位', bold: false }],
      });
    });

    it('user=26 → 平十/破十法错误', () => {
      expect(markQuestion(q, 26)).toEqual({
        isCorrect: false,
        errors: ['平十/破十法计算错误'],
        detail: [{ text: '个位平十/破十计算错误', bold: false }],
      });
    });
  });

  describe('非数值输入', () => {
    it('空字符串归为计算错误', () => {
      const q = { a: 3, b: 4, op: '+', answer: 7, hasCarry: false, hasBorrow: false };
      const result = markQuestion(q, '');
      expect(result.isCorrect).toBe(false);
      expect(result.errors).toEqual(['计算错误']);
    });
  });
});
