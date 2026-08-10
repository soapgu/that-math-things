import { expect } from '@playwright/test';

export const RECITATION_STORAGE_KEY = 'multiplication-recitation-session-v1';

/** 九九乘法口诀背诵正式页面 Page Object。 */
export class MultiplicationRecitationPage {
  constructor(page) {
    this.page = page;
    this.root = page.locator('.multiplication-recitation-page');
    this.commandBar = page.locator('.recitation-command-bar');
    this.currentPhrase = page.locator('.recitation-current-phrase');
    this.matrix = page.getByRole('grid', { name: '九九乘法背诵选择表' });
    this.phraseTable = page.getByRole('grid', { name: '完整45句口诀表' });
    this.confirm = page.getByRole('button', { name: '我背完了' });
    this.reset = page.getByRole('button', { name: '重新开始', exact: true });
  }

  static async installControlledSpeech(context) {
    await context.addInitScript(() => {
      class ControlledUtterance {
        constructor(text) {
          this.text = text;
          this.lang = '';
          this.rate = 1;
        }
      }
      const state = { spoken: [], pending: null, cancelCount: 0, throwOnSpeak: false };
      Object.defineProperty(window, '__recitationSpeech', { configurable: true, value: state });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: ControlledUtterance });
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          cancel() {
            state.cancelCount += 1;
            state.pending = null;
          },
          speak(utterance) {
            if (state.throwOnSpeak) throw new Error('speech unavailable');
            state.spoken.push({ text: utterance.text, lang: utterance.lang, rate: utterance.rate });
            state.pending = utterance;
          },
        },
      });
    });
  }

  async goto(baseURL) {
    await this.page.goto(`${baseURL}#/multiplication/recitation`, { waitUntil: 'networkidle' });
    await this.root.waitFor();
  }

  async finishSpeech() {
    await this.page.evaluate(() => {
      const utterance = window.__recitationSpeech?.pending;
      if (!utterance) throw new Error('当前没有等待结束的领读');
      window.__recitationSpeech.pending = null;
      utterance.onend?.();
    });
    await expect(this.confirm).toBeEnabled();
  }

  async completeCurrent() {
    await this.finishSpeech();
    await this.confirm.click();
  }

  async selectCoordinate(a, b) {
    await this.page.getByRole('button', { name: `${a}乘${b}，未背，可选择` }).click();
  }

  async switchMode(mode) {
    await this.page.getByRole('button', { name: mode === 'custom' ? '自定义背' : '顺序背' }).click();
  }

  async progress() {
    return Number((await this.page.locator('.recitation-progress-text').textContent()).split('/')[0]);
  }
}
