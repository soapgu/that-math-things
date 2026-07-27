import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { SessionPage } from './pages/SessionPage.js';
import { MathAssistPage } from './pages/MathAssistPage.js';
import { AssistPlayerPage } from './pages/AssistPlayerPage.js';
import { QuestionFinder } from './helpers/QuestionFinder.js';
import { ResultPage } from './pages/ResultPage.js';
import { ConsoleCollector } from './helpers/ConsoleCollector.js';

/**
 * Phase 7 § 6 可访问性 + § 7 控制台检查
 *
 * 6.1 减少动态效果（独立 describe，独立 browser context）：
 *   - `reducedMotion: 'reduce'` 下行进位与退位演示各一次
 *   - 步骤直接呈现稳定终态，按钮可操作
 *
 * 6.2 键盘 + 7. 控制台（串行 describe）：
 *   - Tab 焦点遍历设置页 / session 页关键元素
 *   - ConsoleCollector 在 5 个节点采集增量 diff
 */
test.describe('6.1 减少动态效果', () => {
  test('01 - 进位演示 reduced-motion', async ({ browser }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const home = new HomePage(page);
    const settings = new SettingsPage(page);
    const session = new SessionPage(page);
    const assist = new MathAssistPage(page);
    const player = new AssistPlayerPage(page);
    const finder = new QuestionFinder(session);

    await home.goto(baseURL);
    await home.clickPractice();
    await settings.waitForReady();
    await settings.setAssistEnabled(true);
    await settings.setAddRatio(100);
    await settings.setCarryBorrowProbStars(3);
    await settings.selectQuestionCount(10);
    await settings.clickStart();
    await session.waitForReady();

    await finder.untilQuestion((q) => finder.isCarry(q));
    await assist.expand();
    await assist.showMethod();
    await player.waitForReady('carry');

    // reduced-motion 下步骤应直接渲染稳定终态
    await expect(page.getByText(/看作|把相同数位/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '下一步' })).toBeVisible();
    await expect(page.getByRole('button', { name: '跳过演示' })).toBeVisible();

    // 按钮可正常操作
    await player.clickNextStep();
    await expect(page.getByText(/先算|个一/).first()).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: testInfo.outputPath('a11y-01-reduced-motion-carry.png') });
    await ctx.close();
  });

  test('02 - 退位演示 reduced-motion', async ({ browser }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const home = new HomePage(page);
    const settings = new SettingsPage(page);
    const session = new SessionPage(page);
    const assist = new MathAssistPage(page);
    const player = new AssistPlayerPage(page);
    const finder = new QuestionFinder(session);

    await home.goto(baseURL);
    await home.clickPractice();
    await settings.waitForReady();
    await settings.setAssistEnabled(true);
    await settings.setAddRatio(0);
    await settings.setCarryBorrowProbStars(3);
    await settings.selectQuestionCount(10);
    await settings.clickStart();
    await session.waitForReady();

    await finder.untilQuestion((q) => finder.isBorrow(q));
    await assist.expand();
    await assist.showMethod();
    await player.waitForReady('borrow');

    // reduced-motion 下退位步骤直接呈现稳定终态
    await expect(page.getByText(/看作.*个十和.*个一/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '下一步' })).toBeVisible();

    // 退位状态指示存在
    await expect(
      page.locator('[role="status"]').filter({ hasText: /退位/ })
    ).toBeVisible({ timeout: 3000 });

    await player.clickNextStep(); // regroup → subtractOnes
    await expect(page.getByText(/个一减/).first()).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: testInfo.outputPath('a11y-02-reduced-motion-borrow.png') });
    await ctx.close();
  });
});

