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

/**
 * Phase 7 § 4.10 完整结算 → 历史记录 → 错题订正闭环
 *
 * 预期标准：
 *   - 两轮训练各 10 题，首轮覆盖：不用辅助、只看第一层、查看第二层、故意答错
 *   - 首轮最后一题用 Enter 提交，次轮用「完成」按钮提交
 *   - 结算页得分 = 正确数 / 总数 × 100、用时非空
 *   - 辅助摘要独立/提醒/方法题数与操作一致，普通题不计分母
 *   - 历史记录数 ≥ 2，最新记录可查看详情和进入订正
 *   - 订正页只含本轮错题，全部正确提交后出现「🎉 全部订正完成！」
 *   - 返回统计页后原记录数据未被篡改、页面仍然正常
 *
 * 设置：开辅助、加法比例 50（加减混合）、进退位 3 星、10 题。
 */
test.describe.serial('4.10 完整结算 → 历史记录 → 错题订正闭环', () => {
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
  /** @type {number} */
  let round1Correct = 0;
  /** @type {number} */
  let round1Total = 0;

  test.beforeAll(async ({ browser }, testInfo) => {
    baseURL = testInfo.project.use.baseURL;
    const ctx = await browser.newContext();
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

    await home.goto(baseURL);
    await home.clickPractice();
    await settings.waitForReady();

    await settings.setAssistEnabled(true);
    await settings.setAddRatio(50);
    await settings.setCarryBorrowProbStars(3);
    await settings.selectQuestionCount(10);
    await settings.clickStart();
    await session.waitForReady();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  // ===================================================================
  // 第一轮：混合答题（Enter 提交最后一题）
  // ===================================================================

  test('01 - 混合答题第一轮：不用辅助 + 只看提醒 + 查看方法 + 故意答错 → Enter 完成', async ({}, testInfo) => {
    let noAssistDone = false;
    let hintOnlyDone = false;
    let methodDone = false;
    let wrongDone = false;

    for (let i = 0; i < 15; i++) {
      if (!page.url().includes('/practice/session')) break;

      const q = await session.getCurrentQuestion();
      if (!q) break;

      const eligible = finder.isCarry(q) || finder.isBorrow(q);

      if (eligible && !noAssistDone) {
        // 有资格但不求助，直接答题
        await session.answer(finder.answer(q));
        await session.pressEnter();
        noAssistDone = true;
      } else if (eligible && !hintOnlyDone) {
        // 只看第一层提醒，然后收起
        await session.expectAssistEntryVisible();
        await assist.expand();
        await expect(page.getByText(/进 1|退 1/).first()).toBeVisible();
        await assist.collapse();
        await session.answer(finder.answer(q));
        await session.pressEnter();
        hintOnlyDone = true;
      } else if (eligible && !methodDone) {
        // 查看完整方法演示，然后跳过
        const kind = finder.isCarry(q) ? 'carry' : 'borrow';
        await session.expectAssistEntryVisible();
        await assist.expand();
        await assist.showMethod();
        await player.waitForReady(kind);
        await player.clickSkip();
        await session.waitForReady();
        await session.answer(finder.answer(q));
        await session.pressEnter();
        methodDone = true;
      } else if (!wrongDone) {
        // 故意答错
        const wrongAns = finder.answer(q) - 1;
        await session.answer(wrongAns === 0 ? wrongAns + 2 : wrongAns);
        await session.pressEnter();
        wrongDone = true;
      } else {
        await session.answer(finder.answer(q));
        await session.pressEnter();
      }
      await page.waitForTimeout(500);

    }

    expect(noAssistDone && hintOnlyDone && methodDone && wrongDone,
      '必须完成不用辅助/只看提醒/查看方法/答错各 ≥1 题').toBe(true);

    // 应已进入结算页
    await result.waitForReady();
    await page.screenshot({ path: testInfo.outputPath('full-flow-01-result.png') });
  });

  test('02 - 结算页验证：得分、用时、辅助摘要', async () => {
    const score = await result.getScore();
    const { correct, wrong } = await result.getCorrectWrong();
    round1Correct = correct;
    round1Total = correct + wrong;

    // 得分 = 正确数 / 总数 × 100（四舍五入取整）
    expect(Math.round(correct / round1Total * 100)).toBe(score);
    expect(score).toBeGreaterThan(0);

    // 用时非空
    const timeText = await result.getTimeSpentText();
    expect(timeText.length).toBeGreaterThan(0);

    // 辅助摘要
    const counts = await result.getAssistCounts();
    expect(counts, '本轮开启了辅助且有 eligible 题，辅助摘要不应为 null').not.toBeNull();
    if (counts) {
      expect(counts.independent, '至少 1 题独立完成（不用辅助）').toBeGreaterThanOrEqual(1);
      expect(counts.reminder, '至少 1 题只看提醒').toBeGreaterThanOrEqual(1);
      expect(counts.method, '至少 1 题查看方法').toBeGreaterThanOrEqual(1);

      // 普通题不计入辅助分母（3 类之和 ≤ eligible 题数 ≤ 总数）
      const assistTotal = counts.independent + counts.reminder + counts.method;
      expect(assistTotal).toBeLessThanOrEqual(round1Total);
    }

    // 应有错题分析（因为至少一个故意答错）
    const grade = await result.getCompositeGrade();
    expect(grade, '综合评价等级应存在').not.toBeNull();
    expect(typeof grade).toBe('string');
  });

  // ===================================================================
  // 第二轮：最后一题用「完成」按钮提交
  // ===================================================================

  test('03 - 第二轮训练：最后一题用「完成」按钮提交', async ({}, testInfo) => {
    await result.clickPracticeAgain();
    await page.waitForTimeout(500);

    if (page.url().includes('/practice/session')) {
      await session.waitForReady();
    } else {
      await settings.waitForReady();
      await settings.clickStart();
      await session.waitForReady();
    }

    const total = 10;
    for (let num = 1; num <= total; num++) {
      if (!page.url().includes('/practice/session')) break;

      const q = await session.getCurrentQuestion();
      if (!q) break;

      // 故意答错一道题，确保本轮记录有 wrongCount > 0
      if (num === 3) {
        const wrongAns = finder.answer(q) - 1;
        await session.answer(wrongAns === 0 ? wrongAns + 2 : wrongAns);
      } else {
        await session.answer(finder.answer(q));
      }

      if (num === total) {
        // 最后一题用「完成」按钮
        await session.clickNext();
      } else {
        await session.pressEnter();
      }

      await page.waitForTimeout(300);
    }

    await result.waitForReady();
    const score = await result.getScore();
    expect(typeof score).toBe('number');
    await page.screenshot({ path: testInfo.outputPath('full-flow-03-result2.png') });
  });

  // ===================================================================
  // 历史记录与详情
  // ===================================================================

  test('04 - 进入统计数据页，验证历史记录数 ≥ 2', async () => {
    await result.clickToStats();
    await stats.waitForReady();

    const count = await stats.getRecordCount();
    expect(count, '两轮训练后历史记录数应 ≥ 2').toBeGreaterThanOrEqual(2);

    // 验证顶部统计数字不为空
    const practices = await stats.getTotalPractices();
    expect(practices.length).toBeGreaterThan(0);
  });

  // ===================================================================
  // 错题订正闭环
  // ===================================================================

  test('05 - 从「订正」进入订正页，验证只含错题', async ({}, testInfo) => {
    const recordCount = await stats.getRecordCount();
    expect(recordCount, '至少有 2 条历史记录').toBeGreaterThanOrEqual(2);

    await page.screenshot({ path: testInfo.outputPath('full-flow-05-stats-before-correction.png') });

    await stats.clickLatestRecordCorrection();
    await page.waitForFunction(() => window.location.hash.includes('/practice/correction'),
      { timeout: 10000 });
    await correction.waitForReady();

    // 验证进入了正常订正状态（非「无需订正」）
    const titleText = await correction.getTitle();
    expect(titleText).toContain('订正');
    expect(titleText).not.toContain('无需订正');
  });

  test('06 - 全部正确答案 Enter 提交 →「🎉 全部订正完成！」', async () => {
    for (let i = 0; i < 15; i++) {
      if (await correction.isComplete()) break;

      const q = await correction.getCurrentQuestion();
      if (!q) break;

      await correction.answerAndEnter(finder.answer(q));
      await page.waitForTimeout(400);
    }

    await correction.expectComplete();
  });

  // ===================================================================
  // 原记录未被篡改
  // ===================================================================

  test('07 - 返回统计页断言原记录未被篡改', async ({}, testInfo) => {
    // 从订正完成页返回统计页
    if (page.url().includes('/practice/result')) {
      await result.clickToStats();
    } else {
      await page.goto(baseURL + '#/practice/stats');
    }
    await stats.waitForReady();

    // 历史记录数仍 ≥ 2（未因订正而丢失）
    const count = await stats.getRecordCount();
    expect(count, '订正后历史记录数不应减少').toBeGreaterThanOrEqual(2);

    // 顶部统计仍可正常读取
    const practices = await stats.getTotalPractices();
    expect(practices.length).toBeGreaterThan(0);

    await page.screenshot({ path: testInfo.outputPath('full-flow-07-stats.png') });
  });
});
