/**
 * 创建浏览器中文领读控制器。
 *
 * 控制器不管理业务进度，只报告播放生命周期；语音不可用或异常时，
 * 页面仍可进入手动确认流程。environment参数用于测试和非浏览器环境注入。
 */
export function createRecitationSpeechController(environment = globalThis) {
  const synthesis = environment?.speechSynthesis;
  const Utterance = environment?.SpeechSynthesisUtterance;
  // 每次播放或取消都会推进序号，使旧语音迟到的回调无法污染当前页面状态。
  let generation = 0;
  let disposed = false;

  const isSupported = () => !disposed && Boolean(synthesis && Utterance);

  const cancel = () => {
    generation += 1;
    try {
      synthesis?.cancel();
    } catch {
      // 浏览器语音异常不阻断手动背诵。
    }
  };

  /** 先取消旧播报，再以固定中文语言和儿童跟读语速播放新口诀。 */
  const speak = (text, callbacks = {}) => {
    cancel();
    if (!isSupported() || typeof text !== 'string' || !text.trim()) {
      callbacks.onUnavailable?.();
      return false;
    }
    const activeGeneration = generation;
    try {
      const utterance = new Utterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.82;
      utterance.onstart = () => {
        if (!disposed && activeGeneration === generation) callbacks.onStart?.();
      };
      utterance.onend = () => {
        if (!disposed && activeGeneration === generation) callbacks.onEnd?.();
      };
      utterance.onerror = () => {
        if (!disposed && activeGeneration === generation) callbacks.onError?.();
      };
      synthesis.speak(utterance);
      return true;
    } catch {
      callbacks.onError?.();
      return false;
    }
  };

  /** 组件卸载时永久停用控制器，并取消仍在队列中的浏览器语音。 */
  const dispose = () => {
    if (disposed) return;
    cancel();
    disposed = true;
  };

  return { isSupported, speak, cancel, dispose };
}
