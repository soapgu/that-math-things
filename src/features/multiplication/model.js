/**
 * 九九乘法闯关的领域模型。
 *
 * 本文件只包含纯逻辑，不依赖 React、浏览器路由或 localStorage。页面层负责保存
 * 当前会话状态和渲染组件，本模块负责保证题目、选项、累计开图、矩阵可见性和
 * 评分规则始终一致。
 *
 * @typedef {'easy' | 'medium' | 'hard'} MultiplicationDifficulty
 * @typedef {'READY' | 'FEEDBACK_CORRECT' | 'FEEDBACK_WRONG' | string} MultiplicationPhase
 * @typedef {{ a: number, b: number, op: '*', answer: number }} MultiplicationQuestion
 * @typedef {{
 *   a: number,
 *   b: number,
 *   answer: number,
 *   submittedValue: number,
 *   correct: boolean,
 *   order: number
 * }} AnsweredCell
 * @typedef {Record<string, AnsweredCell>} AnsweredCells
 */

/** 三档难度的稳定内部值；Object.freeze 防止运行时被意外改写。 */
export const DIFFICULTIES = Object.freeze({
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
});

/** 产品允许的单局题量；81 题代表完整打开九九乘法表。 */
export const QUESTION_COUNTS = Object.freeze([10, 20, 50, 81]);

/** 获得三星时，各难度允许的最大平均每题用时（秒）。 */
export const SPEED_TARGETS = Object.freeze({
  [DIFFICULTIES.EASY]: 8,
  [DIFFICULTIES.MEDIUM]: 10,
  [DIFFICULTIES.HARD]: 12,
});

/** 设置页首次进入时使用的默认配置。 */
export const DEFAULT_MULTIPLICATION_SETTINGS = Object.freeze({
  difficulty: DIFFICULTIES.EASY,
  questionCount: 10,
});

/** 缓存难度值数组，供所有公开函数执行统一输入校验。 */
const DIFFICULTY_VALUES = Object.freeze(Object.values(DIFFICULTIES));

/**
 * 确认难度属于产品定义的三档之一。
 * @param {string} difficulty
 * @throws {RangeError} 难度无效时抛出，避免错误配置静默进入评分或矩阵逻辑。
 */
function assertDifficulty(difficulty) {
  if (!DIFFICULTY_VALUES.includes(difficulty)) {
    throw new RangeError(`不支持的乘法难度：${difficulty}`);
  }
}

/**
 * 确认题量是设置页允许的四个固定值之一。
 * @param {number} count
 * @throws {RangeError}
 */
function assertQuestionCount(count) {
  if (!QUESTION_COUNTS.includes(count)) {
    throw new RangeError(`题量必须是 ${QUESTION_COUNTS.join('、')} 之一`);
  }
}

/**
 * 校验一道题的两个因数和答案是否自洽。
 *
 * 不只检查 a、b 的范围，也重新计算乘积，防止调用方传入错误答案后污染
 * 四选一、累计记录和矩阵反馈。
 *
 * @param {MultiplicationQuestion} question
 * @throws {TypeError}
 */
function assertQuestion(question) {
  if (
    !question
    || !Number.isInteger(question.a)
    || !Number.isInteger(question.b)
    || question.a < 1
    || question.a > 9
    || question.b < 1
    || question.b > 9
    || question.answer !== question.a * question.b
  ) {
    throw new TypeError('乘法题必须包含 1–9 的两个因数及其正确乘积');
  }
}

/**
 * 校验随机源的一次返回值。
 *
 * Math.random 的标准范围是 [0, 1)，注入的测试随机源也必须遵守同一契约，
 * 否则 Fisher–Yates 计算出的数组下标可能越界。
 *
 * @param {number} value
 * @throws {RangeError}
 */
function assertRngValue(value) {
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('随机函数必须返回 [0, 1) 范围内的有限数值');
  }
}

/**
 * 使用 Fisher–Yates 算法返回一个新顺序，不修改原数组。
 *
 * 从数组末尾向前遍历。处理 index 时，只在尚未固定的 [0, index] 区间
 * 等概率选择 target 并交换，因此每个元素出现在每个位置的概率相同。
 *
 * rng 默认由公开调用方传入 Math.random。将随机源参数化不是因为
 * Math.random 不可靠，而是让单元测试能够传入固定序列，稳定验证题目顺序
 * 和边界行为；生产调用仍然使用标准 Math.random。
 *
 * 时间复杂度 O(n)，额外空间复杂度 O(n)（因为先复制数组）。
 *
 * @template T
 * @param {T[]} values 待洗牌数组
 * @param {() => number} rng 返回 [0, 1) 的随机函数
 * @returns {T[]} 洗牌后的新数组
 */
