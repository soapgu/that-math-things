import React from 'react';
import { render } from '@testing-library/react';
import MultiplicationMatrix from './MultiplicationMatrix';
import { recordAnsweredCell } from './model';

const question = { a: 6, b: 7, op: '*', answer: 42 };

describe('MultiplicationMatrix', () => {
  it('始终渲染100格坐标框架', () => {
    const { getAllByRole } = render(
      <MultiplicationMatrix question={question} difficulty="easy" />
    );
    expect(getAllByRole('gridcell')).toHaveLength(100);
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
});
