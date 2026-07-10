const DETAIL_MAP = {
  '进位错误': '忘记进位',
  '凑十法计算错误': '个位凑十计算错误',
  '借位错误': '忘记退位',
  '平十/破十法计算错误': '个位平十/破十计算错误',
  '计算错误': '计算结果不正确',
};

function buildDetail(errors) {
  if (errors.length === 0) return null;
  return errors.map(e => DETAIL_MAP[e] || e).join('，');
}

/**
 * 批改一道题，返回对错、错误类型列表和点评文案
 * @param {{ a: number, b: number, op: string, answer: number, hasCarry: boolean, hasBorrow: boolean }} question
 * @param {string|number} userAnswer
 * @returns {{ isCorrect: boolean, errors: string[], detail: string|null }}
 */
export function markQuestion(question, userAnswer) {
  const { answer, hasCarry, hasBorrow } = question;
  const userNum = Number(userAnswer);

  if (Number.isNaN(userNum)) {
    return { isCorrect: false, errors: ['计算错误'], detail: '请输入有效数字' };
  }

  if (userNum === answer) {
    return { isCorrect: true, errors: [], detail: null };
  }

  // 既无进位也无退位 → 直接归为计算错误
  if (!hasCarry && !hasBorrow) {
    return { isCorrect: false, errors: ['计算错误'], detail: '计算结果不正确' };
  }

  // 按最大可能位数补零，确保借位/进位的高位差能被检测到
  const maxLen = Math.max(
    String(answer).length,
    String(question.a).length,
    String(question.b).length,
    String(userNum).length,
  );
  const padCorrect = String(answer).padStart(maxLen, '0');
  const padUser = String(userNum).padStart(maxLen, '0');

  const errors = [];

  const onesPos = maxLen - 1;

  if (hasCarry) {
    let hasCarryMistake = false;
    let hasOnesMistake = false;

    for (let i = 0; i < maxLen; i++) {
      const c = parseInt(padCorrect[i], 10);
      const u = parseInt(padUser[i], 10);
      if (i === onesPos) {
        if (c !== u) hasOnesMistake = true;
      } else {
        if (c - u === 1) hasCarryMistake = true;
      }
    }

    if (hasCarryMistake) errors.push('进位错误');
    if (hasOnesMistake) errors.push('凑十法计算错误');
  }

  if (hasBorrow) {
    let hasBorrowMistake = false;
    let hasOnesMistake = false;

    for (let i = 0; i < maxLen; i++) {
      const c = parseInt(padCorrect[i], 10);
      const u = parseInt(padUser[i], 10);
      if (i === onesPos) {
        if (c !== u) hasOnesMistake = true;
      } else {
        if (u - c === 1) hasBorrowMistake = true;
      }
    }

    if (hasBorrowMistake) errors.push('借位错误');
    if (hasOnesMistake && question.a !== 10) errors.push('平十/破十法计算错误');
  }

  if (errors.length === 0) {
    errors.push('计算错误');
  }

  return { isCorrect: false, errors, detail: buildDetail(errors) };
}
