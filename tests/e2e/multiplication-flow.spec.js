import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';
import { MultiplicationSettingsPage } from './pages/MultiplicationSettingsPage.js';
import { MultiplicationSessionPage } from './pages/MultiplicationSessionPage.js';
import { MultiplicationResultPage } from './pages/MultiplicationResultPage.js';
import { ConsoleCollector } from './helpers/ConsoleCollector.js';

const SENTINEL = JSON.stringify([{ id: 'multiplication-e2e-sentinel', total: 7 }]);

async function createMultiplicationPage(browser, baseURL, options = {}) {
  const context = await browser.newContext({ reducedMotion: 'reduce', ...options });
  const page = await context.newPage();
  const collector = new ConsoleCollector(page);
  await collector.start();
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.evaluate((value) => localStorage.setItem('practice-records', value), SENTINEL);
  return { context, page, collector };
}

for (const difficulty of ['easy', 'medium', 'hard']) {
  test(`${difficulty}：真实完成10题并结算`, async ({ browser }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const { context, page, collector } = await createMultiplicationPage(browser, baseURL);
    const settings = new MultiplicationSettingsPage(page);
    const session = new MultiplicationSessionPage(page);
    const result = new MultiplicationResultPage(page);

    await settings.goto(baseURL);
    await settings.selectDifficulty(difficulty);
    await settings.selectQuestionCount(10);
    await settings.start();
    await session.waitForReady();
    await expect(session.root).toHaveAttribute('data-difficulty', difficulty);

    await session.completeRound({ wrongAt: new Set([2]), useEnterAt: new Set([3]) });
    await expect(session.root).toHaveAttribute('data-session-phase', 'FINISHED');
    await expect(session.answeredCellCount()).resolves.toBe(10);
    await page.waitForTimeout(2100);
    await expect(page).toHaveURL(/#\/multiplication\/session/);
    await session.viewResult();
    await result.waitForReady();
    await expect(page.getByText('90', { exact: true })).toBeVisible();
    await expect(page.getByText('/ 10', { exact: true })).toBeVisible();

    expect(await page.evaluate(() => localStorage.getItem('practice-records'))).toBe(SENTINEL);
    if (difficulty === 'hard') {
      await page.reload();
      await settings.waitForReady();
      await expect(page).toHaveURL(/#\/multiplication$/);
    }
    collector.expectClean(`${difficulty} 10题闭环`);
    await context.close();
  });
}

test('首页入口、再来一局和返回设置', async ({ browser }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL;
  const { context, page, collector } = await createMultiplicationPage(browser, baseURL);
  const home = new HomePage(page);
  const settings = new MultiplicationSettingsPage(page);
  const session = new MultiplicationSessionPage(page);
  const result = new MultiplicationResultPage(page);

  await home.goto(baseURL);
  await home.clickMultiplication();
  await settings.waitForReady();
  await settings.start();
  await session.completeRound();
  await session.viewResult();
  await result.expectPerfect(10);

  await result.replay();
  await session.waitForReady();
  await expect(session.getProgress()).resolves.toEqual({ current: 1, total: 10 });
  await expect(session.answeredCellCount()).resolves.toBe(0);
  await page.getByRole('menuitem', { name: '九九乘法' }).click();
  await expect(page.getByRole('dialog', { name: '确定离开本局吗？' })).toBeVisible();
  await page.getByRole('button', { name: '确认离开' }).click();
  await settings.waitForReady();

  expect(await page.evaluate(() => localStorage.getItem('practice-records'))).toBe(SENTINEL);
  collector.expectClean('首页、重玩与离开');
  await context.close();
});

test('20题和50题配置、离开保护及刷新回退', async ({ browser }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL;
  const { context, page, collector } = await createMultiplicationPage(browser, baseURL);
  const home = new HomePage(page);
  const settings = new MultiplicationSettingsPage(page);
  const session = new MultiplicationSessionPage(page);

  for (const count of [20, 50]) {
    await home.goto(baseURL);
    await home.clickMultiplication();
    await settings.waitForReady();
    await settings.selectQuestionCount(count);
    await settings.start();
    await session.waitForReady();
    await expect(session.getProgress()).resolves.toEqual({ current: 1, total: count });

    await page.evaluate(() => history.back());
    await expect(page.getByRole('dialog', { name: '确定离开本局吗？' })).toBeVisible();
    await page.getByRole('button', { name: '继续闯关' }).click();
    await session.waitForReady();
    await expect(session.getProgress()).resolves.toEqual({ current: 1, total: count });

    page.once('dialog', (dialog) => dialog.accept());
    await page.reload();
    await settings.waitForReady();
    await expect(page).toHaveURL(/#\/multiplication$/);
  }

  collector.expectClean('20/50题与路由保护');
  await context.close();
});
