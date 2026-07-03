import appleEaten from './appleEaten';

describe('appleEaten', () => {
  it('has correct metadata', () => {
    expect(appleEaten.id).toBe('apple-eaten');
    expect(appleEaten.title).toBe('吃苹果');
    expect(appleEaten.tags).toEqual(['逆向思维', '最多最少']);
  });

  it('generates valid params', () => {
    for (let i = 0; i < 50; i++) {
      const { params } = appleEaten.createProblem();
      expect(params.total).toBeGreaterThanOrEqual(10);
      expect(params.total).toBeLessThanOrEqual(20);
      expect(params.threshold).toBeGreaterThanOrEqual(3);
      expect(params.threshold).toBeLessThanOrEqual(8);
    }
  });

  it('calculates answer as total - (threshold - 1)', () => {
    for (let i = 0; i < 50; i++) {
      const { params, answers } = appleEaten.createProblem();
      expect(answers).toHaveLength(1);
      const expected = params.total - (params.threshold - 1);
      expect(answers[0].answer).toBe(expected);
    }
  });

  it('has 2 steps', () => {
    const { steps } = appleEaten.createProblem();
    expect(steps).toHaveLength(2);
  });

  it('step 1 answer equals threshold - 1', () => {
    const { steps, params } = appleEaten.createProblem();
    expect(steps[0].answer).toBe(params.threshold - 1);
  });

  it('step 2 answer equals answers[0].answer', () => {
    const { steps, answers } = appleEaten.createProblem();
    expect(steps[1].answer).toBe(answers[0].answer);
  });

  it('generates different params', () => {
    const totals = new Set();
    for (let i = 0; i < 20; i++) {
      const { params } = appleEaten.createProblem();
      totals.add(params.total);
    }
    expect(totals.size).toBeGreaterThan(1);
  });
});
