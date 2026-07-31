import {
  calculateMultiplicationResult,
  DEFAULT_MULTIPLICATION_SETTINGS,
  DIFFICULTIES,
  getCellKey,
} from './model';

export function isEasyTenSettings(settings) {
  return settings?.difficulty === DIFFICULTIES.EASY && settings?.questionCount === 10;
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
  if (!isEasyTenSettings(state?.settings) || !Array.isArray(state?.questions) || state.questions.length !== 10) {
    return false;
  }
  const keys = state.questions.map((question) => (
    isValidQuestion(question) ? getCellKey(question.a, question.b) : null
  ));
  return keys.every(Boolean) && new Set(keys).size === 10;
}

export function isValidMultiplicationResultState(state) {
  if (!isEasyTenSettings(state?.settings)
    || !state?.result
    || !state?.answeredCells
    || Array.isArray(state.answeredCells)
    || Object.keys(state.answeredCells).length !== 10
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
    && Number.isInteger(entry.submittedValue)
    && entry.submittedValue > 0
    && entry.correct === (entry.submittedValue === entry.answer)
    && Number.isInteger(entry.order)
    && entry.order >= 1
    && entry.order <= 10
  ));
  if (!entriesAreValid) return false;
  const orders = Object.values(state.answeredCells).map(({ order }) => order);
  if (new Set(orders).size !== 10) return false;
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