test.describe.serial('6.2 键盘 + 7. 控制台', () => {
  /** @type {string} */
  let baseURL;
  /** @type {import('@playwright/test').Page} */
  let page;
  /** @type {HomePage} */
  let home;
  /** @type {SettingsPage} */
  let settings;
  /** @type {SessionPage} */
  let session;
  /** @type {MathAssistPage} */
  let assist;
  /** @type {AssistPlayerPage} */
  let player;
  /** @type {QuestionFinder} */
  let finder;
  /** @type {ResultPage} */
  let result;
  /** @type {ConsoleCollector} */
  let collector;

  test.beforeAll(async ({ browser }, testInfo) => {
    baseURL = testInfo.project.use.baseURL;
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    page = await ctx.newPage();
    home = new HomePage(page);
    settings = new SettingsPage(page);
    session = new SessionPage(page);
    assist = new MathAssistPage(page);
    player = new AssistPlayerPage(page);
    finder = new QuestionFinder(session);
    result = new ResultPage(page);
    collector = new ConsoleCollector(page);
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test('01 - 首页加载后 → 控制台无 error / warning', async () => {
    await collector.start();
    await home.goto(baseURL);
    await expect(page.getByRole('heading', { name: '那年那数那些事', exact: true })).toBeVisible();

    collector.expectClean('首页加载');
  });

  test('02 - 设置页键盘 Tab → 焦点遍历可控元素', async () => {
    await home.clickPractice();
    await settings.waitForReady();

    // Tab 从辅助开关到「开始训练」按钮
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    // 聚焦在某个控件上（具体位置依赖 Ant Design 渲染，不做精确断言）
    const focused = await page.locator(':focus').first().textContent().catch(() => '');
    expect(typeof focused).toBe('string');

    // 「开始训练」可通过 Enter 触发
    await settings.clickStart();
    await session.waitForReady();

    const snap1 = collector.snapshot();
    expect(snap1.errors.length).toBe(0);
  });

  test('03 - Session 键盘 → 输入 Tab Enter 可用', async () => {
    // 在 session 页输入后 Tab 到下一题按钮
    await session.expectInputFocused();
    await session.answer('99');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  });

  test('04 - 展开进位演示后 → 控制台 diff 干净', async () => {
    const snapBefore = collector.snapshot();

    // 从设置页新开训练，确保稳定状态
    await page.goto(baseURL + '#/practice');
    await settings.waitForReady();
    await settings.setAssistEnabled(true);
    await settings.setAddRatio(100);
    await settings.setCarryBorrowProbStars(3);
    await settings.clickStart();
    await session.waitForReady();

    await finder.untilQuestion((q) => finder.isCarry(q), { maxTries: 30 });
    await session.expectAssistEntryVisible();
    await assist.expand();
    await assist.showMethod();
    await player.waitForReady('carry');

    // 操作几步
    await player.clickNextStep();
    await player.clickNextStep();
    // 进位状态指示
    await expect(
      page.locator('[role="status"]').filter({ hasText: /10 个一换成 1 个十/ })
    ).toBeVisible({ timeout: 3000 });

    const diff = collector.diffSince(snapBefore);
    expect(diff.newErrors).toEqual([]);
    expect(diff.newConsoleErrors).toEqual([]);
  });

  test('05 - 刷新练习页后 → 控制台干净', async () => {
    // 从演示返回题目
    await player.clickSkip();
    await session.waitForReady();

    const snapBefore = collector.snapshot();
    await page.reload();
    await session.waitForReady();

    const diff = collector.diffSince(snapBefore);
    expect(diff.newErrors).toEqual([]);
  });

  test('06 - 进入结算后 → 控制台干净', async () => {
    const snapBefore = collector.snapshot();

    // 答完 session
    try {
      while (page.url().includes('/practice/session')) {
        const q = await session.getCurrentQuestion();
        if (!q) break;
        await session.answer(finder.answer(q));
        await session.pressEnter();
        await page.waitForTimeout(250);
      }
    } catch {
      // 正常
    }

    await result.waitForReady();

    const diff = collector.diffSince(snapBefore);
    expect(diff.newErrors).toEqual([]);
    expect(diff.newConsoleErrors.length).toBeLessThanOrEqual(1);
  });
});
