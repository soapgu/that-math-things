import stickerProblem from './stickerProblem';

describe('stickerProblem', () => {
  it('has correct metadata', () => {
    expect(stickerProblem.id).toBe('sticker-problem');
    expect(stickerProblem.title).toBe('贴纸问题');
    expect(stickerProblem.tags).toEqual(['相差关系', '两步应用题']);
  });

  it('generates valid params', () => {
    for (let i = 0; i < 50; i++) {
      const { params } = stickerProblem.createProblem();
      expect(params.a).toBeGreaterThanOrEqual(12);
      expect(params.a).toBeLessThanOrEqual(30);
      expect(params.b).toBeGreaterThanOrEqual(2);
      expect(params.b).toBeLessThanOrEqual(params.a - 2);
    }
  });

  it('calculates correct answers', () => {
    for (let i = 0; i < 50; i++) {
      const problem = stickerProblem.createProblem();
      const diff = problem.params.a - problem.params.b;
      expect(problem.finalAnswer).toBe(`${diff}, ${Math.floor(diff / 2)}`);
    }
  });

  it('checkAnswer validates two-part answer', () => {
    const { params, checkAnswer } = stickerProblem.createProblem();
    const diff = params.a - params.b;
    const days = Math.floor(diff / 2);

    expect(checkAnswer(`${diff},${days}`)).toBe(true);
    expect(checkAnswer(`${diff} , ${days}`)).toBe(true);
    expect(checkAnswer(`${diff}、${days}`)).toBe(true);
    expect(checkAnswer(`${diff + 1},${days}`)).toBe(false);
    expect(checkAnswer(`${diff},${days + 1}`)).toBe(false);
  });

  it('has 4 steps', () => {
    const { steps } = stickerProblem.createProblem();
    expect(steps).toHaveLength(4);
  });

  it('generates different params on repeated calls', () => {
    const results = new Set();
    for (let i = 0; i < 20; i++) {
      const { params } = stickerProblem.createProblem();
      results.add(`${params.a}-${params.b}`);
    }
    expect(results.size).toBeGreaterThan(1);
  });
});
