import {
  createDefaultMultiplicationSettings,
  isValidMultiplicationResultState,
  isValidMultiplicationSessionState,
} from './routeState';
import {
  calculateMultiplicationResult,
  questionFromCoordinateId,
  recordAnsweredCell,
} from './model';

function createQuestions() {
  return Array.from({ length: 10 }, (_, id) => questionFromCoordinateId(id));
}

function createAnsweredCells(questions) {
  return questions.reduce(
    (answered, question) => recordAnsweredCell(answered, question, question.answer),
    {},
  );
}

describe('multiplication route state', () => {
  it('只接受简单10题且坐标唯一的会话', () => {
    const settings = createDefaultMultiplicationSettings();
    const questions = createQuestions();
    expect(isValidMultiplicationSessionState({ settings, questions })).toBe(true);
    expect(isValidMultiplicationSessionState(null)).toBe(false);
    expect(isValidMultiplicationSessionState({ settings, questions: questions.slice(0, 9) })).toBe(false);
    expect(isValidMultiplicationSessionState({ settings, questions: [...questions.slice(0, 9), questions[0]] })).toBe(false);
  });

  it('拒绝不完整或被篡改的结算状态', () => {
    const settings = createDefaultMultiplicationSettings();
    const questions = createQuestions();
    const answeredCells = createAnsweredCells(questions);
    const result = calculateMultiplicationResult({
      difficulty: settings.difficulty,
      total: 10,
      correct: 10,
      timeSpent: 20,
    });
    const valid = { settings, answeredCells, timeSpent: 20, result };
    expect(isValidMultiplicationResultState(valid)).toBe(true);
    expect(isValidMultiplicationResultState({ ...valid, answeredCells: {} })).toBe(false);
    expect(isValidMultiplicationResultState({
      ...valid,
      answeredCells: {
        ...answeredCells,
        '1×1': { ...answeredCells['1×1'], correct: false },
      },
    })).toBe(false);
  });
});
