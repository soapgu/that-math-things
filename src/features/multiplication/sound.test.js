import {
  createMultiplicationSoundPlayer,
  loadMultiplicationSoundEnabled,
  MULTIPLICATION_SOUND_STORAGE_KEY,
  saveMultiplicationSoundEnabled,
} from './sound';

function installAudioContextMock({ fail = false } = {}) {
  const oscillators = [];
  const close = vi.fn().mockResolvedValue(undefined);
  class AudioContextMock {
    constructor() {
      if (fail) throw new Error('audio unavailable');
      this.currentTime = 1;
      this.state = 'running';
      this.destination = {};
      this.close = close;
    }

    createOscillator() {
      const oscillator = {
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        addEventListener: vi.fn(),
      };
      oscillators.push(oscillator);
      return oscillator;
    }

    createGain() {
      return {
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
    }
  }
  window.AudioContext = AudioContextMock;
  return { close, oscillators };
}

describe('九九乘法轻量答题音效', () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.AudioContext;
    delete window.webkitAudioContext;
  });

  it('默认开启并只接受合法的布尔偏好', () => {
    expect(loadMultiplicationSoundEnabled()).toBe(true);
    saveMultiplicationSoundEnabled(false);
    expect(localStorage.getItem(MULTIPLICATION_SOUND_STORAGE_KEY)).toBe('false');
    expect(loadMultiplicationSoundEnabled()).toBe(false);
    localStorage.setItem(MULTIPLICATION_SOUND_STORAGE_KEY, '"invalid"');
    expect(loadMultiplicationSoundEnabled()).toBe(true);
    localStorage.setItem(MULTIPLICATION_SOUND_STORAGE_KEY, '{bad');
    expect(loadMultiplicationSoundEnabled()).toBe(true);
  });

  it('正确音使用两个短音，错误音使用一个柔和低音', () => {
    const { oscillators } = installAudioContextMock();
    const player = createMultiplicationSoundPlayer();

    player.playCorrect();
    expect(oscillators).toHaveLength(2);
    expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(659.25, 1);
    expect(oscillators[1].frequency.setValueAtTime).toHaveBeenCalledWith(783.99, 1.11);

    player.playWrong();
    expect(oscillators).toHaveLength(3);
    expect(oscillators[2].frequency.setValueAtTime).toHaveBeenCalledWith(246.94, 1);
    expect(oscillators[0].stop).toHaveBeenCalledTimes(2);
    expect(oscillators[1].stop).toHaveBeenCalledTimes(2);
  });

  it('停止未完成声音，浏览器不支持或初始化失败时静默降级', () => {
    const { close, oscillators } = installAudioContextMock();
    const player = createMultiplicationSoundPlayer();
    player.playWrong();
    player.stop();
    expect(oscillators[0].stop).toHaveBeenCalledTimes(2);
    expect(close).not.toHaveBeenCalled();
    player.dispose();
    expect(close).toHaveBeenCalledTimes(1);
    player.dispose();
    expect(close).toHaveBeenCalledTimes(1);
    player.playCorrect();
    expect(oscillators).toHaveLength(1);

    delete window.AudioContext;
    expect(() => createMultiplicationSoundPlayer().playCorrect()).not.toThrow();
    installAudioContextMock({ fail: true });
    expect(() => createMultiplicationSoundPlayer().playWrong()).not.toThrow();
  });
});
