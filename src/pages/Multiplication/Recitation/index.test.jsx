import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import MultiplicationRecitation from '.';
import {
  ORDERING_MODES,
  RECITATION_PHRASES,
  completeCurrentPhrase,
  createEmptyRecitationSession,
  selectRecitationCoordinate,
  switchRecitationMode,
} from '../../../features/multiplication/recitation/model';
import { loadRecitationSession, saveRecitationSession } from '../../../features/multiplication/recitation/storage';

const recitationStyles = readFileSync(resolve(process.cwd(), 'src/pages/Multiplication/Recitation/recitation.css'), 'utf8');

class MockUtterance {
  constructor(text) { this.text = text; }
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

function renderRecitation({ state, withProbe = false } = {}) {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={[{ pathname: '/multiplication/recitation', state }]}
    >
      <Routes>
        <Route path="/multiplication/recitation" element={<MultiplicationRecitation />} />
        <Route path="/multiplication" element={withProbe ? <LocationProbe /> : <div>背诵设置</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function createSequentialProgress(count) {
  let session = createEmptyRecitationSession();
  for (let index = 0; index < count; index += 1) session = completeCurrentPhrase(session);
  return session;
}

describe('MultiplicationRecitation 顺序背与自定义背', () => {
  let spoken;

  beforeEach(() => {
    localStorage.clear();
    spoken = [];
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: MockUtterance });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { cancel: vi.fn(), speak: vi.fn((utterance) => spoken.push(utterance)) },
    });
  });

  it('自动领读第一句，手动确认后保存并进入第二句', async () => {
    const session = createEmptyRecitationSession();
    saveRecitationSession(session);
    renderRecitation({ state: { recitationSession: session } });
    expect(spoken.at(-1).text).toBe('一一得一');
    expect(screen.getByRole('button', { name: '我背完了' })).toBeDisabled();
    act(() => spoken.at(-1).onend());
    const confirm = screen.getByRole('button', { name: '我背完了' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(screen.getByText('1/45')).toBeInTheDocument());
    expect(screen.getByText('1 × 2 = 2 · 一二得二')).toBeInTheDocument();
    expect(screen.getByLabelText('1乘1等于1，已背')).toHaveTextContent('1✓');
    expect(screen.getByRole('columnheader', { name: '第1组，已背完' })).toHaveAttribute('data-state', 'done');
    expect(loadRecitationSession().session.completedPhraseIds).toEqual(['1×1']);
    expect(spoken.at(-1).text).toBe('一二得二');
  });

  it('停止领读后允许确认，卸载时取消语音', () => {
    const session = createEmptyRecitationSession();
    const { unmount } = renderRecitation({ state: { recitationSession: session } });
    fireEvent.click(screen.getByRole('button', { name: '停止领读' }));
    expect(screen.getByRole('button', { name: '我背完了' })).toBeEnabled();
    const callsBeforeUnmount = window.speechSynthesis.cancel.mock.calls.length;
    unmount();
    expect(window.speechSynthesis.cancel.mock.calls.length).toBeGreaterThan(callsBeforeUnmount);
  });

  it('刷新式进入时恢复完成集合和最早未完成句', () => {
    saveRecitationSession(createSequentialProgress(3));
    renderRecitation();
    expect(screen.getByText('3/45')).toBeInTheDocument();
    expect(screen.getByText('1 × 3 = 3 · 一三得三')).toBeInTheDocument();
    expect(screen.getByLabelText('1乘2等于2，已背')).toBeInTheDocument();
    expect(screen.getByLabelText('2乘1等于2，已背')).toBeInTheDocument();
  });

  it('刷新保留旧路由状态时优先恢复更新时间更晚的本地进度', () => {
    const enteredSession = createEmptyRecitationSession('2026-01-01T00:00:00.000Z');
    const storedSession = completeCurrentPhrase(enteredSession, '2026-01-01T00:00:01.000Z');
    saveRecitationSession(storedSession);
    renderRecitation({ state: { recitationSession: enteredSession } });
    expect(screen.getByText('1/45')).toBeInTheDocument();
    expect(screen.getByText('1 × 2 = 2 · 一二得二')).toBeInTheDocument();
    expect(screen.getByLabelText('1乘1等于1，已背')).toBeInTheDocument();
  });

  it('没有有效会话时返回背诵设置Tab', async () => {
    renderRecitation({ withProbe: true });
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/multiplication?mode=recitation'));
  });

  it('确认时保存失败仍保留内存进度并提示', async () => {
    const session = createEmptyRecitationSession();
    renderRecitation({ state: { recitationSession: session } });
    act(() => spoken.at(-1).onend());
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    fireEvent.click(screen.getByRole('button', { name: '我背完了' }));
    expect(await screen.findByText('1/45')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('本次可以继续，但离开后可能无法恢复。');
    setItem.mockRestore();
  });

  it('切到自定义背后等待选择，并把模式立即保存', () => {
    const session = createEmptyRecitationSession();
    renderRecitation({ state: { recitationSession: session } });
    fireEvent.click(screen.getByRole('button', { name: '自定义背' }));
    expect(screen.getByText('请从乘法表选择未背口诀')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '再听一遍' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '我背完了' })).toBeDisabled();
    expect(loadRecitationSession().session).toMatchObject({
      orderingMode: 'custom',
      currentPhraseId: null,
      selectedCoordinate: null,
      completedPhraseIds: [],
    });
  });

