import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PracticeSession from './Session';
import PracticeResult from './Result';
import { getPracticeRecords } from '../../utils/storage';

const mocks = vi.hoisted(() => ({
  questions: [
    { a: 27, b: 5, op: '+', answer: 32, hasCarry: true, hasBorrow: false },
    { a: 43, b: 18, op: '-', answer: 25, hasCarry: false, hasBorrow: true },
    { a: 9, b: 2, op: '+', answer: 11, hasCarry: true, hasBorrow: false },
  ],
  timer: {
    seconds: 42,
    formatted: '00:42',
    start: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
  },
}));

vi.mock('../../utils/mathGenerator', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, generateQuestions: () => mocks.questions };
});
vi.mock('../../hooks/useTimer', () => ({ default: () => mocks.timer }));
vi.mock('./Result/RadarChart', () => ({ default: () => null }));

function renderFlow() {
  const settings = {
    range: 50,
    addRatio: 50,
    carryBorrowProb: 100,
    assistEnabled: true,
    borrowOnesMethod: 'bridgeTen',
    questionCount: 3,
  };

  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={[{ pathname: '/practice/session', state: { settings } }]}
    >
      <Routes>
        <Route path="/practice/session" element={<PracticeSession />} />
        <Route path="/practice/result" element={<PracticeResult />} />
        <Route path="/practice" element={<div>设置页</div>} />
        <Route path="/practice/correction" element={<div>订正页</div>} />
        <Route path="/practice/stats" element={<div>统计页</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  mocks.timer.start.mockClear();
  mocks.timer.stop.mockClear();
});

it('Session → Storage → Result 保留逐题辅助记录并展示一致摘要', async () => {
  const { getByText, getByPlaceholderText, findByText } = renderFlow();
  const answerInput = getByPlaceholderText('?');

  // 第一题只查看提醒。
  fireEvent.click(getByText('需要提示'));
  fireEvent.change(answerInput, { target: { value: '32' } });
  fireEvent.click(getByText('下一题'));

  // 第二题查看平十法完整演示。
  fireEvent.click(getByText('需要提示'));
  fireEvent.click(getByText('看看计算方法'));
  fireEvent.click(getByText('跳过演示'));
  fireEvent.change(answerInput, { target: { value: '25' } });
  fireEvent.click(getByText('下一题'));

  // 第三题不使用辅助。
  fireEvent.change(answerInput, { target: { value: '11' } });
  fireEvent.click(getByText('完成'));

  expect(await findByText('辅助使用情况')).toBeTruthy();
  expect(getByText('独立完成').closest('.ant-statistic').textContent).toContain('1题');
  expect(getByText('只看提醒').closest('.ant-statistic').textContent).toContain('1题');
  expect(getByText('查看方法').closest('.ant-statistic').textContent).toContain('1题');

  const [stored] = getPracticeRecords();
  expect(stored.schemaVersion).toBe(2);
  expect(stored.items.map(({ assistUsage }) => assistUsage)).toEqual([
    expect.objectContaining({ level: 1, method: null, strategy: null }),
    expect.objectContaining({ level: 2, method: 'placeValueBorrow', strategy: 'bridgeTen' }),
    expect.objectContaining({ level: 0, method: null, strategy: null }),
  ]);
});
