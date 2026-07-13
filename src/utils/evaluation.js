// 每题预期用时(秒)：难度 1★ → 3s, 5★ → 15s
const SPEED_BENCHMARKS = { 1: 3, 2: 5, 3: 8, 4: 12, 5: 15 };

// 速度比 ≥ 1.3 → 5★（很快），< 0.5 → 1★（很慢）
const SPEED_RATIO_THRESHOLDS = [
  { min: 1.3, stars: 5 },
  { min: 1.1, stars: 4 },
  { min: 0.8, stars: 3 },
  { min: 0.5, stars: 2 },
  { min: 0, stars: 1 },
];

// 运算范围与基准分映射：≤10→2, ≤20→3, ≤50→5, ≤100→8
const RANGE_SCORE = { 10: 2, 20: 3, 50: 5, 100: 8 };

// 进位退位权重：无进位退位 0.4，进位 0.7，退位 0.9
const SCALE = 1.2;
const CB_WEIGHT = { none: 0.4, carry: 0.7, borrow: 0.9 };

// 总评星级 → SSR/SR/R/N
const GRADE_MAP = { 5: 'SSR', 4: 'SR', 3: 'R' };

// 准确率封顶：准确指数低时总分上限也低
const ACCURACY_CAP = { 5: 5, 4: 4.5, 3: 3.5, 2: 2.5, 1: 1.5 };

/**
 * 将 settings.range 映射到 RANGE_SCORE 的 key。
 * @param {number} range - 正数，表示运算范围上限
 * @returns {number} RANGE_SCORE 的 key：10 / 20 / 50 / 100
 */
function rangeToKey(range) {
  if (range <= 10) return 10;
  if (range <= 20) return 20;
  if (range <= 50) return 50;
  return 100;
}

/**
 * 将 hasCarry/hasBorrow 映射到 CB_WEIGHT 的 key。
 * @param {boolean} hasCarry - 是否有进位（仅加法）
 * @param {boolean} hasBorrow - 是否有退位（仅减法）
 * @returns {'none' | 'carry' | 'borrow'}
 */
function cbKey(hasCarry, hasBorrow) {
  if (hasBorrow) return 'borrow';
  if (hasCarry) return 'carry';
  return 'none';
}

/**
 * 计算单题难度指数（1-5★）。
 * 公式：difficulty = round(cbWeight × rangeScore × 1.2)，封顶 5
 *
 * @param {{ range: number, hasCarry: boolean, hasBorrow: boolean }} params
 * @returns {number} 1-5 的整数
 *
 * @example
 * calcQuestionDifficulty({ range: 20, hasCarry: true, hasBorrow: false }) // → 3
 * calcQuestionDifficulty({ range: 100, hasBorrow: true })                // → 5
 */
export function calcQuestionDifficulty({ range, hasCarry, hasBorrow }) {
  const rs = RANGE_SCORE[rangeToKey(range)];
  const w = CB_WEIGHT[cbKey(hasCarry, hasBorrow)];
  return Math.min(Math.round(w * rs * SCALE), 5);
}

/**
 * 计算一次练习的平均难度指数。
 * 所有题目的 calcQuestionDifficulty 求平均后四舍五入。
 *
 * @param {Array} questions - 题目的数组
 * @param {number} range - 该次练习设置的运算范围
 * @returns {number} 1-5 的整数
 */
export function calcSessionDifficulty(questions, range) {
  if (!questions || questions.length === 0) return 1;
  const sum = questions.reduce(
    (s, q) => s + calcQuestionDifficulty({ range, hasCarry: q.hasCarry, hasBorrow: q.hasBorrow }),
    0
  );
  return Math.round(sum / questions.length);
}

/**
 * 得分 → 准确指数（1-5★）。
 *
 * | 得分 | 星级 |
 * |---|---|
 * | 100 | 5 |
 * | ≥90 | 4 |
 * | ≥80 | 3 |
 * | ≥60 | 2 |
 * | <60 | 1 |
 *
 * @param {number} score - 0-100 的分数
 * @returns {number} 1-5 的整数
 */
export function calcAccuracyStars(score) {
  if (score === 100) return 5;
  if (score >= 90) return 4;
  if (score >= 80) return 3;
  if (score >= 60) return 2;
  return 1;
}

/**
 * 速度比（预期用时 / 实际用时）→ 速度指数（1-5★）。
 *
 * 每题预期用时取决于该题的难度指数。
 *
 * @param {Array} questions - 题目的数组
 * @param {number} range - 该次练习设置的运算范围
 * @param {number} timeSpent - 实际用时（秒）
 * @returns {number} 1-5 的整数
 */
export function calcSpeedStars(questions, range, timeSpent) {
  if (!questions || questions.length === 0 || !timeSpent) return 1;
  const expected = questions.reduce((sum, q) => {
    const diff = calcQuestionDifficulty({ range, hasCarry: q.hasCarry, hasBorrow: q.hasBorrow });
    return sum + SPEED_BENCHMARKS[diff];
  }, 0);
  const ratio = expected / timeSpent;
  for (const t of SPEED_RATIO_THRESHOLDS) {
    if (ratio >= t.min) return t.stars;
  }
  return 1;
}

