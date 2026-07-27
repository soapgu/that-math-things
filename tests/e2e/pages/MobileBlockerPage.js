import { expect } from '@playwright/test';

/**
 * 移动端拦截层 Page Object。
 *
 * src/components/MobileBlocker/index.jsx：
 *   - 仅在 useMobile() 为 false 时全屏遮挡（useMobile 基于 768 阈值判断）
 *   - 遮罩文案：「目前网站只支持电脑和 Pad 访问」+ 灰色说明
 */
export class MobileBlockerPage {
  constructor(page) {
    this.page = page;
  }

  async isBlocked() {
    return await this.page.getByText('目前网站只支持电脑和 Pad 访问', { exact: false })
      .isVisible().catch(() => false);
  }

  async expectBlocked() {
    await expect(this.page.getByText('目前网站只支持电脑和 Pad 访问', { exact: false })).toBeVisible();
  }

  async expectUnblocked() {
    await expect(this.page.getByText('目前网站只支持电脑和 Pad 访问', { exact: false })).toBeHidden();
  }

  async getVisibleText() {
    const el = this.page.locator('div', { hasText: '目前网站只支持电脑和 Pad 访问' }).first();
    return (await el.textContent())?.trim() || '';
  }

  /**
   * 在移动端拦截时，应用内容应不可操作。
   * 这里通过判断答题输入框是否存在或可见（MobileBlocker 会 overlay 在顶部，
   * 但 .ant-layout-content 仍在 DOM 中；点击会被遮挡）。
   * 仅断言输入框不可见，作为「内容不可操作」的代理。
   */
  async isPracticeInputHidden() {
    const input = this.page.locator('input[type="text"]').first();
    if (!(await input.count())) return true;
    return await input.isHidden();
  }
}