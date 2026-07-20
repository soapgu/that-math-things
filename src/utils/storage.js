import { markQuestion } from './marking';
import { calcSessionEvaluation } from './evaluation';

const STORAGE_KEY = 'practice-records';
const SCHEMA_VERSION = 2;
const PRUNE_COUNT = 100;
const ASSIST_KINDS = new Set(['carry', 'borrow']);
const ASSIST_METHODS = new Set(['placeValueCarry', 'placeValueBorrow']);
const BORROW_STRATEGIES = new Set(['breakTen', 'bridgeTen']);

function isQuotaError(e) {
  return e.name === 'QuotaExceededError' || e.code === 22;
}

/**
 * 规范一题的辅助使用数据。used 是 level 的派生便利字段，不信任外部传入值；
 * 缺失记录返回 null，避免把旧数据误判为“符合条件且独立完成”。
 */
function normalizeAssistUsage(usage) {
  if (!usage || typeof usage !== 'object' || Array.isArray(usage)) return null;

  // eligible 本身缺失或类型错误，说明这不是一条可信的采集记录。
  if (typeof usage.eligible !== 'boolean') return null;
  const eligible = usage.eligible === true;
  if (!eligible) {
    return {
      eligible: false,
      kind: null,
      used: false,
      level: 0,
      method: null,
      strategy: null,
    };
  }

  if (!ASSIST_KINDS.has(usage.kind) || ![0, 1, 2].includes(usage.level)) return null;
  const kind = usage.kind;
  const level = usage.level;
  const expectedMethod = kind === 'carry' ? 'placeValueCarry'
    : kind === 'borrow' ? 'placeValueBorrow'
      : null;
  // 第二层的方法是统计含义的一部分，缺失或与题型冲突时整条记录视为未知，
  // 防止损坏数据被结算页误算成“查看方法”。
  if (level === 2 && (!ASSIST_METHODS.has(usage.method) || usage.method !== expectedMethod)) {
    return null;
  }
  if (level === 2 && kind === 'borrow' && !BORROW_STRATEGIES.has(usage.strategy)) return null;

  const method = level === 2 ? usage.method : null;
  const strategy = method === 'placeValueBorrow' ? usage.strategy : null;

  return {
    eligible: true,
    kind,
    used: level > 0,
    level,
    method,
    strategy,
  };
}

function normalizeItem(item, index) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  return {
    index,
    question: item.question,
    userAnswer: item.userAnswer,
    result: item.result,
    assistUsage: normalizeAssistUsage(item.assistUsage),
  };
}

/**
 * 将任意版本的单场记录转换为当前 schema v2。
 * v1 的 questions/userAnswers/results 并列数组仅在这里处理，页面始终消费 items[]。
 */
export function normalizePracticeRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null;

  let items;
  if (Array.isArray(record.items)) {
    items = record.items
      .map((item, index) => normalizeItem(item, index))
      .filter(Boolean);
  } else if (Array.isArray(record.questions)) {
    const answers = Array.isArray(record.userAnswers) ? record.userAnswers : [];
    const results = Array.isArray(record.results) ? record.results : [];
    items = record.questions.map((question, index) => ({
      index,
      question,
      userAnswer: answers[index],
      result: results[index],
      // 旧版从未采集辅助使用情况，不能用 level: 0 冒充独立完成。
      assistUsage: null,
    }));
  } else {
    items = [];
  }

  const {
    questions: _questions,
    userAnswers: _userAnswers,
    results: _results,
    ...rest
  } = record;

  return {
    ...rest,
    schemaVersion: SCHEMA_VERSION,
    items,
  };
}

/**
 * 将会话数据加工为 schema v2 持久化记录。批改结果、答案和辅助使用状态在同一个
 * item 中聚合，后续不再依靠多个数组的相同下标建立关联。
 */
function buildRecord({ questions, userAnswers, assistUsage = [], timeSpent, settings }) {
  const items = questions.map((question, index) => ({
    index,
    question,
    userAnswer: userAnswers[index],
    result: markQuestion(question, userAnswers[index]),
    assistUsage: normalizeAssistUsage(assistUsage[index]),
  }));
  const total = items.length;
  const correct = items.filter(({ result }) => result.isCorrect).length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const wrongCount = total - correct;
  const evaluation = calcSessionEvaluation({ questions, settings, score, timeSpent });

  return {
    schemaVersion: SCHEMA_VERSION,
    id: Date.now(),
    date: new Date().toISOString(),
    score,
    total,
    correct,
    wrongCount,
    timeSpent,
    settings: { ...settings },
    items,
    evaluation,
  };
}

/** 保存一次练习记录；空间不足时自动清理最旧的 100 条记录并重试。 */
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

/** 读取所有记录，并在同一边界转换为 schema v2（按时间倒序）。 */
export function getPracticeRecords() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const parsed = data ? JSON.parse(data) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizePracticeRecord).filter(Boolean);
  } catch {
    return [];
  }
}

/** 计算累计统计数据。 */
export function getStats() {
  const records = getPracticeRecords();
  if (records.length === 0) {
    return { totalPractices: 0, totalQuestions: 0, avgScore: 0, bestScore: 0, errorDistribution: [] };
  }

  const totalPractices = records.length;
  const totalQuestions = records.reduce((sum, record) => sum + record.total, 0);
  const avgScore = Math.round(records.reduce((sum, record) => sum + record.score, 0) / totalPractices);
  const bestScore = Math.max(...records.map(record => record.score));
  const errorAcc = {};

  records.forEach((record) => {
    record.items.forEach(({ result }) => {
      if (result && !result.isCorrect) {
        (result.errors || []).forEach((error) => {
          errorAcc[error] = (errorAcc[error] || 0) + 1;
        });
      }
    });
  });

  const totalErrors = Object.values(errorAcc).reduce((sum, count) => sum + count, 0);
  const errorDistribution = Object.entries(errorAcc).map(([type, count]) => ({
    type,
    count,
    ratio: totalErrors > 0 ? Math.round((count / totalErrors) * 100) : 0,
  }));

  return { totalPractices, totalQuestions, avgScore, bestScore, errorDistribution };
}

export function clearRecords() {
  localStorage.removeItem(STORAGE_KEY);
}
