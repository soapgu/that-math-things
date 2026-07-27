import { expect } from '@playwright/test';

export class SettingsPage {
  constructor(page) {
    this.page = page;
  }

  async waitForReady() {
    // Ant 按钮带图标时，a11y name 形如 "play-circle 开始训练"，用 substring 匹配
    await this.page.getByRole('button', { name: '开始训练' })
      .waitFor({ state: 'visible', timeout: 10000 });
  }

  async isVisible() {
    return await this.page.getByRole('button', { name: '开始训练' }).isVisible();
  }

  async selectQuestionCount(count) {
    await this.page.getByRole('radio', { name: `${count} 题`, exact: true }).click();
  }

  async getSelectedQuestionCount() {
    const checked = this.page.locator('.ant-radio-button-wrapper-checked').first();
    const text = await checked.textContent();
    return text ? text.match(/(\d+)\s*题/)?.[1] : null;
  }

  async setAssistEnabled(enabled) {
    const sw = this.page.getByRole('switch');
    const isChecked = await sw.isChecked();
    if (enabled !== isChecked) {
      await sw.click();
    }
  }

  async isAssistEnabled() {
    return await this.page.getByRole('switch').isChecked();
  }

  async selectBorrowOnesMethod(method) {
    switch (method) {
      case 'breakTen':
        await this.page.getByRole('radio', { name: /破十法/ }).click();
        break;
      case 'bridgeTen':
        await this.page.getByRole('radio', { name: /平十法/ }).click();
        break;
      default:
        throw new Error(`未知 borrow method: ${method}`);
    }
  }

  async expectBorrowMethodDisabled() {
    const radios = this.page.getByRole('radio', { name: /破十法|平十法/ });
    const count = await radios.count();
    for (let i = 0; i < count; i++) {
      await expect(radios.nth(i)).toBeDisabled();
    }
  }

  async setCarryBorrowProbStars(stars) {
    // 1..3 星，星位为 .ant-rate li
    const li = this.page.locator('.ant-rate li').nth(stars - 1);
    await li.click();
  }

  /**
   * 滑动 Slider 到指定值。Ant Slider 可接受键盘左右调整 1 个单位，
   * 这里通过点击轨道 mark 位置或者聚焦后用 Home/End 大范围跳。当前仅支持点击
   * mark 点（20/50/100）。
   *
   * 由于 mark 是 0/20/50/100，且 step 为 null，不可滑入 marks 之外的值。
   */
  async setRange(value) {
    // Ant Slider 的 mark 文本节点是可定位的
    const mark = this.page.locator('.ant-slider-mark text, .ant-slider-mark span').filter({ hasText: String(value) });
    if (await mark.count() === 0) {
      throw new Error(`无法定位运算范围刻度 ${value}`);
    }
    await mark.click();
  }

  async setAddRatio(percent) {
    // 加法比例 Slider marks: 0/50/100 (全减/各半/全加)
    const label = percent === 0 ? '全减' : percent === 100 ? '全加' : percent === 50 ? '各半' : String(percent);
    const mark = this.page.locator('.ant-slider-mark text, .ant-slider-mark span').filter({ hasText: label });
    if (await mark.count() === 0) {
      throw new Error(`无法定位加法比例刻度 ${label}`);
    }
    await mark.click();
  }

  async clickStart() {
    await this.page.getByRole('button', { name: '开始训练' }).click();
  }

  async clickStats() {
    await this.page.getByRole('button', { name: '统计数据' }).click();
  }

  async reload() {
    await this.page.reload();
    await this.waitForReady();
  }
}