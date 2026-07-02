import { getProblem, getAllProblems, getAllProblemIds } from './registry';

describe('problem registry', () => {
  it('returns all problems', () => {
    const all = getAllProblems();
    expect(all).toHaveLength(4);
  });

  it('returns all problem IDs', () => {
    const ids = getAllProblemIds();
    expect(ids).toEqual(
      expect.arrayContaining(['computer-number', 'sticker-problem', 'apple-eaten', 'basket-change'])
    );
  });

  it('getProblem returns correct problem by id', () => {
    const problem = getProblem('computer-number');
    expect(problem).not.toBeNull();
    expect(problem.id).toBe('computer-number');
    expect(problem.title).toBe('电脑编号');
  });

  it('getProblem returns null for unknown id', () => {
    const problem = getProblem('non-existent');
    expect(problem).toBeNull();
  });

  it('every problem has required fields', () => {
    const all = getAllProblems();
    all.forEach((p) => {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('title');
      expect(p).toHaveProperty('tags');
      expect(p).toHaveProperty('createProblem');
      expect(typeof p.createProblem).toBe('function');
    });
  });

  it('every problem generates valid data via createProblem', () => {
    const all = getAllProblems();
    all.forEach((p) => {
      const data = p.createProblem();
      expect(data).toHaveProperty('params');
      expect(data).toHaveProperty('question');
      expect(data).toHaveProperty('hint');
      expect(data).toHaveProperty('steps');
      expect(data).toHaveProperty('finalAnswer');
      expect(Array.isArray(data.steps)).toBe(true);
      data.steps.forEach((step, i) => {
        expect(step).toHaveProperty('description', expect.any(String));
        if (step.answer !== undefined) {
          expect(step).toHaveProperty('hint');
        }
      });
    });
  });
});
