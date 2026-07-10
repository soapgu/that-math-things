import { useState, useRef, useCallback } from 'react';

/**
 * 秒级计时器 hook
 * @returns {{ seconds: number, formatted: string, start: Function, stop: Function, reset: Function }}
 *
 * 用法：
 *   const { seconds, formatted, start, stop, reset } = useTimer();
 *   start();       // 开始计时
 *   stop();        // 暂停
 *   reset();       // 归零并停止
 *   formatted;     // "mm:ss" 格式的字符串
 */
export default function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef(null);

  /** 开始计时（如果已运行则忽略） */
  const start = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
  }, []);

  /** 停止计时 */
  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /** 归零并停止 */
  const reset = useCallback(() => {
    stop();
    setSeconds(0);
  }, [stop]);

  /** 格式化为 mm:ss */
  const formatted = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return { seconds, formatted, start, stop, reset };
}
