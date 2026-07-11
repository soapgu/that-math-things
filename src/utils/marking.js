export const ERROR_CONFIG = [
  { type: '进位错误',        detail: '忘记进位',                  tagColor: 'blue',    barColor: '#1677ff' },
  { type: '凑十法计算错误',   detail: '个位凑十计算错误',          tagColor: 'gold',    barColor: '#faad14' },
  { type: '借位错误',        detail: '忘记退位',                  tagColor: 'red',     barColor: '#ff4d4f' },
  { type: '平十/破十法计算错误', detail: '个位平十/破十计算错误',  tagColor: 'purple',  barColor: '#722ed1' },
  { type: '计算错误',        detail: '计算结果不正确',            tagColor: 'default', barColor: '#d9d9d9' },
  { type: '严重错误',        detail: '方向性错误或完全算错',      tagColor: '#ff0000', barColor: '#ff0000' },
];

function config(type) {
  return ERROR_CONFIG.find(c => c.type === type);
}

export function findSevere(question, userNum) {
  const { a, b, op, answer } = question;
  if (userNum === answer) return null;

  if (userNum === a || userNum === b)
    return { type: '直接抄数', detail: '直接抄了题目中的数字' };
  if ((op === '+' && userNum === a - b) || (op === '-' && userNum === a + b))
    return { type: '符号混淆', detail: '加减法运算方向错误' };

  const aStr = String(answer);
  const uStr = String(userNum);
  if (aStr.length === 2 && uStr.length === 2 && userNum === (answer % 10) * 10 + Math.floor(answer / 10))
    return { type: '数位颠倒', detail: '十位和个位颠倒了' };
  if (aStr.length >= 2 && aStr.length === uStr.length) {
    if ([...aStr].every((c, i) => c !== uStr[i]))
      return { type: '所有数位全错', detail: '每一位计算结果都不正确' };
  }

  return null;
}

function buildDetail(errors, severe) {
  if (errors.length === 0) return null;
  const parts = errors
    .filter(e => e !== '严重错误')
    .map(e => ({ text: (config(e) || {}).detail || e, bold: false }));
  if (severe) parts.unshift({ text: severe.detail, bold: true });
  return parts;
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

  const errors = [];

  // 既无进位也无退位 → 直接归为计算错误
  if (!hasCarry && !hasBorrow) {
    errors.push('计算错误');
  } else {
    // 按最大可能位数补零，确保借位/进位的高位差能被检测到
    const maxLen = Math.max(
      String(answer).length,
      String(question.a).length,
      String(question.b).length,
      String(userNum).length,
    );
    const padCorrect = String(answer).padStart(maxLen, '0');
    const padUser = String(userNum).padStart(maxLen, '0');

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
  }

  if (errors.length === 0) {
    errors.push('计算错误');
  }

  const severe = findSevere(question, userNum);
  if (severe) {
    errors.unshift('严重错误');
  }

  return {
    isCorrect: false,
    errors,
    detail: buildDetail(errors, severe),
  };
}
