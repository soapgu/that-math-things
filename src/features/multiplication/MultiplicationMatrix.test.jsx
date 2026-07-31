import React from 'react';
import { render } from '@testing-library/react';
import MultiplicationMatrix from './MultiplicationMatrix';
import { recordAnsweredCell } from './model';

const question = { a: 6, b: 7, op: '*', answer: 42 };

describe('MultiplicationMatrix', () => {
  it('渲染完整的行、表头和81个数据格语义', () => {
    const { getAllByRole, getByRole } = render(
      <MultiplicationMatrix question={question} difficulty="easy" />
    );
    const grid = getByRole('grid', { name: '九九乘法坐标表' });
    expect(grid).toHaveAttribute('aria-rowcount', '10');
    expect(grid).toHaveAttribute('aria-colcount', '10');
    expect(getAllByRole('row')).toHaveLength(10);
    expect(getAllByRole('columnheader')).toHaveLength(10);
    expect(getAllByRole('rowheader')).toHaveLength(9);
    expect(getAllByRole('gridcell')).toHaveLength(81);
    expect(getByRole('columnheader', { name: '列表头 9' })).toHaveAttribute('aria-colindex', '10');
    expect(getByRole('rowheader', { name: '行表头 9' })).toHaveAttribute('aria-colindex', '1');
  });

  it('挑战难度作答前不会把目标答案写入DOM', () => {
    const { getByRole } = render(
      <MultiplicationMatrix question={question} difficulty="hard" phase="READY" />
    );
    const matrix = getByRole('grid', { name: '九九乘法坐标表' });
    expect(matrix.outerHTML).not.toContain('42');
    expect(getByRole('gridcell', { name: '6乘7目标格，答案待填写' })).not.toHaveTextContent('42');
  });

  it('历史格优先于交换律临时反馈', () => {
    const symmetric = { a: 7, b: 6, op: '*', answer: 42 };
    let answered = recordAnsweredCell({}, symmetric, 41);
    answered = recordAnsweredCell(answered, question, 42);
    const { getByRole } = render(
      <MultiplicationMatrix
        question={question}
        difficulty="easy"
        phase="FEEDBACK_CORRECT"
        answeredCells={answered}
      />
    );
    const history = getByRole('gridcell', { name: '7乘6已完成，答案42，回答错误' });
    expect(history).toHaveAttribute('data-kind', 'history-wrong');
    expect(history).toHaveTextContent('42');
  });

  it('反馈阶段为尚未作答的对称格保留可理解的语义', () => {
    const answered = recordAnsweredCell({}, question, 42);
    const { getByRole } = render(
      <MultiplicationMatrix
        question={question}
        difficulty="easy"
        phase="FEEDBACK_CORRECT"
        answeredCells={answered}
      />
    );
    const symmetric = getByRole('gridcell', { name: '交换律提示，7乘6也等于42' });
    expect(symmetric).toHaveAttribute('aria-colindex', '7');
    expect(symmetric).toHaveTextContent('42');
  });
});
