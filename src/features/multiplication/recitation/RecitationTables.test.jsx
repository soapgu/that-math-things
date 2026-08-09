import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PhraseTable from './PhraseTable';
import RecitationMultiplicationTable from './RecitationMultiplicationTable';
import { ORDERING_MODES, completeCurrentPhrase, createEmptyRecitationSession, selectRecitationCoordinate, switchRecitationMode } from './model';

describe('recitation tables', () => {
  it('未背格不在DOM或辅助文本中泄露结果', () => {
    const session = createEmptyRecitationSession();
    const { container } = render(<><RecitationMultiplicationTable session={session} /><PhraseTable session={session} /></>);
    expect(container.querySelector('[aria-label="9乘9，未背"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-label="9乘9，未背"]')).toHaveTextContent('');
    expect(container.querySelector('[aria-label="9乘9，未背"]')).not.toHaveAttribute('data-value');
    expect(screen.getByLabelText('九九，未背')).toHaveTextContent('九九 ···');
    expect(container).not.toHaveTextContent('九九八十一');
    expect(container.innerHTML).not.toContain('九九八十一');
  });

  it('自定义格可通过按钮选择并保留方向', () => {
    const onSelect = vi.fn();
    const session = switchRecitationMode(createEmptyRecitationSession(), ORDERING_MODES.CUSTOM);
    render(<RecitationMultiplicationTable session={session} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: '9乘1，未背，可选择' }));
    expect(onSelect).toHaveBeenCalledWith({ a: 9, b: 1 });
    const control = screen.getByRole('button', { name: '9乘1，未背，可选择' });
    expect(control.parentElement).toHaveAttribute('role', 'gridcell');
  });

  it('自定义当前格和交换律关联格具有准确辅助名称', () => {
    let session = switchRecitationMode(createEmptyRecitationSession(), ORDERING_MODES.CUSTOM);
    session = selectRecitationCoordinate(session, { a: 9, b: 1 });
    render(<RecitationMultiplicationTable session={session} />);
    expect(screen.getByRole('button', { name: '9乘1，当前口诀，可选择' }).parentElement).toHaveAttribute('data-state', 'current');
    expect(screen.getByRole('button', { name: '1乘9，交换律关联，可选择' }).parentElement).toHaveAttribute('data-state', 'related');
  });

  it('完成口诀后显示结果和分组完成反馈', () => {
    const session = completeCurrentPhrase(createEmptyRecitationSession());
    render(<><RecitationMultiplicationTable session={session} /><PhraseTable session={session} /></>);
    expect(screen.getByLabelText('1乘1等于1，已背')).toHaveTextContent('1✓');
    expect(screen.getByRole('columnheader', { name: '第1组，已背完' })).toHaveAttribute('data-state', 'done');
  });

  it('自定义矩阵只有一个Tab停靠点并用方向键跳过已完成格', () => {
    const onSelect = vi.fn();
    let session = switchRecitationMode(createEmptyRecitationSession(), ORDERING_MODES.CUSTOM);
    session = selectRecitationCoordinate(session, { a: 1, b: 2 });
    session = completeCurrentPhrase(session);
    render(<RecitationMultiplicationTable session={session} onSelect={onSelect} />);
    const controls = screen.getAllByRole('button');
    expect(controls.filter((control) => control.tabIndex === 0)).toHaveLength(1);
    const first = screen.getByRole('button', { name: '1乘1，未背，可选择' });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: '1乘3，未背，可选择' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement, { key: 'ArrowDown' });
    expect(screen.getByRole('button', { name: '2乘3，未背，可选择' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement, { key: 'Enter' });
    fireEvent.click(document.activeElement);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenLastCalledWith({ a: 2, b: 3 });
  });
});
