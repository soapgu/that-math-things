import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { SessionPage } from './pages/SessionPage.js';
import { MathAssistPage } from './pages/MathAssistPage.js';
import { AssistPlayerPage } from './pages/AssistPlayerPage.js';
import { QuestionFinder } from './helpers/QuestionFinder.js';
import { ResultPage } from './pages/ResultPage.js';

/**
 * Phase 7 § 4.6 退位破十法演示 + § 4.7 平十法演示
 *          + § 4.8 borrow 部分速度与控制 + § 4.9 三档速度与控制
 *
 * 预期标准：
 *   - 退位题点击「看看计算方法」后进入数位表演示
 *   - 4 步序列 regroup → subtractOnes → subtractTens → combine 完整渲染
 *   - 数位表 figure aria-label 反映当前操作数与状态
 *   - regroup 步骤出现 role="status" 退位指示 + data-source="borrowed" 元素
 *   - 破十法 subtractOnes caption 含 "10 − X" 算式
 *   - 平十法 subtractOnes caption 含 "先减... = 10" 减到整十行为
 *   - 「上一步」回退、「重新播放」回第一步、「下一步」前进均稳定
 *   - 三档速度 Segmented 选中态唯一 + 自动播放正常
 *   - 边界退位题（10-3 类）辅助资格保留、数位表正常
 *   - 「回到题目」后输入框 focused、未自动填答案
 *
 * 第一轮破十法：开辅助、全减、进退位 3 星、范围 100、10 题（默认破十法）。
 * 第二轮平十法：回到设置页切 bridgeTen 后重开训练。
 */
