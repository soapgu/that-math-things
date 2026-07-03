import basketChange from './basketChange';

describe('basketChange', () => {
  it('has correct metadata', () => {
    expect(basketChange.id).toBe('basket-change');
    expect(basketChange.title).toBe('增减问题');
    expect(basketChange.tags).toEqual(['逆向思维', '增减变化']);
  });

  it('generates valid params', () => {
    for (let i = 0; i < 50; i++) {
      const { params } = basketChange.createProblem();
      expect(params.takeAway).toBeGreaterThanOrEqual(1);
      expect(params.takeAway).toBeLessThanOrEqual(10);
      expect(params.putIn).toBeGreaterThanOrEqual(1);
      expect(params.putIn).toBeLessThanOrEqual(15);
    }
  });

  it('returns 2 answers', () => {
    const { answers } = basketChange.createProblem();
    expect(answers).toHaveLength(2);
    expect(answers[0]).toHaveProperty('answer');
    expect(answers[1]).toHaveProperty('answer');
  });

  it('calculates correct net change', () => {
    for (let i = 0; i < 50; i++) {
      const { params, answers } = basketChange.createProblem();
      const net = params.putIn - params.takeAway;
      expect(answers[1].answer).toBe(Math.abs(net));
    }
  });

  it('direction answer matches sign of net', () => {
    for (let i = 0; i < 50; i++) {
      const { params, answers } = basketChange.createProblem();
      const net = params.putIn - params.takeAway;
      expect(answers[0].answer).toBe(Math.sign(net));
    }
  });

  it('has 3 steps', () => {
    const { steps } = basketChange.createProblem();
    expect(steps).toHaveLength(3);
  });

  it('steps calculate progressively to final answer', () => {
    const { steps } = basketChange.createProblem();
    expect(typeof steps[0].answer).toBe('number');
    expect(typeof steps[1].answer).toBe('number');
    expect(steps[2].answer).toBe(steps[0].answer + steps[1].answer);
  });

  it('generates different params', () => {
    const results = new Set();
    for (let i = 0; i < 20; i++) {
      const { params } = basketChange.createProblem();
      results.add(`${params.takeAway}-${params.putIn}`);
    }
    expect(results.size).toBeGreaterThan(1);
  });
});
