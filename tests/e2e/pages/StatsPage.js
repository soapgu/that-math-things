import { expect } from '@playwright/test';

/**
 * 统计数据页 Page Object。
 *
 * 关键节点（src/pages/Practice/Stats/index.jsx）：
 *   - 标题「统计数据」
 *   - 顶部 4 个 Statistic：练习次数 / 总题数 / 平均分 / 最高分
 *   - ECharts：综合评价趋势 / 错误分布 / 分数趋势
 *   - 历史记录卡片：每条记录为 role="listitem"，含「详情」「订正」按钮
 */
export class StatsPage {
  constructor(page) {
    this.page = page;
  }

  async waitForReady() {
    await this.page.getByRole('heading', { name: '统计数据' })
      .waitFor({ state: 'visible', timeout: 10000 });
  }

  // —— 顶部 Statistic

  async getTotalPractices() {
    return this._readStatisticValue('练习次数');
  }
  async getTotalQuestions() {
    return this._readStatisticValue('总题数');
  }
  async getAvgScore() {
    return this._readStatisticValue('平均分');
  }
  async getBestScore() {
    return this._readStatisticValue('最高分');
  }

  async _readStatisticValue(title) {
    const s = this.page.locator('.ant-statistic', { hasText: title }).first();
    const v = s.locator('.ant-statistic-content-value').first();
    return (await v.textContent())?.trim() || '';
  }

  // —— 历史记录

  /**
   * 返回可见历史记录条数（role="listitem" 在「历史记录」卡片内）。
   */
  async getRecordCount() {
    const card = this.page.locator('.ant-card', { hasText: '历史记录' }).first();
    if (!(await card.isVisible().catch(() => false))) return 0;
    return card.locator('[role="listitem"]').count();
  }

  async clickLatestRecordDetail() {
    await this.page.getByRole('button', { name: '详情' }).first().click();
  }

  async clickLatestRecordCorrection() {
    // 「订正」按钮只在有错的记录里出现；找到第一个可见的
    const btn = this.page.getByRole('button', { name: '订正' }).first();
    await btn.click();
  }

  async clickRecordDetailByIndex(i) {
    const btns = this.page.getByRole('button', { name: '详情' });
    await btns.nth(i).click();
  }

  // —— 兼容旧调用名：clickLatestRecord 仍点详情、clickCorrection 仍点订正
  async clickLatestRecord() {
    return this.clickLatestRecordDetail();
  }
  async clickCorrection() {
    return this.clickLatestRecordCorrection();
  }
}