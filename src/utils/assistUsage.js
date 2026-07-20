import { ASSIST_METHODS } from './assistGenerator';

/**
 * 根据辅助模型初始化一道题的会话内使用状态。
 * eligible 描述题目本身是否适合辅助，与设置中是否开启辅助无关；这样即使入口关闭，
 * 也能明确区分“符合条件但独立完成”和“本来就不需要进退位辅助”的题目。
 */
export function createAssistUsage(assistance) {
  if (!assistance?.eligible) {
    return {
      eligible: false,
      kind: null,
      used: false,
      level: 0,
      method: null,
      strategy: null,
    };
  }

  return {
    eligible: true,
    kind: assistance.kind,
    used: false,
    level: 0,
    method: null,
    strategy: null,
  };
}

/**
 * 将辅助使用状态提升到指定层级，只允许升级、不允许降级。
 * 第二层才记录实际演示方法；退位演示额外记录个位采用的破十法或平十法。
 */
export function promoteAssistUsage(current, requestedLevel, assistance) {
  if (!current?.eligible || requestedLevel <= current.level) return current;

  const level = requestedLevel >= 2 ? 2 : 1;
  const viewedMethod = level === 2 ? assistance?.method ?? null : null;
  const strategy = viewedMethod === ASSIST_METHODS.PLACE_VALUE_BORROW
    ? assistance?.onesMethod ?? null
    : null;

  return {
    ...current,
    used: true,
    level,
    method: viewedMethod,
    strategy,
  };
}

/**
 * 汇总一场练习中有采集记录且符合辅助条件的题目。
 * 普通题（eligible=false）、旧记录（assistUsage=null）和无效层级均不进入分母。
 */
export function summarizeAssistUsage(items = []) {
  const summary = {
    eligible: 0,
    independent: 0,
    reminder: 0,
    method: 0,
  };

  items.forEach(({ assistUsage } = {}) => {
    if (assistUsage?.eligible !== true || ![0, 1, 2].includes(assistUsage.level)) return;

    summary.eligible += 1;
    if (assistUsage.level === 0) summary.independent += 1;
    if (assistUsage.level === 1) summary.reminder += 1;
    if (assistUsage.level === 2) summary.method += 1;
  });

  return summary;
}
