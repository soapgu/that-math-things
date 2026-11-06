import { test, expect } from '@playwright/test';

async function enter(page) {
  await page.goto('#/multiplication');
  await page.getByRole('button', { name: /九九神枪手/ }).click();
  await expect(page.getByText('固定36轮 · 共81发')).toBeVisible();
  await expect(page.getByRole('button', { name: '81 题' })).toHaveCount(0);
  await page.getByRole('button', { name: /开始闯关/ }).click();
  await expect(page.getByRole('main', { name: '九九神枪手', exact: true })).toBeVisible();
}
async function roundInfo(page) {
  const product = Number(await page.locator('.sharpshooter-target').textContent());
  const cells = [];
  for (let a = 1; a <= 9; a += 1) for (let b = 1; b <= 9; b += 1) if (a * b === product) cells.push(`${a}×${b}`);
  return { product, cells };
}
async function finishRound(page) {
  const { cells } = await roundInfo(page);
  // 在一次浏览器任务内发出多次输入，验证快速射击不丢事件、不多扣弹。
  await page.evaluate((keys) => keys.forEach((key) => document.querySelector(`[data-cell="${key}"]`).click()), cells);
  await expect(page.locator('.sharpshooter-round-result')).toBeVisible();
  return cells;
}

test('完整36轮：81连击、结算、重开与原数据隔离', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await enter(page);
  await page.evaluate(() => localStorage.setItem('practice-records', '[]'));
  await page.getByRole('button', { name: '开始射击', exact: true }).click();
  let hits = 0;
  for (let i = 0; i < 36; i += 1) {
    const cells = await finishRound(page);
    hits += cells.length;
    await expect(page.locator('.sharpshooter-cell.hit')).toHaveCount(hits);
    await expect(page.locator('.sharpshooter-round-result')).toContainText('完美');
    if (i < 35) await page.getByRole('button', { name: '下一轮', exact: true }).click();
  }
  await expect(page.locator('.sharpshooter-combo')).toContainText('81 连击');
  await page.getByRole('button', { name: '查看结果', exact: true }).click();
  await expect(page.getByRole('heading', { name: '九九神枪手 · 闯关结果' })).toBeVisible();
  await expect(page.getByLabel('3星')).toBeVisible();
  await expect(page.locator('.sharpshooter-stats')).toContainText('81 / 81');
  await expect(page.locator('.sharpshooter-stats')).toContainText('36 / 36');
  expect(await page.evaluate(() => localStorage.getItem('practice-records'))).toBe('[]');
  await page.getByRole('button', { name: '再来一局' }).click();
  await expect(page.getByText('第 1 / 36 轮 · 累计命中 0 / 81')).toBeVisible();
  await expect(page.getByRole('button', { name: '开始射击', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('打空、漏射揭晓、清理、锁定与静音记忆', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: '关闭音效' }).click();
  await page.getByRole('button', { name: '开始射击', exact: true }).click();
  const { cells } = await roundInfo(page);
  const wrongKeys = await page.locator('.sharpshooter-cell[data-kind="hidden"]').evaluateAll(
    (nodes, correct) => nodes.map((node) => node.dataset.cell).filter((key) => !correct.includes(key)).slice(0, correct.length),
    cells,
  );
  const ammoSlots = page.locator('.sharpshooter-ammo-slot');
  await expect(ammoSlots).toHaveCount(cells.length);
  const wrongTarget = page.locator(`[data-cell="${wrongKeys[0]}"]`);
  await wrongTarget.hover();
  await expect(wrongTarget).toHaveCSS('cursor', /^url\(.*\) 16 16, crosshair$/);
  await wrongTarget.click();
  await expect(ammoSlots.first()).toHaveText('×');
  await expect(wrongTarget).toHaveCSS('cursor', 'default');
  await page.evaluate((keys) => keys.forEach((key) => document.querySelector(`[data-cell="${key}"]`).click()), wrongKeys.slice(1));
  await expect(page.locator('.sharpshooter-ammo-slot[data-outcome="miss"]')).toHaveCount(cells.length);
  await expect(page.locator('.sharpshooter-round-result')).toContainText('再试试');
  await expect(page.locator('.sharpshooter-cell.missed')).toHaveCount(cells.length);
  await expect(page.locator('.sharpshooter-cell.hit')).toHaveCount(0);
  await page.locator(`[data-cell="${cells[0]}"]`).click({ force: true });
  await expect(page.locator('.sharpshooter-cell.hit')).toHaveCount(0);
  await page.getByRole('button', { name: '下一轮', exact: true }).click();
  await expect(page.locator('.sharpshooter-cell.missed, .sharpshooter-cell.wrong')).toHaveCount(0);
  await expect(page.locator('.sharpshooter-ammo-slot:not([data-outcome="loaded"])')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: '九九乘法', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /九九神枪手/ }).click();
  await page.getByRole('button', { name: /开始闯关/ }).click();
  const enableSound = page.getByRole('button', { name: '开启音效' });
  await expect(enableSound).toHaveAttribute('aria-pressed', 'false');
  await enableSound.click();
  await expect(page.getByRole('button', { name: '关闭音效' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('multiplication-sound-enabled'))).toBe('true');
});

test('键盘射击、重复输入、减少动态与音频不可用', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { window.Audio = undefined; });
  await enter(page);
  await page.getByRole('button', { name: '开始射击', exact: true }).click();
  const { cells } = await roundInfo(page);
  const target = page.locator(`[data-cell="${cells[0]}"]`);
  await target.focus();
  await page.keyboard.press('Enter');
  await expect(target).toHaveAttribute('data-kind', 'hit');
  const firedSlot = page.locator('.sharpshooter-ammo-slot').first();
  await expect(firedSlot).toHaveText('✓');
  await expect(firedSlot.locator('.sharpshooter-ammo-result')).toHaveCSS('animation-name', 'none');
  const ammo = await page.locator('.sharpshooter-ammo').getAttribute('aria-label');
  await target.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.sharpshooter-ammo')).toHaveAttribute('aria-label', ammo);
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => document.activeElement?.hasAttribute('data-cell'))).toBe(true);
  expect(await target.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});

