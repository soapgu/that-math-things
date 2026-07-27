import { expect } from '@playwright/test';

/**
 * 进位/退位方法演示 Page Object。
 *
 * 关键 UI 节点（src/components/practice/MathAssist/AssistAnimationPlayer.jsx）：
 *   - <section aria-label="进位计算演示" | "退位计算演示">
 *   - 顶部 Segmented speed control：快 5秒 / 中 10秒 / 慢 20秒
 *     （Ant Segmented 的 ant-segmented-item-selected 标识当前选中）
 *   - Progress 区：aria-label="第 N 步，共 M 步"
 *   - aria-live="polite" 容器渲染 step.text + step.expression（code 标签）
 *   - 按钮：跳过演示 / 上一步 / 下一步 / 重新播放 / 回到题目
 *     未到末步显示「跳过演示 + 上一步(>=1 才可点) + 下一步」
 *     到末步显示「上一步 + 重新播放 + 回到题目」
 */

export const SPEED_LABELS = { fast: '快 5秒', medium: '中 10秒', slow: '慢 20秒' };

export class AssistPlayerPage {
  /**
   * @param {import('@playwright/test').Page} page Playwright 页面。
   */
  constructor(page) {
    this.page = page;
  }

  // —— 容器定位

  /**
   * 获取演示 section 的 Locator。
   * @param {'carry' | 'borrow'} kind 进位或退位。
   * @returns {import('@playwright/test').Locator}
   */
  sectionLocator(kind) {
    const label = kind === 'carry' ? '进位计算演示' : '退位计算演示';
    return this.page.locator(`section[aria-label="${label}"]`);
  }

  /**
   * 等待演示 section 渲染完成。
   * @param {'carry' | 'borrow'} kind 进位或退位。
   * @returns {Promise<void>}
   */
  async waitForReady(kind) {
    const section = this.sectionLocator(kind);
    await section.waitFor({ state: 'visible', timeout: 10000 });
  }

  // —— 速度档

  /**
   * 选择自动播放速度。
   * @param {'fast' | 'medium' | 'slow'} speed 快/中/慢。
   * @returns {Promise<void>}
   */
  async setSpeed(speed) {
    await this.page.getByText(SPEED_LABELS[speed], { exact: true }).click();
  }

  /**
   * 获取当前选中的速度档文案（如 "快 5秒"）。
   * @returns {Promise<string>}
   */
  async getCurrentSpeedLabel() {
    const selected = this.page.locator('.ant-segmented-item-selected').first();
    return (await selected.textContent())?.trim() || '';
  }

  /**
   * 断言当前速度档匹配预期值。
   * @param {'fast' | 'medium' | 'slow'} speed 预期速度档。
   * @returns {Promise<void>}
   */
  async expectSpeed(speed) {
    const want = SPEED_LABELS[speed];
    const got = await this.getCurrentSpeedLabel();
    if (got !== want) {
      throw new Error(`预期 speed=${want}，实际 ${got}`);
    }
  }

  // —— 步骤与表达式

  /**
   * 解析 Progress aria-label，返回当前步骤序号与总数。
   * @returns {Promise<{idx: number, total: number}>}
   */
  async getStepInfo() {
    const progress = this.page.locator('.ant-progress[aria-label]').first();
    const label = await progress.getAttribute('aria-label');
    const m = label?.match(/第\s*(\d+)\s*步.*?共\s*(\d+)\s*步/);
    if (!m) return { idx: 0, total: 0 };
    return { idx: parseInt(m[1], 10), total: parseInt(m[2], 10) };
  }

  /**
   * 读取 aria-live 容器中当前步骤的展示文本。
   * @returns {Promise<string>}
   */
  async getStepText() {
    const live = this.page.locator('[aria-live="polite"]').first();
    return (await live.textContent())?.trim() || '';
  }

  /**
   * 断言指定算式表达式在 code 标签中可见。
   * @param {string} expr 算式表达式。
   * @returns {Promise<void>}
   */
  async expectExpression(expr) {
    await expect(this.page.locator('code').filter({ hasText: expr }).first()).toBeVisible();
  }

  /**
   * 获取 Progress 百分比数值。
   * @returns {Promise<number>}
   */
  async getProgressPercent() {
    const bar = this.page.getByRole('progressbar').first();
    if (!(await bar.count())) return 0;
    const v = await bar.getAttribute('aria-valuenow');
    return v ? parseFloat(v) : 0;
  }

  // —— 控制按钮

  /**
   * 点击「上一步」。
   * @returns {Promise<void>}
   */
  async clickPrevStep()   { await this.page.getByRole('button', { name: '上一步' }).click(); }

  /**
   * 点击「下一步」。
   * @returns {Promise<void>}
   */
  async clickNextStep()   { await this.page.getByRole('button', { name: '下一步' }).click(); }

  /**
   * 点击「跳过演示」。
   * @returns {Promise<void>}
   */
  async clickSkip()       { await this.page.getByRole('button', { name: '跳过演示' }).click(); }

  /**
   * 点击「重新播放」。
   * @returns {Promise<void>}
   */
  async clickReplay()     { await this.page.getByRole('button', { name: '重新播放' }).click(); }

  /**
   * 点击「回到题目」。
   * @returns {Promise<void>}
   */
  async clickReturnToQ()  { await this.page.getByRole('button', { name: '回到题目' }).click(); }

  /**
   * 首步时「上一步」是否 disabled。
   * @returns {Promise<boolean>}
   */
  async isFirstStepPrevDisabled() {
    return await this.page.getByRole('button', { name: '上一步' }).first().isDisabled();
  }

  /**
   * 「下一步」按钮是否可见。
   * @returns {Promise<boolean>}
   */
  async isNextStepVisible() {
    return await this.page.getByRole('button', { name: '下一步' }).first().isVisible().catch(() => false);
  }

  /**
   * 「回到题目」按钮是否可见。
   * @returns {Promise<boolean>}
   */
  async isReturnButtonVisible() {
    return await this.page.getByRole('button', { name: '回到题目' }).first().isVisible().catch(() => false);
  }

  /**
   * 手动触发「下一步」（用于打断自动播放计时器）。
   * @returns {Promise<void>}
   */
  async manualNext() {
    await this.clickNextStep();
  }
}
