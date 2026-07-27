import { expect } from '@playwright/test';

/**
 * 第一层辅助交互 Page Object。
 *
 * - 折叠态：「需要提示」按钮（type="text" + BulbOutlined）
 * - 展开态卡片：hint.message + "想一想：" + hint.question + 按钮「我再想想」「看看计算方法」
 *   -> 「我再想想」回到 collapsed + 触发 onReturnToQuestion 聚焦输入框
 *   -> 「看看计算方法」进入 method 阶段，触发 AssistPlayerPage
 * - 简单题（assistance.eligible=false）整块组件不渲染，所有元素不可见
 */
export class MathAssistPage {
  /**
   * @param {import('@playwright/test').Page} page Playwright 页面。
   */
  constructor(page) {
    this.page = page;
  }

  // —— 入口与折叠态

  /**
   * 「需要提示」入口按钮是否可见。
   * @returns {Promise<boolean>}
   */
  async isEntryVisible() {
    return await this.page.getByRole('button', { name: '需要提示' }).isVisible().catch(() => false);
  }

  /**
   * 断言无辅助入口。
   * @returns {Promise<void>}
   */
  async expectNoEntry() {
    await expect(this.page.getByRole('button', { name: '需要提示' })).toBeHidden();
  }

  /**
   * 断言辅助入口可见。
   * @returns {Promise<void>}
   */
  async expectEntryVisible() {
    await expect(this.page.getByRole('button', { name: '需要提示' })).toBeVisible();
  }

  /**
   * 点击「需要提示」展开第一层提醒卡片。
   * @returns {Promise<void>}
   */
  async expand() {
    await this.page.getByRole('button', { name: '需要提示' }).click();
  }

  // —— 提醒卡片内容

  /**
   * 断言提醒卡片中包含指定提示文字片段。
   * @param {string} fragment 提示文字片段。
   * @returns {Promise<void>}
   */
  async expectHintMessageVisible(fragment) {
    await expect(this.page.locator('.ant-layout-content').filter({ hasText: fragment })).toBeVisible();
  }

  /**
   * 断言「想一想：」引导问题包含指定文字。
   * @param {string} fragment 问题文字片段。
   * @returns {Promise<void>}
   */
  async expectHintQuestionVisible(fragment) {
    await expect(this.page.getByText(`想一想：${fragment}`, { exact: false })).toBeVisible();
  }

  /**
   * 断言第一层提醒未泄露最终答案。
   * @param {number} answer 正确答案。
   * @returns {Promise<void>}
   */
  async expectAnswerNotExposed(answer) {
    const text = await this.page.locator('.ant-layout-content').textContent();
    if (new RegExp(`(?<!\\d)${answer}(?!\\d)`).test(text)) {
      throw new Error(`第一层提前泄露答案 ${answer}`);
    }
  }

  // —— 两个分支按钮

  /**
   * 点击「我再想想」收起提醒卡片。
   * @returns {Promise<void>}
   */
  async collapse() {
    await this.page.getByRole('button', { name: '我再想想' }).click();
  }

  /**
   * 点击「看看计算方法」进入第二层方法演示。
   * @returns {Promise<void>}
   */
  async showMethod() {
    await this.page.getByRole('button', { name: '看看计算方法' }).click();
  }

  /**
   * 提醒卡片当前是否展开。
   * @returns {Promise<boolean>}
   */
  async isCardVisible() {
    return await this.page.getByRole('button', { name: '我再想想' }).isVisible().catch(() => false);
  }
}
