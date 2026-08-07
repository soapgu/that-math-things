export const MULTIPLICATION_SOUND_STORAGE_KEY = 'multiplication-sound-enabled';

export function loadMultiplicationSoundEnabled() {
  if (typeof window === 'undefined') return true;
  try {
    const stored = window.localStorage.getItem(MULTIPLICATION_SOUND_STORAGE_KEY);
    if (stored === null) return true;
    const parsed = JSON.parse(stored);
    return typeof parsed === 'boolean' ? parsed : true;
  } catch {
    return true;
  }
}

export function saveMultiplicationSoundEnabled(enabled) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MULTIPLICATION_SOUND_STORAGE_KEY, JSON.stringify(Boolean(enabled)));
  } catch {
    // 音效偏好不是关键数据，存储不可用时保持当前会话内设置即可。
  }
}

export function createMultiplicationSoundPlayer() {
  let context = null;
  let activeNodes = [];
  let disposed = false;

  const stop = () => {
    activeNodes.forEach(({ oscillator, gain }) => {
      try {
        oscillator.stop();
      } catch {
        // 已经结束的振荡器无需再次停止。
      }
      oscillator.disconnect?.();
      gain.disconnect?.();
    });
    activeNodes = [];
  };

  const getContext = () => {
    if (disposed) return null;
    if (context) return context;
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    try {
      context = new AudioContextClass();
      return context;
    } catch {
      return null;
    }
  };

  const playNotes = (notes) => {
    try {
      stop();
      const audioContext = getContext();
      if (!audioContext) return;
      if (audioContext.state === 'suspended') {
        audioContext.resume?.().catch?.(() => {});
      }

      const startedAt = audioContext.currentTime;
      activeNodes = notes.map(({ frequency, offset, duration, volume, type = 'sine' }) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const noteStart = startedAt + offset;
        const noteEnd = noteStart + duration;

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, noteStart);
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(volume, noteStart + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(noteStart);
        oscillator.stop(noteEnd + 0.01);
        oscillator.addEventListener?.('ended', () => {
          oscillator.disconnect?.();
          gain.disconnect?.();
          activeNodes = activeNodes.filter((node) => node.oscillator !== oscillator);
        }, { once: true });
        return { oscillator, gain };
      });
    } catch {
      stop();
    }
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    const audioContext = context;
    context = null;
    try {
      audioContext?.close?.().catch?.(() => {});
    } catch {
      // 关闭失败不影响页面卸载。
    }
  };

  return {
    playCorrect() {
      playNotes([
        { frequency: 659.25, offset: 0, duration: 0.12, volume: 0.055 },
        { frequency: 783.99, offset: 0.11, duration: 0.14, volume: 0.06 },
      ]);
    },
    playWrong() {
      playNotes([
        { frequency: 246.94, offset: 0, duration: 0.3, volume: 0.05, type: 'triangle' },
      ]);
    },
    stop,
    dispose,
  };
}
