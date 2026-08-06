import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  createMemoryRouter,
  MemoryRouter,
  Route,
  RouterProvider,
  Routes,
  useLocation,
} from 'react-router-dom';
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
const nativeGlobalRequest = globalThis.Request;
const nativeWindowRequest = window.Request;

class RouterCompatibleRequest extends nativeGlobalRequest {
  constructor(input, init = {}) {
    const { signal: _crossRealmSignal, ...compatibleInit } = init;
    super(input, compatibleInit);
  }
}

function renderSession(state = { settings, questions }) {
  const router = createMemoryRouter([
    { path: '/multiplication', element: <div>设置页回退</div> },
    { path: '/multiplication/session', element: <MultiplicationSession /> },
    { path: '/multiplication/result', element: <MultiplicationResult /> },
    { path: '/', element: <div>首页</div> },
  ], {
    initialEntries: [
      '/multiplication',
      { pathname: '/multiplication/session', state },
    ],
    initialIndex: 1,
    future: { v7_startTransition: true, v7_relativeSplatPath: true },
  });
  return {
    ...render(<RouterProvider router={router} future={{ v7_startTransition: true }} />),
    router,
  };
}

function createSessionState(difficulty, questionCount = 10, startId = 30) {
  return {
    settings: { difficulty, questionCount },
    questions: Array.from({ length: questionCount }, (_, index) => (
      questionFromCoordinateId((startId + index) % 81)
    )),
  };
}