test.describe.serial('4.6-4.9 退位方法演示 + 速度与控制（borrow）', () => {
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
  /** @type {null|{a: number, op: string, b: number}} */
  let borrowQ = null;

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

    await home.goto(baseURL);
    await home.clickPractice();
    await settings.waitForReady();

    // 第一轮：开辅助、全减、进退位 3 星、范围 100、10 题（破十法默认）
    await settings.setAssistEnabled(true);
    await settings.setAddRatio(0);
    await settings.setCarryBorrowProbStars(3);
    await settings.setRange(100);
    await settings.selectQuestionCount(10);
    await settings.clickStart();
    await session.waitForReady();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  // ===================================================================
  // 第一轮：破十法（§ 4.6）
  // ===================================================================

  test('01 - 找到退位题，进入破十法演示，验证 section 与步骤数', async () => {
    borrowQ = await finder.untilQuestion((q) => finder.isBorrow(q));
    expect(borrowQ, '至少找到 1 道退位题').not.toBeNull();

    await session.expectAssistEntryVisible();

    // 展开第一层
    await assist.expand();
    await expect(page.getByText('需要从十位退 1').first()).toBeVisible();
    await expect(page.getByText(/想一想：/).first()).toBeVisible();

    // 进入方法演示（第二层）
    await assist.showMethod();
    await player.waitForReady('borrow');

    const section = player.sectionLocator('borrow');
    await expect(section).toBeVisible();

    const { idx, total } = await player.getStepInfo();
    expect(idx).toBe(1);
    expect(total).toBe(4);
  });

  test('02 - regroup 步骤：expression、退位状态指示、上一步 disabled', async ({}, testInfo) => {
    // 步骤文字（例：把 43 看作 3 个十和 13 个一）
    await expect(page.getByText(/看作.*个十和.*个一/).first()).toBeVisible();

    // expression 算式（例：43 = 30 + 13）
    await expect(page.locator('code').first()).toBeVisible();

    // data-source="borrowed" 元素存在（退位拆分的十/一）
    await expect(page.locator('[data-source="borrowed"]').first()).toBeVisible({ timeout: 5000 });

    // 退位状态指示（例：退位：1 个十换成 10 个一 ↓）
    await expect(
      page.locator('[role="status"]').filter({ hasText: /退位/ })
    ).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: testInfo.outputPath('assist-borrow-02-regroup-step.png') });

    // 数位表 figure 含 aria-label
    const figure = page.locator('figure[aria-label]').first();
    await expect(figure).toBeVisible();
    const label = await figure.getAttribute('aria-label');
    expect(label).toMatch(/数位表：\d+ 个十，\d+ 个一/);

    // 上一步按钮 disabled（首步不可回退）
    await expect(page.getByRole('button', { name: '上一步' })).toBeDisabled();

    // 下一步、跳过演示均可见
    await expect(page.getByRole('button', { name: '下一步' })).toBeVisible();
    await expect(page.getByRole('button', { name: '跳过演示' })).toBeVisible();
  });

  test('03 - 逐步「下一步」验证各步内容（破十法 caption）', async () => {
    // ---- regroup → subtractOnes (step 2) ----
    await player.clickNextStep();
    await expect(page.getByText(/个一减/).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('code').first()).toBeVisible();
    // 破十法动画 caption 含 "10 − X"（先算 10 − 减数个位）
    await expect(page.getByText(/10 − \d+/).first()).toBeVisible({ timeout: 5000 });
    {
      const { idx } = await player.getStepInfo();
      expect(idx).toBe(2);
    }

    // ---- subtractOnes → subtractTens (step 3) ----
    await player.clickNextStep();
    await expect(page.getByText(/个十减/).first()).toBeVisible({ timeout: 5000 });
    {
      const { idx } = await player.getStepInfo();
      expect(idx).toBe(3);
    }

    // ---- subtractTens → combine (step 4) ----
    await player.clickNextStep();
    await expect(page.getByText(/合起来是/).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('code').first()).toBeVisible();
    {
      const { idx } = await player.getStepInfo();
      expect(idx).toBe(4);
    }

    // finished 按钮区：回到题目 + 重新播放，无下一步/跳过
    await expect(page.getByRole('button', { name: '回到题目' })).toBeVisible();
    await expect(page.getByRole('button', { name: '重新播放' })).toBeVisible();
    await expect(page.getByRole('button', { name: '下一步' })).toBeHidden();
    await expect(page.getByRole('button', { name: '跳过演示' })).toBeHidden();
  });

  test('04 - 「上一步」回退：combine → subtractTens → subtractOnes → regroup', async () => {
    // combine → subtractTens
    await player.clickPrevStep();
    await expect(page.getByText(/个十减/).first()).toBeVisible({ timeout: 5000 });
    {
      const { idx } = await player.getStepInfo();
      expect(idx).toBe(3);
    }

    // subtractTens → subtractOnes
    await player.clickPrevStep();
    await expect(page.getByText(/个一减/).first()).toBeVisible({ timeout: 5000 });
    // 破十法 caption 恢复
    await expect(page.getByText(/10 − \d+/).first()).toBeVisible({ timeout: 5000 });
    {
      const { idx } = await player.getStepInfo();
      expect(idx).toBe(2);
    }

    // subtractOnes → regroup
    await player.clickPrevStep();
    await expect(page.getByText(/看作.*个十和.*个一/).first()).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('[role="status"]').filter({ hasText: /退位/ })
    ).toBeVisible({ timeout: 3000 });
    {
      const { idx } = await player.getStepInfo();
      expect(idx).toBe(1);
    }
  });

  test('05 - 「重新播放」回到 regroup 步骤、定时器重置', async () => {
    // 前进到完成状态，使「重新播放」按钮可见
    await player.clickNextStep(); // regroup → subtractOnes
    await player.clickNextStep(); // subtractOnes → subtractTens
    await player.clickNextStep(); // subtractTens → combine

    await player.clickReplay();
    await expect(page.getByText(/看作.*个十和.*个一/).first()).toBeVisible({ timeout: 5000 });

    const { idx, total } = await player.getStepInfo();
    expect(idx).toBe(1);
    expect(total).toBe(4);

    await expect(page.getByRole('button', { name: '上一步' })).toBeDisabled();
    await expect(page.getByRole('button', { name: '下一步' })).toBeVisible();
  });

  // ===================================================================
  // 第二轮：平十法（§ 4.7）
  // ===================================================================

  test('06 - 切平十法，找退位题进入演示', async () => {
    // 前进到完成状态，使「回到题目」按钮可见
    for (let i = 0; i < 5; i++) {
      if (await page.getByRole('button', { name: '回到题目' }).isVisible().catch(() => false)) break;
      if (await page.getByRole('button', { name: '下一步' }).isVisible().catch(() => false)) {
        await player.clickNextStep();
      }
    }
    await player.clickReturnToQ();
    await session.waitForReady();

    // 答完当前退位题
    const ans = finder.answer(borrowQ);
    await session.answer(ans);
    await session.pressEnter();
    await page.waitForTimeout(300);

    // 答完剩余题目
    try {
      while (page.url().includes('/practice/session')) {
        const q = await session.getCurrentQuestion();
        if (!q) break;
        await session.answer(finder.answer(q));
        await session.pressEnter();
        await page.waitForTimeout(250);
      }
    } catch {
      // 路由切换瞬间 parse 抛异常属正常
    }

    // 回到设置页切平十法
    await page.goto(baseURL + '#/practice');
    await settings.waitForReady();
    await settings.selectBorrowOnesMethod('bridgeTen');
    await settings.clickStart();
    await session.waitForReady();

    // 找退位题
    borrowQ = await finder.untilQuestion((q) => finder.isBorrow(q));
    expect(borrowQ, '平十法轮次至少找到 1 道退位题').not.toBeNull();

    // 进入演示
    await session.expectAssistEntryVisible();
    await assist.expand();
    await assist.showMethod();
    await player.waitForReady('borrow');

    const { idx, total } = await player.getStepInfo();
    expect(idx).toBe(1);
    expect(total).toBe(4);
  });

  test('07 - 平十法 subtractOnes 验证「减到整十」+「再减剩余」', async () => {
    // regroup → subtractOnes
    await player.clickNextStep();
    await expect(page.getByText(/个一减/).first()).toBeVisible({ timeout: 5000 });

    // 平十法第一步 caption 含 "先减 X 个一" + "= 10"（减到整十）
    await expect(page.getByText(/先减 \d+ 个一/).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/= 10/).first()).toBeVisible({ timeout: 3000 });

    // 平十法第二步 caption：等待自动过渡到 phase 2
    await expect(page.getByText(/再减剩下的/).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/10 − \d+/).first()).toBeVisible({ timeout: 3000 });
  });

  // ===================================================================
  // 速度与控制（§ 4.8 borrow + § 4.9）
  // ===================================================================

  test('08 - 三档速度各观察一次，Segmented 选中态唯一', async () => {
    await player.setSpeed('fast');
    await player.expectSpeed('fast');

    await player.setSpeed('medium');
    await player.expectSpeed('medium');

    await player.setSpeed('slow');
    await player.expectSpeed('slow');

    // 还原为快档
    await player.setSpeed('fast');
    await player.expectSpeed('fast');
  });

  test('09 - 自动播放：快档等待后至少前进一步', async () => {
    // 前进到完成状态 → 重新播放回到 regroup
    await player.clickNextStep(); // subtractOnes → subtractTens
    await player.clickNextStep(); // subtractTens → combine
    await player.clickReplay();
    await expect(page.getByText(/看作.*个十和.*个一/).first()).toBeVisible({ timeout: 5000 });
    {
      const { idx } = await player.getStepInfo();
      expect(idx).toBe(1);
    }

    await player.setSpeed('fast');

    // 等待快档（5 秒）+ 动画余量 3 秒
    await page.waitForTimeout(8000);

    // 应已前进一步以上
    const { idx } = await player.getStepInfo();
    expect(idx).toBeGreaterThanOrEqual(2);
  });

  // ===================================================================
  // 边界退位题（§ 4.6 整十边界 + § 4.8 borrow 边界部分）
  // ===================================================================

  test('10 - 边界退位题（10-3 类）跨轮验证', async () => {
    // 前进到完成状态，回到题目
    for (let i = 0; i < 5; i++) {
      if (await page.getByRole('button', { name: '回到题目' }).isVisible().catch(() => false)) break;
      if (await page.getByRole('button', { name: '下一步' }).isVisible().catch(() => false)) {
        await player.clickNextStep();
      }
    }
    await player.clickReturnToQ();
    await session.waitForReady();

    // 从当前 borrowQ 出发搜索边界退位题，最多 5 轮
    let boundaryQ = null;
    const MAX_ROUNDS = 5;

    for (let r = 0; r < MAX_ROUNDS && !boundaryQ; r++) {
      try {
        boundaryQ = await finder.untilQuestion(
          (q) => finder.isBorrowBoundary(q),
          { maxTries: 50 }
        );
      } catch (err) {
        if (err.code !== 'SESSION_ENDED') throw err;
      }

      if (!boundaryQ) {
        await result.waitForReady();
        // 回到设置页确保仍是平十法
        await page.goto(baseURL + '#/practice');
        await settings.waitForReady();
        await settings.clickStart();
        await session.waitForReady();
      }
    }

    if (!boundaryQ) {
      console.warn('[assist-borrow] 5 轮未命中边界退位题（10-3 类），跳过边界验证');
      return;
    }

    // 进入方法演示
    await session.expectAssistEntryVisible();
    await assist.expand();
    await assist.showMethod();
    await player.waitForReady('borrow');

    // regroup 步骤验证退位状态指示
    await expect(
      page.locator('[role="status"]').filter({ hasText: /退位/ })
    ).toBeVisible({ timeout: 5000 });

    // regroup → subtractOnes
    await player.clickNextStep();
    await expect(page.getByText(/个一减/).first()).toBeVisible({ timeout: 5000 });

    // 一路完成到 combine
    await player.clickNextStep(); // subtractTens
    await player.clickNextStep(); // combine
    await expect(page.getByText(/合起来是/).first()).toBeVisible({ timeout: 5000 });

    // 数位表正常
    const figure = page.locator('figure[aria-label]').first();
    await expect(figure).toBeVisible();
    const label = await figure.getAttribute('aria-label');
    expect(label).toMatch(/数位表：\d+ 个十，\d+ 个一/);

    // 回到题目
    await player.clickReturnToQ();
    await session.waitForReady();
    expect(page.url()).toContain('/practice/session');
  });

  // ===================================================================
  // 「回到题目」验证
  // ===================================================================

  test('11 - 「回到题目」：输入框 focused、未自动填答案、题面不变', async () => {
    // 当前已在边界题的 session 中（test 10 的 clickReturnToQ 后）
    await session.expectInputFocused();

    const inputVal = await session.getInputValue();
    expect(inputVal).toBe('');

    const q = await session.getCurrentQuestion();
    expect(q).not.toBeNull();
  });
});
