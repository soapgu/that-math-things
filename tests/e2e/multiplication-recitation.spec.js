import { test, expect } from '@playwright/test';
import { ConsoleCollector } from './helpers/ConsoleCollector.js';
import { isNoHorizontalScroll } from './helpers/viewport.js';
import {
  MultiplicationRecitationPage,
  RECITATION_STORAGE_KEY,
} from './pages/MultiplicationRecitationPage.js';

const DATA_SENTINELS = {
  'practice-records': '[{"sentinel":"practice"}]',
  'multiplication-sound-enabled': 'false',
};

const EXPECTED_SEQUENTIAL_FORMULAS = Array.from({ length: 9 }, (_, groupIndex) => (
  Array.from({ length: groupIndex + 1 }, (_, factorIndex) => {
    const a = factorIndex + 1;
    const b = groupIndex + 1;
    return `${a} × ${b} = ${a * b}`;
  })
)).flat();

async function seedEmptySession(page, mode = 'sequential') {
  await page.addInitScript(({ key, modeValue }) => {
    if (localStorage.getItem(key) !== null) return;
    localStorage.setItem(key, JSON.stringify({
      schemaVersion: 1,
      orderingMode: modeValue,
      currentPhraseId: modeValue === 'sequential' ? '1×1' : null,
      selectedCoordinate: null,
      completedPhraseIds: [],
      updatedAt: new Date().toISOString(),
    }));
  }, { key: RECITATION_STORAGE_KEY, modeValue: mode });
}

async function seedSentinels(page) {
  await page.addInitScript((sentinels) => {
    Object.entries(sentinels).forEach(([key, value]) => localStorage.setItem(key, value));
  }, DATA_SENTINELS);
}

async function storageSnapshotWithoutRecitation(page) {
  return page.evaluate((recitationKey) => Object.fromEntries(
    Object.entries(localStorage).filter(([key]) => key !== recitationKey).sort(([left], [right]) => left.localeCompare(right)),
  ), RECITATION_STORAGE_KEY);
}

test('统一入口、参数回退与设置进度保持闯关兼容', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const baseURL = testInfo.project.use.baseURL;
  const collector = new ConsoleCollector(page);
  await collector.start();

  await page.goto(`${baseURL}#/`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('menuitem').filter({ hasText: '九九乘法' })).toHaveCount(1);
  await page.getByRole('menuitem').filter({ hasText: '九九乘法' }).click();
  await expect(page.getByRole('tab', { name: '闯关' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: '开始闯关' })).toBeVisible();

  await page.goto(`${baseURL}#/multiplication?mode=invalid`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('tab', { name: '闯关' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: '背诵' }).click();
  await expect(page).toHaveURL(/mode=recitation/);
  await expect(page.getByText('0/45', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '开始背诵' })).toBeVisible();
  collector.expectClean('统一入口与设置参数');
  await context.close();
});

test('顺序背完整45句、双表映射、完成恢复与数据隔离', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ reducedMotion: 'no-preference', viewport: { width: 1440, height: 900 } });
  await MultiplicationRecitationPage.installControlledSpeech(context);
  const page = await context.newPage();
  await seedEmptySession(page);
  await seedSentinels(page);
  const collector = new ConsoleCollector(page);
  await collector.start();
  const recitation = new MultiplicationRecitationPage(page);
  await recitation.goto(testInfo.project.use.baseURL);
  const isolatedStorageBefore = await storageSnapshotWithoutRecitation(page);

  const observed = [];
  for (let index = 0; index < 45; index += 1) {
    observed.push((await recitation.currentPhrase.textContent()).split(' · ')[0]);
    await recitation.completeCurrent();
    await expect(page.locator('.recitation-progress-text')).toHaveText(`${index + 1}/45`);
    if (index === 0) {
      const motion = await page.evaluate(() => ({
        phraseName: getComputedStyle(document.querySelector('.recitation-current-phrase')).animationName,
        phraseDuration: getComputedStyle(document.querySelector('.recitation-current-phrase')).animationDuration,
        matrixName: getComputedStyle(document.querySelector('.matrix-cell[data-newly-completed="true"]')).animationName,
        matrixDuration: getComputedStyle(document.querySelector('.matrix-cell[data-newly-completed="true"]')).animationDuration,
        phraseCellName: getComputedStyle(document.querySelector('.phrase-cell[data-newly-completed="true"]')).animationName,
        phraseCellDuration: getComputedStyle(document.querySelector('.phrase-cell[data-newly-completed="true"]')).animationDuration,
      }));
      expect(motion).toEqual({
        phraseName: 'recitation-current-enter',
        phraseDuration: '0.22s',
        matrixName: 'recitation-cell-reveal',
        matrixDuration: '0.24s',
        phraseCellName: 'recitation-cell-reveal',
        phraseCellDuration: '0.24s',
      });
    }
  }
  expect(observed).toEqual(EXPECTED_SEQUENTIAL_FORMULAS);
  await expect(recitation.currentPhrase).toHaveText('45句全部背完 · 两张表已展开');
  await expect(page.locator('.recitation-production-tables')).toHaveClass(/is-completing/);
  const completionMotion = await page.locator('.recitation-table-panel').first().evaluate((element) => ({
    name: getComputedStyle(element).animationName,
    duration: getComputedStyle(element).animationDuration,
  }));
  expect(completionMotion).toEqual({ name: 'recitation-complete-glow', duration: '0.68s' });
  await expect(page.locator('.matrix-cell[data-state="done"]')).toHaveCount(81);
  await expect(page.locator('.phrase-cell[data-state="done"]')).toHaveCount(45);
  await expect(page.locator('.phrase-header[data-state="done"]')).toHaveCount(9);
  await expect(recitation.commandBar.getByRole('button', { name: '我背完了' })).toBeDisabled();
  expect(await storageSnapshotWithoutRecitation(page)).toEqual(isolatedStorageBefore);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(recitation.currentPhrase).toHaveText('45句全部背完 · 两张表已展开');
  await expect(page.locator('.recitation-production-tables')).not.toHaveClass(/is-completing/);
  expect(await page.evaluate(() => window.__recitationSpeech.spoken.length)).toBe(0);
  collector.expectClean('顺序背完整45句');
  await context.close();
});

