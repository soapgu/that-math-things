import {
  calculateMultiplicationResult,
  DEFAULT_MULTIPLICATION_SETTINGS,
  DIFFICULTIES,
  getCellKey,
  QUESTION_COUNTS,
} from './model';

export function isValidMultiplicationSettings(settings) {
  return Object.values(DIFFICULTIES).includes(settings?.difficulty)
    && QUESTION_COUNTS.includes(settings?.questionCount);
}

export function isValidQuestion(question) {
  return Number.isInteger(question?.a)
    && Number.isInteger(question?.b)
    && question.a >= 1
    && question.a <= 9
    && question.b >= 1
    && question.b <= 9
    && question.op === '*'
    && question.answer === question.a * question.b;
}

export function isValidMultiplicationSessionState(state) {
  if (!isValidMultiplicationSettings(state?.settings)
    || !Array.isArray(state?.questions)
    || state.questions.length !== state.settings.questionCount) {
    return false;
  }
  const keys = state.questions.map((question) => (
    isValidQuestion(question) ? getCellKey(question.a, question.b) : null
  ));
  return keys.every(Boolean) && new Set(keys).size === state.settings.questionCount;
}

export function isValidMultiplicationResultState(state) {
  if (!isValidMultiplicationSettings(state?.settings)
    || !state?.result
    || !state?.answeredCells
    || Array.isArray(state.answeredCells)
    || Object.keys(state.answeredCells).length !== state.settings.questionCount
    || !Number.isFinite(state.timeSpent)
    || state.timeSpent < 0) {
    return false;
  }
  const entriesAreValid = Object.entries(state.answeredCells).every(([key, entry]) => (
    Number.isInteger(entry?.a)
    && Number.isInteger(entry?.b)
    && entry.a >= 1
    && entry.a <= 9
    && entry.b >= 1
    && entry.b <= 9
    && entry.answer === entry.a * entry.b
    && key === getCellKey(entry.a, entry.b)
    && Number.isSafeInteger(entry.submittedValue)
    && entry.submittedValue > 0
    && entry.correct === (entry.submittedValue === entry.answer)
    && Number.isInteger(entry.order)
    && entry.order >= 1
    && entry.order <= state.settings.questionCount
  ));
  if (!entriesAreValid) return false;
  const orders = Object.values(state.answeredCells).map(({ order }) => order);
  if (new Set(orders).size !== state.settings.questionCount) return false;
  const { score, averageSeconds, stars } = state.result;
  const resultShapeIsValid = Number.isInteger(score)
    && score >= 0
    && score <= 100
    && Number.isFinite(averageSeconds)
    && averageSeconds >= 0
    && [1, 2, 3].includes(stars);
  if (!resultShapeIsValid) return false;
  const correct = Object.values(state.answeredCells).filter((entry) => entry.correct).length;
  const expected = calculateMultiplicationResult({
    difficulty: state.settings.difficulty,
    total: state.settings.questionCount,
    correct,
    timeSpent: state.timeSpent,
  });
  return expected.score === score
    && expected.averageSeconds === averageSeconds
    && expected.stars === stars;
}

export function createDefaultMultiplicationSettings() {
  return { ...DEFAULT_MULTIPLICATION_SETTINGS };
}
