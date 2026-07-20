import { createAssistance, ASSIST_METHODS } from './assistGenerator';
import { BORROW_ONES_METHODS } from './practiceSettings';
import { generateQuestions } from './mathGenerator';

// 测试工厂始终生成自洽的题目对象；个别容错测试会在此基础上
// 故意篡改派生标记或答案，以确认模型不会盲信外部数据。
const addition = (a, b) => ({
  a,
  b,
  op: '+',
  answer: a + b,
  hasCarry: (a % 10) + (b % 10) >= 10,
  hasBorrow: false,
});

const subtraction = (a, b) => ({
  a,
  b,
  op: '-',
  answer: a - b,
  hasCarry: false,
  hasBorrow: (a % 10) < (b % 10),
});

// ──────────────────────────────
// 入口校验与辅助资格
// ──────────────────────────────
describe('createAssistance 辅助资格', () => {
  it.each([
    [addition(3, 4), 'no-carry'],
    [subtraction(18, 5), 'no-borrow'],
    [{ a: 3, b: 2, op: '*', answer: 6 }, 'invalid-question'],
    [{ a: 8, b: 7, op: '+', answer: 99 }, 'invalid-question'],
  ])('排除不在辅助范围内的题目', (question, reason) => {
    expect(createAssistance(question)).toEqual({ eligible: false, reason });
  });

  it('不依赖可能过期的 hasCarry 标记', () => {
    const result = createAssistance({ ...addition(8, 7), hasCarry: false });
    expect(result.eligible).toBe(true);
    expect(result.kind).toBe('carry');
  });

  it.each([
    [9, 1, 10],
    [18, 2, 20],
  ])('%i + %i 结果正好是整十，仍提供进位辅助', (a, b, answer) => {
    const result = createAssistance(addition(a, b));
    expect(result).toMatchObject({
      eligible: true,
      kind: 'carry',
      method: ASSIST_METHODS.PLACE_VALUE_CARRY,
      operands: { onesResult: 0, answer },
    });
    expect(result.steps.find((step) => step.type === 'carry')).toMatchObject({
      text: '个位写 0，再向十位进 1',
    });
    const expectedTensExpression = a === 9 ? '1 = 1' : '1 + 1 = 2';
    expect(result.steps.find((step) => step.type === 'addTens').expression).toBe(expectedTensExpression);
  });
});

// ──────────────────────────────
// 数位进位：严格按照教材图示的“数位对齐、个位相加、进一、十位相加”
// ──────────────────────────────
describe('数位进位加法', () => {
  it('严格生成图片中 27 + 5 的进位步骤', () => {
    const result = createAssistance(addition(27, 5));

    expect(result).toMatchObject({
      eligible: true,
      kind: 'carry',
      method: ASSIST_METHODS.PLACE_VALUE_CARRY,
      operands: {
        firstTensValue: 20,
        secondTensValue: 0,
        onesSum: 12,
        onesResult: 2,
        carryTensValue: 10,
        tensResultValue: 30,
        firstTensCount: 2,
        secondTensCount: 0,
        carryTensCount: 1,
        tensResultCount: 3,
        answer: 32,
      },
      hint: {
        message: '个位 7 + 5 超过了 10，记得向十位进 1。',
        question: '个位 7 加 5 得多少？满十后个位写几，向十位进几？',
      },
    });
    expect(result.steps.map((step) => step.type)).toEqual([
      'align', 'addOnes', 'carry', 'addTens', 'combine',
    ]);
    expect(result.steps.slice(1).map((step) => step.expression)).toEqual([
      '7 + 5 = 12',
      '12 = 10 + 2',
      '2 + 1 = 3',
      '30 + 2 = 32',
    ]);
  });

  it('支持两个加数都是两位数', () => {
    const result = createAssistance(addition(36, 27));
    expect(result.operands).toMatchObject({
      firstTensValue: 30,
      secondTensValue: 20,
      onesSum: 13,
      onesResult: 3,
      tensResultValue: 60,
      firstTensCount: 3,
      secondTensCount: 2,
      tensResultCount: 6,
      answer: 63,
    });
    expect(result.steps.find((step) => step.type === 'addTens').expression).toBe('3 + 2 + 1 = 6');
    expect(result.steps.at(-1).expression).toBe('60 + 3 = 63');
  });

  it('退位个位算法设置不影响加法模型', () => {
    const breakTen = createAssistance(addition(19, 24), {
      borrowOnesMethod: BORROW_ONES_METHODS.BREAK_TEN,
    });
    const bridgeTen = createAssistance(addition(19, 24), {
      borrowOnesMethod: BORROW_ONES_METHODS.BRIDGE_TEN,
    });
    expect(bridgeTen).toEqual(breakTen);
  });
});