test('自定义方向、键盘、共享进度、刷新恢复和重新开始', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1024, height: 768 } });
  await MultiplicationRecitationPage.installControlledSpeech(context);
  const page = await context.newPage();
  await seedEmptySession(page, 'custom');
  const recitation = new MultiplicationRecitationPage(page);
  await recitation.goto(testInfo.project.use.baseURL);

  const first = page.getByRole('button', { name: '1乘1，未背，可选择' });
  await expect(first).toBeFocused();
  await first.press('ArrowDown');
  await expect(page.getByRole('button', { name: '2乘1，未背，可选择' })).toBeFocused();
  await page.getByRole('button', { name: '9乘1，未背，可选择' }).press('Enter');
  await expect(recitation.currentPhrase).toHaveText('9 × 1 = 9 · 一九得九');
  await expect(page.locator('.matrix-cell[data-state="related"]')).toHaveCount(1);
  expect((await page.evaluate(() => window.__recitationSpeech.spoken.at(-1)))).toMatchObject({ text: '一九得九', lang: 'zh-CN' });
  await recitation.completeCurrent();
  await expect(page.getByLabel('9乘1等于9，已背')).toBeVisible();
  await expect(page.getByLabel('1乘9等于9，已背')).toBeVisible();
  await expect(recitation.currentPhrase).toHaveText('请从乘法表选择未背口诀');

  await recitation.switchMode('sequential');
  await expect(recitation.currentPhrase).toHaveText('1 × 1 = 1 · 一一得一');
  await recitation.completeCurrent();
  await recitation.switchMode('custom');
  await recitation.selectCoordinate(3, 3);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(recitation.currentPhrase).toHaveText('3 × 3 = 9 · 三三得九');
  expect(await recitation.progress()).toBe(2);

  await recitation.reset.click();
  const keep = page.getByRole('button', { name: '继续保留' });
  await expect(keep).toBeFocused();
  await keep.click();
  await expect(recitation.reset).toBeFocused();
  expect(await recitation.progress()).toBe(2);
  await recitation.reset.click();
  await page.getByRole('button', { name: '清空并重新开始' }).click();
  await expect(recitation.currentPhrase).toHaveText('1 × 1 = 1 · 一一得一');
  expect(await recitation.progress()).toBe(0);
  await context.close();
});

test('语音不可用、损坏存储与写入失败均可安全降级', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await MultiplicationRecitationPage.installControlledSpeech(context);
  const page = await context.newPage();
  await page.addInitScript((key) => localStorage.setItem(key, '{broken-json'), RECITATION_STORAGE_KEY);
  const baseURL = testInfo.project.use.baseURL;

  await page.goto(`${baseURL}#/multiplication?mode=recitation`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('status')).toContainText('背诵进度数据异常，已安全恢复为空进度');
  await page.evaluate(() => { window.__recitationSpeech.throwOnSpeak = true; });
  await page.getByRole('button', { name: '开始背诵' }).click();
  await expect(page.getByRole('button', { name: '语音不可用' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '我背完了' })).toBeEnabled();
  await expect(page.locator('.recitation-live-region')).toContainText('语音不可用');
  await context.close();

  const readContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await readContext.addInitScript((key) => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function getItem(name) {
      if (name === key) throw new Error('blocked');
      return original.call(this, name);
    };
  }, RECITATION_STORAGE_KEY);
  const readPage = await readContext.newPage();
  await readPage.goto(`${baseURL}#/multiplication?mode=recitation`, { waitUntil: 'networkidle' });
  await expect(readPage.getByRole('status')).toContainText('无法读取本机进度，本次仍可背诵');
  await readContext.close();

  const writeContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await MultiplicationRecitationPage.installControlledSpeech(writeContext);
  await writeContext.addInitScript((key) => {
    const original = Storage.prototype.setItem;
    window.__allowRecitationWrite = false;
    Storage.prototype.setItem = function setItem(name, value) {
      if (name === key && !window.__allowRecitationWrite && localStorage.getItem(key) !== null) throw new Error('blocked');
      return original.call(this, name, value);
    };
  }, RECITATION_STORAGE_KEY);
  const writePage = await writeContext.newPage();
  await seedEmptySession(writePage);
  const recitation = new MultiplicationRecitationPage(writePage);
  await recitation.goto(baseURL);
  await recitation.finishSpeech();
  await recitation.confirm.click();
  await expect(writePage.getByRole('status')).toContainText('离开后可能无法恢复');
  await writePage.evaluate(() => { window.__allowRecitationWrite = true; });
  await recitation.switchMode('custom');
  await expect(writePage.getByRole('status')).toHaveCount(0);
  await writeContext.close();
});

