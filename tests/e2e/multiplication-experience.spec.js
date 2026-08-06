import { test, expect } from '@playwright/test';
import { MultiplicationSettingsPage } from './pages/MultiplicationSettingsPage.js';
import { MultiplicationSessionPage } from './pages/MultiplicationSessionPage.js';
import { MultiplicationResultPage } from './pages/MultiplicationResultPage.js';
import { ConsoleCollector } from './helpers/ConsoleCollector.js';
import { isNoHorizontalScroll } from './helpers/viewport.js';

test('普通动效：滑块、光束、显数、格内替换和自动切题', async ({ browser }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL;
  const context = await browser.newContext({ reducedMotion: 'no-preference', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const collector = new ConsoleCollector(page);
  await collector.start();
  const settings = new MultiplicationSettingsPage(page);
  const session = new MultiplicationSessionPage(page);

  await settings.goto(baseURL);
  await settings.start();
  await expect(session.root).toHaveAttribute('data-session-phase', 'LOCATING');
  await expect(session.matrix).toHaveAttribute('data-locate-stage', /idle|sliding/);
  await expect(page.locator('.multiplication-choices')).toHaveCount(0);
  await expect(session.matrix).toHaveAttribute('data-locate-stage', 'firing', { timeout: 1000 });
  await expect.poll(() => session.matrix.locator('[data-kind="hint"]').count()).toBeGreaterThan(0);
  await session.waitForReady();
  await expect(session.matrix.locator('[data-kind="hint"]')).toHaveCount(16);

  const before = await session.matrix.boundingBox();
  const first = await session.submitCorrect();
  const after = await session.matrix.boundingBox();
  expect(after).toEqual(before);
  if (first.a !== first.b) {
    await expect(session.matrix.locator('[data-kind="symmetric"]')).toHaveCount(1);
  }
  await expect.poll(async () => (await session.getProgress()).current, { timeout: 3500 }).toBe(2);
  await session.waitForReady();

  await page.getByRole('menuitem').filter({ hasText: '九九乘法' }).click();
  await page.getByRole('button', { name: '确认离开' }).click();
  await settings.selectDifficulty('medium');
  await settings.start();
  await session.waitForReady();
  const question = await session.getQuestion();
  const input = page.getByRole('textbox', { name: `${question.a}乘${question.b}的答案` });
  await input.fill(String(question.answer + 1));
  await input.press('Enter');
  await expect(session.matrix.locator('[data-feedback-stage="submitted"]')).toHaveCount(1);
  await expect(session.matrix.locator('[data-feedback-stage="result"]')).toHaveCount(1, { timeout: 1000 });

  collector.expectClean('普通动效时序');
  await context.close();
});

const viewportCases = [
  { name: '768×1024', viewport: { width: 768, height: 1024 }, difficulty: 'easy', hintRange: [16, 16] },
  { name: '1024×768', viewport: { width: 1024, height: 768 }, difficulty: 'medium', hintRange: [2, 4] },
  { name: '1440×900', viewport: { width: 1440, height: 900 }, difficulty: 'hard', hintRange: [0, 0] },
];

for (const { name, viewport, difficulty, hintRange } of viewportCases) {
  test(`${name}：布局稳定、难度提示正确并完成结算`, async ({ browser }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport });
    const page = await context.newPage();
    const collector = new ConsoleCollector(page);
    await collector.start();
    const settings = new MultiplicationSettingsPage(page);
    const session = new MultiplicationSessionPage(page);
    const result = new MultiplicationResultPage(page);

    await settings.goto(baseURL);
    await expect(page.getByRole('menuitem')).toHaveCount(4);
    expect(await isNoHorizontalScroll(page)).toBe(true);
    await settings.selectDifficulty(difficulty);
    await settings.start();
    await session.waitForReady();

    const hintCount = await session.matrix.locator('[data-kind="hint"]').count();
    expect(hintCount).toBeGreaterThanOrEqual(hintRange[0]);
    expect(hintCount).toBeLessThanOrEqual(hintRange[1]);
    const matrixBox = await session.matrix.boundingBox();
    const panelBox = await page.locator('.multiplication-answer-panel').boundingBox();
    expect(matrixBox.x).toBeGreaterThanOrEqual(0);
    expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width);
    expect(matrixBox.width).toBeGreaterThanOrEqual(430);
    expect(await isNoHorizontalScroll(page)).toBe(true);

    const before = await session.matrix.boundingBox();
    await session.submitCorrect({ enter: difficulty !== 'easy' });
    expect(await session.matrix.boundingBox()).toEqual(before);
    await session.next(1);
    await session.completeRound();
    await session.viewResult();
    await result.expectPerfect(10);
    expect(await isNoHorizontalScroll(page)).toBe(true);
    collector.expectClean(`${name} 响应式`);
    await context.close();
  });
}

test('键盘、焦点、播报、矩阵语义和离开确认', async ({ browser }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL;
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1024, height: 768 } });
  const page = await context.newPage();
  const collector = new ConsoleCollector(page);
  await collector.start();
  const settings = new MultiplicationSettingsPage(page);
  const session = new MultiplicationSessionPage(page);

  await settings.goto(baseURL);
  const hard = page.locator('[data-difficulty="hard"]');
  await hard.focus();
  await page.keyboard.press('Enter');
  await expect(hard).toHaveAttribute('aria-pressed', 'true');
  const start = page.getByRole('button', { name: '开始闯关' });
  await start.focus();
  await page.keyboard.press('Enter');
  await session.waitForReady();

  await expect(session.matrix.getByRole('row')).toHaveCount(10);
  await expect(session.matrix.getByRole('columnheader')).toHaveCount(10);
  await expect(session.matrix.getByRole('rowheader')).toHaveCount(9);
  await expect(session.matrix.getByRole('gridcell')).toHaveCount(81);
  const question = await session.getQuestion();
  const input = page.getByRole('textbox', { name: `${question.a}乘${question.b}的答案` });
  await expect(input).toBeFocused();
  await expect(page.getByRole('status')).toContainText(`第1题，${question.a}乘${question.b}等于多少`);

  const homeItem = page.getByRole('menuitem').filter({ hasText: '首页' });
  await homeItem.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: '确定离开本局吗？' })).toBeVisible();
  const stay = page.getByRole('button', { name: '继续闯关' });
  await expect(stay).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(input).toBeFocused();

  await input.fill(String(question.answer));
  await input.press('Enter');
  const next = page.getByRole('button', { name: /下一题/ });
  await expect(next).toBeFocused();
  await expect(page.getByRole('status')).toContainText('回答正确');

  collector.expectClean('键盘与无障碍');
  await context.close();
});
