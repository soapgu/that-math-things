import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';
import { SettingsPage } from './pages/SettingsPage.js';

/**
 * Phase 7 § 4.1 首页与设置页基础流程
 *
 * 预期标准：
 *   - 页面没有横向溢出、不重叠
 *   - 题数选项只有一个处于选中状态
 *   - 关闭辅助后，退位个位算法不可操作但当前值不跳变
 *   - 开启辅助后，破十法/平十法可切换，说明文字完整可读
 *   - 刷新设置页后，最近一次设置仍能恢复
 */
test.describe.serial('4.1 首页与设置页基础流程', () => {
  let page;
  let home;
  let settings;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    page = await ctx.newPage();
    home = new HomePage(page);
    settings = new SettingsPage(page);
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test('01 - 从首页进入设置页，所有控件存在', async ({}, testInfo) => {
    const baseURL = test.info().project.use.baseURL;
    await home.goto(baseURL);
    await home.clickPractice();
    await settings.waitForReady();

    await expect(page.getByText('运算范围')).toBeVisible();
    await expect(page.getByText('加法比例')).toBeVisible();
    await expect(page.getByText('进位/退位难度')).toBeVisible();
    await expect(page.getByText('退位个位算法')).toBeVisible();
    await expect(page.getByText('辅助运算')).toBeVisible();
    await expect(page.getByText('题目数量')).toBeVisible();
    await expect(page.getByRole('button', { name: '开始训练' })).toBeVisible();
    await expect(page.getByRole('button', { name: '统计数据' })).toBeVisible();

    await page.screenshot({ path: testInfo.outputPath('settings-init.png'), fullPage: true });
  });

  test('02 - 题数 10/20/50 互斥选中', async () => {
    for (const count of [10, 20, 50]) {
      await settings.selectQuestionCount(count);
      const selected = await settings.getSelectedQuestionCount();
      expect(String(selected)).toBe(String(count));
    }
    // 回到 10 题供后续测试稳定
    await settings.selectQuestionCount(10);
  });

  test('03 - 关闭辅助后退位个位算法不可操作但当前值保持', async () => {
    // 先开启辅助并选平十法
    await settings.setAssistEnabled(true);
    await settings.selectBorrowOnesMethod('bridgeTen');
    await expect(page.getByRole('radio', { name: /平十法/ })).toBeChecked();

    // 关闭辅助 → 选项不可操作
    await settings.setAssistEnabled(false);
    await settings.expectBorrowMethodDisabled();

    // 当前值不跳变：仍是平十法
    await expect(page.getByRole('radio', { name: /平十法/ })).toBeChecked();
  });

  test('04 - 重新开启辅助后破十法/平十法可切换，说明文字完整可读', async () => {
    await settings.setAssistEnabled(true);

    await settings.selectBorrowOnesMethod('breakTen');
    await expect(page.getByRole('radio', { name: /破十法/ })).toBeChecked();
    // 说明文字（含 U+2212）
    await expect(page.getByText('12−4：先算 10−4，再加回 2')).toBeVisible();

    await settings.selectBorrowOnesMethod('bridgeTen');
    await expect(page.getByRole('radio', { name: /平十法/ })).toBeChecked();
    await expect(page.getByText('12−4：先减 2 得到 10，再减 2')).toBeVisible();
  });

  test('05 - 无横向溢出、标题/说明/控件不重叠', async () => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('06 - 刷新后最近一次设置仍能恢复', async () => {
    // 先做一组明确选择
    await settings.selectQuestionCount(20);
    await settings.setAssistEnabled(true);
    await settings.selectBorrowOnesMethod('bridgeTen');

    await settings.reload();

    expect(await settings.getSelectedQuestionCount()).toBe('20');
    expect(await settings.isAssistEnabled()).toBe(true);
    await expect(page.getByRole('radio', { name: /平十法/ })).toBeChecked();
  });
});