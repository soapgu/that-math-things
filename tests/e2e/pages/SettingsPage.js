import { expect } from '@playwright/test';

/** 计算训练设置页 Page Object。 */
export class SettingsPage {
  /**
   * @param {import('@playwright/test').Page} page Playwright 页面。
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * 等待设置页渲染完成（「开始训练」按钮可见）。
   * @returns {Promise<void>}
   */
  async waitForReady() {
    await this.page.getByRole('button', { name: '开始训练' })
      .waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * 设置页是否可见。
   * @returns {Promise<boolean>}
   */
  async isVisible() {
    return await this.page.getByRole('button', { name: '开始训练' }).isVisible();
  }

  /**
   * 选择题目数量。
   * @param {number} count 题目数（10/20/50）。
   * @returns {Promise<void>}
   */
  async selectQuestionCount(count) {
    await this.page.locator('.ant-radio-button-wrapper', { hasText: `${count} 题` }).click();
  }

  /**
   * 获取当前选中的题目数量字符串。
   * @returns {Promise<string|null>}
   */
  async getSelectedQuestionCount() {
    const checked = this.page.locator('.ant-radio-button-wrapper-checked').first();
    const text = await checked.textContent();
    return text ? text.match(/(\d+)\s*题/)?.[1] : null;
  }

  /**
   * 切换辅助运算开关。
   * @param {boolean} enabled 是否开启。
   * @returns {Promise<void>}
   */
  async setAssistEnabled(enabled) {
    const sw = this.page.getByRole('switch');
    const isChecked = await sw.isChecked();
    if (enabled !== isChecked) {
      await sw.click();
    }
  }

  /**
   * 辅助运算当前是否开启。
   * @returns {Promise<boolean>}
   */
  async isAssistEnabled() {
    return await this.page.getByRole('switch').isChecked();
  }

  /**
   * 选择退位个位算法。
   * @param {'breakTen' | 'bridgeTen'} method 破十法或平十法。
   * @returns {Promise<void>}
   */
  async selectBorrowOnesMethod(method) {
    const label = method === 'breakTen' ? '破十法' : method === 'bridgeTen' ? '平十法' : null;
    if (!label) throw new Error(`未知 borrow method: ${method}`);
    await this.page.locator('.ant-radio-wrapper', { hasText: label }).click();
  }

  /**
   * 断言退位个位算法选项处于禁用状态。
   * @returns {Promise<void>}
   */
  async expectBorrowMethodDisabled() {
    const labels = ['破十法', '平十法'];
    for (const label of labels) {
      const wrapper = this.page.locator('.ant-radio-wrapper', { hasText: label }).first();
      const input = wrapper.locator('input[type="radio"]');
      await expect(input).toBeDisabled();
    }
  }

  /**
   * 设置进位/退位难度（星级）。
   * @param {number} stars 星级（1-3）。
   * @returns {Promise<void>}
   */
  async setCarryBorrowProbStars(stars) {
    const li = this.page.locator('.ant-rate li').nth(stars - 1);
    await li.click();
  }

  /**
   * 滑动设置运算范围（点击 mark 刻度点 20/50/100）。
   * @param {number} value 范围值。
   * @returns {Promise<void>}
   */
  async setRange(value) {
    const mark = this.page.locator('.ant-slider-mark text, .ant-slider-mark span').filter({ hasText: String(value) });
    if (await mark.count() === 0) {
      throw new Error(`无法定位运算范围刻度 ${value}`);
    }
    await mark.click();
  }

  /**
   * 设置加法比例（点击 mark 刻度点 0 全减 / 50 各半 / 100 全加）。
   * @param {number} percent 比例值。
   * @returns {Promise<void>}
   */
  async setAddRatio(percent) {
    const label = percent === 0 ? '全减' : percent === 100 ? '全加' : percent === 50 ? '各半' : String(percent);
    const mark = this.page.locator('.ant-slider-mark text, .ant-slider-mark span').filter({ hasText: label });
    if (await mark.count() === 0) {
      throw new Error(`无法定位加法比例刻度 ${label}`);
    }
    await mark.click();
  }

  /**
   * 点击「开始训练」按钮。
   * @returns {Promise<void>}
   */
  async clickStart() {
    await this.page.getByRole('button', { name: '开始训练' }).click();
  }

  /**
   * 点击「统计数据」按钮。
   * @returns {Promise<void>}
   */
  async clickStats() {
    await this.page.getByRole('button', { name: '统计数据' }).click();
  }

  /**
   * 刷新页面并等待重新渲染完成。
   * @returns {Promise<void>}
   */
  async reload() {
    await this.page.reload();
    await this.waitForReady();
  }
}
