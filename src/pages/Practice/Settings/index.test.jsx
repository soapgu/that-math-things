import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PracticeSettings from './index';
import { BORROW_ONES_METHODS, PRACTICE_SETTINGS_KEY } from '../../../utils/practiceSettings';

function renderSettings() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PracticeSettings />
    </MemoryRouter>
  );
}

beforeEach(() => localStorage.clear());

describe('PracticeSettings v2.4 辅助设置', () => {
  it('展示破十法和平十法，辅助关闭时禁用选择', () => {
    const { getByText } = renderSettings();
    expect(getByText('做题时可主动查看进位、退位提示')).toBeTruthy();
    expect(getByText('破十法')).toBeTruthy();
    expect(getByText('平十法')).toBeTruthy();
    expect(getByText('破十法').closest('label').querySelector('input')).toBeDisabled();
  });

  it('开启辅助后可以选择平十法并持久化', () => {
    const view = renderSettings();
    fireEvent.click(view.getByRole('switch'));
    fireEvent.click(view.getByText('平十法'));
    expect(JSON.parse(localStorage.getItem(PRACTICE_SETTINGS_KEY))).toMatchObject({
      assistEnabled: true,
      borrowOnesMethod: BORROW_ONES_METHODS.BRIDGE_TEN,
    });
  });

  it('加载旧 assistMethod 时迁移为新的退位个位算法', () => {
    localStorage.setItem(PRACTICE_SETTINGS_KEY, JSON.stringify({
      range: 20,
      assistEnabled: true,
      assistMethod: 'flatTen',
      questionCount: 10,
    }));
    renderSettings();
    expect(JSON.parse(localStorage.getItem(PRACTICE_SETTINGS_KEY))).toMatchObject({
      borrowOnesMethod: BORROW_ONES_METHODS.BRIDGE_TEN,
    });
    expect(JSON.parse(localStorage.getItem(PRACTICE_SETTINGS_KEY))).not.toHaveProperty('assistMethod');
  });
});
