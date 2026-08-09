import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import MultiplicationRecitation from '.';
import { createEmptyRecitationSession } from '../../../features/multiplication/recitation/model';
import { loadRecitationSession, saveRecitationSession } from '../../../features/multiplication/recitation/storage';

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

describe('MultiplicationRecitation 第一轮顺序背闭环', () => {
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

  it('刷新式进入时从本地会话恢复', () => {
    saveRecitationSession(createEmptyRecitationSession());
    renderRecitation();
    expect(screen.getByText('1 × 1 = 1 · 一一得一')).toBeInTheDocument();
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
    expect(screen.getByRole('status')).toHaveTextContent('进度暂时无法保存，本次仍可继续背诵。');
    setItem.mockRestore();
  });
});
