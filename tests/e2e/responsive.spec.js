import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { SessionPage } from './pages/SessionPage.js';
import { MathAssistPage } from './pages/MathAssistPage.js';
import { AssistPlayerPage } from './pages/AssistPlayerPage.js';
import { QuestionFinder } from './helpers/QuestionFinder.js';
import { MobileBlockerPage } from './pages/MobileBlockerPage.js';
import { ResultPage } from './pages/ResultPage.js';
import { StatsPage } from './pages/StatsPage.js';
import { CorrectionPage } from './pages/CorrectionPage.js';
import { setViewport, isNoHorizontalScroll, VIEWPORTS } from './helpers/viewport.js';

/**
 * Phase 7 § 5 响应式矩阵
 *
 * 预期标准：
 *   - 1440 / 1024 / 768 无横向溢出
 *   - 767px 显示移动端拦截层，文案「目前网站只支持电脑和 Pad 访问」
 *   - 767 → 768 不刷新，拦截层消失、应用内容恢复
 *   - 平板竖屏 ↔ 横屏不刷新，题目与输入值不重置
 *   - 结果、统计、订正等核心页面在 768px 无横向溢出
 *   - 退位演示卡片 768px 无水平溢出
 */
test.describe.serial('5. 响应式矩阵（767/768/1024/1440）', () => {
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
  /** @type {MobileBlockerPage} */
  let blocker;
  /** @type {ResultPage} */
  let result;
  /** @type {StatsPage} */
  let stats;
  /** @type {CorrectionPage} */
  let correction;

  test.beforeAll(async ({ browser }, testInfo) => {
    baseURL = testInfo.project.use.baseURL;
    const ctx = await browser.newContext({ viewport: VIEWPORTS.DESKTOP_WIDE });
    page = await ctx.newPage();
    home = new HomePage(page);
    settings = new SettingsPage(page);
    session = new SessionPage(page);
    assist = new MathAssistPage(page);
    player = new AssistPlayerPage(page);
    finder = new QuestionFinder(session);
    blocker = new MobileBlockerPage(page);
    result = new ResultPage(page);
    stats = new StatsPage(page);
    correction = new CorrectionPage(page);

    await home.goto(baseURL);
    await home.clickPractice();
    await settings.waitForReady();

    await settings.setAssistEnabled(true);
    await settings.setAddRatio(50);
    await settings.setCarryBorrowProbStars(3);
    await settings.selectQuestionCount(10);
    await settings.clickStart();
    await session.waitForReady();

    // 找退位题并进入演示（退位演示卡片更宽，适合溢出测试）
    await finder.untilQuestion((q) => finder.isBorrow(q));
    await assist.expand();
    await assist.showMethod();
    await player.waitForReady('borrow');
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test('01 - 1440px 退位演示 → 无横向溢出', async ({}, testInfo) => {
    await expect(page.getByRole('button', { name: '下一步' })).toBeVisible();
    expect(await isNoHorizontalScroll(page)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('responsive-01-1440-demo.png'), fullPage: true });
  });

  test('02 - 1024px → 无横向溢出、按钮可见', async ({}, testInfo) => {
    await setViewport(page, 'DESKTOP');
    await expect(page.getByRole('button', { name: '下一步' })).toBeVisible();
    expect(await isNoHorizontalScroll(page)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('responsive-02-1024-demo.png'), fullPage: true });
  });

  test('03 - 768px → 演示卡片无水平溢出', async ({}, testInfo) => {
    await setViewport(page, 'PAD_MIN');
    await expect(page.getByRole('button', { name: '下一步' })).toBeVisible();
    expect(await isNoHorizontalScroll(page)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('responsive-03-768-demo.png'), fullPage: true });
  });

  test('04 - 767px → 移动端拦截层出现', async ({}, testInfo) => {
    await setViewport(page, 'UNSUPPORTED');
    await blocker.expectBlocked();
    await expect(page.getByRole('button', { name: '下一步' })).toBeHidden();
    await page.screenshot({ path: testInfo.outputPath('responsive-04-767-blocked.png'), fullPage: true });
  });

  test('05 - 767 → 768 不刷新 → 拦截层消失、页面内容恢复', async () => {
    await setViewport(page, 'PAD_MIN');
    await page.waitForTimeout(500);
    await blocker.expectUnblocked();

    // 768px 使用已确认的短品牌，但应用顶栏和内容必须恢复。
    await expect(page.locator('.app-brand-short')).toHaveText('那些数');
    await expect(page.locator('.app-brand-short')).toBeVisible();
    await expect(page.getByRole('button', { name: /下一题/ })).toBeVisible();
    expect(await isNoHorizontalScroll(page)).toBe(true);
  });

  test('06 - 平板竖屏 ↔ 横屏不刷新 → 当前训练状态保留', async () => {
    // 回到设置页，开一轮新训练
    await setViewport(page, 'PAD_PORTRAIT');
    await page.goto(baseURL + '#/practice');
    await settings.waitForReady();
    await settings.clickStart();
    await session.waitForReady();

    const testInput = '123';
    await session.answer(testInput);
    const savedQ = await session.getCurrentQuestion();

    await setViewport(page, 'PAD_LANDSCAPE');
    expect(await session.getCurrentQuestion()).toEqual(savedQ);
    expect(await session.getInputValue()).toBe(testInput);
    expect(await isNoHorizontalScroll(page)).toBe(true);

    await setViewport(page, 'PAD_PORTRAIT');
    expect(await session.getCurrentQuestion()).toEqual(savedQ);
    expect(await session.getInputValue()).toBe(testInput);
  });

  test('07 - 768px 做题、结果、统计、订正 → 无横向溢出', async ({}, testInfo) => {
    let first = true;
    while (page.url().includes('/practice/session')) {
      const q = await session.getCurrentQuestion();
      if (!q) break;
      await session.answer(first ? finder.answer(q) + 1000 : finder.answer(q));
      first = false;
      await session.pressEnter();
      await page.waitForTimeout(250);
    }

    await result.waitForReady();
    expect(await isNoHorizontalScroll(page)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('responsive-07-768-result.png'), fullPage: true });

    await result.clickToStats();
    await stats.waitForReady();
    expect(await isNoHorizontalScroll(page)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('responsive-07-768-stats.png'), fullPage: true });

    await stats.clickLatestRecordCorrection();
    await correction.waitForReady();
    await expect(page.getByRole('heading', { name: '订正练习' })).toBeVisible();
    expect(await isNoHorizontalScroll(page)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('responsive-07-768-correction.png'), fullPage: true });
  });

  test('08 - 768px 设置页 + 首页回归截图', async ({}, testInfo) => {
    await page.goto(baseURL + '#/practice');
    await settings.waitForReady();
    await expect(page.getByText('运算范围')).toBeVisible();
    expect(await isNoHorizontalScroll(page)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('responsive-08-768-settings.png'), fullPage: true });

    await page.goto(baseURL + '#/');
    await expect(page.getByRole('heading', { name: '那年那数那些事', exact: true })).toBeVisible();
    expect(await isNoHorizontalScroll(page)).toBe(true);
  });
});
