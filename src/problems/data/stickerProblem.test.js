import stickerProblem from './stickerProblem';

describe('stickerProblem', () => {
  it('has correct metadata', () => {
    expect(stickerProblem.id).toBe('sticker-problem');
    expect(stickerProblem.title).toBe('贴纸问题');
    expect(stickerProblem.tags).toEqual(['相差关系', '两步应用题']);
  });

  it('generates valid params with even diff', () => {
    for (let i = 0; i < 50; i++) {
      const { params } = stickerProblem.createProblem();
      expect(params.a).toBeGreaterThanOrEqual(12);
      expect(params.a).toBeLessThanOrEqual(30);
      expect(params.b).toBeGreaterThanOrEqual(2);
      expect(params.b).toBeLessThanOrEqual(params.a - 2);
      expect((params.a - params.b) % 2).toBe(0);
    }
  });

  it('returns two answers with labels', () => {
    const { answers } = stickerProblem.createProblem();
    expect(answers).toHaveLength(2);
    expect(answers[0]).toHaveProperty('label');
    expect(answers[0]).toHaveProperty('answer');
    expect(answers[1]).toHaveProperty('label');
    expect(answers[1]).toHaveProperty('answer');
    expect(answers[0].label).toContain('添');
    expect(answers[1].label).toContain('天');
  });

  it('calculates correct answers', () => {
    for (let i = 0; i < 50; i++) {
      const problem = stickerProblem.createProblem();
      const diff = problem.params.a - problem.params.b;
      expect(problem.answers[0].answer).toBe(diff);
      expect(problem.answers[1].answer).toBe(diff / 2);
    }
  });

  it('has 5 steps including the new perspective step', () => {
    const { steps } = stickerProblem.createProblem();
    expect(steps).toHaveLength(5);
    expect(steps[4].description).toContain('另一个视角');
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