test('表格语义、未背答案保护、礼貌播报与减少动态效果', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  await MultiplicationRecitationPage.installControlledSpeech(context);
  const page = await context.newPage();
  await seedEmptySession(page);
  const recitation = new MultiplicationRecitationPage(page);
  await recitation.goto(testInfo.project.use.baseURL);

  await expect(recitation.matrix.getByRole('row')).toHaveCount(10);
  await expect(recitation.matrix.getByRole('columnheader')).toHaveCount(10);
  await expect(recitation.matrix.getByRole('rowheader')).toHaveCount(9);
  await expect(recitation.matrix.getByRole('gridcell')).toHaveCount(81);
  await expect(recitation.phraseTable.getByRole('row')).toHaveCount(10);
  await expect(recitation.phraseTable.getByRole('columnheader')).toHaveCount(9);
  await expect(recitation.phraseTable.getByRole('gridcell', { includeHidden: true })).toHaveCount(81);
  await expect(page.locator('.phrase-cell[data-state="placeholder"]')).toHaveCount(36);
  const hiddenCell = page.locator('.matrix-cell[data-state="hidden"]').nth(1);
  await expect(hiddenCell).toHaveText('');
  expect(await hiddenCell.getAttribute('aria-label')).not.toMatch(/等于|2/);
  await recitation.completeCurrent();
  await expect(page.locator('.recitation-live-region')).toContainText('已完成1/45');
  const animations = await page.evaluate(() => ({
    phrase: getComputedStyle(document.querySelector('.recitation-current-phrase')).animationName,
    cell: getComputedStyle(document.querySelector('.matrix-cell[data-state="done"]')).animationName,
    progress: getComputedStyle(document.querySelector('.recitation-progress-line')).transitionDuration,
  }));
  expect(animations).toEqual({ phrase: 'none', cell: 'none', progress: '0s' });
  await context.close();
});

const viewportCases = [
  { name: '768×1024', viewport: { width: 768, height: 1024 }, stacked: true },
  { name: '1024×768', viewport: { width: 1024, height: 768 }, stacked: true },
  { name: '1440×900', viewport: { width: 1440, height: 900 }, stacked: false },
  { name: '1920×1080', viewport: { width: 1920, height: 1080 }, stacked: false },
];

for (const { name, viewport, stacked } of viewportCases) {
  test(`${name}：背诵控制栏和双表响应式稳定`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport });
    await MultiplicationRecitationPage.installControlledSpeech(context);
    const page = await context.newPage();
    await seedEmptySession(page);
    const collector = new ConsoleCollector(page);
    await collector.start();
    const recitation = new MultiplicationRecitationPage(page);
    await recitation.goto(testInfo.project.use.baseURL);

    expect(await isNoHorizontalScroll(page)).toBe(true);
    const commandBox = await recitation.commandBar.boundingBox();
    expect(commandBox.height).toBeLessThanOrEqual(52);
    const panels = page.locator('.recitation-table-panel');
    const left = await panels.nth(0).boundingBox();
    const right = await panels.nth(1).boundingBox();
    if (stacked) {
      expect(right.y).toBeGreaterThan(left.y + left.height - 1);
      const matrix = await recitation.matrix.boundingBox();
      expect(Math.abs(matrix.width - matrix.height)).toBeLessThanOrEqual(1);
    } else {
      expect(Math.abs(left.y - right.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(left.height - 573)).toBeLessThanOrEqual(1);
      expect(Math.abs(right.height - 573)).toBeLessThanOrEqual(1);
      const grids = page.locator('.recitation-grid');
      expect(Math.abs((await grids.nth(0).boundingBox()).height - 532)).toBeLessThanOrEqual(1);
      expect(Math.abs((await grids.nth(1).boundingBox()).height - 532)).toBeLessThanOrEqual(1);
      expect((await recitation.root.boundingBox()).width).toBeLessThanOrEqual(1400);
    }
    collector.expectClean(`${name}背诵响应式`);
    await context.close();
  });
}
