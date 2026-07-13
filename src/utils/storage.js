import { markQuestion } from './marking';
import { calcSessionEvaluation } from './evaluation';

const STORAGE_KEY = 'practice-records';

const PRUNE_COUNT = 100;

function isQuotaError(e) {
  return e.name === 'QuotaExceededError' || e.code === 22;
}

/**
 * 将一次练习会话的数据加工为持久化记录，每道题调用 markQuestion 批改，
 * 然后调用 calcSessionEvaluation 生成综合评价。
 * @param {{ questions: Array, userAnswers: Array, timeSpent: number, settings: Object }} sessionData
 * @returns {{ id: number, date: string, score: number, total: number, correct: number, wrongCount: number, timeSpent: number, settings: Object, questions: Array, userAnswers: Array, results: Array<{isCorrect:boolean, errors:string[], detail:string|null}>, evaluation: Object }}
 */
function buildRecord({ questions, userAnswers, timeSpent, settings }) {
  const results = questions.map((q, i) => markQuestion(q, userAnswers[i]));
  const total = results.length;
  const correct = results.filter(r => r.isCorrect).length;
  const score = Math.round((correct / total) * 100);
  const wrongCount = total - correct;
  const evaluation = calcSessionEvaluation({ questions, settings, score, timeSpent });

  return {
    id: Date.now(),
    date: new Date().toISOString(),
    score,
    total,
    correct,
    wrongCount,
    timeSpent,
    settings: { ...settings },
    questions,
    userAnswers,
    results,
    evaluation,
  };
}

/**
 * 保存一次练习记录到 localStorage。
 * 存储空间不足时自动清理最旧的 100 条记录并重试。
 * @param {{ questions: Array, userAnswers: Array, timeSpent: number, settings: Object }} sessionData
 * @returns {Object} 新生成的记录对象，若触发清理则附带 _pruned 字段
 */
export function savePracticeRecord(sessionData) {
  const record = buildRecord(sessionData);
  const records = getPracticeRecords();
  records.unshift(record);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return record;
  } catch (e) {
    if (!isQuotaError(e)) throw e;
    const pruned = records.splice(-PRUNE_COUNT).length;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return { ...record, _pruned: pruned };
  }
}

/**
 * 读取所有练习记录（按时间倒序）
 * @returns {Array}
 */
export function getPracticeRecords() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * 计算累计统计数据
 * @returns {{ totalPractices: number, totalQuestions: number, avgScore: number, bestScore: number, errorDistribution: Array<{type:string, count:number, ratio:number}> }}
 */
export function getStats() {
  const records = getPracticeRecords();
  if (records.length === 0) {
    return { totalPractices: 0, totalQuestions: 0, avgScore: 0, bestScore: 0, errorDistribution: [] };
  }

  const totalPractices = records.length;
  const totalQuestions = records.reduce((s, r) => s + r.total, 0);
  const avgScore = Math.round(records.reduce((s, r) => s + r.score, 0) / totalPractices);
  const bestScore = Math.max(...records.map(r => r.score));

  // 累加所有错题的 errors[]，一道题可进多个分类
  const errorAcc = {};
  records.forEach(r => {
    (r.results || []).forEach(result => {
      if (!result.isCorrect) {
        result.errors.forEach(e => {
          errorAcc[e] = (errorAcc[e] || 0) + 1;
        });
      }
    });
  });

  const totalErrors = Object.values(errorAcc).reduce((s, v) => s + v, 0);
  const errorDistribution = Object.entries(errorAcc).map(([type, count]) => ({
    type,
    count,
    ratio: totalErrors > 0 ? Math.round((count / totalErrors) * 100) : 0,
  }));

  return { totalPractices, totalQuestions, avgScore, bestScore, errorDistribution };
}

/**
 * 清空所有练习记录
 */
export function clearRecords() {
  localStorage.removeItem(STORAGE_KEY);
}
