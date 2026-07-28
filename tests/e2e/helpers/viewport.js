/**
 * 视口切换与水平溢出检查，供 responsive.spec.js 使用。
 */

// v2.5 正式支持 768px 及以上；767px 仅验证不支持设备的拦截边界。
export const VIEWPORTS = {
  DESKTOP_WIDE: { width: 1440, height: 900 },
  DESKTOP:      { width: 1024, height: 800 },
  PAD_MIN:      { width: 768,  height: 700 },
  UNSUPPORTED:  { width: 767,  height: 700 },
};

/**
 * 切换视口并等待 MobileBlocker 的 resize 监听稳定。
 * useMobile hook 一般基于 window.innerWidth 与 768 阈值判断，300ms 足够其响应。
 */
export async function setViewport(page, nameOrSize) {
  const size = typeof nameOrSize === 'string' ? VIEWPORTS[nameOrSize] : nameOrSize;
  await page.setViewportSize({ width: size.width, height: size.height });
  await page.waitForTimeout(300);
}

/**
 * 检查当前页面无水平滚动溢出。
 * 返回 true 表示无溢出。
 */
export async function isNoHorizontalScroll(page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  return overflow <= 0;
}
