import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Home from '.';

describe('Home entries', () => {
  it('保留原有入口并可进入九九乘法设置', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/multiplication" element={<div>九九乘法设置页</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '错题列表' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '计算训练' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('heading', { name: '九九乘法' }));
    expect(screen.getByText('九九乘法设置页')).toBeInTheDocument();
  });
});