for (const width of [768, 1024, 1440, 1920]) {
  test(`${width}px：布局、射击反馈与截图`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 900 });
    await enter(page);
    const assertDesktopAlignment = async () => {
      if (width < 1440) return;
      const board = await page.locator('.sharpshooter-board-panel').boundingBox();
      const controls = await page.locator('.sharpshooter-controls').boundingBox();
      const back = await page.getByRole('button', { name: '返回难度选择' }).boundingBox();
      expect(controls.y).toBeCloseTo(board.y, 0);
      expect(back.y + back.height).toBeCloseTo(board.y + board.height, 0);
    };
    await expect(page.locator('.sharpshooter-aim svg')).toBeVisible();
    if (width === 768 || width === 1440) {
      await page.screenshot({ path: testInfo.outputPath(`sharpshooter-${width}-ready.png`), fullPage: true });
    }
    await assertDesktopAlignment();
    await page.getByRole('button', { name: '开始射击', exact: true }).click();
    await assertDesktopAlignment();
    const targetCard = page.locator('.sharpshooter-target-card');
    await expect(page.getByRole('heading', { name: '九九神枪手', exact: true })).toHaveCount(0);
    await expect(targetCard.getByText('第 1 / 36 轮 · 累计命中 0 / 81')).toBeVisible();
    await expect(targetCard.getByRole('button', { name: '关闭音效' })).toBeVisible();
    if (width <= 1100) {
      await page.keyboard.press('ArrowRight');
      const focusedCell = await page.locator('.sharpshooter-cell:focus-visible').boundingBox();
      const stickyCard = await targetCard.boundingBox();
      expect(focusedCell.y).toBeGreaterThan(stickyCard.y + stickyCard.height);
    }
    const ammo = page.locator('.sharpshooter-ammo');
    const before = await ammo.boundingBox();
    const hits = (await finishRound(page)).length;
    const after = await ammo.boundingBox();
    expect(after.width).toBe(before.width);
    expect(after.height).toBe(before.height);
    await expect(targetCard.getByText(`第 1 / 36 轮 · 累计命中 ${hits} / 81`)).toBeVisible();
    await expect(page.locator('.sharpshooter-round-result')).toContainText('完美');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const first = await page.locator('.sharpshooter-cell').first().boundingBox();
    expect(first.width).toBeGreaterThanOrEqual(40);
    // 轮末按钮会自动获得焦点并滚动；布局比较先恢复页面顶部，避免把吸顶坐标当作原始位置。
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    const board = await page.locator('.sharpshooter-board-panel').boundingBox();
    expect(board.width).toBeLessThanOrEqual(560);
    if (width <= 1100) expect(board.height).toBeLessThanOrEqual(590);
    await assertDesktopAlignment();
    const controls = await page.locator('.sharpshooter-controls > .ant-card').first().boundingBox();
    if (width >= 1440) expect(controls.x).toBeGreaterThan(board.x + board.width);
    else expect(board.y).toBeGreaterThan(controls.y + controls.height);
    await page.screenshot({ path: testInfo.outputPath(`sharpshooter-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: '下一轮', exact: true }).click();
    await expect(page.locator('.sharpshooter-round-result')).toHaveCount(0);
    await expect(targetCard.getByText(`第 2 / 36 轮 · 累计命中 ${hits} / 81`)).toBeVisible();
  });
}
