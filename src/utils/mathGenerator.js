import { getRandomInt, shuffleArray } from './random';

/** 判断加法是否涉及进位（个位相加 ≥ 10） */
function needsCarry(a, b) {
  return (a % 10) + (b % 10) >= 10;
}

/** 判断减法是否涉及退位（被减数个位 < 减数个位） */
function needsBorrow(a, b) {
  return (a % 10) < (b % 10);
}

/**
 * 生成一道加法题
 * @param {number} range - 运算范围（结果不超过此值）
 * @param {boolean} wantCarry - 是否需要进位
 */
function generateAddition(range, wantCarry) {
  // 随机试 200 次，找满足进位/不进位条件的题
  for (let i = 0; i < 200; i++) {
    const a = getRandomInt(1, range - 1);
    const b = getRandomInt(1, range - a);
    if (needsCarry(a, b) === wantCarry) {
      return { a, b, op: '+', answer: a + b, hasCarry: true, hasBorrow: false };
    }
  }
  // 兜底：直接构造符合条件的数据
  const a = getRandomInt(1, Math.min(range - 1, 9));
  const b = wantCarry
    ? getRandomInt(10 - (a % 10), Math.min(9, range - a))
    : getRandomInt(1, Math.min(9 - (a % 10), range - a));
  return { a, b, op: '+', answer: a + b, hasCarry: true, hasBorrow: false };
}

/**
 * 生成一道减法题
 * @param {number} range - 运算范围（被减数不超过此值）
 * @param {boolean} wantBorrow - 是否需要退位
 */
function generateSubtraction(range, wantBorrow) {
  // 随机试 200 次，找满足退位/不退位条件的题
  for (let i = 0; i < 200; i++) {
    const a = getRandomInt(2, range);
    const b = getRandomInt(1, a - 1);
    if (needsBorrow(a, b) === wantBorrow) {
      return { a, b, op: '-', answer: a - b, hasCarry: false, hasBorrow: true };
    }
  }
  // 兜底：直接构造符合条件的数据
  const a = getRandomInt(11, range);
  const unitsA = a % 10;
  const b = wantBorrow
    ? getRandomInt(unitsA + 1, Math.min(9, a - 1))
    : getRandomInt(1, unitsA);
  return { a, b: b || 1, op: '-', answer: a - (b || 1), hasCarry: false, hasBorrow: true };
}

/**
 * 根据设置参数批量生成题目
 * @param {Object} opts
 * @param {number} opts.range - 运算范围
 * @param {number} opts.addRatio - 加法比例（0-100）
 * @param {number} opts.carryBorrowProb - 进位/退位概率百分比
 * @param {number} opts.questionCount - 题目数量
 * @returns {Array<{a,b,op,answer,hasCarry,hasBorrow}>} 打乱后的题目数组
 */
export function generateQuestions({ range, addRatio, carryBorrowProb, questionCount }) {
  const questions = [];

  // 按比例分配加法和减法各自的题数
  const addCount = Math.round((questionCount * addRatio) / 100);
  const subCount = questionCount - addCount;

  // 需要进位/退位的题数
  const withCarryOrBorrowCount = Math.round((questionCount * carryBorrowProb) / 100);

  let carryRemaining = withCarryOrBorrowCount;
  let addRemaining = addCount;
  let subRemaining = subCount;

  for (let i = 0; i < questionCount; i++) {
    // 按剩余比例决定当前题是加法还是减法
    const isAdd = addRemaining > 0 && (subRemaining === 0 || Math.random() < addRemaining / (addRemaining + subRemaining));

    if (isAdd) {
      addRemaining--;
      // 在还需进位题数中按概率扣减
      const wantCarry = carryRemaining > 0 && Math.random() < carryRemaining / (addRemaining + subRemaining + 1);
      if (wantCarry) carryRemaining--;
      questions.push(generateAddition(range, wantCarry));
    } else {
      subRemaining--;
      const wantBorrow = carryRemaining > 0 && Math.random() < carryRemaining / (addRemaining + subRemaining + 1);
      if (wantBorrow) carryRemaining--;
      questions.push(generateSubtraction(range, wantBorrow));
    }
  }

  // 打乱顺序，避免同类型题目扎堆
  return shuffleArray(questions);
}
