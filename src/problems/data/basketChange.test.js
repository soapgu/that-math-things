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
      expect(params.putIn).toBeGreaterThanOrEqual(params.takeAway + 2);
      expect(params.putIn).toBeLessThanOrEqual(params.takeAway + 15);
    }
  });

  it('calculates correct net change', () => {
    for (let i = 0; i < 50; i++) {
      const { params, finalAnswer } = basketChange.createProblem();
      const net = params.putIn - params.takeAway;
      const expected = `${net > 0 ? '多' : '少'}${Math.abs(net)}`;
      expect(finalAnswer).toBe(expected);
    }
  });

  it('always results in "多" (net positive)', () => {
    for (let i = 0; i < 50; i++) {
      const { finalAnswer } = basketChange.createProblem();
      expect(finalAnswer.startsWith('多')).toBe(true);
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
