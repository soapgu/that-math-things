import React, { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SharpshooterSession } from './Pages';
import { PRODUCTS } from './model';

const sound = vi.hoisted(() => ({ playShot: vi.fn(), playMiss: vi.fn(), stop: vi.fn(), dispose: vi.fn() }));
vi.mock('../sound', () => ({
  createMultiplicationSoundPlayer: () => sound,
  loadMultiplicationSoundEnabled: () => true,
  saveMultiplicationSoundEnabled: vi.fn(),
}));
function setup() {
  return render(<StrictMode><MemoryRouter initialEntries={[{ pathname: '/multiplication/session', state: {
    settings: { difficulty: 'sharpshooter', questionCount: 36 }, rounds: [24, 81, ...PRODUCTS.filter((p) => p !== 24 && p !== 81)],
  } }]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes><Route path="/multiplication/session" element={<SharpshooterSession />} /></Routes>
  </MemoryRouter></StrictMode>);
}
function cell(a, b) { return screen.getByRole('button', { name: new RegExp(`^${a}乘${b}，`) }); }

describe('神枪手页面事件与计时', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); });
  afterEach(() => { vi.useRealTimers(); });
  it('开局前不射击、不计时；揭晓阶段暂停，下一轮续计，StrictMode不重复播音', () => {
    setup();
    fireEvent.click(cell(3, 8));
    expect(sound.playShot).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/作答用时 00:00/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '开始射击', exact: true }));
    act(() => vi.advanceTimersByTime(2400));
    ['3,8', '8,3', '4,6', '6,4'].forEach((key) => { const [a, b] = key.split(','); fireEvent.click(cell(a, b)); });
    expect(sound.playShot).toHaveBeenCalledTimes(4);
    expect(sound.playShot).toHaveBeenLastCalledWith(4, true);
    expect(screen.getByText('完美')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '下一轮', exact: true })).toHaveFocus();
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByText(/作答用时 00:02/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下一轮', exact: true }));
    act(() => vi.advanceTimersByTime(1600));
    fireEvent.click(cell(9, 9));
    expect(sound.playShot).toHaveBeenLastCalledWith(5, true);
    expect(screen.getByText(/作答用时 00:04/)).toBeInTheDocument();
  });
  it('打空只播一次，断连文字短暂显示；关闭音效停止声音并清理离页资源', () => {
    const { unmount } = setup();
    fireEvent.click(screen.getByRole('button', { name: '开始射击', exact: true }));
    fireEvent.click(cell(3, 8));
    fireEvent.click(cell(1, 1));
    fireEvent.click(cell(1, 1));
    expect(sound.playMiss).toHaveBeenCalledTimes(1);
    expect(screen.getByText('连击中断')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(650));
    expect(screen.queryByText('连击中断')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '关闭音效' }));
    expect(sound.stop).toHaveBeenCalled();
    fireEvent.click(cell(8, 3));
    expect(sound.playShot).toHaveBeenCalledTimes(1);
    unmount();
    expect(sound.dispose).toHaveBeenCalled();
  });
});