  it('模式切换保存失败时保留内存模式并显示提示', async () => {
    const session = createEmptyRecitationSession();
    renderRecitation({ state: { recitationSession: session } });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    fireEvent.click(screen.getByRole('button', { name: '自定义背' }));
    expect(screen.getByRole('button', { name: '自定义背' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByRole('status')).toHaveTextContent('本次可以继续，但离开后可能无法恢复。');
    setItem.mockRestore();
  });

  it('自定义点击保留9×1方向、统一领读并完成两个交换律格', () => {
    const session = switchRecitationMode(createEmptyRecitationSession(), ORDERING_MODES.CUSTOM);
    const { container } = renderRecitation({ state: { recitationSession: session } });
    fireEvent.click(screen.getByRole('button', { name: '9乘1，未背，可选择' }));
    expect(screen.getByText('9 × 1 = 9 · 一九得九')).toBeInTheDocument();
    expect(spoken.at(-1).text).toBe('一九得九');
    expect(screen.getByRole('button', { name: '9乘1，当前口诀，可选择' }).parentElement).toHaveAttribute('data-state', 'current');
    expect(screen.getByRole('button', { name: '1乘9，交换律关联，可选择' }).parentElement).toHaveAttribute('data-state', 'related');
    act(() => spoken.at(-1).onend());
    fireEvent.click(screen.getByRole('button', { name: '我背完了' }));
    expect(screen.getByText('请从乘法表选择未背口诀')).toBeInTheDocument();
    expect(screen.getByLabelText('9乘1等于9，已背')).toBeInTheDocument();
    expect(screen.getByLabelText('1乘9等于9，已背')).toBeInTheDocument();
    expect(container.querySelectorAll('.matrix-cell[data-state="done"]')).toHaveLength(2);
  });

  it('重复当前坐标不重播，切换交换律方向会更新方向并重播', () => {
    const session = switchRecitationMode(createEmptyRecitationSession(), ORDERING_MODES.CUSTOM);
    renderRecitation({ state: { recitationSession: session } });
    const reversed = screen.getByRole('button', { name: '9乘1，未背，可选择' });
    fireEvent.click(reversed);
    const spokenAfterSelection = spoken.length;
    fireEvent.click(screen.getByRole('button', { name: '9乘1，当前口诀，可选择' }));
    expect(spoken).toHaveLength(spokenAfterSelection);
    fireEvent.click(screen.getByRole('button', { name: '1乘9，交换律关联，可选择' }));
    expect(screen.getByText('1 × 9 = 9 · 一九得九')).toBeInTheDocument();
    expect(spoken).toHaveLength(spokenAfterSelection + 1);
    expect(spoken.at(-1).text).toBe('一九得九');
  });

  it('自定义平方口诀只展开一个对角格', () => {
    const session = switchRecitationMode(createEmptyRecitationSession(), ORDERING_MODES.CUSTOM);
    const { container } = renderRecitation({ state: { recitationSession: session } });
    fireEvent.click(screen.getByRole('button', { name: '2乘2，未背，可选择' }));
    act(() => spoken.at(-1).onend());
    fireEvent.click(screen.getByRole('button', { name: '我背完了' }));
    expect(screen.getByLabelText('2乘2等于4，已背')).toBeInTheDocument();
    expect(container.querySelectorAll('.matrix-cell[data-state="done"]')).toHaveLength(1);
  });

  it('未确认的自定义选择切回顺序背时不计入进度', () => {
    const session = switchRecitationMode(createEmptyRecitationSession(), ORDERING_MODES.CUSTOM);
    renderRecitation({ state: { recitationSession: session } });
    fireEvent.click(screen.getByRole('button', { name: '9乘1，未背，可选择' }));
    fireEvent.click(screen.getByRole('button', { name: '顺序背' }));
    expect(screen.getByText('0/45')).toBeInTheDocument();
    expect(screen.getByText('1 × 1 = 1 · 一一得一')).toBeInTheDocument();
    expect(loadRecitationSession().session.completedPhraseIds).toEqual([]);
  });

  it('自定义完成后切回顺序背并定位最早未完成句', () => {
    let session = switchRecitationMode(createEmptyRecitationSession(), ORDERING_MODES.CUSTOM);
    session = selectRecitationCoordinate(session, { a: 9, b: 1 });
    renderRecitation({ state: { recitationSession: session } });
    act(() => spoken.at(-1).onend());
    fireEvent.click(screen.getByRole('button', { name: '我背完了' }));
    expect(screen.getByText('1/45')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '顺序背' }));
    expect(screen.getByText('1 × 1 = 1 · 一一得一')).toBeInTheDocument();
    expect(spoken.at(-1).text).toBe('一一得一');
    expect(loadRecitationSession().session).toMatchObject({
      orderingMode: 'sequential',
      currentPhraseId: '1×1',
      completedPhraseIds: ['1×9'],
    });
  });

