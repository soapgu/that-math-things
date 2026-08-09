import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import MultiplicationSettings from '.';
import {
  ORDERING_MODES,
  RECITATION_PHRASES,
  completeCurrentPhrase,
  createEmptyRecitationSession,
  selectRecitationCoordinate,
  switchRecitationMode,
} from '../../../features/multiplication/recitation/model';
import { saveRecitationSession } from '../../../features/multiplication/recitation/storage';

function SessionStateProbe() {
  const location = useLocation();
  return <pre data-testid="session-state">{JSON.stringify(location.state)}</pre>;
}

function SettingsWithLocation() {
  const location = useLocation();
  return <><MultiplicationSettings /><span data-testid="settings-location">{`${location.pathname}${location.search}`}</span></>;
}

function renderSettings(initialEntry = '/multiplication') {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/multiplication" element={<SettingsWithLocation />} />
        <Route path="/multiplication/session" element={<SessionStateProbe />} />
        <Route path="/multiplication/recitation" element={<SessionStateProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function createSequentialProgress(count) {
  let session = createEmptyRecitationSession();
  for (let index = 0; index < count; index += 1) session = completeCurrentPhrase(session);
  return session;
}

describe('MultiplicationSettings', () => {
  beforeEach(() => localStorage.clear());

  it('默认选择简单10题并展示全部配置', () => {
    renderSettings();
    expect(screen.getByRole('heading', { name: '九九乘法' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /简单.*已选择/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /提升/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /挑战/ })).toHaveAttribute('aria-pressed', 'false');
    [10, 20, 50, 81].forEach((count) => {
      expect(screen.getByRole('button', { name: `${count} 题` })).toBeInTheDocument();
    });
  });

  it('按选择的挑战81题生成完整无重复会话', async () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: /挑战/ }));
    fireEvent.click(screen.getByRole('button', { name: '81 题' }));
    expect(screen.getByText('完成整张九九乘法表')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /开始闯关/ }));

    await waitFor(() => expect(screen.getByTestId('session-state')).toBeInTheDocument());
    const state = JSON.parse(screen.getByTestId('session-state').textContent);
    expect(state.settings).toEqual({ difficulty: 'hard', questionCount: 81 });
    expect(state.questions).toHaveLength(81);
    expect(new Set(state.questions.map(({ a, b }) => `${a}×${b}`)).size).toBe(81);
  });

  it.each(['/multiplication', '/multiplication?mode=challenge', '/multiplication?mode=unknown'])('默认和无效参数显示闯关：%s', (entry) => {
    renderSettings(entry);
    expect(screen.getByRole('tab', { name: '闯关' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /开始闯关/ })).toBeInTheDocument();
  });

  it('切换背诵Tab并开始空会话', async () => {
    renderSettings();
    fireEvent.click(screen.getByRole('tab', { name: '背诵' }));
    expect(screen.getByRole('tab', { name: '背诵' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('settings-location')).toHaveTextContent('/multiplication?mode=recitation');
    expect(screen.getByText('0/45')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /开始背诵/ }));
    await waitFor(() => expect(screen.getByTestId('session-state')).toBeInTheDocument());
    const state = JSON.parse(screen.getByTestId('session-state').textContent);
    expect(state.recitationSession).toMatchObject({ currentPhraseId: '1×1', completedPhraseIds: [] });
  });

  it('已有进度时显示继续背诵并传递会话', async () => {
    const session = completeCurrentPhrase(createEmptyRecitationSession());
    saveRecitationSession(session);
    renderSettings('/multiplication?mode=recitation');
    expect(screen.getByText('已背 1/45 句')).toBeInTheDocument();
    expect(screen.getByText('上次方式：顺序背')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /继续背诵/ }));
    await waitFor(() => expect(screen.getByTestId('session-state')).toBeInTheDocument());
    expect(JSON.parse(screen.getByTestId('session-state').textContent).recitationSession.completedPhraseIds).toEqual(['1×1']);
  });

  it.each([
    { count: 44, button: '继续背诵', summary: '上次方式：顺序背' },
    { count: RECITATION_PHRASES.length, button: '查看完成结果', summary: '整张口诀表已经背完' },
  ])('$count/45会话显示正确设置状态', ({ count, button, summary }) => {
    saveRecitationSession(createSequentialProgress(count));
    renderSettings('/multiplication?mode=recitation');
    expect(screen.getByText(`已背 ${count}/45 句`)).toBeInTheDocument();
    expect(screen.getByText(summary)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(button) })).toBeInTheDocument();
  });

  it('查看完成结果会携带45/45会话进入背诵页', async () => {
    saveRecitationSession(createSequentialProgress(RECITATION_PHRASES.length));
    renderSettings('/multiplication?mode=recitation');
    fireEvent.click(screen.getByRole('button', { name: /查看完成结果/ }));
    await waitFor(() => expect(screen.getByTestId('session-state')).toBeInTheDocument());
    expect(JSON.parse(screen.getByTestId('session-state').textContent).recitationSession).toMatchObject({
      currentPhraseId: null,
      selectedCoordinate: null,
      completedPhraseIds: RECITATION_PHRASES.map(({ id }) => id),
    });
  });

  it('首次保存失败仍携带内存会话进入背诵页', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    renderSettings('/multiplication?mode=recitation');
    fireEvent.click(screen.getByRole('button', { name: /开始背诵/ }));
    await waitFor(() => expect(screen.getByTestId('session-state')).toBeInTheDocument());
    const state = JSON.parse(screen.getByTestId('session-state').textContent);
    expect(state.recitationSession.currentPhraseId).toBe('1×1');
    expect(state.storageWarning).toMatch(/离开后可能无法恢复/);
    setItem.mockRestore();
  });

  it('自定义会话显示真实方式并保持模式继续背诵', async () => {
    let session = switchRecitationMode(createEmptyRecitationSession(), ORDERING_MODES.CUSTOM);
    session = selectRecitationCoordinate(session, { a: 9, b: 1 });
    saveRecitationSession(session);
    renderSettings('/multiplication?mode=recitation');
    expect(screen.getByText('上次方式：自定义背')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /继续背诵/ }));
    await waitFor(() => expect(screen.getByTestId('session-state')).toBeInTheDocument());
    expect(JSON.parse(screen.getByTestId('session-state').textContent).recitationSession).toMatchObject({
      orderingMode: 'custom',
      currentPhraseId: '1×9',
      selectedCoordinate: { a: 9, b: 1 },
    });
  });

  it('损坏与不可访问存储显示不同的安全降级提示', () => {
    localStorage.setItem('multiplication-recitation-session-v1', '{bad');
    const { unmount } = renderSettings('/multiplication?mode=recitation');
    expect(screen.getByRole('status')).toHaveTextContent('背诵进度数据异常，已安全恢复为空进度。');
    unmount();

    localStorage.clear();
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    renderSettings('/multiplication?mode=recitation');
    expect(screen.getByRole('status')).toHaveTextContent('无法读取本机进度，本次仍可背诵，但离开后可能无法恢复。');
    getItem.mockRestore();
  });

  it('重新开始可取消保留，也可确认后直接进入全新顺序会话', async () => {
    const session = completeCurrentPhrase(createEmptyRecitationSession());
    saveRecitationSession(session);
    renderSettings('/multiplication?mode=recitation');
    const trigger = screen.getByRole('button', { name: '重新开始' });
    fireEvent.click(trigger);
    expect(await screen.findByRole('dialog', { name: '重新开始背诵？' })).toBeInTheDocument();
    const keep = screen.getByRole('button', { name: '继续保留' });
    await waitFor(() => expect(keep).toHaveFocus());
    fireEvent.click(keep);
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.getByText('已背 1/45 句')).toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('button', { name: '清空并重新开始' }));
    await waitFor(() => expect(screen.getByTestId('session-state')).toBeInTheDocument());
    expect(JSON.parse(screen.getByTestId('session-state').textContent).recitationSession).toMatchObject({
      orderingMode: 'sequential', currentPhraseId: '1×1', selectedCoordinate: null, completedPhraseIds: [],
    });
  });
});
