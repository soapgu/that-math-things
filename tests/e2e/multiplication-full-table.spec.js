import { test, expect } from '@playwright/test';
import { MultiplicationSettingsPage } from './pages/MultiplicationSettingsPage.js';
import { MultiplicationSessionPage } from './pages/MultiplicationSessionPage.js';
import { MultiplicationResultPage } from './pages/MultiplicationResultPage.js';
import { ConsoleCollector } from './helpers/ConsoleCollector.js';

test('81题无重复完成整表并手动结算', async ({ browser }, testInfo) => {
  test.setTimeout(240000);
  const baseURL = testInfo.project.use.baseURL;
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const collector = new ConsoleCollector(page);
  await collector.start();
  const settings = new MultiplicationSettingsPage(page);
  const session = new MultiplicationSessionPage(page);
  const result = new MultiplicationResultPage(page);

  await settings.goto(baseURL);
  await settings.selectQuestionCount(81);
  await expect(page.getByText('完成整张九九乘法表')).toBeVisible();
  await settings.start();
  const questions = await session.completeRound({ collectQuestions: true });

  expect(new Set(questions.map(({ key }) => key)).size).toBe(81);
  expect(new Set(questions.map(({ key }) => key))).toEqual(
    new Set(Array.from({ length: 9 }, (_, row) => (
      Array.from({ length: 9 }, (_, column) => `${row + 1}×${column + 1}`)
    )).flat()),
  );
  await expect(session.answeredCellCount()).resolves.toBe(81);
  await expect(session.matrix).toHaveClass(/multiplication-table-complete/);
  await expect(session.root).toHaveAttribute('data-session-phase', 'FINISHED');
  await page.waitForTimeout(2100);
  await expect(page).toHaveURL(/#\/multiplication\/session/);

  await session.viewResult();
  await result.expectPerfect(81);
  collector.expectClean('81题整表');
  await context.close();
});
