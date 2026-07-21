import React from 'react';
import { act, render } from '@testing-library/react';
import MobileBlocker from './index';

function setViewportWidth(width) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  window.dispatchEvent(new Event('resize'));
}

describe('MobileBlocker 响应式边界', () => {
  const originalWidth = window.innerWidth;

  afterEach(() => {
    act(() => setViewportWidth(originalWidth));
  });

  it('767px 时阻止访问并显示终端提示', () => {
    setViewportWidth(767);
    const { getByText, queryByText } = render(
      <MobileBlocker><div>应用内容</div></MobileBlocker>,
    );

    expect(getByText('目前网站只支持电脑和 Pad 访问')).toBeTruthy();
    expect(queryByText('应用内容')).toBeNull();
  });

  it('768px 及以上正常显示应用，并响应窗口尺寸变化', () => {
    setViewportWidth(768);
    const view = render(<MobileBlocker><div>应用内容</div></MobileBlocker>);
    expect(view.getByText('应用内容')).toBeTruthy();

    act(() => setViewportWidth(767));
    expect(view.getByText('目前网站只支持电脑和 Pad 访问')).toBeTruthy();

    act(() => setViewportWidth(1024));
    expect(view.getByText('应用内容')).toBeTruthy();
  });
});
