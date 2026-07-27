/**
 * 题目文本解析与资格判定。
 *
 * 题面在 Session 渲染为 `{a} {op} {b} =`，其中减法显示为 U+2212（−）而非 ASCII `-`。
 * 这里同时兼容两种字符，避免对源码字符耦合。
 *
 * 资格判定与 src/utils/assistGenerator.js 同款规则：
 *   - 加题：个位和 >= 10 ⇒ carry
 *   - 减题：被减数个位 < 减数个位 ⇒ borrow
 *   - 其余为 simple
 */
export class QuestionFinder {
  /**
   * @param {import('../pages/SessionPage').SessionPage} sessionPage Session Page Object。
   */
  constructor(sessionPage) {
    this.page = sessionPage.page;
    this.sessionPage = sessionPage;
  }

  /**
   * 从 session 题面解析操作数与运算符，不识别返回 null。
   * op 统一返回 ASCII '+' / '-'。
   * @returns {Promise<null|{a: number, op: string, b: number}>}
   */
  async parse() {
    const text = await this.sessionPage.getQuestionText();
    if (!text) return null;
    const m = text.match(/(-?\d+)\s*([+\-−])\s*(-?\d+)\s*=/);
    if (!m) return null;
    return {
      a: parseInt(m[1], 10),
      op: m[2] === '−' ? '-' : m[2],
      b: parseInt(m[3], 10),
    };
  }

  /**
   * 真实出题资格判定（不依赖可能过期的标记，只看操作数）。
   * @param {{a: number, op: string, b: number}} q 题目操作数。
   * @returns {null|{kind: 'carry' | 'borrow' | 'simple'}}
   */
  classify(q) {
    if (!q) return null;
    const { a, op, b } = q;
    if (op === '+') {
      const onesSum = (Math.abs(a) % 10) + (Math.abs(b) % 10);
      return { kind: onesSum >= 10 ? 'carry' : 'simple' };
    }
    if (op === '-') {
      const aOnes = Math.abs(a) % 10;
      const bOnes = Math.abs(b) % 10;
      return { kind: aOnes < bOnes ? 'borrow' : 'simple' };
    }
    return null;
  }

  /**
   * 是否为进位题。
   * @param {{a: number, op: string, b: number}} q 题目操作数。
   * @returns {boolean}
   */
  isCarry(q)  { return this.classify(q)?.kind === 'carry'; }

  /**
   * 是否为退位题。
   * @param {{a: number, op: string, b: number}} q 题目操作数。
   * @returns {boolean}
   */
  isBorrow(q) { return this.classify(q)?.kind === 'borrow'; }

  /**
   * 是否为简单题。
   * @param {{a: number, op: string, b: number}} q 题目操作数。
   * @returns {boolean}
   */
  isSimple(q) { return this.classify(q)?.kind === 'simple'; }

  /**
   * 是否为边界进位题（个位和恰好为 10，如 18+2）。
   * @param {{a: number, op: string, b: number}} q 题目操作数。
   * @returns {boolean}
   */
  isCarryBoundary(q) {
    if (!this.isCarry(q)) return false;
    return (Math.abs(q.a) % 10) + (Math.abs(q.b) % 10) === 10;
  }

  /**
   * 是否为边界退位题（被减数为整十，如 10-3）。
   * @param {{a: number, op: string, b: number}} q 题目操作数。
   * @returns {boolean}
   */
  isBorrowBoundary(q) {
    if (!this.isBorrow(q)) return false;
    return Math.abs(q.a) % 10 === 0;
  }

  /**
   * 计算正确答案。
   * @param {{a: number, op: string, b: number}} q 题目操作数。
   * @returns {number}
   */
  answer(q) {
    return q.op === '+' ? q.a + q.b : q.a - q.b;
  }

  /**
   * 循环答题前进，直到 predicate(q) 为真，命中即返回该题并停止。
   * 不命中则按 answerCorrect 策略提交当前题，前进到下一题。
   *
   * 早退条件（抛 code='SESSION_ENDED' 的 Error）：
   *   1) page.url() 离开 /practice/session
   *   2) parse() 返回 null（路由已切或动画过渡瞬间）
   *
   * spec 跨轮重开时捕获 `err.code === 'SESSION_ENDED'` 决定是否再开新训练。
   *
   * @param {(q: {a: number, op: string, b: number}) => boolean} predicate 匹配条件。
   * @param {{maxTries?: number, answerCorrect?: boolean}} [opts] 选项。
   * @returns {Promise<{a: number, op: string, b: number}>}
   */
  async untilQuestion(predicate, { maxTries = 50, answerCorrect = true } = {}) {
    const endSession = (msg) => {
      const err = new Error(msg);
      err.code = 'SESSION_ENDED';
      return err;
    };

    for (let i = 0; i < maxTries; i++) {
      if (!this.page.url().includes('/practice/session')) {
        throw endSession('untilQuestion: 训练已结束（路由离开 /practice/session）');
      }

      const q = await this.parse();
      if (!q) {
        throw endSession('untilQuestion: 题面解析失败，可能已离开 session');
      }
      if (predicate(q)) return q;

      const value = answerCorrect ? this.answer(q) : this.answer(q) + 1;
      await this.sessionPage.answer(value);
      await this.sessionPage.pressEnter();
      await this.page.waitForTimeout(200);
    }
    throw new Error(`maxTries (${maxTries}) reached while seeking target question`);
  }
}
