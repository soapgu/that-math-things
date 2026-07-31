import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  calculateMultiplicationResult,
  questionFromCoordinateId,
  recordAnsweredCell,
} from '../../features/multiplication/model';
import { createDefaultMultiplicationSettings } from '../../features/multiplication/routeState';
import MultiplicationSession from './Session';
import MultiplicationResult from './Result';
import MultiplicationSettings from './Settings';

const questions = Array.from({ length: 10 }, (_, id) => questionFromCoordinateId(id));
const settings = createDefaultMultiplicationSettings();

function renderSession(state = { settings, questions }) {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={[{ pathname: '/multiplication/session', state }]}
    >
      <Routes>
        <Route path="/multiplication" element={<div>设置页回退</div>} />
        <Route path="/multiplication/session" element={<MultiplicationSession />} />
        <Route path="/multiplication/result" element={<MultiplicationResult />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('九九乘法最小闭环', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('作答前矩阵目标格不泄露答案，首次选择后锁定并累计开图', () => {
    renderSession();
    const matrix = screen.getByRole('grid', { name: '九九乘法坐标表' });
    const target = within(matrix).getByRole('gridcell', { name: '1乘1目标格，答案待填写' });
    expect(target).toBeEmptyDOMElement();

    fireEvent.click(screen.getByRole('button', { name: '选择答案 1' }));
    expect(screen.getByText('回答正确：1 × 1 = 1')).toBeInTheDocument();
    screen.getAllByRole('button', { name: /答案|选择/ }).forEach((button) => {
      expect(button).toBeDisabled();
    });
    expect(within(matrix).getByRole('gridcell', { name: /1乘1当前题.*回答正确/ })).toHaveTextContent('1');

    fireEvent.click(screen.getByRole('button', { name: /下一题/ }));
    expect(within(matrix).getByRole('gridcell', { name: /1乘1已完成.*回答正确/ })).toHaveTextContent('1');
    expect(screen.getByText(/第 2\/10 题/)).toBeInTheDocument();
  });

  it('反馈期间暂停计时，切题后继续计时', () => {
    vi.useFakeTimers();
    renderSession();
    act(() => vi.advanceTimersByTime(2100));
    expect(screen.getByText(/作答 00:02/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '选择答案 1' }));
    act(() => vi.advanceTimersByTime(2200));
    expect(screen.getByText(/作答 00:02/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /下一题/ }));
    act(() => vi.advanceTimersByTime(1100));
    expect(screen.getByText(/作答 00:03/)).toBeInTheDocument();
  });

  it('完成10题后进入结算并可返回设置', async () => {
    renderSession();
    for (let index = 0; index < questions.length; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: `选择答案 ${questions[index].answer}` }));
      fireEvent.click(screen.getByRole('button', { name: index === 9 ? /查看结果/ : /下一题/ }));
    }

    await waitFor(() => expect(screen.getByRole('heading', { name: '闯关结果' })).toBeInTheDocument());
    expect(screen.getByText('100', { selector: '.ant-statistic-content-value-int' })).toBeInTheDocument();
    expect(screen.getByLabelText('3星')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /返回难度选择/ }));
    await waitFor(() => expect(screen.getByText('设置页回退')).toBeInTheDocument());
  });

  it('会话和结算缺少有效状态时 replace 回设置页', async () => {
    const { unmount } = renderSession(null);
    await waitFor(() => expect(screen.getByText('设置页回退')).toBeInTheDocument());
    unmount();

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/multiplication/result']}>
        <Routes>
          <Route path="/multiplication" element={<MultiplicationSettings />} />
          <Route path="/multiplication/result" element={<MultiplicationResult />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByRole('heading', { name: '九九乘法' })).toBeInTheDocument());
  });

  it('结算页与答题页使用相同的mm:ss格式', () => {
    const answeredCells = questions.reduce(
      (answered, question) => recordAnsweredCell(answered, question, question.answer),
      {},
    );
    const result = calculateMultiplicationResult({
      difficulty: settings.difficulty,
      total: 10,
      correct: 10,
      timeSpent: 65,
    });
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={[{
          pathname: '/multiplication/result',
          state: { settings, answeredCells, timeSpent: 65, result },
        }]}
      >
        <Routes>
          <Route path="/multiplication/result" element={<MultiplicationResult />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('01:05')).toBeInTheDocument();
  });
});
