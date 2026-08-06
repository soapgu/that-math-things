import { act, renderHook } from '@testing-library/react';
import { formatTimerDuration } from './useTimer';
import useTimer from './useTimer';

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

describe('useTimer 时间戳计时', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('开始、停止和重复调用保持幂等', () => {
    const intervalSpy = vi.spyOn(window, 'setInterval');
    const { result } = renderHook(() => useTimer());
    act(() => {
      result.current.start();
      result.current.start();
    });
    expect(intervalSpy).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(2500));
    expect(result.current.seconds).toBe(2);
    let stoppedSeconds;
    act(() => { stoppedSeconds = result.current.stop(); });
    expect(stoppedSeconds).toBe(2);
    act(() => { stoppedSeconds = result.current.stop(); });
    expect(stoppedSeconds).toBe(2);
    intervalSpy.mockRestore();
  });

  it('暂停前的毫秒余量会在恢复后继续累计', () => {
    const { result } = renderHook(() => useTimer());
    act(() => result.current.start());
    vi.setSystemTime(new Date('2026-01-01T00:00:01.500Z'));
    let stoppedSeconds;
    act(() => { stoppedSeconds = result.current.stop(); });
    expect(stoppedSeconds).toBe(1);

    vi.setSystemTime(new Date('2026-01-01T00:00:10.000Z'));
    act(() => result.current.start());
    vi.setSystemTime(new Date('2026-01-01T00:00:10.600Z'));
    act(() => { stoppedSeconds = result.current.stop(); });
    expect(stoppedSeconds).toBe(2);
    expect(result.current.formatted).toBe('00:02');
  });

  it('即使刷新回调未执行，停止时仍按真实时间返回快照', () => {
    const { result } = renderHook(() => useTimer());
    act(() => result.current.start());
    vi.setSystemTime(new Date('2026-01-01T00:00:05.500Z'));

    let stoppedSeconds;
    act(() => { stoppedSeconds = result.current.stop(); });
    expect(stoppedSeconds).toBe(5);
    expect(result.current.seconds).toBe(5);
  });

  it('重置会清空运行段和累计时间', () => {
    const { result } = renderHook(() => useTimer());
    act(() => result.current.start());
    vi.setSystemTime(new Date('2026-01-01T00:00:03.200Z'));
    act(() => result.current.reset());
    expect(result.current.seconds).toBe(0);
    expect(result.current.stop()).toBe(0);
  });

  it('卸载时清理刷新定时器', () => {
    const clearSpy = vi.spyOn(window, 'clearInterval');
    const { result, unmount } = renderHook(() => useTimer());
    act(() => result.current.start());
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