function shuffleWithRng(values, rng) {
  if (typeof rng !== 'function') throw new TypeError('随机源必须是函数');
  // 保持函数纯净：复制后再交换，调用方传入的坐标池或候选项不会被修改。
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomValue = rng();
    assertRngValue(randomValue);
    // randomValue < 1，因此 target 必然落在尚未固定的 [0, index] 区间。
    const target = Math.floor(randomValue * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

/**
 * 将 0–80 的逻辑坐标编号转换为一道有序乘法题。
 *
 * 编号按行优先排列：0 → 1×1，8 → 1×9，9 → 2×1，80 → 9×9。
 * 这样无需维护 81 个手写题目对象，同时 3×7 和 7×3 仍拥有不同编号。
 *
 * @param {number} id 0–80 的整数
 * @returns {MultiplicationQuestion}
 * @throws {RangeError}
 */
export function questionFromCoordinateId(id) {
  if (!Number.isInteger(id) || id < 0 || id > 80) {
    throw new RangeError('乘法坐标编号必须是 0–80 的整数');
  }
  // 整除 9 得到从 0 开始的行号，取余 9 得到从 0 开始的列号。
  const a = Math.floor(id / 9) + 1;
  const b = (id % 9) + 1;
  return { a, b, op: '*', answer: a * b };
}

/**
 * 通过洗牌逻辑坐标池生成无放回题目。
 *
 * 先一次性洗牌 0–80，再截取前 count 个编号。相比“随机 a、b，重复则重抽”，
 * 该方法在 81 题接近完成时不会因大量重复命中而反复重试。
 *
 * @param {number} count 仅支持 10、20、50、81
 * @param {() => number} [rng=Math.random] 生产默认使用 Math.random；测试可注入固定随机源
 * @returns {MultiplicationQuestion[]}
 */
export function generateMultiplicationQuestions(count, rng = Math.random) {
  assertQuestionCount(count);
  // 这里只创建轻量编号池，不预先维护 81 个题目对象。
  const coordinateIds = Array.from({ length: 81 }, (_, index) => index);
  return shuffleWithRng(coordinateIds, rng)
    .slice(0, count)
    .map(questionFromCoordinateId);
}

/**
 * 生成有序乘法坐标的稳定键。
 *
 * 使用乘号而不是排序后的因数组合，因此 3×4 与 4×3 是两个独立格子。
 *
 * @param {number} a 行因数
 * @param {number} b 列因数
 * @returns {string} 例如 "3×4"
 */
export function getCellKey(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || a > 9 || b < 1 || b > 9) {
    throw new RangeError('乘法格坐标必须是 1–9 的整数');
  }
  return `${a}×${b}`;
}

/**
 * 计算目标格上下左右真实存在的相邻格乘积。
 *
 * 边缘和四角会自然过滤超出 1–9 的坐标。这些乘积既是中等难度的提示，
 * 也是简单四选一最有教学意义的第一优先级干扰项。
 *
 * @param {MultiplicationQuestion} question
 * @returns {number[]}
 */
function neighborProducts(question) {
  const coordinates = [
    [question.a - 1, question.b],
    [question.a + 1, question.b],
    [question.a, question.b - 1],
    [question.a, question.b + 1],
  ];
  return coordinates
    .filter(([a, b]) => a >= 1 && a <= 9 && b >= 1 && b <= 9)
    .map(([a, b]) => a * b);
}

/**
 * 为简单难度生成四个唯一正整数选项。
 *
 * 候选优先级：
 * 1. 目标上下左右的真实乘积；
 * 2. 正确答案加减两个因数的常见偏差；
 * 3. 正确答案附近的正整数兜底。
 *
 * Set 同时负责去重和确保正确答案只出现一次。每一层候选先洗牌，最终四项
 * 再洗牌，避免正确答案或某类干扰项长期固定在同一位置。
 *
 * @param {MultiplicationQuestion} question
 * @param {() => number} [rng=Math.random]
 * @returns {number[]} 四个唯一正整数
 */
export function generateAnswerChoices(question, rng = Math.random) {
  assertQuestion(question);
  // 先放入正确答案，之后所有候选都必须与它不同。
  const selected = new Set([question.answer]);
  const addCandidates = (candidates) => {
    shuffleWithRng(candidates, rng).forEach((candidate) => {
      if (selected.size < 4 && Number.isInteger(candidate) && candidate > 0 && candidate !== question.answer) {
        selected.add(candidate);
      }
    });
  };

  // 第一优先级：矩阵空间中与目标格相邻的口诀结果。
  addCandidates(neighborProducts(question));
  // 第二优先级：把某个因数多算或少算一次的常见错误。
  addCandidates([
    question.answer - question.a,
    question.answer + question.a,
    question.answer - question.b,
    question.answer + question.b,
  ]);

  // 极端小答案或候选重复时，用逐步扩大的邻近整数补足到四项。
  for (let distance = 1; selected.size < 4; distance += 1) {
    addCandidates([question.answer - distance, question.answer + distance]);
  }

  return shuffleWithRng([...selected], rng);
}

/**
 * 不可变地记录首次作答结果。
 *
 * 对称格不会在这里自动写入；只有孩子真正回答过的有序坐标才成为永久历史格。
 * 展开运算符返回新对象，适合直接交给 React setState 或路由状态。
 *
 * @param {AnsweredCells} answeredCells 当前累计记录
 * @param {MultiplicationQuestion} question 当前题
 * @param {number} submittedValue 孩子首次提交的正整数
 * @returns {AnsweredCells} 包含新格子的全新对象
 */
export function recordAnsweredCell(answeredCells, question, submittedValue) {
  assertQuestion(question);
  if (!answeredCells || typeof answeredCells !== 'object' || Array.isArray(answeredCells)) {
    throw new TypeError('answeredCells 必须是普通对象');
  }
  if (!Number.isSafeInteger(submittedValue) || submittedValue <= 0) {
    throw new RangeError('提交答案必须是正整数');
  }
  const key = getCellKey(question.a, question.b);
  // 首次提交是唯一计分依据；重复调用代表状态机错误，因此显式拒绝。
  if (Object.prototype.hasOwnProperty.call(answeredCells, key)) {
    throw new Error(`${key} 已经作答，不能重复提交`);
  }
  return {
    ...answeredCells,
    [key]: {
      a: question.a,
      b: question.b,
      answer: question.answer,
      submittedValue,
      correct: submittedValue === question.answer,
      // order 从 1 开始，供后续开图动画或调试还原作答顺序。
      order: Object.keys(answeredCells).length + 1,
    },
  };
}

/**
 * 判断当前是否处于已经提交答案的反馈阶段。
 * startsWith 兼容 FEEDBACK_CORRECT 和 FEEDBACK_WRONG。
 *
 * @param {MultiplicationPhase} phase
 * @returns {boolean}
 */
function isFeedbackPhase(phase) {
  return typeof phase === 'string' && phase.startsWith('FEEDBACK');
}

/**
 * 判断一个尚未作答的普通格是否属于当前难度允许的临时提示范围。
 *
 * 简单：目标整行或整列；目标格会在更高优先级分支提前处理。
 * 中等：曼哈顿距离恰好为 1，即上下左右，不包含斜角。
 * 困难：不提供任何乘积提示。
 */
function isHintCell(row, column, question, difficulty) {
  if (difficulty === DIFFICULTIES.EASY) {
    return row === question.a || column === question.b;
  }
  if (difficulty === DIFFICULTIES.MEDIUM) {
    return Math.abs(row - question.a) + Math.abs(column - question.b) === 1;
  }
  return false;
}

/**
 * 生成 81 个乘积格的安全视图模型。只有可见格拥有 value。
 *
 * 固定优先级：
 * 当前目标 → 已作答历史格 → 临时交换律对称格 → 难度提示 → 隐藏格。
 *
 * 组件层不得自行计算 row * column，而应只渲染本函数返回的 value。
 * 这样 READY 目标格和隐藏格不仅视觉上为空，DOM 属性和无障碍名称中也不会
 * 提前出现答案。
 *
 * @param {{
 *   question: MultiplicationQuestion,
 *   difficulty: MultiplicationDifficulty,
 *   phase?: MultiplicationPhase,
 *   answeredCells?: AnsweredCells
 * }} input
 * @returns {Array<{
 *   key: string,
 *   row: number,
 *   column: number,
 *   kind: string,
 *   value?: number,
 *   ariaLabel: string
 * }>}
 */
export function buildMatrixCells({
  question,
  difficulty,
  phase = 'READY',
  answeredCells = {},
}) {
  assertQuestion(question);
  assertDifficulty(difficulty);
  if (!answeredCells || typeof answeredCells !== 'object' || Array.isArray(answeredCells)) {
    throw new TypeError('answeredCells 必须是普通对象');
  }

  const feedback = isFeedbackPhase(phase);
  const targetKey = getCellKey(question.a, question.b);
  // 当前题提交后应已经存在于 answeredCells，用它决定正确或错误视觉。
  const targetEntry = answeredCells[targetKey];
  const symmetricKey = getCellKey(question.b, question.a);

  return Array.from({ length: 81 }, (_, id) => {
    const row = Math.floor(id / 9) + 1;
    const column = (id % 9) + 1;
    const key = getCellKey(row, column);
    const base = { key, row, column };

    // 优先级 1：当前目标。READY 时刻意不返回 value，避免答案泄露。
    if (key === targetKey) {
      if (feedback && targetEntry) {
        return {
          ...base,
          kind: targetEntry.correct ? 'target-correct' : 'target-wrong',
          value: question.answer,
          ariaLabel: `${row}乘${column}当前题，正确答案${question.answer}，${targetEntry.correct ? '回答正确' : '回答错误'}`,
        };
      }
      return { ...base, kind: 'target', ariaLabel: `${row}乘${column}目标格，答案待填写` };
    }

    // 优先级 2：历史格永久保留，并压过当前题经过此处的提示或对称反馈。
    const history = answeredCells[key];
    if (history) {
      return {
        ...base,
        kind: history.correct ? 'history-correct' : 'history-wrong',
        value: history.answer,
        ariaLabel: `${row}乘${column}已完成，答案${history.answer}，${history.correct ? '回答正确' : '回答错误'}`,
      };
    }

    // 优先级 3：只在反馈阶段短暂揭示尚未作答的交换律对称格。
    if (feedback && question.a !== question.b && key === symmetricKey) {
      return {
        ...base,
        kind: 'symmetric',
        value: question.answer,
        ariaLabel: `交换律提示，${row}乘${column}也等于${question.answer}`,
      };
    }

    // 优先级 4：仅公开当前难度允许的临时乘积。
    if (isHintCell(row, column, question, difficulty)) {
      const value = row * column;
      return { ...base, kind: 'hint', value, ariaLabel: `${row}乘${column}等于${value}` };
    }

    // 优先级 5：隐藏格完全不携带 value，ariaLabel 也不描述乘积。
    return { ...base, kind: 'hidden', ariaLabel: '隐藏乘积格' };
  });
}

/**
 * 计算单局分数、平均用时和星级。
 *
 * 准确率优先：
 * - 3 星：分数 ≥ 90 且平均用时不超过当前难度目标；
 * - 2 星：未达到三星，但分数 ≥ 80；
 * - 1 星：其余已完成对局。
 *
 * timeSpent = 0 是合法边界，表示没有累计到可作答秒数；NaN、Infinity 和
 * 负数会被拒绝。函数不负责保存结果。
 *
 * @param {{
 *   difficulty: MultiplicationDifficulty,
 *   total: number,
 *   correct: number,
 *   timeSpent: number
 * }} input
 * @returns {{ score: number, averageSeconds: number, stars: 1 | 2 | 3 }}
 */
export function calculateMultiplicationResult({ difficulty, total, correct, timeSpent }) {
  assertDifficulty(difficulty);
  assertQuestionCount(total);
  if (!Number.isInteger(correct) || correct < 0 || correct > total) {
    throw new RangeError('正确题数必须是 0 到总题数之间的整数');
  }
  if (!Number.isFinite(timeSpent) || timeSpent < 0) {
    throw new RangeError('作答用时必须是非负有限数值');
  }
  // 产品分数采用百分制四舍五入，平均用时保留原始精度供展示层格式化。
  const score = Math.round((correct / total) * 100);
  const averageSeconds = timeSpent / total;
  const stars = score >= 90 && averageSeconds <= SPEED_TARGETS[difficulty]
    ? 3
    : score >= 80
      ? 2
      : 1;
  return { score, averageSeconds, stars };
}
