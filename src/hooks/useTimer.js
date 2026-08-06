import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

/**
 * 将非负秒数格式化为统一的 mm:ss；分钟超过 59 时继续累加。
 * @param {number} seconds
 * @returns {string}
 */
export function formatTimerDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

/**
 * 基于活动时间戳的秒级计时器 hook。setInterval 只刷新显示，最终用时由
 * Date.now() 的差值计算，因此后台节流不会造成少计。
 * @returns {{ seconds: number, formatted: string, start: Function, stop: () => number, reset: Function }}
 *
 * 用法：
 *   const { seconds, formatted, start, stop, reset } = useTimer();
 *   start();       // 开始计时
 *   stop();        // 暂停，并返回最终整秒快照
 *   reset();       // 归零并停止
 *   formatted;     // "mm:ss" 格式的字符串
 */
export default function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef(null);
  const accumulatedMsRef = useRef(0);
  const startedAtRef = useRef(null);
  const secondsRef = useRef(0);

  const readElapsedSeconds = useCallback(() => {
    const runningMs = startedAtRef.current === null
      ? 0
      : Math.max(0, Date.now() - startedAtRef.current);
    return Math.floor((accumulatedMsRef.current + runningMs) / 1000);
  }, []);

  const publishSeconds = useCallback(() => {
    const nextSeconds = readElapsedSeconds();
    secondsRef.current = nextSeconds;
    setSeconds(nextSeconds);
    return nextSeconds;
  }, [readElapsedSeconds]);

  /** 开始计时（如果已运行则忽略） */
  const start = useCallback(() => {
    if (startedAtRef.current !== null) return;
    startedAtRef.current = Date.now();
    intervalRef.current = setInterval(publishSeconds, 1000);
  }, [publishSeconds]);

  /** 停止计时，并返回包含当前运行段的最终整秒快照。 */
  const stop = useCallback(() => {
    if (startedAtRef.current === null && intervalRef.current === null) {
      return secondsRef.current;
    }
    if (startedAtRef.current !== null) {
      accumulatedMsRef.current += Math.max(0, Date.now() - startedAtRef.current);
      startedAtRef.current = null;
    }
    if (intervalRef.current !== null) clearInterval(intervalRef.current);
    intervalRef.current = null;
    const finalSeconds = Math.floor(accumulatedMsRef.current / 1000);
    secondsRef.current = finalSeconds;
    setSeconds(finalSeconds);
    return finalSeconds;
  }, []);

  /** 归零并停止 */
  const reset = useCallback(() => {
    if (intervalRef.current !== null) clearInterval(intervalRef.current);
    intervalRef.current = null;
    accumulatedMsRef.current = 0;
    startedAtRef.current = null;
    secondsRef.current = 0;
    setSeconds(0);
  }, []);

  useEffect(() => () => {
    if (intervalRef.current !== null) clearInterval(intervalRef.current);
  }, []);

  /** 格式化为 mm:ss */
  const formatted = formatTimerDuration(seconds);

  return { seconds, formatted, start, stop, reset };
}
