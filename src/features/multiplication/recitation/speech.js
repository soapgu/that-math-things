export function createRecitationSpeechController(environment = globalThis) {
  const synthesis = environment?.speechSynthesis;
  const Utterance = environment?.SpeechSynthesisUtterance;
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

  const dispose = () => {
    if (disposed) return;
    cancel();
    disposed = true;
  };

  return { isSupported, speak, cancel, dispose };
}
