import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { SessionPage } from './pages/SessionPage.js';
import { MathAssistPage } from './pages/MathAssistPage.js';

/**
 * Phase 7 § 4.2 关闭辅助的原有做题流程
 * Phase 7 § 4.3 刷新恢复
 */
test.describe.serial('4.2 + 4.3 关闭辅助做题与刷新恢复', () => {
  let page;
  let home;
  let settings;
  let session;
  let assist;

  test.beforeAll(async ({ browser }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const ctx = await browser.newContext();
    page = await ctx.newPage();
    home = new HomePage(page);
    settings = new SettingsPage(page);
    session = new SessionPage(page);
    assist = new MathAssistPage(page);

    await home.goto(baseURL);
    await home.clickPractice();
    await settings.waitForReady();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  // § 4.2 1-3：关闭辅助 → 开始 10 题训练 → 验证题面元素
  test('01 - 关闭辅助开始训练，验证题面/输入框/按钮/进度/计时器', async () => {
    await settings.setAssistEnabled(false);
    await settings.selectQuestionCount(10);
    await settings.clickStart();

    await session.waitForReady();
    await expect(page.getByText(/第\s*1\s*\/\s*10\s*题/)).toBeVisible();

    const q = await session.getCurrentQuestion();
    expect(q).not.toBeNull();
    expect(typeof q.a).toBe('number');
    expect(typeof q.b).toBe('number');

    // 计时器存在（形如 m:ss）
    const timer = await session.getTimerText();
    expect(timer).toMatch(/^\d+:\d+$/);

    // 第一题进度条 0%
    const p = await session.getProgressPercent();
    expect(p).toBeLessThanOrEqual(0.001);

    await page.screenshot({ path: test.info().outputPath('practice-01.png') });
  });

  // § 4.2 4-5：连续完成≥3 题，第一题用按钮、第二题用 Enter
  test('02 - 辅助入口始终不可见，使用「下一题」按钮提交切题', async () => {
    await assist.expectNoEntry();

    const q1 = await session.getCurrentQuestion();
    const ans = q1.a + (q1.op === '+' ? q1.b : -q1.b);

    const nextBtn = page.getByRole('button', { name: /下一题|完成/ });
    await expect(nextBtn).toBeDisabled();

    await session.answer(ans);
    await expect(nextBtn).toBeEnabled();
    await session.clickNext();

    await expect(page.getByText(/第\s*2\s*\/\s*10\s*题/)).toBeVisible();
    // 切题后输入框清空且聚焦
    expect(await session.getInputValue()).toBe('');
    await session.expectInputFocused();
  });

  test('03 - Enter 提交行为与按钮一致，前进一题、不重复提交', async () => {
    await assist.expectNoEntry();

    const q2 = await session.getCurrentQuestion();
    const ans = q2.a + (q2.op === '+' ? q2.b : -q2.b);
    await session.answer(ans);
    await session.pressEnter();

    // Enter 提交后前进到第 3 题
    await expect(page.getByText(/第\s*3\s*\/\s*10\s*题/)).toBeVisible();
    expect(await session.getInputValue()).toBe('');
    await session.expectInputFocused();
  });

  test('04 - 第三题后再切一题，验证计时器单调递增', async () => {
    const t0 = await session.getTimerText();
    await page.waitForTimeout(1500);

    const q3 = await session.getCurrentQuestion();
    const ans = q3.a + (q3.op === '+' ? q3.b : -q3.b);
    await session.answer(ans);
    await session.clickNext();

    await expect(page.getByText(/第\s*4\s*\/\s*10\s*题/)).toBeVisible();
    const t1 = await session.getTimerText();

    // 计时器不倒退；格式 mm:ss，比较秒数累计值
    const toSec = (s) => {
      const m = s.match(/(\d+):(\d+)/);
      return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    };
    expect(toSec(t1)).toBeGreaterThanOrEqual(toSec(t0));
  });

  test('05 - 空输入不能提交，按钮保持 disabled', async () => {
    // 已在第 4 题
    const initialValue = await session.getInputValue();
    await page.locator('input[type="text"]').first().fill('');
    const nextBtn = page.getByRole('button', { name: /下一题|完成/ });
    await expect(nextBtn).toBeDisabled();

    // 仍是第 4 题，Enter 不前进
    await session.pressEnter();
    await expect(page.getByText(/第\s*4\s*\/\s*10\s*题/)).toBeVisible();
  });

  // § 4.3 刷新恢复
  test('06 - 4.3 刷新恢复：路由不崩溃、辅助入口不可见、设置恢复', async () => {
    // 退回设置页，改一组易识别设置：20 以内、10 题、关闭辅助
    await page.goBack();  // 回设置页（路由__/practice）
    await settings.waitForReady();
    // 注意：原 settings 对象状态由 React state 保存，但 reload 才从 localStorage 重建
    // 这里走「直接 navigate 到设置页」会丢 state；不刷新则保留状态

    await settings.setAssistEnabled(false);
    await settings.selectQuestionCount(10);
    await settings.clickStart();
    await session.waitForReady();

    // 进入第 1 题后直接刷新
    await expect(page.getByText(/第\s*1\s*\/\s*10\s*题/)).toBeVisible();
    await page.reload();

    // 仍停留在练习页，不白屏 / 不崩
    await session.waitForReady();
    expect(page.url()).toContain('/practice/session');

    // 关闭辅助状态保持：辅助入口不可见
    await assist.expectNoEntry();
    await expect(page.getByText(/第\s*1\s*\/\s*10\s*题/)).toBeVisible();

    // 返回设置页，确认设置值仍为刷新前选择（20/10/关辅助）
    await page.goBack();
    await settings.waitForReady();
    expect(await settings.getSelectedQuestionCount()).toBe('10');
    expect(await settings.isAssistEnabled()).toBe(false);
  });
});