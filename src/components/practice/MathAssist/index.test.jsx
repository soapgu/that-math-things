import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import MathAssist from './index';

const hint = {
  message: '个位 7 + 5 超过了 10，记得向十位进 1。',
  question: '个位 7 加 5 得多少？满十后个位写几，向十位进几？',
};

describe('MathAssist 第一层提醒', () => {
  it('默认只显示低强调入口，不提前泄露提示', () => {
    const { getByText, queryByText } = render(<MathAssist hint={hint} />);
    expect(getByText('需要提示')).toBeTruthy();
    expect(queryByText(hint.message)).toBeNull();
  });

  it('点击后展示提醒和引导问题', () => {
    const { getByText } = render(<MathAssist hint={hint} />);
    fireEvent.click(getByText('需要提示'));
    expect(getByText(hint.message)).toBeTruthy();
    expect(getByText(`想一想：${hint.question}`)).toBeTruthy();
  });

  it('我再想想会收起提示', () => {
    const { getByText, queryByText } = render(<MathAssist hint={hint} />);
    fireEvent.click(getByText('需要提示'));
    fireEvent.click(getByText('我再想想'));
    expect(queryByText(hint.message)).toBeNull();
    expect(getByText('需要提示')).toBeTruthy();
  });

  it('第二层未接入时保留禁用入口', () => {
    const { getByText } = render(<MathAssist hint={hint} />);
    fireEvent.click(getByText('需要提示'));
    expect(getByText('看看计算方法').closest('button')).toBeDisabled();
    expect(getByText('分步演示将在下一阶段提供')).toBeTruthy();
  });
});
