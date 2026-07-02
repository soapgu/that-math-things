import computerNumber from './computerNumber';

describe('computerNumber', () => {
  it('has correct metadata', () => {
    expect(computerNumber.id).toBe('computer-number');
    expect(computerNumber.title).toBe('电脑编号');
    expect(computerNumber.tags).toEqual(['端点问题', '数轴认知']);
  });

  it('generates valid params', () => {
    for (let i = 0; i < 50; i++) {
      const { params } = computerNumber.createProblem();
      expect(params.x).toBeGreaterThanOrEqual(1);
      expect(params.x).toBeLessThanOrEqual(80);
      expect(params.y).toBeGreaterThanOrEqual(params.x + 1);
      expect(params.y).toBeLessThanOrEqual(100);
    }
  });

  it('calculates answer as y - x + 1', () => {
    const { params, finalAnswer, steps } = computerNumber.createProblem();
    expect(finalAnswer).toBe(params.y - params.x + 1);
    expect(steps).toHaveLength(2);
  });

  it('has step answers that lead to final answer', () => {
    const { steps, finalAnswer } = computerNumber.createProblem();
    const step2Result = steps[0].answer - steps[1].answer;
    expect(step2Result).toBe(finalAnswer);
  });

  it('generates different params on repeated calls', () => {
    const results = new Set();
    for (let i = 0; i < 20; i++) {
      const { params } = computerNumber.createProblem();
      results.add(`${params.x}-${params.y}`);
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it('renders question text with params', () => {
    const { question, params } = computerNumber.createProblem();
    expect(question).toContain(String(params.x));
    expect(question).toContain(String(params.y));
  });
});
