import { expect } from '@playwright/test';

/**
 * 结算页 Page Object。
 *
 * UI 关键节点（src/pages/Practice/Result/index.jsx）:
 *   - 标题「练习结果」
 *   - 得分卡片：大数字 score + "分"，下方三个 Statistic: 正确 / 错误 / 用时
 *   - 辅助摘要卡片（assistSummary.eligible > 0 才显示）：
 *       独立完成 / 只看提醒 / 查看方法，suffix 「题」
 *   - 错误分析卡片（有错才显示）：Tag 文案 "类型 ×次数"
 *   - 逐题详情 Card
 *   - 按钮区：再来一次 / 订正(有错才显示) / 统计数据 / 返回首页
 */
export class ResultPage {
  /**
   * @param {import('@playwright/test').Page} page Playwright 页面。
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * 等待结算页渲染完成。
   * @returns {Promise<void>}
   */
  async waitForReady() {
    await this.page.getByRole('heading', { name: '练习结果' })
      .waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * @returns {Promise<string>}
   */
  async _contentText() {
    return this.page.locator('.ant-layout-content').textContent();
  }

  /**
   * 获取得分数字。
   * @returns {Promise<number>}
   */
  async getScore() {
    const t = await this._contentText();
    return parseInt(t.match(/(\d+)\s*分/)?.[1] || '0', 10);
  }

  /**
   * 获取正确/错误题数。
   * @returns {Promise<{correct: number, wrong: number}>}
   */
  async getCorrectWrong() {
    const getByTitle = async (title) => {
      const wrapper = this.page.locator('.ant-statistic', { hasText: title }).first();
      const value = wrapper.locator('.ant-statistic-content-value').first();
      return (await value.textContent())?.trim() || '';
    };
    const correctText = await getByTitle('正确');
    const wrongText  = await getByTitle('错误');
    const correct = parseInt(correctText.match(/(\d+)/)?.[1] || '0', 10);
    const wrong  = parseInt(wrongText.match(/(\d+)/)?.[1] || '0', 10);
    return { correct, wrong };
  }

  /**
   * 获取用时文本。
   * @returns {Promise<string>}
   */
  async getTimeSpentText() {
    const wrapper = this.page.locator('.ant-statistic', { hasText: '用时' }).first();
    const value = wrapper.locator('.ant-statistic-content-value').first();
    return (await value.textContent())?.trim() || '';
  }

  /**
   * 获取辅助使用摘要（独立完成/只看提醒/查看方法各几题）。
   * 本轮无 eligible 题时返回 null。
   * @returns {Promise<null|{independent: number, reminder: number, method: number}>}
   */
  async getAssistCounts() {
    const card = this.page.locator('.ant-card', { hasText: '辅助使用情况' }).first();
    if (!(await card.isVisible().catch(() => false))) return null;

    const getByTitle = async (title) => {
      const s = card.locator('.ant-statistic', { hasText: title }).first();
      const v = s.locator('.ant-statistic-content-value').first();
      return parseInt((await v.textContent())?.match(/(\d+)/)?.[1] || '0', 10);
    };
    return {
      independent: await getByTitle('独立完成'),
      reminder: await getByTitle('只看提醒'),
      method: await getByTitle('查看方法'),
    };
  }

  /**
   * 断言错题详情中包含指定题目。
   * @param {string} questionDisplay 题目精要字符串（如 "19 + 24"）。
   * @returns {Promise<void>}
   */
  async expectErrorDetail(questionDisplay) {
    const t = await this._contentText();
    if (!t.includes(questionDisplay)) {
      throw new Error(`未在错题详情中找到目标题目：${questionDisplay}`);
    }
  }

  /**
   * 获取综合评价等级（UR / SSR / SR / R / N）。
   * @returns {Promise<string|null>}
   */
  async getCompositeGrade() {
    const t = await this._contentText();
    const m = t.match(/\b(UR|SSR|SR|R|N)\b/);
    return m?.[1] || null;
  }

  /** @returns {Promise<string>} */
  async getAssistSummary() { return await this._contentText(); }

  // —— 跳转按钮

  /**
   * 点击「再来一次」按钮。
   * @returns {Promise<void>}
   */
  async clickPracticeAgain() { await this.page.getByRole('button', { name: '再来一次' }).click(); }

  /**
   * 点击「订正」按钮。
   * @returns {Promise<void>}
   */
  async clickToCorrection()  { await this.page.getByRole('button', { name: '订正' }).click(); }

  /**
   * 点击「统计数据」按钮。
   * @returns {Promise<void>}
   */
  async clickToStats()       { await this.page.getByRole('button', { name: '统计数据' }).click(); }

  /**
   * 点击「返回首页」按钮。
   * @returns {Promise<void>}
   */
  async clickHome()          { await this.page.getByRole('button', { name: '返回首页' }).click(); }
}