describe('九九乘法最小闭环', () => {
  beforeAll(() => {
    globalThis.Request = RouterCompatibleRequest;
    window.Request = RouterCompatibleRequest;
  });

  afterAll(() => {
    globalThis.Request = nativeGlobalRequest;
    window.Request = nativeWindowRequest;
    expect(globalThis.Request).toBe(nativeGlobalRequest);
    expect(window.Request).toBe(nativeWindowRequest);
  });

  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('作答前矩阵目标格不泄露答案，首次选择后锁定并累计开图', () => {
    renderSession();
    expect(screen.getAllByRole('button', { name: /选择答案/ })[0]).toHaveFocus();
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

  it('正常动效在滑动和发射完成前不泄露提示或作答控件', () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    renderSession(createSessionState('easy'));
    const matrix = screen.getByRole('grid', { name: '九九乘法坐标表' });
    expect(screen.getByText(/定位中/)).toBeInTheDocument();
    expect(matrix).toHaveAttribute('data-locate-stage', 'idle');
    expect(matrix.querySelectorAll('[data-kind="hint"]')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /选择答案/ })).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(600));
    expect(matrix).toHaveAttribute('data-locate-stage', 'firing');
    expect(screen.queryByRole('button', { name: /选择答案/ })).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(800));
    expect(matrix).toHaveAttribute('data-locate-stage', 'revealed');
    expect(matrix.querySelectorAll('[data-kind="hint"]')).toHaveLength(16);
    expect(screen.getAllByRole('button', { name: /选择答案/ })[0]).toHaveFocus();
    expect(screen.getByText(/作答 00:00/)).toBeInTheDocument();
  });

  it('简单提示分别沿横纵光束从轴起点依次显现', () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    renderSession(createSessionState('easy', 10, 65));
    const matrix = screen.getByRole('grid', { name: '九九乘法坐标表' });

    act(() => vi.advanceTimersByTime(690));
    expect(within(matrix).getByRole('gridcell', { name: '8乘1等于8' })).toBeInTheDocument();
    expect(within(matrix).getByRole('gridcell', { name: '1乘3等于3' })).toBeInTheDocument();
    expect(matrix.querySelector('[data-row="8"][data-column="2"]')).toHaveAttribute('data-kind', 'hidden');
    expect(matrix.querySelector('[data-row="2"][data-column="3"]')).toHaveAttribute('data-kind', 'hidden');

    act(() => vi.advanceTimersByTime(89));
    expect(within(matrix).getByRole('gridcell', { name: '8乘2等于16' })).toBeInTheDocument();
    expect(within(matrix).getByRole('gridcell', { name: '2乘3等于6' })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(621));
    expect(matrix.querySelectorAll('[data-kind="hint"]')).toHaveLength(16);
  });

  it('提升提示沿对应光束显现，挑战模式始终不公开提示', () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const { unmount } = renderSession(createSessionState('medium'));
    let matrix = screen.getByRole('grid', { name: '九九乘法坐标表' });
    act(() => vi.advanceTimersByTime(866));
    expect(matrix.querySelectorAll('[data-kind="hint"]')).toHaveLength(0);
    act(() => vi.advanceTimersByTime(2));
    expect(matrix.querySelectorAll('[data-kind="hint"]')).toHaveLength(2);
    act(() => vi.advanceTimersByTime(177));
    expect(matrix.querySelectorAll('[data-kind="hint"]')).toHaveLength(4);
    unmount();

    renderSession(createSessionState('hard'));
    matrix = screen.getByRole('grid', { name: '九九乘法坐标表' });
    act(() => vi.advanceTimersByTime(1399));
    expect(matrix.querySelectorAll('[data-kind="hint"]')).toHaveLength(0);
    expect(within(matrix).queryByRole('textbox')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(matrix.querySelectorAll('[data-kind="hint"]')).toHaveLength(0);
    expect(within(matrix).getByRole('textbox')).toBeInTheDocument();
  });

  it('提升难度在目标格内输入，Enter提交并正确流转焦点', () => {
    renderSession(createSessionState('medium'));
    const matrix = screen.getByRole('grid', { name: '九九乘法坐标表' });
    expect(matrix.querySelectorAll('[data-kind="hint"]')).toHaveLength(4);
    const input = within(matrix).getByRole('textbox', { name: '4乘4的答案' });
    expect(input).toHaveFocus();
    expect(input.closest('[data-kind="target"]')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '16' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('回答正确：4 × 4 = 16')).toBeInTheDocument();
    const next = screen.getByRole('button', { name: /下一题/ });
    expect(next).toHaveFocus();

    fireEvent.click(next);
    const nextInput = within(matrix).getByRole('textbox', { name: '4乘5的答案' });
    expect(nextInput).toHaveValue('');
    expect(nextInput).toHaveFocus();
  });

  it('提升难度提交后保留输入300ms，再显示正确结果', () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    renderSession(createSessionState('medium'));
    act(() => vi.advanceTimersByTime(1400));
    const matrix = screen.getByRole('grid', { name: '九九乘法坐标表' });
    const input = within(matrix).getByRole('textbox', { name: '4乘4的答案' });
    fireEvent.change(input, { target: { value: '15' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    let target = matrix.querySelector('[data-row="4"][data-column="4"]');
    expect(target).toHaveAttribute('data-feedback-stage', 'submitted');
    expect(target).toHaveTextContent('15');
    expect(target).not.toHaveTextContent('16');
    expect(target.querySelector('.multiplication-marker')).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(299));
    expect(target).toHaveAttribute('data-feedback-stage', 'submitted');
    act(() => vi.advanceTimersByTime(1));
    target = matrix.querySelector('[data-row="4"][data-column="4"]');
    expect(target).toHaveAttribute('data-feedback-stage', 'result');
    expect(target).toHaveTextContent('16');
    expect(target).toHaveTextContent('✕');
    expect(screen.getByText(/你的答案是 15/)).toBeInTheDocument();
  });

  it('格内反馈过渡在快速切题时清理，减少动态效果时直接显示结果', () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const { unmount } = renderSession(createSessionState('medium'));
    act(() => vi.advanceTimersByTime(1400));
    let input = screen.getByRole('textbox', { name: '4乘4的答案' });
    fireEvent.change(input, { target: { value: '16' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(document.querySelector('[data-feedback-stage="submitted"]')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /下一题/ }));
    act(() => vi.advanceTimersByTime(300));
    expect(document.querySelector('[data-feedback-stage]')).not.toBeInTheDocument();
    unmount();

    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    renderSession(createSessionState('hard'));
    input = screen.getByRole('textbox', { name: '4乘4的答案' });
    fireEvent.change(input, { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: '提交答案' }));
    expect(document.querySelector('[data-feedback-stage="result"]')).toHaveTextContent('16');
    expect(document.querySelector('[data-feedback-stage="submitted"]')).not.toBeInTheDocument();
  });

  it('挑战难度不泄露提示，并通过提交按钮记录错误答案', () => {
    renderSession(createSessionState('hard'));
    const matrix = screen.getByRole('grid', { name: '九九乘法坐标表' });
    expect(matrix.querySelectorAll('[data-kind="hint"]')).toHaveLength(0);
    const input = within(matrix).getByRole('textbox', { name: '4乘4的答案' });
    expect(matrix.outerHTML).not.toContain('16');
    fireEvent.change(input, { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: '提交答案' }));
    expect(screen.getByText('你的答案是 15，正确答案：4 × 4 = 16')).toBeInTheDocument();
    expect(within(matrix).queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('格内输入拒绝空值、非数字和0', () => {
    renderSession(createSessionState('medium'));
    const input = screen.getByRole('textbox', { name: '4乘4的答案' });
    expect(screen.getByRole('button', { name: '提交答案' })).toBeDisabled();

    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: '提交答案' }));
    expect(screen.getByText('请输入有效的正整数')).toBeInTheDocument();
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('请输入有效的正整数')).toBeInTheDocument();
    expect(screen.queryByText(/回答正确|正确答案：/)).not.toBeInTheDocument();
  });

  it('超长数字不会进入提交状态或导致页面崩溃', () => {
    vi.useFakeTimers();
    renderSession(createSessionState('hard'));
    const matrix = screen.getByRole('grid', { name: '九九乘法坐标表' });
    const input = screen.getByRole('textbox', { name: '4乘4的答案' });
    fireEvent.change(input, { target: { value: '9'.repeat(400) } });
    fireEvent.click(screen.getByRole('button', { name: '提交答案' }));

    expect(screen.getByText('请输入有效的正整数')).toBeInTheDocument();
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText(/回答正确|正确答案：/)).not.toBeInTheDocument();
    expect(matrix.querySelectorAll('[data-kind^="history-"]')).toHaveLength(0);
    act(() => vi.advanceTimersByTime(1100));
    expect(screen.getByText(/作答 00:01/)).toBeInTheDocument();
  });

  it('反馈期间暂停计时，切题后继续计时', () => {
    vi.useFakeTimers();
    renderSession();
    act(() => vi.advanceTimersByTime(2100));
    expect(screen.getByText(/作答 00:02/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '选择答案 1' }));
    act(() => vi.advanceTimersByTime(2200));
    expect(screen.getByText(/作答 00:02/)).toBeInTheDocument();
    expect(screen.getByText(/第 2\/10 题/)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1100));
    expect(screen.getByText(/作答 00:03/)).toBeInTheDocument();
  });

  it('手动切题和自动切题竞争时只推进一次', () => {
    vi.useFakeTimers();
    renderSession();
    fireEvent.click(screen.getByRole('button', { name: '选择答案 1' }));
    act(() => vi.advanceTimersByTime(1999));
    fireEvent.click(screen.getByRole('button', { name: /下一题/ }));
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText(/第 2\/10 题/)).toBeInTheDocument();
    expect(screen.queryByText(/第 3\/10 题/)).not.toBeInTheDocument();
  });

  it('离开时暂停并确认，取消保留当前输入，确认后进入原目标', async () => {
    const { router } = renderSession(createSessionState('medium'));
    const input = screen.getByRole('textbox', { name: '4乘4的答案' });
    fireEvent.change(input, { target: { value: '1' } });

    act(() => { router.navigate('/'); });
    expect(await screen.findByRole('dialog', { name: '确定离开本局吗？' })).toBeInTheDocument();
    expect(screen.getByText('离开后本局不保存。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '继续闯关' }));
    expect(await screen.findByRole('textbox', { name: '4乘4的答案' })).toHaveValue('1');
    expect(screen.getByRole('textbox', { name: '4乘4的答案' })).toHaveFocus();

    act(() => { router.navigate('/'); });
    fireEvent.click(await screen.findByRole('button', { name: '确认离开' }));
    await waitFor(() => expect(screen.getByText('首页')).toBeInTheDocument());
  });

  it('未完成会话注册刷新关闭提醒，卸载后清理', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderSession();
    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('完成10题后进入结算并可返回设置', async () => {
    renderSession();
    for (let index = 0; index < questions.length; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: `选择答案 ${questions[index].answer}` }));
      if (index === 9) {
        expect(document.querySelector('[data-session-phase="FINISHED"]')).toBeInTheDocument();
      }
      fireEvent.click(screen.getByRole('button', { name: index === 9 ? /查看结果/ : /下一题/ }));
    }

    await waitFor(() => expect(screen.getByRole('heading', { name: '闯关结果' })).toBeInTheDocument());
    expect(screen.getByText('100', { selector: '.ant-statistic-content-value-int' })).toBeInTheDocument();
    expect(screen.getByLabelText('3星')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /返回难度选择/ }));
    await waitFor(() => expect(screen.getByText('设置页回退')).toBeInTheDocument());
  });

  it('最后一题进入FINISHED，错误反馈不会自动结算，取消离开后恢复结果焦点', () => {
    vi.useFakeTimers();
    const { router } = renderSession();
    for (let index = 0; index < questions.length; index += 1) {
      const answer = index === questions.length - 1 ? 3 : questions[index].answer;
      fireEvent.click(screen.getByRole('button', { name: `选择答案 ${answer}` }));
      if (index < questions.length - 1) fireEvent.click(screen.getByRole('button', { name: /下一题/ }));
    }

    expect(document.querySelector('[data-session-phase="FINISHED"]')).toBeInTheDocument();
    expect(screen.getByText(/你的答案是 3/)).toBeInTheDocument();
    const resultButton = screen.getByRole('button', { name: /查看结果/ });
    expect(resultButton).toHaveFocus();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByRole('heading', { name: '闯关结果' })).not.toBeInTheDocument();

    act(() => { router.navigate('/'); });
    fireEvent.click(screen.getByRole('button', { name: '继续闯关' }));
    act(() => vi.advanceTimersByTime(0));
    expect(document.querySelector('[data-session-phase="FINISHED"]')).toBeInTheDocument();
    expect(resultButton).toHaveFocus();
  });

  it.each([20, 50, 81])('简单模式%i题可真实完成并显示动态结算', async (questionCount) => {
    const state = createSessionState('easy', questionCount, 0);
    renderSession(state);
    const matrix = screen.getByRole('grid', { name: '九九乘法坐标表' });

    for (let index = 0; index < state.questions.length; index += 1) {
      const question = state.questions[index];
      fireEvent.click(screen.getByRole('button', { name: `选择答案 ${question.answer}` }));
      if (index < state.questions.length - 1) {
        fireEvent.click(screen.getByRole('button', { name: /下一题/ }));
      }
    }

    expect(matrix.querySelectorAll('[data-kind$="-correct"]')).toHaveLength(questionCount);
    if (questionCount === 81) expect(matrix).toHaveClass('multiplication-table-complete');
    fireEvent.click(screen.getByRole('button', { name: /查看结果/ }));

    await waitFor(() => expect(screen.getByRole('heading', { name: '闯关结果' })).toBeInTheDocument());
    expect(screen.getByLabelText('3星')).toBeInTheDocument();
    expect(screen.getByText('100', { selector: '.ant-statistic-content-value-int' })).toBeInTheDocument();
    const correctStatistic = screen.getByText('正确题数').closest('.ant-statistic');
    const totalStatistic = screen.getByText('总题数').closest('.ant-statistic');
    expect(within(correctStatistic).getByText(String(questionCount), { selector: '.ant-statistic-content-value-int' })).toBeInTheDocument();
    expect(within(correctStatistic).getByText(`/ ${questionCount}`)).toBeInTheDocument();
    expect(within(totalStatistic).getByText(String(questionCount), { selector: '.ant-statistic-content-value-int' })).toBeInTheDocument();
  }, 30000);

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

  it('再来一局保留设置并生成新的合法会话', async () => {
    const replaySettings = { difficulty: 'hard', questionCount: 20 };
    const replayQuestions = Array.from({ length: 20 }, (_, id) => questionFromCoordinateId(id));
    const answeredCells = replayQuestions.reduce(
      (answered, question) => recordAnsweredCell(answered, question, question.answer),
      {},
    );
    const result = calculateMultiplicationResult({
      difficulty: 'hard', total: 20, correct: 20, timeSpent: 20,
    });
    function SessionProbe() {
      const location = useLocation();
      return <pre data-testid="replay-state">{JSON.stringify(location.state)}</pre>;
    }
    const router = createMemoryRouter([
      { path: '/multiplication/result', element: <MultiplicationResult /> },
      { path: '/multiplication/session', element: <SessionProbe /> },
    ], {
      initialEntries: [{
        pathname: '/multiplication/result',
        state: { settings: replaySettings, answeredCells, timeSpent: 20, result },
      }],
      future: { v7_startTransition: true, v7_relativeSplatPath: true },
    });
    render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);
    fireEvent.click(screen.getByRole('button', { name: /再来一局/ }));
    await waitFor(() => expect(screen.getByTestId('replay-state')).toBeInTheDocument());
    const state = JSON.parse(screen.getByTestId('replay-state').textContent);
    expect(state.settings).toEqual(replaySettings);
    expect(state.questions).toHaveLength(20);
    expect(new Set(state.questions.map(({ a, b }) => `${a}×${b}`)).size).toBe(20);
  });
});
