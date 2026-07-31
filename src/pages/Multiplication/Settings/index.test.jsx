import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import MultiplicationSettings from '.';

function SessionStateProbe() {
  const location = useLocation();
  return (
    <div>
      <span>session</span>
      <span>{location.state?.settings?.difficulty}</span>
      <span>{location.state?.settings?.questionCount}</span>
      <span>{location.state?.questions?.length}</span>
    </div>
  );
}

describe('MultiplicationSettings', () => {
  it('以简单10题开始一局无重复题目', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/multiplication']}>
        <Routes>
          <Route path="/multiplication" element={<MultiplicationSettings />} />
          <Route path="/multiplication/session" element={<SessionStateProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '九九乘法' })).toBeInTheDocument();
    expect(screen.getByText('简单')).toBeInTheDocument();
    expect(screen.getByText('10 题')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /开始闯关/ }));

    await waitFor(() => expect(screen.getByText('session')).toBeInTheDocument());
    expect(screen.getByText('easy')).toBeInTheDocument();
    expect(screen.getAllByText('10')).toHaveLength(2);
  });
});