// ──────────────────────────────
// 数位退位：严格按照教材图示的“退十到个、分别相减、最后合并”
// ──────────────────────────────
describe('数位退位减法', () => {
  it('严格生成图片中 43 - 18 的四个步骤，默认使用破十法', () => {
    const result = createAssistance(subtraction(43, 18));

    expect(result).toMatchObject({
      eligible: true,
      kind: 'borrow',
      method: ASSIST_METHODS.PLACE_VALUE_BORROW,
      onesMethod: BORROW_ONES_METHODS.BREAK_TEN,
      operands: {
        borrowedOnes: 13,
        remainingTensValue: 30,
        subtrahendTensValue: 10,
        onesResult: 5,
        tensResultValue: 20,
        answer: 25,
      },
      hint: {
        message: '个位的 3 不够减 8，需要从十位退 1。',
        question: '退下来的 1 个十可以换成多少个一？',
      },
    });
    expect(result.steps.map((step) => step.type)).toEqual([
      'regroup', 'subtractOnes', 'subtractTens', 'combine',
    ]);
    expect(result.steps.map((step) => step.expression)).toEqual([
      '43 = 30 + 13',
      '13 - 8 = 5',
      '30 - 10 = 20',
      '20 + 5 = 25',
    ]);
    expect(result.steps[1].strategy).toEqual({
      type: BORROW_ONES_METHODS.BREAK_TEN,
      subtractFromTen: 8,
      tenRemainder: 2,
      addBack: 3,
      skipAddBack: false,
      result: 5,
    });
  });

  it('15 - 8 选择平十法时只替换个位内部策略', () => {
    const result = createAssistance(subtraction(15, 8), {
      borrowOnesMethod: BORROW_ONES_METHODS.BRIDGE_TEN,
    });
    expect(result.method).toBe(ASSIST_METHODS.PLACE_VALUE_BORROW);
    expect(result.onesMethod).toBe(BORROW_ONES_METHODS.BRIDGE_TEN);
    expect(result.steps.map((step) => step.expression)).toEqual([
      '15 = 0 + 15',
      '15 - 8 = 7',
      '0 - 0 = 0',
      '0 + 7 = 7',
    ]);
    expect(result.steps[1].strategy).toEqual({
      type: BORROW_ONES_METHODS.BRIDGE_TEN,
      subtractToTen: 5,
      remainingSubtract: 3,
      skipToTen: false,
      result: 7,
    });
  });

  it('10 - 3 自然表示为 0 个十和 10 个一', () => {
    const result = createAssistance(subtraction(10, 3), {
      borrowOnesMethod: BORROW_ONES_METHODS.BRIDGE_TEN,
    });
    expect(result.operands).toMatchObject({
      borrowedOnes: 10,
      remainingTensValue: 0,
      onesResult: 7,
      tensResultValue: 0,
      answer: 7,
    });
    expect(result.steps[0]).toMatchObject({
      type: 'regroup',
      text: '把 10 看作 0 个十和 10 个一',
      expression: '10 = 0 + 10',
    });
    expect(result.steps[1].strategy).toMatchObject({
      type: BORROW_ONES_METHODS.BRIDGE_TEN,
      subtractToTen: 0,
      remainingSubtract: 3,
      skipToTen: true,
    });
    expect(result.steps.at(-1).expression).toBe('0 + 7 = 7');
  });

  it('100 - 18 可通过连续退位表示为 9 个十和 10 个一', () => {
    const result = createAssistance(subtraction(100, 18));
    expect(result.operands).toMatchObject({
      borrowedOnes: 10,
      remainingTensValue: 90,
      subtrahendTensValue: 10,
      onesResult: 2,
      tensResultValue: 80,
      answer: 82,
    });
    expect(result.steps[0].text).toBe('把 100 看作 9 个十和 10 个一');
    expect(result.steps.at(-1).expression).toBe('80 + 2 = 82');
  });
});

// ──────────────────────────────
// 属性式抽样：使用真实出题器检查广泛输入，而不只验证手写例题
// ──────────────────────────────
describe('随机题一致性', () => {
  it('输出的最后一步始终得到正确答案', () => {
    const questions = generateQuestions({
      range: 100,
      addRatio: 50,
      carryBorrowProb: 100,
      questionCount: 100,
    });

    questions.forEach((question) => {
      const result = createAssistance(question);
      expect(result.eligible).toBe(true);
      expect(result.steps.length).toBeGreaterThanOrEqual(4);
      expect(result.operands.answer).toBe(question.answer);
      expect(result.steps.at(-1).expression).toContain(`= ${question.answer}`);
    });
  });
});
