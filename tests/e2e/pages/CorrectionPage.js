import { expect } from '@playwright/test';

/**
 * 订正页 Page Object。
 *
 * UI 实际行为（src/pages/Practice/Correction/index.jsx）：
 *   - 标题「订正练习」，进度条 + 「N/M 题」
 *   - 答题输入框 + 「提交」按钮（答题正确后变「✓ 正确」禁用 600ms 后自动切题）
 *   - 答错：保持输入框，可重填；Enter 触发提交
 *   - 全部订正完成：标题「🎉 全部订正完成！」
 *   - 无错题时显示「无需订正」提示
 *
 * 测试主要靠 Enter 推进，subButton 文案会随答题状态变化故需 care。
 */
export class CorrectionPage {
  constructor(page) {
    this.page = page;
  }

  async waitForReady() {
    // 优先等输入框可见（避题状态）/ 完成标题（无错题时也可触达）
    await this.page.locator('input[type="text"], h4, h3').first()
      .waitFor({ state: 'visible', timeout: 10000 });
  }

  async getTitle() {
    return (await this.page.locator('.ant-layout-content').textContent())?.trim() || '';
  }

  /**
   * 返回错题总数（解析进度文字「1/3 题」）。
   * 未进入订正流程时返回 0。
   */
  async getWrongCount() {
    const t = await this.getTitle();
    return parseInt(t.match(/(\d+)\s*\/\s*(\d+)\s*题/)?.[2] || t.match(/共\s*(\d+)\s*题/)?.[1] || '0', 10);
  }

  async getCurrentQuestion() {
    const text = await this.page.locator('.ant-layout-content').textContent();
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
  async clickSubmit() {
    // 「提交」按钮带 Ant CheckOutlined 图标，a11y 名形如 "check 提交"，用子串匹配
    await this.page.getByRole('button', { name: '提交' }).click();
  }
  async pressEnter() {
    await this.page.keyboard.press('Enter');
  }
  async answerAndEnter(v) {
    await this.answer(v);
    await this.pressEnter();
  }

  async isComplete() {
    return (await this.page.locator('.ant-layout-content').textContent()).includes('全部订正完成');
  }
  async expectComplete() {
    await expect(this.page.getByText('🎉 全部订正完成！')).toBeVisible();
  }
}