import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PracticeResult from './index';

vi.mock('./RadarChart', () => ({ default: () => null }));

const baseRecord = {
  id: 1,
  date: '2026-01-01T00:00:00.000Z',
  score: 90,
  total: 2,
  correct: 2,
  wrongCount: 0,
  timeSpent: 60,
  settings: { range: 20, addRatio: 50, carryBorrowProb: 30, questionCount: 2 },
  questions: [
    { a: 3, b: 4, op: '+', answer: 7, hasCarry: false, hasBorrow: false },
    { a: 5, b: 2, op: '+', answer: 7, hasCarry: false, hasBorrow: false },
  ],
  userAnswers: ['7', '7'],
  results: [
    { isCorrect: true, errors: [], detail: null },
    { isCorrect: true, errors: [], detail: null },
  ],
};

function recordWithEval(overrides = {}) {
  return {
    ...baseRecord,
    evaluation: {
      difficulty: 3,
      accuracy: 4,
      speed: 3,
      composite: { totalStars: 4, grade: 'SR', comment: '表现优秀，速度方面还有提升空间。' },
    },
    ...overrides,
  };
}

function renderAt(state) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[{ pathname: '/practice/result', state }]}>
      <Routes>
        <Route path="/practice/result" element={<PracticeResult />} />
        <Route path="/practice" element={<div />} />
        <Route path="/practice/correction" element={<div />} />
        <Route path="/practice/stats" element={<div />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PracticeResult 评价卡片', () => {
  describe('评价卡片渲染', () => {
    it('有 evaluation 时渲染评级标签', () => {
      const { getByText } = renderAt({ record: recordWithEval() });
      expect(getByText('SR')).toBeTruthy();
    });

    it('显示评语文案', () => {
      const { container } = renderAt({ record: recordWithEval() });
      expect(container.textContent).toContain('表现优秀，速度方面还有提升空间。');
    });

    it('无 evaluation（旧数据）不渲染评价卡片', () => {
      const { queryByText } = renderAt({ record: baseRecord });
      expect(queryByText('综合评价')).toBeNull();
    });

    it('全 5★ → UR 评级', () => {
      const { container, getByText } = renderAt({
        record: recordWithEval({
          score: 100,
          results: [
            { isCorrect: true, errors: [], detail: null },
            { isCorrect: true, errors: [], detail: null },
          ],
          evaluation: {
            difficulty: 5,
            accuracy: 5,
            speed: 5,
            composite: { totalStars: 5, grade: 'UR', comment: '无可挑剔的完美表现！' },
          },
        }),
      });
      expect(getByText('UR')).toBeTruthy();
      expect(container.textContent).toContain('无可挑剔的完美表现！');
    });

    it('低分 → N 评级', () => {
      const { getByText } = renderAt({
        record: recordWithEval({
          score: 40,
          results: [
            { isCorrect: false, errors: ['计算错误'], detail: [{ text: '计算结果不正确', bold: false }] },
            { isCorrect: false, errors: ['计算错误'], detail: [{ text: '计算结果不正确', bold: false }] },
          ],
          evaluation: {
            difficulty: 2,
            accuracy: 1,
            speed: 1,
            composite: { totalStars: 2, grade: 'N', comment: '需要多加练习，建议放慢速度，确保每一步计算准确。' },
          },
        }),
      });
      expect(getByText('N')).toBeTruthy();
    });
  });

  it('无 record 时不崩溃', () => {
    const { unmount } = renderAt({});
    expect(() => unmount()).not.toThrow();
  });
});