  it('刷新恢复自定义选择方向并重新领读', () => {
    let session = switchRecitationMode(createEmptyRecitationSession('2026-01-01T00:00:00.000Z'), ORDERING_MODES.CUSTOM, '2026-01-01T00:00:01.000Z');
    session = selectRecitationCoordinate(session, { a: 9, b: 1 }, '2026-01-01T00:00:02.000Z');
    saveRecitationSession(session);
    renderRecitation();
    expect(screen.getByText('9 × 1 = 9 · 一九得九')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '自定义背' })).toHaveAttribute('aria-pressed', 'true');
    expect(spoken.at(-1).text).toBe('一九得九');
  });

  it('普通口诀展开两个交换律格，平方口诀只展开一个格', () => {
    const session = createSequentialProgress(1);
    renderRecitation({ state: { recitationSession: session } });
    act(() => spoken.at(-1).onend());
    fireEvent.click(screen.getByRole('button', { name: '我背完了' }));
    expect(screen.getByLabelText('1乘2等于2，已背')).toBeInTheDocument();
    expect(screen.getByLabelText('2乘1等于2，已背')).toBeInTheDocument();
    act(() => spoken.at(-1).onend());
    fireEvent.click(screen.getByRole('button', { name: '我背完了' }));
    expect(screen.getByLabelText('2乘2等于4，已背')).toBeInTheDocument();
    expect(screen.getByText('1 × 3 = 3 · 一三得三')).toBeInTheDocument();
  });

  it('第44句进入九九八十一，第45句进入完整完成态且不再领读', () => {
    const session = createSequentialProgress(44);
    const { container } = renderRecitation({ state: { recitationSession: session } });
    expect(screen.getByText('9 × 9 = 81 · 九九八十一')).toBeInTheDocument();
    const spokenBeforeComplete = spoken.length;
    act(() => spoken.at(-1).onend());
    fireEvent.click(screen.getByRole('button', { name: '我背完了' }));
    expect(screen.getByText('45句全部背完 · 两张表已展开')).toBeInTheDocument();
    expect(screen.getByText('45/45')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '再听一遍' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '我背完了' })).toBeDisabled();
    expect(container.querySelectorAll('.matrix-cell[data-state="done"]')).toHaveLength(81);
    expect(container.querySelectorAll('.phrase-cell[data-state="done"]')).toHaveLength(RECITATION_PHRASES.length);
    expect(container.querySelectorAll('.phrase-header[data-state="done"]')).toHaveLength(9);
    expect(spoken).toHaveLength(spokenBeforeComplete);
    expect(loadRecitationSession().session).toMatchObject({ currentPhraseId: null, selectedCoordinate: null });
  });

  it('完整45句严格按传统顺序推进且每次确认只完成一句', () => {
    const session = createEmptyRecitationSession();
    renderRecitation({ state: { recitationSession: session } });
    RECITATION_PHRASES.forEach((phrase, index) => {
      expect(spoken.at(-1).text).toBe(phrase.text);
      act(() => spoken.at(-1).onend());
      const confirm = screen.getByRole('button', { name: '我背完了' });
      fireEvent.click(confirm);
      fireEvent.click(confirm);
      expect(screen.getByText(`${index + 1}/45`)).toBeInTheDocument();
    });
    expect(loadRecitationSession().session.completedPhraseIds).toEqual(RECITATION_PHRASES.map(({ id }) => id));
  });

  it('页面重新开始可取消保留，并可确认清空后重新领读第一句', async () => {
    const session = createSequentialProgress(3);
    renderRecitation({ state: { recitationSession: session } });
    const trigger = screen.getByRole('button', { name: '重新开始' });
    fireEvent.click(trigger);
    const keep = await screen.findByRole('button', { name: '继续保留' });
    await waitFor(() => expect(keep).toHaveFocus());
    fireEvent.click(keep);
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.getByText('3/45')).toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('button', { name: '清空并重新开始' }));
    expect(screen.getByText('0/45')).toBeInTheDocument();
    expect(screen.getByText('1 × 1 = 1 · 一一得一')).toHaveFocus();
    expect(spoken.at(-1).text).toBe('一一得一');
    expect(loadRecitationSession().session.completedPhraseIds).toEqual([]);
  });

  it('最后一句只在本次完成转换时触发柔光，恢复完成会话不触发', () => {
    const session = createSequentialProgress(44);
    const { container, unmount } = renderRecitation({ state: { recitationSession: session } });
    act(() => spoken.at(-1).onend());
    fireEvent.click(screen.getByRole('button', { name: '我背完了' }));
    expect(container.querySelector('.recitation-production-tables')).toHaveClass('is-completing');
    expect(container.querySelector('.recitation-live-region')).toHaveTextContent('45句全部背完，乘法表已经全部展开。');
    unmount();

    const complete = createSequentialProgress(45);
    saveRecitationSession(complete);
    const restored = renderRecitation();
    expect(restored.container.querySelector('.recitation-production-tables')).not.toHaveClass('is-completing');
  });

  it('语音调用异常时立即降级并允许手动确认', () => {
    window.speechSynthesis.speak.mockImplementation(() => { throw new Error('speech failed'); });
    const session = createEmptyRecitationSession();
    renderRecitation({ state: { recitationSession: session } });
    expect(screen.getByRole('button', { name: '语音不可用' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '我背完了' })).toBeEnabled();
    expect(screen.getByText('语音不可用，可以继续手动背诵。')).toBeInTheDocument();
  });

  it('自定义确认后将焦点移到按行排列的下一个未完成格', async () => {
    const session = switchRecitationMode(createEmptyRecitationSession(), ORDERING_MODES.CUSTOM);
    renderRecitation({ state: { recitationSession: session } });
    fireEvent.click(screen.getByRole('button', { name: '1乘1，未背，可选择' }));
    act(() => spoken.at(-1).onend());
    fireEvent.click(screen.getByRole('button', { name: '我背完了' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '1乘2，未背，可选择' })).toHaveFocus());
  });

  it('重置弹窗打开期间语音结束不会把焦点移出弹窗', async () => {
    const session = createEmptyRecitationSession();
    renderRecitation({ state: { recitationSession: session } });
    fireEvent.click(screen.getByRole('button', { name: '重新开始' }));
    const keep = await screen.findByRole('button', { name: '继续保留' });
    await waitFor(() => expect(keep).toHaveFocus());
    act(() => spoken.at(-1).onend());
    await waitFor(() => expect(keep).toHaveFocus());
    expect(screen.getByRole('button', { name: '我背完了' })).not.toHaveFocus();
  });

  it('恢复自定义等待会话时聚焦第一个未完成格', async () => {
    const session = switchRecitationMode(createEmptyRecitationSession(), ORDERING_MODES.CUSTOM);
    saveRecitationSession(session);
    renderRecitation();
    expect(screen.getByText('请从乘法表选择未背口诀')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: '1乘1，未背，可选择' })).toHaveFocus());
  });

  it('当前句切换会替换动画节点，减少动态效果样式会关闭动画', () => {
    const session = createEmptyRecitationSession();
    renderRecitation({ state: { recitationSession: session } });
    const firstPhrase = screen.getByText('1 × 1 = 1 · 一一得一');
    expect(firstPhrase).toHaveClass('recitation-current-phrase');
    act(() => spoken.at(-1).onend());
    fireEvent.click(screen.getByRole('button', { name: '我背完了' }));
    const secondPhrase = screen.getByText('1 × 2 = 2 · 一二得二');
    expect(secondPhrase).toHaveClass('recitation-current-phrase');
    expect(secondPhrase).not.toBe(firstPhrase);
    expect(recitationStyles).toMatch(/prefers-reduced-motion:\s*reduce[\s\S]*\.recitation-current-phrase\s*{\s*animation:\s*none;/);
  });

  it('重置保存失败保留内存空会话，后续保存成功会清除警告', async () => {
    const session = createSequentialProgress(3);
    renderRecitation({ state: { recitationSession: session } });
    fireEvent.click(screen.getByRole('button', { name: '重新开始' }));
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    fireEvent.click(await screen.findByRole('button', { name: '清空并重新开始' }));
    expect(screen.getByText('0/45')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('本次可以继续，但离开后可能无法恢复。');

    setItem.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: '自定义背' }));
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(loadRecitationSession().session.orderingMode).toBe(ORDERING_MODES.CUSTOM);
  });
});
