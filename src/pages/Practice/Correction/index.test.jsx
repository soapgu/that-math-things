import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PracticeCorrection from './index';

const mockRecord = {
  id: 1,
  date: '2026-01-01T00:00:00.000Z',
  score: 50,
  total: 2,
  correct: 1,
  wrongCount: 1,
  timeSpent: 30,
  settings: { range: 20, addRatio: 70, carryBorrowProb: 60, questionCount: 2, assistEnabled: false },
  questions: [
    { a: 3, b: 4, op: '+', answer: 7, hasCarry: false, hasBorrow: false },
    { a: 9, b: 2, op: '+', answer: 11, hasCarry: true, hasBorrow: false },
  ],
  userAnswers: ['7', '5'],
  results: [
    { isCorrect: true, errors: [], detail: null },
    { isCorrect: false, errors: ['进位错误'], detail: [{ text: '忘记进位', bold: false }] },
  ],
};

function renderAt(pathname, state) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[{ pathname, state }]}>
      <Routes>
        <Route path="/practice/correction" element={<PracticeCorrection />} />
        <Route path="/practice" element={<div />} />
      </Routes>
    </MemoryRouter>
  );
}

test('有错题时正常渲染', () => {
  const { unmount } = renderAt('/practice/correction', { record: mockRecord });
  expect(() => unmount()).not.toThrow();
});

test('无需订正时显示提示', () => {
  const allCorrect = {
    ...mockRecord,
    wrongCount: 0,
    userAnswers: ['7', '11'],
    results: [
      { isCorrect: true, errors: [], detail: null },
      { isCorrect: true, errors: [], detail: null },
    ],
  };
  const { getByText, unmount } = renderAt('/practice/correction', { record: allCorrect });
  expect(getByText('无需订正')).toBeTruthy();
  unmount();
});

test('无 record 时不崩溃', () => {
  const { unmount } = renderAt('/practice/correction', {});
  expect(() => unmount()).not.toThrow();
});
