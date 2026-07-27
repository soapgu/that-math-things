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
  constructor(page) {
    this.page = page;
  }

  // —— 容器定位（保留 kind 参数，值 'carry' | 'borrow'）

  sectionLocator(kind) {
    const label = kind === 'carry' ? '进位计算演示' : '退位计算演示';
    return this.page.locator(`section[aria-label="${label}"]`);
  }

  async waitForReady(kind) {
    const section = this.sectionLocator(kind);
    await section.waitFor({ state: 'visible', timeout: 10000 });
  }

  // —— 速度档

  async setSpeed(speed) {
    await this.page.getByText(SPEED_LABELS[speed], { exact: true }).click();
  }

  /**
   * 返回当前选中的速度档文案。例如 "快 5秒"。
   */
  async getCurrentSpeedLabel() {
    const selected = this.page.locator('.ant-segmented-item-selected').first();
    return (await selected.textContent())?.trim() || '';
  }

  /**
   * 期望当前选中的速度档精确匹配指定 speed。
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
   * 解析 Progress 的 aria-label：形如 "第 1 步，共 5 步"，返回 { idx, total }。
   */
  async getStepInfo() {
    const progress = this.page.locator('.ant-progress[aria-label]').first();
    const label = await progress.getAttribute('aria-label');
    const m = label?.match(/第\s*(\d+)\s*步.*?共\s*(\d+)\s*步/);
    if (!m) return { idx: 0, total: 0 };
    return { idx: parseInt(m[1], 10), total: parseInt(m[2], 10) };
  }

  /**
   * 读取 aria-live=polite 容器中当前步骤的展示文本。
   */
  async getStepText() {
    const live = this.page.locator('[aria-live="polite"]').first();
    return (await live.textContent())?.trim() || '';
  }

  async expectExpression(expr) {
    await expect(this.page.locator('code').filter({ hasText: expr }).first()).toBeVisible();
  }

  async getProgressPercent() {
    // AssistAnimationPlayer 的 Progress 也在 section 内；用 aria-valuenow 稳健跨 Ant 版本
    const bar = this.page.getByRole('progressbar').first();
    if (!(await bar.count())) return 0;
    const v = await bar.getAttribute('aria-valuenow');
    return v ? parseFloat(v) : 0;
  }

  // —— 控制按钮（AssistAnimationPlayer 中按钮均为 plain Button 无图标）

  async clickPrevStep()   { await this.page.getByRole('button', { name: '上一步' }).click(); }
  async clickNextStep()   { await this.page.getByRole('button', { name: '下一步' }).click(); }
  async clickSkip()       { await this.page.getByRole('button', { name: '跳过演示' }).click(); }
  async clickReplay()     { await this.page.getByRole('button', { name: '重新播放' }).click(); }
  async clickReturnToQ()  { await this.page.getByRole('button', { name: '回到题目' }).click(); }

  async isFirstStepPrevDisabled() {
    return await this.page.getByRole('button', { name: '上一步' }).first().isDisabled();
  }

  async isNextStepVisible() {
    return await this.page.getByRole('button', { name: '下一步' }).first().isVisible().catch(() => false);
  }

  async isReturnButtonVisible() {
    return await this.page.getByRole('button', { name: '回到题目' }).first().isVisible().catch(() => false);
  }

  /**
   * 手动操作当前步骤：等自动进入下一步或点「下一步」一次。
   * 用于「打断计时器」验证：点击后应清除定时器，不立即再跳。
   */
  async manualNext() {
    await this.clickNextStep();
  }
}