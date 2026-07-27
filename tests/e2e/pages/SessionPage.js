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
  constructor(page) {
    this.page = page;
  }

  async waitForReady() {
    // 答题输入框可见即代表题面已渲染；优先于 .ant-layout-content
    await this.page.locator('input[type="text"]').first()
      .waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * 只读题面 span 的文本，避免与 Result 错题详情里同格式 "a op b =" 文本串扰。
   * 离开 Session 路由时 locator 不存在，返回 null。
   */
  async getQuestionText() {
    const prompt = this.page.locator('[data-testid="question-prompt"]');
    if (!(await prompt.count())) return null;
    return prompt.textContent();
  }

  /**
   * 解析当前题面，返回 { a, op, b }。
   * 减号统一返回 ASCII '-'，方便调用方比较。
   * 不识别返回 null。
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

  async answer(value) {
    const input = this.page.locator('input[type="text"]').first();
    await input.fill(String(value));
  }

/**
   * 点击「下一题」 / 「完成」。
   * 这两个按钮带 Ant 图标（ArrowRightOutlined / CheckOutlined），其 a11y 名形如
   * "arrow-right 下一题" / "check 完成"，因此用子串正则匹配两种文案。
   */
  async clickNext() {
    await this.page.getByRole('button', { name: /下一题|完成/ }).click();
  }

  async pressEnter() {
    await this.page.keyboard.press('Enter');
  }

  // —— 辅助交互（第一层与第二层共用容器）

  async expectAssistEntryVisible() {
    await expect(this.page.getByRole('button', { name: '需要提示' })).toBeVisible();
  }

  async expectAssistEntryInvisible() {
    await expect(this.page.getByRole('button', { name: '需要提示' })).toBeHidden();
  }

  async clickHint() {
    await this.page.getByRole('button', { name: '需要提示' }).click();
  }

  async clickICanThink() {
    await this.page.getByRole('button', { name: '我再想想' }).click();
  }

  async clickShowMethod() {
    await this.page.getByRole('button', { name: '看看计算方法' }).click();
  }

  // —— AnimationPlayer 控件（plain Button 无图标，保留 substring 匹配以统一风格）

  async clickPrevStep() {
    await this.page.getByRole('button', { name: '上一步' }).click();
  }
  async clickNextStep() {
    await this.page.getByRole('button', { name: '下一步' }).click();
  }
  async clickSkip() {
    await this.page.getByRole('button', { name: '跳过演示' }).click();
  }
  async clickReplay() {
    await this.page.getByRole('button', { name: '重新播放' }).click();
  }
  async clickFinishDemo() {
    await this.page.getByRole('button', { name: '回到题目' }).click();
  }

  async isFirstStepPrevDisabled() {
    return this.page.getByRole('button', { name: '上一步' }).first().isDisabled();
  }

  async isInputFocused() {
    // Playwright Locator 没有 isFocused()，用 evaluate 与 activeElement 对比
    return this.page.locator('input[type="text"]').first()
      .evaluate((el) => el === document.activeElement);
  }

  /**
   * 等待输入框获得焦点（Session useEffect 用 setTimeout(50ms) 触发，故需要 auto-retry）。
   */
  async expectInputFocused() {
    await expect(this.page.locator('input[type="text"]').first()).toBeFocused();
  }

  async getInputValue() {
    return this.page.locator('input[type="text"]').first().inputValue();
  }

  async isHintVisible() {
    return this.page.getByRole('button', { name: '需要提示' }).isVisible();
  }

  /**
   * 返回计时文本（形如 "1:23"）。
   * Session 顶部信息行格式："第 N/M 题  {timer.formatted}"
   * useTimer 的 formatted 通常是 mm:ss 形式。
   */
  async getTimerText() {
    const text = await this.page.locator('.ant-layout-content').textContent();
    const m = text.match(/(\d+):(\d+)/);
    return m ? `${m[1]}:${m[2]}` : '';
  }

  async getProgressPercent() {
    // Ant 6 Progress 主体有 role="progressbar" + aria-valuenow；比子元素选择器更稳
    const bar = this.page.getByRole('progressbar').first();
    if (!(await bar.count())) return 0;
    const v = await bar.getAttribute('aria-valuenow');
    return v ? parseFloat(v) : 0;
  }

  async isNoHorizontalScroll() {
    const overflow = await this.page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    return overflow <= 0;
  }
}