import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { createAssistance } from '../../../utils/assistGenerator';
import CarryAnimation from './CarryAnimation';
import BorrowAnimation from './BorrowAnimation';
import { PLAYBACK_SPEEDS, STEP_DURATION } from './AssistAnimationPlayer';
import { BORROW_ONES_METHODS } from '../../../utils/practiceSettings';

const unitsIn = (container, groupId) => (
  container.querySelectorAll(`[data-group="${groupId}"] [data-testid]`)
);

describe('进位、退位分步动画', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const advanceSteps = (count) => {
    for (let index = 0; index < count; index += 1) {
      act(() => vi.advanceTimersByTime(STEP_DURATION));
    }
  };

  it('19 + 24 保留上下数位，并依次补十、进位、融合', () => {
    const assistance = createAssistance({ a: 19, b: 24, op: '+', answer: 43 });
    const view = render(<CarryAnimation assistance={assistance} onComplete={vi.fn()} />);

    expect(view.getByText('19')).toBeTruthy();
    expect(view.getByText('+24')).toBeTruthy();
    expect(unitsIn(view.container, 'first-tens')).toHaveLength(1);
    expect(unitsIn(view.container, 'second-tens')).toHaveLength(2);
    expect(unitsIn(view.container, 'first-ones')).toHaveLength(9);
    expect(unitsIn(view.container, 'second-ones')).toHaveLength(4);

    fireEvent.click(view.getByText('下一步'));
    expect(unitsIn(view.container, 'first-tens')).toHaveLength(1);
    expect(unitsIn(view.container, 'second-tens')).toHaveLength(2);
    expect(unitsIn(view.container, 'make-ten')).toHaveLength(10);
    expect(unitsIn(view.container, 'remaining-ones')).toHaveLength(3);

    fireEvent.click(view.getByText('下一步'));
    expect(unitsIn(view.container, 'carry-ten')).toHaveLength(1);
    expect(view.getByText(/10 个一换成 1 个十/)).toBeTruthy();

    fireEvent.click(view.getByText('下一步'));
    expect(unitsIn(view.container, 'first-tens')).toHaveLength(1);
    expect(unitsIn(view.container, 'second-tens')).toHaveLength(2);
    expect(unitsIn(view.container, 'carry-ten')).toHaveLength(1);

    fireEvent.click(view.getByText('下一步'));
    expect(view.getByLabelText('数位表：4 个十，3 个一')).toBeTruthy();
  });

  it.each([
    [9, 1, 10],
    [18, 2, 20],
    [36, 27, 63],
  ])('%i + %i 能完整播放到合并步骤', (a, b, answer) => {
    const assistance = createAssistance({ a, b, op: '+', answer });
    const onComplete = vi.fn();
    const view = render(<CarryAnimation assistance={assistance} onComplete={onComplete} />);
    advanceSteps(4);
    expect(view.getByText(assistance.steps[4].text)).toBeTruthy();
    expect(view.getByLabelText(`数位表：${assistance.operands.tensResultCount} 个十，${assistance.operands.onesResult} 个一`)).toBeTruthy();
    fireEvent.click(view.getByText('回到题目'));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('43 - 18 先展示原数位，再退位并分别计算个位、十位', () => {
    const assistance = createAssistance({ a: 43, b: 18, op: '-', answer: 25 });
    const view = render(<BorrowAnimation assistance={assistance} onComplete={vi.fn()} />);

    expect(view.getByText('43')).toBeTruthy();
    expect(view.getByText('−18')).toBeTruthy();
    expect(unitsIn(view.container, 'remaining-tens')).toHaveLength(3);
    expect(unitsIn(view.container, 'borrow-source')).toHaveLength(1);
    expect(unitsIn(view.container, 'original-ones')).toHaveLength(3);
    expect(unitsIn(view.container, 'subtrahend-ones')).toHaveLength(8);

    act(() => vi.advanceTimersByTime(1400));
    expect(unitsIn(view.container, 'remaining-tens')).toHaveLength(3);
    expect(unitsIn(view.container, 'borrowed-ones')).toHaveLength(10);
    expect(view.getByText(/1 个十换成 10 个一/)).toBeTruthy();

    fireEvent.click(view.getByText('下一步'));
    const borrowed = unitsIn(view.container, 'borrowed-ones');
    expect([...borrowed].filter((node) => node.firstChild.dataset.state === 'crossed')).toHaveLength(8);

    fireEvent.click(view.getByText('下一步'));
    expect(view.getByText('再从 3 个十中划去 1 个十')).toBeTruthy();
    expect(unitsIn(view.container, 'ones-result')).toHaveLength(5);

    fireEvent.click(view.getByText('下一步'));
    expect(view.getByLabelText('数位表：2 个十，5 个一')).toBeTruthy();
  });

  it('32 - 24 的退位十根保持单排，个位完成后固定显示 8', () => {
    const assistance = createAssistance({ a: 32, b: 24, op: '-', answer: 8 });
    const view = render(<BorrowAnimation assistance={assistance} onComplete={vi.fn()} />);

    act(() => vi.advanceTimersByTime(1400));
    const borrowedGroup = view.container.querySelector('[data-group="borrowed-ones"]');
    expect(borrowedGroup).toHaveStyle({ gridTemplateColumns: 'repeat(10, 8px)' });
    expect(unitsIn(view.container, 'borrowed-ones')).toHaveLength(10);

    fireEvent.click(view.getByText('下一步'));
    expect([...unitsIn(view.container, 'borrowed-ones')]
      .filter((node) => node.firstChild.dataset.state === 'crossed')).toHaveLength(4);
    act(() => vi.advanceTimersByTime(1600));
    expect(unitsIn(view.container, 'ones-result')).toHaveLength(8);
    expect(unitsIn(view.container, 'subtrahend-ones')).toHaveLength(0);
    expect(view.getByText('个位已减')).toBeTruthy();

    fireEvent.click(view.getByText('下一步'));
    expect(unitsIn(view.container, 'ones-result')).toHaveLength(8);
    expect(unitsIn(view.container, 'subtrahend-ones')).toHaveLength(0);
    act(() => vi.advanceTimersByTime(1600));
    expect(unitsIn(view.container, 'ones-result')).toHaveLength(8);
    expect(view.getByText('十位已减')).toBeTruthy();
  });

  it('32 - 24 选择平十法时先减 2 到 10，再减剩余 2', () => {
    const assistance = createAssistance(
      { a: 32, b: 24, op: '-', answer: 8 },
      { borrowOnesMethod: BORROW_ONES_METHODS.BRIDGE_TEN },
    );
    const view = render(<BorrowAnimation assistance={assistance} onComplete={vi.fn()} />);
    act(() => vi.advanceTimersByTime(1400));
    fireEvent.click(view.getByText('下一步'));

    expect(view.getByText(/平十法：先减 2 个一/)).toBeTruthy();
    expect([...unitsIn(view.container, 'original-ones')]
      .filter((node) => node.firstChild.dataset.state === 'crossed')).toHaveLength(2);
    expect(unitsIn(view.container, 'subtract-to-ten')).toHaveLength(2);
    expect(unitsIn(view.container, 'remaining-subtract')).toHaveLength(2);

    act(() => vi.advanceTimersByTime(1400));
    expect(view.getByText(/再减剩下的 2 个一/)).toBeTruthy();
    expect(unitsIn(view.container, 'original-ones')).toHaveLength(0);
    expect([...unitsIn(view.container, 'borrowed-ones')]
      .filter((node) => node.firstChild.dataset.state === 'crossed')).toHaveLength(2);

    act(() => vi.advanceTimersByTime(1400));
    expect(unitsIn(view.container, 'ones-result')).toHaveLength(8);
    expect(view.getByText('个位已减')).toBeTruthy();
  });

  it.each([
    [15, 8, 7],
    [10, 3, 7],
    [100, 18, 82],
  ])('%i - %i 能完整播放到合并步骤', (a, b, answer) => {
    const assistance = createAssistance({ a, b, op: '-', answer });
    const view = render(<BorrowAnimation assistance={assistance} onComplete={vi.fn()} />);
    advanceSteps(3);
    expect(view.getByText(assistance.steps[3].text)).toBeTruthy();
    expect(view.getByLabelText(`数位表：${assistance.operands.tensResultValue / 10} 个十，${assistance.operands.onesResult} 个一`)).toBeTruthy();
  });

  it('10 - 3 的十位步骤明确说明无需再减', () => {
    const assistance = createAssistance({ a: 10, b: 3, op: '-', answer: 7 });
    const view = render(<BorrowAnimation assistance={assistance} onComplete={vi.fn()} />);
    fireEvent.click(view.getByText('下一步'));
    fireEvent.click(view.getByText('下一步'));
    expect(view.getByText('十位没有需要再减的十，保持 0')).toBeTruthy();
  });

  it('10 - 3 选择平十法时说明已是整十并省略第一段', () => {
    const assistance = createAssistance(
      { a: 10, b: 3, op: '-', answer: 7 },
      { borrowOnesMethod: BORROW_ONES_METHODS.BRIDGE_TEN },
    );
    const view = render(<BorrowAnimation assistance={assistance} onComplete={vi.fn()} />);
    fireEvent.click(view.getByText('下一步'));
    expect(view.getByText(/现在已经是 10，省略“先减到 10”/)).toBeTruthy();
  });

  it('支持上一步、下一步、跳过和重新播放', () => {
    const assistance = createAssistance({ a: 27, b: 5, op: '+', answer: 32 });
    const onComplete = vi.fn();
    const view = render(<CarryAnimation assistance={assistance} onComplete={onComplete} />);
    expect(view.getByText('上一步').closest('button')).toBeDisabled();
    fireEvent.click(view.getByText('下一步'));
    fireEvent.click(view.getByText('上一步'));
    expect(view.getByText(assistance.steps[0].text)).toBeTruthy();
    fireEvent.click(view.getByText('跳过演示'));
    expect(onComplete).toHaveBeenCalledOnce();

    advanceSteps(4);
    fireEvent.click(view.getByText('重新播放'));
    expect(view.getByText(assistance.steps[0].text)).toBeTruthy();
  });

  it('默认中速，并支持切换为 5 秒快档', () => {
    const assistance = createAssistance({ a: 27, b: 5, op: '+', answer: 32 });
    const view = render(<CarryAnimation assistance={assistance} onComplete={vi.fn()} />);
    expect(view.getByText('中 10秒').closest('.ant-segmented-item')).toHaveClass('ant-segmented-item-selected');
    fireEvent.click(view.getByText('快 5秒'));
    act(() => vi.advanceTimersByTime(PLAYBACK_SPEEDS.fast));
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
