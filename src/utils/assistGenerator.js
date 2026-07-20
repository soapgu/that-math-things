import { BORROW_ONES_METHODS } from './practiceSettings';

// 教学方法标识只描述“采用哪套数位步骤”，不代表 UI 组件名称。
// 后续动画根据 method 选择进位或退位演示，不需要再次分析题目。
const METHODS = {
  PLACE_VALUE_CARRY: 'placeValueCarry',
  PLACE_VALUE_BORROW: 'placeValueBorrow',
};

// 所有不可辅助的分支使用同一种返回结构，UI 只需判断 eligible，
// reason 则保留给测试、调试以及以后可能增加的产品埋点。
const ineligible = (reason) => ({ eligible: false, reason });

/**
 * 在进入教学算法前验证题目自身是否自洽。
 * 这里故意不校验 hasCarry/hasBorrow：它们是可推导字段，可能来自旧记录，
 * 辅助模型应以 a、b、op 的实际个位关系为准。
 *
 * 校验内容：
 * 1. a、b、answer 必须是整数；
 * 2. 当前训练只接受非负的 a 和正数 b；
 * 3. 只处理加法、减法；
 * 4. answer 必须与算式结果一致，避免生成错误教学步骤。
 *
 * @param {Object} question 计算题对象
 * @returns {boolean} 题目是否可以安全进入辅助算法
 */
function isValidQuestion(question) {
  return question
    && Number.isInteger(question.a)
    && Number.isInteger(question.b)
    && Number.isInteger(question.answer)
    && question.a >= 0
    && question.b > 0
    && (question.op === '+' || question.op === '-')
    && question.answer === (question.op === '+' ? question.a + question.b : question.a - question.b);
}

/**
 * 生成进位加法的教材数位模型。
 *
 * 以 27 + 5 为例：
 * - 个位：7 + 5 = 12；
 * - 个位保留 2，10 个一换成 1 个十；
 * - 十位：2 + 1 = 3，即 2 个十加进来的 1 个十；
 * - 合并：30 + 2 = 32。
 *
 * @param {{a:number,b:number,answer:number}} question
 * @returns {Object} 可供两层提醒和动画直接消费的模型
 */
