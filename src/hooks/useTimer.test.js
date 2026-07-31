import { formatTimerDuration } from './useTimer';

describe('formatTimerDuration', () => {
  it.each([
    [0, '00:00'],
    [5, '00:05'],
    [65, '01:05'],
    [3605, '60:05'],
  ])('将 %i 秒格式化为 %s', (seconds, expected) => {
    expect(formatTimerDuration(seconds)).toBe(expected);
  });
});
