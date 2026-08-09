import { createRecitationSpeechController } from './speech';

class MockUtterance { constructor(text) { this.text = text; } }

describe('recitation speech', () => {
  it('使用中文语音和稳定语速', () => {
    const synthesis = { cancel: vi.fn(), speak: vi.fn() };
    const controller = createRecitationSpeechController({ speechSynthesis: synthesis, SpeechSynthesisUtterance: MockUtterance });
    expect(controller.speak('一九得九')).toBe(true);
    const utterance = synthesis.speak.mock.calls[0][0];
    expect(utterance).toMatchObject({ text: '一九得九', lang: 'zh-CN', rate: 0.82 });
  });

  it('取消后忽略旧语音回调', () => {
    const synthesis = { cancel: vi.fn(), speak: vi.fn() };
    const onEnd = vi.fn();
    const controller = createRecitationSpeechController({ speechSynthesis: synthesis, SpeechSynthesisUtterance: MockUtterance });
    controller.speak('一一得一', { onEnd });
    const utterance = synthesis.speak.mock.calls[0][0];
    controller.cancel();
    utterance.onend();
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('不可用和异常时允许降级', () => {
    const unavailable = vi.fn();
    const controller = createRecitationSpeechController({});
    expect(controller.speak('一一得一', { onUnavailable: unavailable })).toBe(false);
    expect(unavailable).toHaveBeenCalledOnce();
  });

  it('卸载后不可再次播放', () => {
    const synthesis = { cancel: vi.fn(), speak: vi.fn() };
    const controller = createRecitationSpeechController({ speechSynthesis: synthesis, SpeechSynthesisUtterance: MockUtterance });
    controller.dispose();
    expect(controller.isSupported()).toBe(false);
    expect(controller.speak('一一得一')).toBe(false);
    expect(synthesis.speak).not.toHaveBeenCalled();
  });
});
