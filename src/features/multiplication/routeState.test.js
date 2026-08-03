import {
  createDefaultMultiplicationSettings,
  isValidMultiplicationResultState,
  isValidMultiplicationSessionState,
  isValidMultiplicationSettings,
} from './routeState';
import {
  calculateMultiplicationResult,
  DIFFICULTIES,
  QUESTION_COUNTS,
  questionFromCoordinateId,
  recordAnsweredCell,
} from './model';

function createQuestions(count) {
  return Array.from({ length: count }, (_, id) => questionFromCoordinateId(id));
}

function createAnsweredCells(questions) {
  return questions.reduce(
    (answered, question) => recordAnsweredCell(answered, question, question.answer),
    {},
  );
}

function createResultState(settings) {
  const questions = createQuestions(settings.questionCount);
  const answeredCells = createAnsweredCells(questions);
  const timeSpent = settings.questionCount * 5;
  const result = calculateMultiplicationResult({
    difficulty: settings.difficulty,
    total: settings.questionCount,
    correct: settings.questionCount,
    timeSpent,
  });
  return { settings, answeredCells, timeSpent, result };
}

describe('multiplication route state', () => {
  it.each(Object.values(DIFFICULTIES).flatMap((difficulty) => (
    QUESTION_COUNTS.map((questionCount) => [difficulty, questionCount])
  )))('接受 %s 难度 %i 题的完整会话与结算', (difficulty, questionCount) => {
    const settings = { difficulty, questionCount };
    const questions = createQuestions(questionCount);
    expect(isValidMultiplicationSettings(settings)).toBe(true);
    expect(isValidMultiplicationSessionState({ settings, questions })).toBe(true);
    expect(isValidMultiplicationResultState(createResultState(settings))).toBe(true);
  });

  it('保留简单10题默认设置', () => {
    expect(createDefaultMultiplicationSettings()).toEqual({ difficulty: 'easy', questionCount: 10 });
  });

  it('拒绝非法设置、数量不符和重复坐标', () => {
    const settings = createDefaultMultiplicationSettings();
    const questions = createQuestions(10);
    expect(isValidMultiplicationSettings({ difficulty: 'unknown', questionCount: 10 })).toBe(false);
    expect(isValidMultiplicationSettings({ difficulty: 'easy', questionCount: 11 })).toBe(false);
    expect(isValidMultiplicationSessionState(null)).toBe(false);
    expect(isValidMultiplicationSessionState({ settings, questions: questions.slice(0, 9) })).toBe(false);
    expect(isValidMultiplicationSessionState({ settings, questions: [...questions.slice(0, 9), questions[0]] })).toBe(false);
  });

  it('拒绝不完整或被篡改的结算状态', () => {
    const valid = createResultState(createDefaultMultiplicationSettings());
    expect(isValidMultiplicationResultState({ ...valid, answeredCells: {} })).toBe(false);
    expect(isValidMultiplicationResultState({
      ...valid,
      answeredCells: {
        ...valid.answeredCells,
        '1×1': { ...valid.answeredCells['1×1'], correct: false },
      },
    })).toBe(false);
    expect(isValidMultiplicationResultState({
      ...valid,
      result: { ...valid.result, stars: 1 },
    })).toBe(false);
    expect(isValidMultiplicationResultState({
      ...valid,
      answeredCells: {
        ...valid.answeredCells,
        '1×1': {
          ...valid.answeredCells['1×1'],
          submittedValue: Number.MAX_SAFE_INTEGER + 1,
          correct: false,
        },
      },
    })).toBe(false);
  });
});
