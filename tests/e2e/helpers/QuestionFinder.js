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
  constructor(sessionPage) {
    this.page = sessionPage.page;
    this.sessionPage = sessionPage;
  }

  /**
   * 从 Session 题面文本提取 { a, op, b }；不识别则返回 null。
   * op 统一返回 ASCII '+' / '-'，方便调用方比较。
   */
  async parse() {
    const text = await this.sessionPage.getQuestionText();
    if (!text) return null;
    // 形如 "27 + 5 = ?" 或 "43 − 18 = ?"
    const m = text.match(/(-?\d+)\s*([+\-−])\s*(-?\d+)\s*=/);
    if (!m) return null;
    return {
      a: parseInt(m[1], 10),
      op: m[2] === '−' ? '-' : m[2],
      b: parseInt(m[3], 10),
    };
  }

  /**
   * 真实出题资格判定，返回 { kind: 'carry' | 'borrow' | 'simple' }。
   * 不依赖可能过期的 hasCarry/hasBorrow 标记，只看真实操作数。
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

  isCarry(q)  { return this.classify(q)?.kind === 'carry'; }
  isBorrow(q) { return this.classify(q)?.kind === 'borrow'; }
  isSimple(q) { return this.classify(q)?.kind === 'simple'; }

  // 边界题：进位且个位和恰好为 10（如 18+2）
  isCarryBoundary(q) {
    if (!this.isCarry(q)) return false;
    return (Math.abs(q.a) % 10) + (Math.abs(q.b) % 10) === 10;
  }

  // 边界题：退位且被减数为整十（如 10-3）
  isBorrowBoundary(q) {
    if (!this.isBorrow(q)) return false;
    return Math.abs(q.a) % 10 === 0;
  }

  // 计算正确答案
  answer(q) {
    return q.op === '+' ? q.a + q.b : q.a - q.b;
  }

  /**
   * 循环答题前进，直到命中 predicate(q) 为真；命中即返回当前题 q，并停止答题。
   * 不命中则按 answerCorrect 策略提交当前题，前进到下一题。
   *
   * 不直接修改 localStorage 或篡改题目，严格遵守 phase7 第 3 节。
   * maxTries 作为最终安全阀，常用 case 因「训练已结束」会提前早退。
   *
   * 早退条件（抛 code='SESSION_ENDED' 的 Error）：
   *   1) page.url() 离开 /practice/session
   *   2) parse() 返回 null（题面 span 已不存在；常因路由已切或动画过渡瞬间）
   *
   * spec 跨轮重开时捕获 `err.code === 'SESSION_ENDED'` 决定是否再开新训练。
   *
   * @param {(q:{a,op,b}|null)=>boolean} predicate
   * @param {{maxTries?:number, answerCorrect?:boolean}} [opts]
   * @returns {Promise<{a,op,b}>}
   */
  async untilQuestion(predicate, { maxTries = 50, answerCorrect = true } = {}) {
    const endSession = (msg) => {
      const err = new Error(msg);
      err.code = 'SESSION_ENDED';
      return err;
    };

    for (let i = 0; i < maxTries; i++) {
      // 闸 1：路由已离开 /practice/session
      if (!this.page.url().includes('/practice/session')) {
        throw endSession('untilQuestion: 训练已结束（路由离开 /practice/session）');
      }

      // 闸 2：题面 span 不存在 → parse 返回 null 即拒绝继续
      const q = await this.parse();
      if (!q) {
        throw endSession('untilQuestion: 题面解析失败，可能已离开 session');
      }
      if (predicate(q)) return q;

      // 非目标题：按策略答完，前进
      const value = answerCorrect ? this.answer(q) : this.answer(q) + 1;
      await this.sessionPage.answer(value);
      // Enter 在最后一题同样会触发 handleSubmit，触发后路由会变
      await this.sessionPage.pressEnter();
      // 留给 React 重渲染一帧；下一轮循环顶部会再次校验路由
      await this.page.waitForTimeout(200);
    }
    throw new Error(`maxTries (${maxTries}) reached while seeking target question`);
  }
}