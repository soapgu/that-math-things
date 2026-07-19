import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PracticeSettings from './index';
import { PRACTICE_SETTINGS_KEY } from '../../../utils/practiceSettings';

function renderSettings() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PracticeSettings />
    </MemoryRouter>
  );
}

beforeEach(() => localStorage.clear());

describe('PracticeSettings v2.4 辅助设置', () => {
  it('展示主动查看说明，不再展示破十法和平十法', () => {
    const { getByText, queryByText } = renderSettings();
    expect(getByText('做题时可主动查看进位、退位提示')).toBeTruthy();
    expect(queryByText(/破十法/)).toBeNull();
    expect(queryByText(/平十法/)).toBeNull();
  });

  it('加载旧设置时自动移除 assistMethod', () => {
    localStorage.setItem(PRACTICE_SETTINGS_KEY, JSON.stringify({
      range: 20,
      assistEnabled: true,
      assistMethod: 'breakTen',
      questionCount: 10,
    }));
    renderSettings();
    expect(JSON.parse(localStorage.getItem(PRACTICE_SETTINGS_KEY))).not.toHaveProperty('assistMethod');
  });
});