function createCarryAssistance({ a, b, answer }) {
  // `% 10` 取得个位数；减去个位后得到以“十”为单位的数值部分。
  // 27 → 个位 7、十位数值 20；5 → 个位 5、十位数值 0。
  const firstOnes = a % 10;
  const secondOnes = b % 10;
  const firstTensValue = a - firstOnes;
  const secondTensValue = b - secondOnes;
  const firstTensCount = firstTensValue / 10;
  const secondTensCount = secondTensValue / 10;

  // 个位和决定是否进位。进位题中 onesSum 为 10～18，
  // onesResult 是最终写在个位上的数字，carryTensValue 是进到十位的 1 个十。
  const onesSum = firstOnes + secondOnes;
  const onesResult = onesSum % 10;
  const carryTensValue = 10;
  const carryTensCount = 1;

  // 十位最终数值仍保留给最终合并表达式使用：20 + 0 + 10 = 30。
  // 但面向孩子的十位步骤使用下面的 tensCount 字段，表达为 2 + 1 = 3。
  const tensResultValue = firstTensValue + secondTensValue + carryTensValue;
  const tensResultCount = tensResultValue / 10;
  // 教材按“几个十”计算。第二个加数没有十位时省略 0，
  // 27 + 5 显示 2 + 1 = 3，而不是 20 + 0 + 10 = 30。
  const tensCountAddends = [];
  if (firstTensCount > 0) tensCountAddends.push(firstTensCount);
  if (secondTensCount > 0) tensCountAddends.push(secondTensCount);
  tensCountAddends.push(carryTensCount);

  // 个位和小于 10 表示没有进位，不属于本功能范围。
  if (onesSum < 10) return ineligible('no-carry');
  // 只要真实发生进位就提供辅助。即使结果正好是整十（如 9 + 1、18 + 2），
  // 仍需演示“个位写 0、向十位进 1”，不能按结果是否整十排除。

  // 返回值同时服务两层辅助：hint 给第一层文字提醒，
  // operands/steps 给第二层动画消费。
  return {
    eligible: true,
    kind: 'carry',
    method: METHODS.PLACE_VALUE_CARRY,
    hint: {
      message: `个位 ${firstOnes} + ${secondOnes} 超过了 10，记得向十位进 1。`,
      question: `个位 ${firstOnes} 加 ${secondOnes} 得多少？满十后个位写几，向十位进几？`,
    },
    operands: {
      // 原始操作数，方便动画展示完整算式。
      first: a,
      second: b,
      // 两个加数的个位。
      firstOnes,
      secondOnes,
      // 两个加数原有的整十部分，字段保存“数值”而不是“几个十”。
      firstTensValue,
      secondTensValue,
      // 对应的“几个十”，用于教材十位算式和文案。
      firstTensCount,
      secondTensCount,
      // 个位相加的原始结果，以及最终保留在个位上的数字。
      onesSum,
      onesResult,
      // 从个位进到十位的数值 10，以及计算后的完整十位数值。
      carryTensValue,
      tensResultValue,
      carryTensCount,
      tensResultCount,
      // 只供展示和一致性校验使用，不由动画重新推算。
      answer,
    },
    // steps 只保存第二层的实际演示动作，第一层提醒统一由 hint 负责。
    // 数组已按教材播放顺序排列；UI 不得自行重排。
    steps: [
      {
        // 建立竖式/数位表的观察顺序。
        type: 'align',
        text: '把相同数位对齐，从个位算起',
      },
      {
        // 先计算个位，但暂不处理“写几进几”。
        type: 'addOnes',
        text: `先算个位：${firstOnes} 加 ${secondOnes} 等于 ${onesSum}`,
        expression: `${firstOnes} + ${secondOnes} = ${onesSum}`,
      },
      {
        // 把 onesSum 分解成 1 个十和 onesResult 个一。
        type: 'carry',
        text: `个位写 ${onesResult}，再向十位进 1`,
        expression: `${onesSum} = 10 + ${onesResult}`,
      },
      {
        // 计算十位时按“几个十”表达，并显式包含进来的 1，强化“不要忘记进位”。
        type: 'addTens',
        text: `${tensCountAddends.join(' 个十加 ')} 个十是 ${tensResultCount} 个十`,
        expression: `${tensCountAddends.join(' + ')} = ${tensResultCount}`,
      },
      {
        // 把十位数值与个位结果重新组成最终答案。
        type: 'combine',
        text: `${tensResultValue / 10} 个十与 ${onesResult} 个一合起来是 ${answer}`,
        expression: `${tensResultValue} + ${onesResult} = ${answer}`,
      },
    ],
  };
}

/**
 * 生成退位减法的教材数位模型。
 *
 * 以 43 - 18 为例：
 * - 3 个一不够减 8 个一，从十位退 1；
 * - 43 看作 3 个十和 13 个一；
 * - 个位：13 - 8 = 5；
 * - 十位：30 - 10 = 20；
 * - 合并：20 + 5 = 25。
 *
 * @param {{a:number,b:number,answer:number}} question
 * @returns {Object} 可供两层提醒和动画直接消费的模型
 */
