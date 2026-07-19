import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { createAssistance } from '../../../utils/assistGenerator';
import CarryAnimation from './CarryAnimation';
import BorrowAnimation from './BorrowAnimation';
import { STEP_DURATION } from './AssistAnimationPlayer';

describe('进位、退位分步动画', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const advanceSteps = (count) => {
    for (let index = 0; index < count; index += 1) {
      act(() => vi.advanceTimersByTime(STEP_DURATION));
    }
  };

  it.each([
    [9, 1, 10],
    [18, 2, 20],
    [36, 27, 63],
  ])('%i + %i 能完整播放到合并步骤', (a, b, answer) => {
    const assistance = createAssistance({ a, b, op: '+', answer });
    const onComplete = vi.fn();
    const { getByText, getByLabelText } = render(
      <CarryAnimation assistance={assistance} onComplete={onComplete} />,
    );

    expect(getByText(assistance.steps[0].text)).toBeTruthy();
    advanceSteps(4);
    expect(getByText(assistance.steps[4].text)).toBeTruthy();
    expect(getByLabelText(`数位表：${assistance.operands.tensResultCount} 个十，${assistance.operands.onesResult} 个一`)).toBeTruthy();
    fireEvent.click(getByText('回到题目'));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it.each([
    [15, 8, 7],
    [10, 3, 7],
    [100, 18, 82],
  ])('%i - %i 按退位、个位、十位、合并顺序播放', (a, b, answer) => {
    const assistance = createAssistance({ a, b, op: '-', answer });
    const { getByText, getByLabelText } = render(
      <BorrowAnimation assistance={assistance} onComplete={vi.fn()} />,
    );

    expect(getByText(assistance.steps[0].text)).toBeTruthy();
    expect(getByText(/退位：1 个十换成 10 个一/)).toBeTruthy();
    advanceSteps(3);
    expect(getByText(assistance.steps[3].text)).toBeTruthy();
    expect(getByLabelText(`数位表：${assistance.operands.tensResultValue / 10} 个十，${assistance.operands.onesResult} 个一`)).toBeTruthy();
  });

  it('支持中途跳过和最终重新播放', () => {
    const assistance = createAssistance({ a: 27, b: 5, op: '+', answer: 32 });
    const onComplete = vi.fn();
    const view = render(<CarryAnimation assistance={assistance} onComplete={onComplete} />);
    fireEvent.click(view.getByText('跳过演示'));
    expect(onComplete).toHaveBeenCalledOnce();

    view.rerender(<CarryAnimation assistance={assistance} onComplete={onComplete} />);
    advanceSteps(4);
    fireEvent.click(view.getByText('重新播放'));
    expect(view.getByText(assistance.steps[0].text)).toBeTruthy();
  });

  it('支持手动进入下一步', () => {
    const assistance = createAssistance({ a: 27, b: 5, op: '+', answer: 32 });
    const view = render(<CarryAnimation assistance={assistance} onComplete={vi.fn()} />);
    expect(view.getByText('可点击“下一步”，也会自动进入下一步')).toBeTruthy();
    fireEvent.click(view.getByText('下一步'));
    expect(view.getByText(assistance.steps[1].text)).toBeTruthy();
  });

  it('父组件刷新并传入新模型对象时不重置自动推进计时', () => {
    const createModel = () => createAssistance({ a: 27, b: 5, op: '+', answer: 32 });
    const view = render(<CarryAnimation assistance={createModel()} onComplete={vi.fn()} />);

    act(() => vi.advanceTimersByTime(1000));
    view.rerender(<CarryAnimation assistance={createModel()} onComplete={vi.fn()} />);
    act(() => vi.advanceTimersByTime(STEP_DURATION - 1000));

    expect(view.getByText(createModel().steps[1].text)).toBeTruthy();
  });
});
