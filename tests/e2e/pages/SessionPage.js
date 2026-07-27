import { expect } from '@playwright/test';

/**
 * Session 做题页 Page Object。
 *
 * 关键 UI 文案：
 *   下一题 / 完成：外层 Button（最后一题文案变「完成」）
 *   需要提示：第一层入口
 *   我再想想：第一层收起
 *   看看计算方法：进入第二层
 *   跳过演示 / 上一步 / 下一步 / 重新播放 / 回到题目：AssistAnimationPlayer
 *
 * 速度档 Segmented：快 5秒 / 中 10秒 / 慢 20秒，value 为 fast/medium/slow。
 */
export class SessionPage {
  /**
   * @param {import('@playwright/test').Page} page Playwright 页面。
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * 等待 session 页渲染完成（输入框可见）。
   * @returns {Promise<void>}
   */
  async waitForReady() {
    await this.page.locator('input[type="text"]').first()
      .waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * 读取题面 span 文本，离开 session 路由时返回 null。
   * @returns {Promise<string|null>}
   */
  async getQuestionText() {
    const prompt = this.page.locator('[data-testid="question-prompt"]');
    if (!(await prompt.count())) return null;
    return prompt.textContent();
  }

  /**
   * 解析当前题面，返回操作数与运算符。
   * 减号统一返回 ASCII '-'，不识别返回 null。
   * @returns {Promise<null|{a: number, op: string, b: number}>}
   */
  async getCurrentQuestion() {
    const text = await this.getQuestionText();
    if (!text) return null;
    const m = text.match(/(-?\d+)\s*([+\-−])\s*(-?\d+)\s*=/);
    if (!m) return null;
    return {
      a: parseInt(m[1], 10),
      op: m[2] === '−' ? '-' : m[2],
      b: parseInt(m[3], 10),
    };
  }

  /**
   * 在输入框中填入答案。
   * @param {number|string} value 答案值。
   * @returns {Promise<void>}
   */
  async answer(value) {
    const input = this.page.locator('input[type="text"]').first();
    await input.fill(String(value));
  }

  /**
   * 点击「下一题」 / 「完成」按钮。
   * @returns {Promise<void>}
   */
  async clickNext() {
    await this.page.getByRole('button', { name: /下一题|完成/ }).click();
  }

  /**
   * 按下 Enter 键提交。
   * @returns {Promise<void>}
   */
  async pressEnter() {
    await this.page.keyboard.press('Enter');
  }

  // —— 辅助交互（第一层与第二层共用容器）

  /**
   * 断言辅助入口「需要提示」按钮可见。
   * @returns {Promise<void>}
   */
  async expectAssistEntryVisible() {
    await expect(this.page.getByRole('button', { name: '需要提示' })).toBeVisible();
  }

  /**
   * 断言辅助入口「需要提示」按钮不可见。
   * @returns {Promise<void>}
   */
  async expectAssistEntryInvisible() {
    await expect(this.page.getByRole('button', { name: '需要提示' })).toBeHidden();
  }

  /**
   * 点击「需要提示」按钮。
   * @returns {Promise<void>}
   */
  async clickHint() {
    await this.page.getByRole('button', { name: '需要提示' }).click();
  }

  /**
   * 点击「我再想想」收起提醒卡片。
   * @returns {Promise<void>}
   */
  async clickICanThink() {
    await this.page.getByRole('button', { name: '我再想想' }).click();
  }

  /**
   * 点击「看看计算方法」进入第二层方法演示。
   * @returns {Promise<void>}
   */
  async clickShowMethod() {
    await this.page.getByRole('button', { name: '看看计算方法' }).click();
  }

  // —— AnimationPlayer 控件

  /**
   * 点击演示控制「上一步」按钮。
   * @returns {Promise<void>}
   */
  async clickPrevStep() {
    await this.page.getByRole('button', { name: '上一步' }).click();
  }

  /**
   * 点击演示控制「下一步」按钮。
   * @returns {Promise<void>}
   */
  async clickNextStep() {
    await this.page.getByRole('button', { name: '下一步' }).click();
  }

  /**
   * 点击「跳过演示」按钮。
   * @returns {Promise<void>}
   */
  async clickSkip() {
    await this.page.getByRole('button', { name: '跳过演示' }).click();
  }

  /**
   * 点击「重新播放」按钮。
   * @returns {Promise<void>}
   */
  async clickReplay() {
    await this.page.getByRole('button', { name: '重新播放' }).click();
  }

  /**
   * 点击「回到题目」按钮。
   * @returns {Promise<void>}
   */
  async clickFinishDemo() {
    await this.page.getByRole('button', { name: '回到题目' }).click();
  }

  /**
   * 演示首步时「上一步」是否 disabled。
   * @returns {Promise<boolean>}
   */
  async isFirstStepPrevDisabled() {
    return this.page.getByRole('button', { name: '上一步' }).first().isDisabled();
  }

  /**
   * 输入框当前是否聚焦。
   * @returns {Promise<boolean>}
   */
  async isInputFocused() {
    return this.page.locator('input[type="text"]').first()
      .evaluate((el) => el === document.activeElement);
  }

  /**
   * 断言输入框已聚焦。
   * @returns {Promise<void>}
   */
  async expectInputFocused() {
    await expect(this.page.locator('input[type="text"]').first()).toBeFocused();
  }

  /**
   * 获取输入框当前值。
   * @returns {Promise<string>}
   */
  async getInputValue() {
    return this.page.locator('input[type="text"]').first().inputValue();
  }

  /**
   * 「需要提示」按钮是否可见。
   * @returns {Promise<boolean>}
   */
  async isHintVisible() {
    return this.page.getByRole('button', { name: '需要提示' }).isVisible();
  }

  /**
   * 获取计时文本（形如 "m:ss"）。
   * @returns {Promise<string>}
   */
  async getTimerText() {
    const text = await this.page.locator('.ant-layout-content').textContent();
    const m = text.match(/(\d+):(\d+)/);
    return m ? `${m[1]}:${m[2]}` : '';
  }

  /**
   * 获取 Progress 百分比数值。
   * @returns {Promise<number>}
   */
  async getProgressPercent() {
    const bar = this.page.getByRole('progressbar').first();
    if (!(await bar.count())) return 0;
    const v = await bar.getAttribute('aria-valuenow');
    return v ? parseFloat(v) : 0;
  }

  /**
   * 页面是否无水平滚动条。
   * @returns {Promise<boolean>}
   */
  async isNoHorizontalScroll() {
    const overflow = await this.page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    return overflow <= 0;
  }
}
