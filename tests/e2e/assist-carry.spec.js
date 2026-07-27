import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { SessionPage } from './pages/SessionPage.js';
import { MathAssistPage } from './pages/MathAssistPage.js';
import { AssistPlayerPage } from './pages/AssistPlayerPage.js';
import { QuestionFinder } from './helpers/QuestionFinder.js';
import { ResultPage } from './pages/ResultPage.js';

/**
 * Phase 7 § 4.5 进位方法演示 + § 4.8 carry 部分速度与控制
 *
 * 预期标准：
 *   - 进位题点击「看看计算方法」后进入数位表演示
 *   - 5 步序列 align → addOnes → carry → addTens → combine 完整渲染
 *   - 数位表 figure aria-label 反映当前操作数与状态
 *   - carry 步骤出现 role="status" 进位指示 + data-source="carry" 元素
 *   - 「上一步」回退、「重新播放」回第一步、「下一步」前进均稳定
 *   - 三档速度 Segmented 选中态唯一
 *   - 边界进位题（18+2 类）个位余数为 0 时数位表正常
 *   - 「回到题目」后输入框 focused、未自动填答案
 *
 * 设置：开辅助、全加、进退位 3 星、范围 50、10 题。
 */
test.describe.serial('4.5 进位方法演示 + 4.8 速度与控制（carry）', () => {
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
  let carryQ = null;

  test.beforeAll(async ({ browser }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
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

    await settings.setAssistEnabled(true);
    await settings.setAddRatio(100);
    await settings.setCarryBorrowProbStars(3);
    await settings.setRange(50);
    await settings.selectQuestionCount(10);
    await settings.clickStart();
    await session.waitForReady();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  // ---------------------------------------------------------------
  // 4.5 进位方法演示
  // ---------------------------------------------------------------

  test('01 - 找到进位题，进入方法演示，验证 section 与步骤数', async () => {
    carryQ = await finder.untilQuestion((q) => finder.isCarry(q));
    expect(carryQ, '至少找到 1 道进位题').not.toBeNull();

    await session.expectAssistEntryVisible();

    // 展开第一层
    await assist.expand();
    await expect(page.getByText('超过了 10，记得向十位进 1').first()).toBeVisible();
    await expect(page.getByText(/想一想：/).first()).toBeVisible();

    // 进入方法演示（第二层）
    await assist.showMethod();
    await player.waitForReady('carry');

    const section = player.sectionLocator('carry');
    await expect(section).toBeVisible();

    const { idx, total } = await player.getStepInfo();
    expect(idx).toBe(1);
    expect(total).toBe(5);
  });

  test('02 - align 步骤：提示文字、数位表 figure、上一步 disabled', async () => {
    // 步骤文字
    await expect(page.getByText('把相同数位对齐，从个位算起')).toBeVisible();

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

    // 进度接近 0%（首步）
    const pct = await player.getProgressPercent();
    expect(pct).toBeLessThanOrEqual(20);
  });

  test('03 - 逐步「下一步」验证各步内容', async () => {
    // ---- align → addOnes (step 2) ----
    await player.clickNextStep();
    await expect(page.getByText(/先算个位：/).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('code').first()).toBeVisible();
    {
      const { idx } = await player.getStepInfo();
      expect(idx).toBe(2);
    }

    // ---- addOnes → carry (step 3) ----
    await player.clickNextStep();
    await expect(page.getByText(/个位写/).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('code').first()).toBeVisible();
    // 进位状态指示
    await expect(
      page.locator('[role="status"]').filter({ hasText: /10 个一换成 1 个十/ })
    ).toBeVisible({ timeout: 3000 });
    // data-source="carry" 元素存在（带橙色虚线边框的进位十位单元）
    await expect(page.locator('[data-source="carry"]').first()).toBeVisible({ timeout: 3000 });
    {
      const { idx } = await player.getStepInfo();
      expect(idx).toBe(3);
    }

    // ---- carry → addTens (step 4) ----
    await player.clickNextStep();
    await expect(page.getByText(/个十加|个十是/).first()).toBeVisible({ timeout: 5000 });
    {
      const { idx } = await player.getStepInfo();
      expect(idx).toBe(4);
    }

    // ---- addTens → combine (step 5) ----
    await player.clickNextStep();
    await expect(page.getByText(/合起来是/).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('code').first()).toBeVisible();
    {
      const { idx } = await player.getStepInfo();
      expect(idx).toBe(5);
    }

    // finished 按钮区：回到题目 + 重新播放，无下一步/跳过
    await expect(page.getByRole('button', { name: '回到题目' })).toBeVisible();
    await expect(page.getByRole('button', { name: '重新播放' })).toBeVisible();
    await expect(page.getByRole('button', { name: '下一步' })).toBeHidden();
    await expect(page.getByRole('button', { name: '跳过演示' })).toBeHidden();
  });

  test('04 - 「上一步」回退：combine → addTens → carry → addOnes', async () => {
    // combine → addTens
    await player.clickPrevStep();
    await expect(page.getByText(/个十加|个十是/).first()).toBeVisible({ timeout: 5000 });
    {
      const { idx } = await player.getStepInfo();
      expect(idx).toBe(4);
    }

    // addTens → carry
    await player.clickPrevStep();
    await expect(page.getByText(/个位写/).first()).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('[role="status"]').filter({ hasText: /10 个一换成 1 个十/ })
    ).toBeVisible({ timeout: 3000 });

    // carry → addOnes
    await player.clickPrevStep();
    await expect(page.getByText(/先算个位：/).first()).toBeVisible({ timeout: 5000 });
    {
      const { idx } = await player.getStepInfo();
      expect(idx).toBe(2);
    }
  });

  test('05 - 「重新播放」回到 align 步骤、定时器重置', async () => {
    // 前进到完成状态，使「重新播放」按钮可见
    await player.clickNextStep(); // addOnes → carry
    await player.clickNextStep(); // carry → addTens
    await player.clickNextStep(); // addTens → combine

    await player.clickReplay();
    await expect(page.getByText('把相同数位对齐，从个位算起')).toBeVisible({ timeout: 5000 });

    const { idx, total } = await player.getStepInfo();
    expect(idx).toBe(1);
    expect(total).toBe(5);

    await expect(page.getByRole('button', { name: '上一步' })).toBeDisabled();
    await expect(page.getByRole('button', { name: '下一步' })).toBeVisible();
  });

  test('06 - 三档速度各观察一次，Segmented 选中态唯一', async () => {
    await player.setSpeed('fast');
    await player.expectSpeed('fast');

    await player.setSpeed('medium');
    await player.expectSpeed('medium');

    await player.setSpeed('slow');
    await player.expectSpeed('slow');

    // 还原为快档，便于后续自动播放测试
    await player.setSpeed('fast');
    await player.expectSpeed('fast');
  });

  test('07 - 自动播放：快档等待后至少前进一步', async () => {
    // 前进到完成状态，使「重新播放」按钮可用
    await player.clickNextStep(); // align → addOnes
    await player.clickNextStep(); // addOnes → carry
    await player.clickNextStep(); // carry → addTens
    await player.clickNextStep(); // addTens → combine
    await player.clickReplay();
    await expect(page.getByText('把相同数位对齐，从个位算起')).toBeVisible({ timeout: 5000 });
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

  // ---------------------------------------------------------------
  // 4.5 「回到题目」
  // ---------------------------------------------------------------

  test('08 - 「回到题目」：输入框 focused、未自动填答案、题面不变', async () => {
    // 前进到完成状态，使「回到题目」按钮可见（最多 5 步）
    for (let i = 0; i < 5; i++) {
      if (await page.getByRole('button', { name: '回到题目' }).isVisible().catch(() => false)) break;
      if (await page.getByRole('button', { name: '下一步' }).isVisible().catch(() => false)) {
        await player.clickNextStep();
      }
    }
    await expect(page.getByRole('button', { name: '回到题目' })).toBeVisible({ timeout: 5000 });

    await player.clickReturnToQ();
    await session.waitForReady();

    expect(page.url()).toContain('/practice/session');
    await session.expectInputFocused();

    const inputVal = await session.getInputValue();
    expect(inputVal).toBe('');

    // 题面与进入演示前一致
    const q = await session.getCurrentQuestion();
    expect(q).not.toBeNull();
    expect(q.a).toBe(carryQ.a);
    expect(q.b).toBe(carryQ.b);
    expect(q.op).toBe(carryQ.op);
  });

  // ---------------------------------------------------------------
  // 4.5 边界进位题（18+2 类）—— 最多 5 轮重开
  // ---------------------------------------------------------------

  test('09 - 边界进位题（个位和为 10）验证个位余数 0 时数位表正常', async () => {
    // 从当前 carryQ 出发，由 untilQuestion 自动答非目标题前进
    // 命中 → 直接进入演示；SESSION_ENDED → 重开新训练（最多 5 轮）
    let boundaryQ = null;
    const MAX_ROUNDS = 5;

    for (let r = 0; r < MAX_ROUNDS && !boundaryQ; r++) {
      try {
        boundaryQ = await finder.untilQuestion(
          (q) => finder.isCarryBoundary(q),
          { maxTries: 50 }
        );
      } catch (err) {
        if (err.code !== 'SESSION_ENDED') throw err;
      }

      if (!boundaryQ) {
        await result.waitForReady();
        await result.clickPracticeAgain();
        await page.waitForTimeout(500);
        if (page.url().includes('/practice/session')) {
          await session.waitForReady();
        } else {
          await settings.waitForReady();
          await settings.clickStart();
          await session.waitForReady();
        }
      }
    }

    if (!boundaryQ) {
      console.warn('[assist-carry] 5 轮未命中边界进位题（18+2 类），跳过边界验证');
      return;
    }

    // 进入方法演示
    await session.expectAssistEntryVisible();
    await assist.expand();
    await assist.showMethod();
    await player.waitForReady('carry');

    // align → addOnes → carry（验证「个位写 0」）
    await player.clickNextStep();
    await player.clickNextStep();
    await expect(page.getByText(/个位写 0/)).toBeVisible({ timeout: 5000 });

    await expect(
      page.locator('[role="status"]').filter({ hasText: /10 个一换成 1 个十/ })
    ).toBeVisible({ timeout: 3000 });

    // carry → addTens → combine
    await player.clickNextStep();
    await player.clickNextStep();
    await expect(page.getByText(/合起来是/).first()).toBeVisible({ timeout: 5000 });

    const figure = page.locator('figure[aria-label]').first();
    await expect(figure).toBeVisible();
    const label = await figure.getAttribute('aria-label');
    expect(label).toContain('0 个一');

    await player.clickReturnToQ();
    await session.waitForReady();
    expect(page.url()).toContain('/practice/session');
  });
});
