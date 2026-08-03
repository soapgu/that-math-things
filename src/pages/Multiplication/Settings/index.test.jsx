import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import MultiplicationSettings from '.';

function SessionStateProbe() {
  const location = useLocation();
  return <pre data-testid="session-state">{JSON.stringify(location.state)}</pre>;
}

function renderSettings() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/multiplication']}>
      <Routes>
        <Route path="/multiplication" element={<MultiplicationSettings />} />
        <Route path="/multiplication/session" element={<SessionStateProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MultiplicationSettings', () => {
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
});
