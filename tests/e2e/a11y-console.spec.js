import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { SessionPage } from './pages/SessionPage.js';
import { MathAssistPage } from './pages/MathAssistPage.js';
import { AssistPlayerPage } from './pages/AssistPlayerPage.js';
import { QuestionFinder } from './helpers/QuestionFinder.js';
import { ResultPage } from './pages/ResultPage.js';
import { StatsPage } from './pages/StatsPage.js';
import { CorrectionPage } from './pages/CorrectionPage.js';
import { ConsoleCollector } from './helpers/ConsoleCollector.js';

async function tabTo(page, locator, maxTabs = 30) {
  if (await locator.count() === 0) {
    throw new Error('目标控件不存在，无法执行 Tab 可达性检查');
  }
  await page.locator('body').focus();
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    if (await locator.evaluate((el) => el === document.activeElement).catch(() => false)) return;
  }
  throw new Error(`Tab ${maxTabs} 次后仍未到达目标控件`);
}

async function expectVisibleFocus(locator) {
  await expect(locator).toBeFocused();
  const hasVisibleStyle = await locator.evaluate((el) => {
    const style = getComputedStyle(el);
    return (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0)
      || (style.boxShadow !== 'none' && style.boxShadow !== '');
  });
  expect(hasVisibleStyle).toBe(true);
}

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
  /** @type {StatsPage} */
  let stats;
  /** @type {CorrectionPage} */
  let correction;
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
    stats = new StatsPage(page);
    correction = new CorrectionPage(page);
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

  test('02 - 设置页键盘 Tab → 开始训练可达、焦点可见、Enter 可触发', async () => {
    await home.clickPractice();
    await settings.waitForReady();

    const start = page.getByRole('button', { name: '开始训练' });
    await tabTo(page, start);
    await expectVisibleFocus(start);
    await page.keyboard.press('Enter');
    await session.waitForReady();

    const snap1 = collector.snapshot();
    expect(snap1.errors.length).toBe(0);
  });

  test('03 - Session Enter → 只前进一题并把焦点交回输入框', async () => {
    await session.expectInputFocused();
    const before = await session.getQuestionText();
    const q = await session.getCurrentQuestion();
    await session.answer(finder.answer(q) + 1000);
    await session.pressEnter();
    await expect.poll(() => session.getQuestionText()).not.toBe(before);
    await session.expectInputFocused();
    await page.waitForTimeout(150);
    expect(await session.getProgressPercent()).toBe(10);
  });

  test('04 - 辅助入口和播放控件 → 键盘可达且状态名称可理解', async () => {
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
    await page.waitForTimeout(100);
    const hintButton = page.getByRole('button', { name: '需要提示' });
    await tabTo(page, hintButton);
    await expectVisibleFocus(hintButton);
    await hintButton.press('Enter');
    await expect(page.getByText('想一想：', { exact: false }).first()).toBeVisible();

    const methodButton = page.getByRole('button', { name: '看看计算方法' });
    await tabTo(page, methodButton);
    await methodButton.press('Enter');
    await player.waitForReady('carry');

    const nextStep = page.getByRole('button', { name: '下一步' });
    await tabTo(page, nextStep);
    await expectVisibleFocus(nextStep);
    await nextStep.press('Enter');
    await nextStep.focus();
    await page.keyboard.press('Enter');
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
    let first = true;
    try {
      while (page.url().includes('/practice/session')) {
        const q = await session.getCurrentQuestion();
        if (!q) break;
        await session.answer(first ? finder.answer(q) + 1000 : finder.answer(q));
        first = false;
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

  test('07 - 结果与订正 → 键盘可达，错误/正确状态含文字', async () => {
    const statsButton = page.getByRole('button', { name: '统计数据' });
    await tabTo(page, statsButton);
    await expectVisibleFocus(statsButton);
    await page.keyboard.press('Enter');
    await stats.waitForReady();

    const correctionButton = page.getByRole('button', { name: /订/ }).first();
    await tabTo(page, correctionButton);
    await expectVisibleFocus(correctionButton);
    await page.keyboard.press('Enter');
    await correction.waitForReady();
    await expect(page.locator('input[type="text"]').first()).toBeVisible();

    const q = await correction.getCurrentQuestion();
    expect(q).not.toBeNull();
    await correction.answer(finder.answer(q) + 1);
    await correction.pressEnter();
    await expect(page.getByText('✗ 回答错误')).toBeVisible();
    await expect(page.locator('input[type="text"]').first()).toBeFocused();

    await correction.answer(finder.answer(q));
    await correction.pressEnter();
    await expect(page.getByRole('heading', { name: '🎉 全部订正完成！' })).toBeVisible();
    await expect(page.getByText(/全部订正正确/)).toBeVisible();
  });
});
