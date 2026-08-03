import React from 'react';
import { buildMatrixCells } from './model';
import './multiplication-matrix.css';

function markerForKind(kind) {
  if (kind.endsWith('correct')) return '✓';
  if (kind.endsWith('wrong')) return '✕';
  if (kind === 'symmetric') return '⇄';
  return '';
}

/**
 * 只消费安全视图模型的矩阵组件，不自行计算或隐藏答案。
 */
export default function MultiplicationMatrix({
  question,
  difficulty,
  phase = 'READY',
  answeredCells = {},
  targetControl = null,
}) {
  const cells = buildMatrixCells({ question, difficulty, phase, answeredCells });

  return (
    <div
      className="multiplication-matrix"
      role="grid"
      aria-label="九九乘法坐标表"
      aria-rowcount={10}
      aria-colcount={10}
    >
      <div className="multiplication-row" role="row" aria-rowindex={1}>
        <div
          className="multiplication-cell multiplication-header"
          role="columnheader"
          aria-colindex={1}
          aria-label="乘法表"
        >
          ×
        </div>
        {Array.from({ length: 9 }, (_, index) => (
          <div
            className="multiplication-cell multiplication-header"
            role="columnheader"
            aria-colindex={index + 2}
            aria-label={`列表头 ${index + 1}`}
            key={`column-${index + 1}`}
          >
            {index + 1}
          </div>
        ))}
      </div>
      {Array.from({ length: 9 }, (_, rowIndex) => (
        <div
          className="multiplication-row"
          role="row"
          aria-rowindex={rowIndex + 2}
          key={`row-${rowIndex + 1}`}
        >
          <div
            className="multiplication-cell multiplication-header"
            role="rowheader"
            aria-colindex={1}
            aria-label={`行表头 ${rowIndex + 1}`}
          >
            {rowIndex + 1}
          </div>
          {cells
            .filter(({ row }) => row === rowIndex + 1)
            .map((cell) => (
              <div
                className={`multiplication-cell multiplication-${cell.kind}`}
                role="gridcell"
                aria-colindex={cell.column + 1}
                aria-label={cell.ariaLabel}
                data-kind={cell.kind}
                data-row={cell.row}
                data-column={cell.column}
                key={cell.key}
              >
                {cell.kind === 'target' ? targetControl : null}
                {'value' in cell ? <span className="multiplication-value">{cell.value}</span> : null}
                {markerForKind(cell.kind) ? (
                  <span className="multiplication-marker" aria-hidden="true">
                    {markerForKind(cell.kind)}
                  </span>
                ) : null}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
