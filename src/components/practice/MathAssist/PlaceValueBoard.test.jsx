import React from 'react';
import { render } from '@testing-library/react';
import PlaceValueBoard, { OneUnit, TenBundle } from './PlaceValueBoard';

describe('数位基础视觉单元', () => {
  it('OneUnit 提供可访问名称和划去状态', () => {
    const { getByRole } = render(<OneUnit crossedOut />);
    expect(getByRole('img', { name: '1 个一' })).toHaveAttribute('data-state', 'crossed');
  });

  it('TenBundle 表示一个十并支持高亮', () => {
    const { getByRole } = render(<TenBundle highlighted />);
    expect(getByRole('img', { name: '1 个十' })).toHaveAttribute('data-state', 'highlighted');
  });
});

describe('PlaceValueBoard', () => {
  it('按数量渲染十和一，并提供数位摘要', () => {
    const { getByRole, getAllByTestId } = render(
      <PlaceValueBoard tensCount={3} onesCount={5} caption="43 退位后" />
    );
    expect(getByRole('figure', { name: '数位表：3 个十，5 个一' })).toBeTruthy();
    expect(getAllByTestId('ten-bundle')).toHaveLength(3);
    expect(getAllByTestId('one-unit')).toHaveLength(5);
  });

  it('支持划去数量和当前数位高亮', () => {
    const { getByLabelText, getAllByTestId } = render(
      <PlaceValueBoard
        tensCount={3}
        onesCount={13}
        crossedTens={1}
        crossedOnes={8}
        highlight="ones"
      />
    );
    expect(getByLabelText('十位：3 个十，划去 1 个')).toHaveAttribute('data-highlighted', 'false');
    expect(getByLabelText('个位：13 个一，划去 8 个')).toHaveAttribute('data-highlighted', 'true');
    expect(getAllByTestId('ten-bundle').filter((node) => node.firstChild.dataset.state === 'crossed')).toHaveLength(1);
    expect(getAllByTestId('one-unit').filter((node) => node.firstChild.dataset.state === 'crossed')).toHaveLength(8);
  });

  it.each([
    ['carry', '进位：10 个一换成 1 个十 ↑'],
    ['borrow', '退位：1 个十换成 10 个一 ↓'],
  ])('展示 %s 数位转换提示', (exchange, text) => {
    const { getByRole } = render(<PlaceValueBoard exchange={exchange} />);
    expect(getByRole('status')).toHaveTextContent(text);
  });

  it('暴露减少动态效果状态并规范化负数数量', () => {
    const { getByRole, getByText, getByLabelText } = render(
      <PlaceValueBoard tensCount={-1} onesCount={-2} reducedMotion />
    );
    expect(getByRole('figure')).toHaveAttribute('data-reduced-motion', 'true');
    expect(getByLabelText('十位：0 个十，划去 0 个')).toHaveStyle({ transition: 'none' });
    expect(getByText('0 个十')).toBeTruthy();
    expect(getByText('0 个一')).toBeTruthy();
  });
});
