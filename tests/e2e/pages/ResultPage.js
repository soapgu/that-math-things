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
  constructor(page) {
    this.page = page;
  }

  async waitForReady() {
    await this.page.getByRole('heading', { name: '练习结果' })
      .waitFor({ state: 'visible', timeout: 10000 });
  }

  async _contentText() {
    return this.page.locator('.ant-layout-content').textContent();
  }

  async getScore() {
    const t = await this._contentText();
    return parseInt(t.match(/(\d+)\s*分/)?.[1] || '0', 10);
  }

  /**
   * 通过 Ant Statistic 的 title 定位 value，更稳定。
   * 返回 { correct, wrong, total }。
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

  async getTimeSpentText() {
    const wrapper = this.page.locator('.ant-statistic', { hasText: '用时' }).first();
    const value = wrapper.locator('.ant-statistic-content-value').first();
    return (await value.textContent())?.trim() || '';
  }

  /**
   * 辅助摘要 { independent, reminder, method }。
   * 如果页面未展示卡片（本轮无 eligible 题），返回 null。
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
   * 断言本轮题目精要字符串出现在错题详情里。形如 "19 + 24" 或 "32 − 24"。
   */
  async expectErrorDetail(questionDisplay) {
    const t = await this._contentText();
    if (!t.includes(questionDisplay)) {
      throw new Error(`未在错题详情中找到目标题目：${questionDisplay}`);
    }
  }

  /**
   * 等级（综合评价）：UR / SSR / SR / R / N。
   */
  async getCompositeGrade() {
    const t = await this._contentText();
    const m = t.match(/\b(UR|SSR|SR|R|N)\b/);
    return m?.[1] || null;
  }

  // —— 兼容旧 minimal 调用
  async getAssistSummary() { return await this._contentText(); }

  // —— 跳转按钮（均带 Ant 图标，a11y 名形如 "reload 再来一次"，故用子串匹配）
  async clickPracticeAgain() { await this.page.getByRole('button', { name: '再来一次' }).click(); }
  async clickToCorrection()  { await this.page.getByRole('button', { name: '订正' }).click(); }
  async clickToStats()       { await this.page.getByRole('button', { name: '统计数据' }).click(); }
  async clickHome()          { await this.page.getByRole('button', { name: '返回首页' }).click(); }
}