/**
 * 综合三指数生成总评。
 *
 * 加权公式：
 *   totalStars = round(准确×0.50 + 难度×0.25 + 速度×0.25)
 *   但受准确率封顶（ACCURACY_CAP）限制
 *
 * @param {number} difficulty - 1-5 的难度指数
 * @param {number} accuracy - 1-5 的准确指数
 * @param {number} speed - 1-5 的速度指数
 * @returns {{ totalStars: number, grade: string, comment: string }}
 *
 * @example
 * calcCompositeEvaluation(5, 5, 5) // → { totalStars: 5, grade: 'UR', comment: '…' }
 * calcCompositeEvaluation(3, 5, 4) // → { totalStars: 5, grade: 'SSR', comment: '…' }
 */
export function calcCompositeEvaluation(difficulty, accuracy, speed) {
  const weighted = accuracy * 0.50 + difficulty * 0.25 + speed * 0.25;
  const cap = ACCURACY_CAP[accuracy] || 5;
  const totalStars = Math.round(Math.min(weighted, cap));

  // UR：三项全满
  const isUR = totalStars === 5 && difficulty === 5 && accuracy === 5 && speed === 5;
  const grade = isUR ? 'UR' : (GRADE_MAP[totalStars] || 'N');

  const dims = [
    { name: '难度', stars: difficulty },
    { name: '准确', stars: accuracy },
    { name: '速度', stars: speed },
  ];
  const sorted = [...dims].sort((a, b) => a.stars - b.stars);
  const weakest = sorted[0];

  let comment = '';
  if (grade === 'UR') {
    comment = '无可挑剔的完美表现！';
  } else if (grade === 'SSR') {
    comment = '表现优秀，';
    if (weakest.stars < 4) {
      comment += `${weakest.name}方面还有提升空间。`;
    } else {
      comment += '继续保持，向 UR 冲刺！';
    }
  } else if (grade === 'SR') {
    comment = '表现良好，';
    if (weakest.stars < 4) {
      comment += `${weakest.name}方面还有提升空间。`;
    } else {
      comment += '继续保持，向 SSR 冲刺！';
    }
  } else if (grade === 'R') {
    comment = '表现一般，';
    if (weakest.name === '速度') {
      comment += '速度偏慢，建议多做基础练习提高反应速度。';
    } else if (weakest.name === '准确') {
      comment += '准确率有提升空间，建议做题时更仔细。';
    } else {
      comment += '可以挑战更大的运算范围。';
    }
  } else {
    comment = '需要多加练习，';
    if (weakest.name === '速度') {
      comment += '先保证准确率，再逐步提高速度。';
    } else if (weakest.name === '准确') {
      comment += '建议放慢速度，确保每一步计算准确。';
    } else {
      comment += '可以从更简单的题目开始夯实基础。';
    }
  }

  return { totalStars, grade, comment };
}

/**
 * 对一条完整的练习记录进行全部维度的评价。
 *
 * @param {Object} record - storage.js 中 buildRecord 返回的记录
 * @param {Array} record.questions - 题目数组
 * @param {{ range: number }} record.settings - 设置
 * @param {number} record.score - 0-100 分
 * @param {number} record.timeSpent - 用时（秒）
 * @returns {{ difficulty: number, accuracy: number, speed: number, composite: Object }}
 *
 * @example
 * calcSessionEvaluation({ questions, settings: { range: 20 }, score: 90, timeSpent: 60 })
 */
export function calcSessionEvaluation(record) {
  const { questions, settings, score, timeSpent } = record;
  const range = settings.range;
  const difficulty = calcSessionDifficulty(questions, range);
  const accuracy = calcAccuracyStars(score);
  const speed = calcSpeedStars(questions, range, timeSpent);
  const composite = calcCompositeEvaluation(difficulty, accuracy, speed);
  return { difficulty, accuracy, speed, composite };
}

/**
 * 计算所有历史记录的平均评价。
 * 只统计含有 evaluation 字段的记录（兼容旧数据）。
 *
 * @param {Array} records - getPracticeRecords() 返回的完整记录数组
 * @returns {null | { difficulty: number, accuracy: number, speed: number }}
 *   没有任何有效记录时返回 null
 *
 * @example
 * calcHistoricalEvaluation(getPracticeRecords())
 */
export function calcHistoricalEvaluation(records) {
  const valid = records.filter((r) => r.evaluation);
  if (valid.length === 0) return null;
  const len = valid.length;
  let d = 0, a = 0, s = 0;
  for (const r of valid) {
    d += r.evaluation.difficulty;
    a += r.evaluation.accuracy;
    s += r.evaluation.speed;
  }
  return {
    difficulty: Math.round(d / len),
    accuracy: Math.round(a / len),
    speed: Math.round(s / len),
  };
}
