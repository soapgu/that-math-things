import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { SessionPage } from './pages/SessionPage.js';
import { MathAssistPage } from './pages/MathAssistPage.js';
import { QuestionFinder } from './helpers/QuestionFinder.js';

/**
 * Phase 7 § 4.4 第一层提醒
 *
 * 预期标准：
 *   - 简单且不涉及真实进位或退位的题目不显示辅助入口
 *   - 真实进位或退位题显示低干扰的「需要提示」，但未点击前不泄露步骤
 *   - 第一层只提示进位或退位关键点，不直接显示最终答案
 *   - 收起和再次展开操作稳定，题目、输入内容和计时不受影响
 *
 * 设置：辅助开、3 星进退位（80% prob）、范围 50、10 题。
 * 生成器保证 8 道进/退位 + 2 道简单题。
 */
test.describe.serial('4.4 第一层提醒', () => {
  let page;
  let home;
  let settings;
  let session;
  let assist;
  let finder;
  let eligibleQ = null;
  // 早期循环中是否已校验过简单题入口不可见（用于 test 04 兜底）
  let simpleCheckedEarly = false;

  test.beforeAll(async ({ browser }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const ctx = await browser.newContext();
    page = await ctx.newPage();
    home = new HomePage(page);
    settings = new SettingsPage(page);
    session = new SessionPage(page);
    assist = new MathAssistPage(page);
    finder = new QuestionFinder(session);

    await home.goto(baseURL);
    await home.clickPractice();
    await settings.waitForReady();

    await settings.setAssistEnabled(true);
    await settings.setCarryBorrowProbStars(3); // 80%
    await settings.selectQuestionCount(10);
    await settings.clickStart();
    await session.waitForReady();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  // 答完非目标题直到命中第一道 carry/borrow，停在那里。
  // 期间若遇到简单题，代理断言入口不可见。
  test('01 - 简单题无入口（早期遇到的）+ 第一道真实进退位题入口可见', async () => {
    for (let i = 0; i < 12; i++) {
      if (!page.url().includes('/practice/session')) break;
      const q = await session.getCurrentQuestion();
      if (!q) break;

      if (finder.isSimple(q)) {
        await session.expectAssistEntryInvisible();
        simpleCheckedEarly = true;
        await session.answer(finder.answer(q));
        await session.pressEnter();
        await page.waitForTimeout(300);
        continue;
      }
      if (finder.isCarry(q) || finder.isBorrow(q)) {
        await session.expectAssistEntryVisible();
        eligibleQ = q;
        break;
      }
      // 兜底
      await session.answer(finder.answer(q));
      await session.pressEnter();
      await page.waitForTimeout(300);
    }

    expect(eligibleQ, '找到至少 1 道 carry/borrow 题').not.toBeNull();
    // simpleCheckedEarly 可能是 false（第一题即 eligible），后续 test 04 补齐断言
  });

  test('02 - 点击「需要提示」展示关键提醒，不泄露答案、不渲染步骤', async ({}, testInfo) => {
    expect(eligibleQ).not.toBeNull();
    const idMarker = finder.isCarry(eligibleQ)
      ? '超过了 10，记得向十位进 1'
      : '需要从十位退 1';

    await assist.expand();

    await expect(page.getByText(idMarker).first()).toBeVisible();
    await expect(page.getByText(/想一想：/).first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('assist-hint-02-hint-card.png') });

    // 反向校验：第二层 AssistPlayer 未渲染
    await expect(page.getByRole('button', { name: '上一步' })).toBeHidden();
    await expect(page.getByRole('button', { name: '下一步' })).toBeHidden();

    // 第一层不能把数字明确标成最终答案；答案恰好为 10 时，允许教学阈值
    // “超过了 10”正常出现，不能仅凭裸数字判定泄露。
    const reminderCard = page.locator('.ant-card[aria-live="polite"]');
    const cardText = await reminderCard.textContent();
    const answer = finder.answer(eligibleQ);
    expect(new RegExp(`(?:答案|结果|等于|=)\\s*${answer}(?!\\d)`).test(cardText || ''),
      `第一层提醒避免泄露最终答案 ${answer}`).toBe(false);

    // 两个分支按钮可见
    await expect(page.getByRole('button', { name: '我再想想' })).toBeVisible();
    await expect(page.getByRole('button', { name: '看看计算方法' })).toBeVisible();
  });

  test('03 - 收起后再次展开，提醒内容稳定、题目和计时不受影响', async () => {
    expect(eligibleQ).not.toBeNull();

    await assist.collapse();
    await expect(page.getByRole('button', { name: '我再想想' })).toBeHidden();
    await expect(page.getByRole('button', { name: '看看计算方法' })).toBeHidden();

    // 题面不变、计时器仍递增
    const q = await session.getCurrentQuestion();
    expect(q).not.toBeNull();
    expect(q.a).toBe(eligibleQ.a);
    expect(q.b).toBe(eligibleQ.b);
    expect(q.op).toBe(eligibleQ.op);

    const t0 = await session.getTimerText();
    expect(t0).toMatch(/^\d+:\d+$/);

    // 重新展开
    await assist.expand();
    const idMarker = finder.isCarry(eligibleQ)
      ? '超过了 10，记得向十位进 1'
      : '需要从十位退 1';
    await expect(page.getByText(idMarker).first()).toBeVisible();

    await page.waitForTimeout(500);
    const t1 = await session.getTimerText();
    const toSec = (s) => {
      const m = s.match(/(\d+):(\d+)/);
      return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    };
    expect(toSec(t1)).toBeGreaterThanOrEqual(toSec(t0));
  });

  test('04 - 收起后完成本题，剩余训练中至少一道简单题入口不可见', async () => {
    expect(eligibleQ).not.toBeNull();
    // 先确保回到 collapsed
    await assist.collapse();

    // 答完当前 eligible 题，进入下一题
    await session.answer(finder.answer(eligibleQ));
    await session.pressEnter();
    await page.waitForTimeout(300);

    // 剩余 8 题中应至少还有 1 道简单题（generator 总共 10 题里 2 simple）
    let simpleCheckedLate = simpleCheckedEarly;
    for (let i = 0; i < 12; i++) {
      if (!page.url().includes('/practice/session')) break;
      const q = await session.getCurrentQuestion();
      if (!q) break;

      if (finder.isSimple(q)) {
        await session.expectAssistEntryInvisible();
        simpleCheckedLate = true;
        break; // 找到即可
      }
      // 跳过其他 eligible 题
      await session.answer(finder.answer(q));
      await session.pressEnter();
      await page.waitForTimeout(300);
    }

    expect(simpleCheckedLate, '本轮训练至少验证过 1 道简单题入口不可见').toBe(true);
  });
});
