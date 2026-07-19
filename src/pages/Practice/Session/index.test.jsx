import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PracticeSession from './index';

const mocks = vi.hoisted(() => ({
  questions: [],
  timer: {
    seconds: 0,
    formatted: '00:00',
    start: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
  },
}));

vi.mock('../../../utils/mathGenerator', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, generateQuestions: () => mocks.questions };
});

vi.mock('../../../hooks/useTimer', () => ({ default: () => mocks.timer }));
vi.mock('../../../utils/storage', () => ({ savePracticeRecord: vi.fn() }));

const settings = {
  range: 20,
  addRatio: 50,
  carryBorrowProb: 40,
  assistEnabled: true,
  questionCount: 2,
};

const carryQuestion = { a: 27, b: 5, op: '+', answer: 32, hasCarry: true, hasBorrow: false };
const borrowQuestion = { a: 43, b: 18, op: '-', answer: 25, hasCarry: false, hasBorrow: true };
const plainQuestion = { a: 12, b: 5, op: '+', answer: 17, hasCarry: false, hasBorrow: false };

function renderSession(overrides = {}) {
  const sessionSettings = { ...settings, ...overrides };
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={[{ pathname: '/practice/session', state: { settings: sessionSettings } }]}
    >
      <Routes>
        <Route path="/practice/session" element={<PracticeSession />} />
        <Route path="/practice" element={<div>设置页</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  mocks.questions = [carryQuestion, carryQuestion];
  mocks.timer.start.mockClear();
  mocks.timer.stop.mockClear();
});

describe('PracticeSession 两层辅助', () => {
  it('开启辅助的进位题显示入口，点击后才展示提示', () => {
    const { getByText, queryByText } = renderSession();
    expect(getByText('需要提示')).toBeTruthy();
    expect(queryByText(/个位 7 \+ 5 超过了 10/)).toBeNull();

    fireEvent.click(getByText('需要提示'));
    expect(getByText('个位 7 + 5 超过了 10，记得向十位进 1。')).toBeTruthy();
  });

  it('关闭辅助时不显示入口', () => {
    const { queryByText } = renderSession({ assistEnabled: false });
    expect(queryByText('需要提示')).toBeNull();
  });

  it('不进位题不显示入口', () => {
    mocks.questions = [plainQuestion, plainQuestion];
    const { queryByText } = renderSession();
    expect(queryByText('需要提示')).toBeNull();
  });

  it('切换下一题后提示恢复为收起状态', () => {
    const { getByText, getByPlaceholderText, queryByText } = renderSession();
    fireEvent.click(getByText('需要提示'));
    expect(getByText('个位 7 + 5 超过了 10，记得向十位进 1。')).toBeTruthy();

    fireEvent.change(getByPlaceholderText('?'), { target: { value: '32' } });
    fireEvent.click(getByText('下一题'));

    expect(queryByText('个位 7 + 5 超过了 10，记得向十位进 1。')).toBeNull();
    expect(getByText('需要提示')).toBeTruthy();
  });

  it('可进入第二层并在跳过后重新聚焦答案输入框', () => {
    const { getByText, getByPlaceholderText } = renderSession();
    const input = getByPlaceholderText('?');
    fireEvent.click(getByText('需要提示'));
    fireEvent.click(getByText('看看计算方法'));
    expect(getByText('进位计算演示')).toBeTruthy();

    input.blur();
    fireEvent.click(getByText('跳过演示'));
    expect(input).toHaveFocus();
    expect(getByText('需要提示')).toBeTruthy();
  });

  it('退位题进入退位方法演示', () => {
    mocks.questions = [borrowQuestion, borrowQuestion];
    const { getByText } = renderSession();
    fireEvent.click(getByText('需要提示'));
    fireEvent.click(getByText('看看计算方法'));
    expect(getByText('退位计算演示')).toBeTruthy();
    expect(getByText('把 43 看作 3 个十和 13 个一')).toBeTruthy();
  });
});
