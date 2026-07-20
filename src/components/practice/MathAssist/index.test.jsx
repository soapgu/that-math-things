import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import MathAssist from './index';
import { createAssistance } from '../../../utils/assistGenerator';

const assistance = createAssistance({ a: 27, b: 5, op: '+', answer: 32 });

describe('MathAssist 两层辅助', () => {
  it('默认只显示低强调入口，不提前泄露提示', () => {
    const { getByText, queryByText } = render(<MathAssist assistance={assistance} />);
    expect(getByText('需要提示')).toBeTruthy();
    expect(queryByText(assistance.hint.message)).toBeNull();
  });

  it('点击后展示提醒和引导问题', () => {
    const onLevelChange = vi.fn();
    const { getByText } = render(
      <MathAssist assistance={assistance} onLevelChange={onLevelChange} />,
    );
    fireEvent.click(getByText('需要提示'));
    expect(getByText(assistance.hint.message)).toBeTruthy();
    expect(onLevelChange).toHaveBeenCalledWith(1);
    expect(getByText(`想一想：${assistance.hint.question}`)).toBeTruthy();
  });

  it('我再想想会收起提示并回到题目', () => {
    const onReturnToQuestion = vi.fn();
    const { getByText, queryByText } = render(
      <MathAssist assistance={assistance} onReturnToQuestion={onReturnToQuestion} />,
    );
    fireEvent.click(getByText('需要提示'));
    fireEvent.click(getByText('我再想想'));
    expect(queryByText(assistance.hint.message)).toBeNull();
    expect(getByText('需要提示')).toBeTruthy();
    expect(onReturnToQuestion).toHaveBeenCalledOnce();
  });

  it('从第一层进入进位演示，跳过后收起并通知题目恢复焦点', () => {
    const onReturnToQuestion = vi.fn();
    const onLevelChange = vi.fn();
    const { getByText, queryByText } = render(
      <MathAssist
        assistance={assistance}
        onReturnToQuestion={onReturnToQuestion}
        onLevelChange={onLevelChange}
      />,
    );
    fireEvent.click(getByText('需要提示'));
    fireEvent.click(getByText('看看计算方法'));
    expect(onLevelChange.mock.calls).toEqual([[1], [2]]);
    expect(getByText('进位计算演示')).toBeTruthy();
    expect(getByText(assistance.steps[0].text)).toBeTruthy();

    fireEvent.click(getByText('跳过演示'));
    expect(queryByText('进位计算演示')).toBeNull();
    expect(getByText('需要提示')).toBeTruthy();
    expect(onReturnToQuestion).toHaveBeenCalledOnce();
  });

  it('退位题进入退位演示', () => {
    const borrow = createAssistance({ a: 43, b: 18, op: '-', answer: 25 });
    const { getByText } = render(<MathAssist assistance={borrow} />);
    fireEvent.click(getByText('需要提示'));
    fireEvent.click(getByText('看看计算方法'));
    expect(getByText('退位计算演示')).toBeTruthy();
    expect(getByText(borrow.steps[0].text)).toBeTruthy();
  });
});
