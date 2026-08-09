import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { TechnicalPrototype } from './entry';

class MockUtterance {
  constructor(text) { this.text = text; }
}

describe('recitation technical prototype', () => {
  let spoken;

  beforeEach(() => {
    localStorage.clear();
    spoken = [];
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: MockUtterance });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel: vi.fn(),
        speak: vi.fn((utterance) => spoken.push(utterance)),
      },
    });
  });

  it('初始句和确认后的下一句都会自动领读，双击只完成一句', () => {
    render(<TechnicalPrototype />);
    expect(spoken.at(-1).text).toBe('一一得一');
    act(() => spoken.at(-1).onend());
    const confirm = screen.getByRole('button', { name: '我背完了' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(screen.getByText('1/45')).toBeInTheDocument();
    expect(spoken.at(-1).text).toBe('一二得二');
  });

  it('评审宽度选择能独立切换上下和宽屏布局', () => {
    const { container } = render(<TechnicalPrototype />);
    const viewport = screen.getByRole('combobox', { name: '评审宽度' });
    fireEvent.change(viewport, { target: { value: '768' } });
    expect(container.querySelector('.prototype-shell')).toHaveAttribute('data-review-layout', 'stacked');
    fireEvent.change(viewport, { target: { value: '1440' } });
    expect(container.querySelector('.prototype-shell')).toHaveAttribute('data-review-layout', 'wide');
  });

  it('重复点击当前模式不会取消正在进行的领读', () => {
    render(<TechnicalPrototype />);
    const cancel = window.speechSynthesis.cancel;
    const callsBefore = cancel.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: '顺序背' }));
    expect(cancel).toHaveBeenCalledTimes(callsBefore);
    expect(screen.getByRole('button', { name: '停止领读' })).toBeEnabled();
  });

  it('重复选择当前坐标不取消领读，选择交换律坐标会重新领读并保留方向', () => {
    render(<TechnicalPrototype />);
    fireEvent.click(screen.getByRole('button', { name: '自定义背' }));
    const firstCoordinate = screen.getByRole('button', { name: '1乘2，未背，可选择' });
    fireEvent.click(firstCoordinate);
    const cancel = window.speechSynthesis.cancel;
    const callsBeforeRepeat = cancel.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: '1乘2，当前口诀，可选择' }));
    expect(cancel).toHaveBeenCalledTimes(callsBeforeRepeat);
    fireEvent.click(screen.getByRole('button', { name: '2乘1，交换律关联，可选择' }));
    expect(screen.getByText('2 × 1 = 2 · 一二得二')).toBeInTheDocument();
    expect(spoken.at(-1).text).toBe('一二得二');
    expect(screen.getByRole('button', { name: '停止领读' })).toBeEnabled();
  });

  it('StrictMode重复执行挂载effect时仍保留损坏会话提示', () => {
    localStorage.setItem('multiplication-recitation-session-v1', '{bad');
    render(<React.StrictMode><TechnicalPrototype /></React.StrictMode>);
    expect(screen.getByRole('status')).toHaveTextContent('会话数据已损坏，已安全恢复为空进度。');
    expect(localStorage.getItem('multiplication-recitation-session-v1')).toBe('{bad');
  });
});
