import { test, expect } from '@playwright/test'
import { HomePage } from './pages/HomePage.js'
import { SettingsPage } from './pages/SettingsPage.js'

test.describe.serial('最小目标：首页 → 计算训练设置页', () => {
  let page
  let baseURL

  test.beforeAll(async ({ browser }) => {
    baseURL = test.info().project.use.baseURL
    const ctx = await browser.newContext()
    page = await ctx.newPage()
  })

  test.afterAll(async () => {
    await page.context().close()
  })

  test('01 - 打开首页，验证标题和入口卡片存在', async () => {
    const home = new HomePage(page)
    await home.goto(baseURL)

    await expect(page.getByRole('heading', { name: '那年那数那些事', exact: true })).toBeVisible()
    await expect(page.getByText('让数学不再可怕，让错题不再反复。')).toBeVisible()
    await expect(page.getByRole('heading', { name: '计算训练' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '错题列表' })).toBeVisible()
  })

  test('02 - 点击计算训练，进入设置页', async ({}, testInfo) => {
    const home = new HomePage(page)
    const settings = new SettingsPage(page)

    await home.clickPractice()
    await settings.waitForReady()

    await expect(page).toHaveURL(/#\/practice/)
    await expect(page.getByText('运算范围')).toBeVisible()
    await expect(page.getByText('加法比例')).toBeVisible()
    await expect(page.getByText('进位/退位难度')).toBeVisible()
    await expect(page.getByText('辅助运算')).toBeVisible()
    await expect(page.getByText('题目数量')).toBeVisible()
    await expect(page.getByRole('button', { name: '开始训练' })).toBeVisible()
    await expect(page.getByRole('button', { name: '统计数据' })).toBeVisible()

    await page.screenshot({ path: testInfo.outputPath('practice-settings.png'), fullPage: true })
  })
})