function createBorrowAssistance({ a, b, answer }, settings) {
  // minuend = 被减数，subtrahend = 减数；这里只先取双方个位。
  const minuendOnes = a % 10;
  const subtrahendOnes = b % 10;

  // 当前训练不生成负数结果；防御性校验放在这里，避免出现负的十位数量。
  if (a <= b) return ineligible('non-positive-subtraction');
  // 被减数个位足够减时不需要退位，不属于本功能范围。
  if (minuendOnes >= subtrahendOnes) return ineligible('no-borrow');

  // 严格按照教材图示的数位退位步骤建模：
  // 43 - 18 中，把 43 看成 3 个十和 13 个一；分别计算 13 - 8、30 - 10，最后合并。
  // 这套公式也自然覆盖 10 - 3（0 个十和 10 个一）以及 100 - 18（9 个十和 10 个一）。
  // 从被减数十位退 1，相当于个位增加 10。
  const borrowedOnes = minuendOnes + 10;
  // 被减数退位后的整十部分。例如 43 退 1 个十后剩 30。
  const remainingTensValue = (Math.floor(a / 10) - 1) * 10;
  // 减数的整十部分。例如 18 去掉个位 8 后为 10。
  const subtrahendTensValue = b - subtrahendOnes;
  // 个位与十位分别相减，两个结果最终再合并。
  const onesResult = borrowedOnes - subtrahendOnes;
  const tensResultValue = remainingTensValue - subtrahendTensValue;
  // 文案使用“几个十”，表达式使用实际数值，因此额外计算三个计数值。
  const remainingTensCount = remainingTensValue / 10;
  const subtrahendTensCount = subtrahendTensValue / 10;
  const tensResultCount = tensResultValue / 10;
  const onesMethod = settings.borrowOnesMethod === BORROW_ONES_METHODS.BRIDGE_TEN
    ? BORROW_ONES_METHODS.BRIDGE_TEN
    : BORROW_ONES_METHODS.BREAK_TEN;
  // 顶层仍是同一个“个位相减”步骤，只把内部演示所需的拆分数据交给动画。
  const onesStrategy = onesMethod === BORROW_ONES_METHODS.BRIDGE_TEN
    ? {
      type: BORROW_ONES_METHODS.BRIDGE_TEN,
      subtractToTen: minuendOnes,
      remainingSubtract: subtrahendOnes - minuendOnes,
      skipToTen: minuendOnes === 0,
      result: onesResult,
    }
    : {
      type: BORROW_ONES_METHODS.BREAK_TEN,
      subtractFromTen: subtrahendOnes,
      tenRemainder: 10 - subtrahendOnes,
      addBack: minuendOnes,
      skipAddBack: minuendOnes === 0,
      result: onesResult,
    };

  return {
    eligible: true,
    kind: 'borrow',
    method: METHODS.PLACE_VALUE_BORROW,
    onesMethod,
    hint: {
      message: `个位的 ${minuendOnes} 不够减 ${subtrahendOnes}，需要从十位退 1。`,
      question: '退下来的 1 个十可以换成多少个一？',
    },
    operands: {
      // 原始操作数。
      first: a,
      second: b,
      // 退位前双方个位。
      minuendOnes,
      subtrahendOnes,
      // 退位后被减数的个位，以及双方的整十数值。
      borrowedOnes,
      remainingTensValue,
      subtrahendTensValue,
      // 个位差、十位差和最终答案。
      onesResult,
      tensResultValue,
      answer,
    },
    // steps 只保存第二层动作，与教材图片顺序一致：重组 → 个位 → 十位 → 合并。
    // 第一层退位提醒统一由 hint 负责，不在这里重复保存。
    steps: [
      {
        // 演示十位减少一个、个位增加十个的数形变化。
        type: 'regroup',
        text: `把 ${a} 看作 ${remainingTensCount} 个十和 ${borrowedOnes} 个一`,
        expression: `${a} = ${remainingTensValue} + ${borrowedOnes}`,
      },
      {
        // 只处理个位区域中的小棒/圆点。
        type: 'subtractOnes',
        text: `${borrowedOnes} 个一减 ${subtrahendOnes} 个一是 ${onesResult} 个一`,
        expression: `${borrowedOnes} - ${subtrahendOnes} = ${onesResult}`,
        strategy: onesStrategy,
      },
      {
        // 再处理十位区域，避免孩子只算个位而漏算减数十位。
        type: 'subtractTens',
        text: `${remainingTensCount} 个十减 ${subtrahendTensCount} 个十是 ${tensResultCount} 个十`,
        expression: `${remainingTensValue} - ${subtrahendTensValue} = ${tensResultValue}`,
      },
      {
        // 将剩余的十与一重新组成答案。
        type: 'combine',
        text: `${tensResultCount} 个十与 ${onesResult} 个一合起来是 ${answer}`,
        expression: `${tensResultValue} + ${onesResult} = ${answer}`,
      },
    ],
  };
}

/**
 * 根据一道计算题和训练设置生成辅助计算模型。
 * 该函数是纯计算逻辑，不读取状态，也不包含 UI 或动画实现。
 * settings 只选择退位后个位的破十法或平十法；加法及顶层数位步骤不受影响。
 *
 * @param {Object} question 题目对象：{ a, b, op, answer, ... }
 * @param {Object} settings 训练设置，Phase 1 暂不参与算法分支
 * @returns {Object} eligible=false 的原因，或 eligible=true 的完整辅助模型
 */
export function createAssistance(question, settings = {}) {
  // 先阻断坏数据，后续两个生成器即可假设 a、b、answer 都是可信整数。
  if (!isValidQuestion(question)) return ineligible('invalid-question');

  // 加法固定使用数位进位；减法固定使用数位退位，只有退位后的个位内部策略可选。
  if (question.op === '+') return createCarryAssistance(question);
  return createBorrowAssistance(question, settings);
}

// 对外只暴露稳定的字符串常量，调用方不需要知道内部生成函数。
export { METHODS as ASSIST_METHODS };
