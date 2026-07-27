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
  constructor(page) {
    this.page = page;
  }

  // —— 入口与折叠态

  async isEntryVisible() {
    return await this.page.getByRole('button', { name: '需要提示' }).isVisible().catch(() => false);
  }

  async expectNoEntry() {
    await expect(this.page.getByRole('button', { name: '需要提示' })).toBeHidden();
  }

  async expectEntryVisible() {
    await expect(this.page.getByRole('button', { name: '需要提示' })).toBeVisible();
  }

  async expand() {
    await this.page.getByRole('button', { name: '需要提示' }).click();
  }

  // —— 提醒卡片内容

  async expectHintMessageVisible(fragment) {
    await expect(this.page.locator('.ant-layout-content').filter({ hasText: fragment })).toBeVisible();
  }

  async expectHintQuestionVisible(fragment) {
    await expect(this.page.getByText(`想一想：${fragment}`, { exact: false })).toBeVisible();
  }

  /**
   * 第一层不应显示最终答案（5 类外部数字除外，可能存在 hint 描述里完全无关）。
   * 这里只校验：标识区不会出现与最终答案同等的独立算式结果。
   */
  async expectAnswerNotExposed(answer) {
    const text = await this.page.locator('.ant-layout-content').textContent();
    // 简单按整词匹配
    if (new RegExp(`(?<!\\d)${answer}(?!\\d)`).test(text)) {
      throw new Error(`第一层提前泄露答案 ${answer}`);
    }
  }

  // —— 两个分支按钮

  async collapse() {
    await this.page.getByRole('button', { name: '我再想想' }).click();
  }

  async showMethod() {
    await this.page.getByRole('button', { name: '看看计算方法' }).click();
  }

  async isCardVisible() {
    return await this.page.getByRole('button', { name: '我再想想' }).isVisible().catch(() => false);
  }
}