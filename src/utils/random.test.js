import { getRandomInt, shuffleArray } from './random';

describe('getRandomInt', () => {
  it('returns a number within [min, max]', () => {
    for (let i = 0; i < 100; i++) {
      const result = getRandomInt(3, 7);
      expect(result).toBeGreaterThanOrEqual(3);
      expect(result).toBeLessThanOrEqual(7);
    }
  });

  it('returns an integer', () => {
    for (let i = 0; i < 50; i++) {
      const result = getRandomInt(1, 100);
      expect(Number.isInteger(result)).toBe(true);
    }
  });

  it('returns the same value when min === max', () => {
    const result = getRandomInt(5, 5);
    expect(result).toBe(5);
  });
});

describe('shuffleArray', () => {
  it('returns an array of the same length', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);
    expect(shuffled).toHaveLength(arr.length);
  });

  it('contains the same elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);
    expect(shuffled.sort()).toEqual(arr.sort());
  });

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    shuffleArray(arr);
    expect(arr).toEqual(copy);
  });
});
