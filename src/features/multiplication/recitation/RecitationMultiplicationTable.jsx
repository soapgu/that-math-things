import React, { useEffect, useRef, useState } from 'react';
import { buildRecitationMatrixView } from './model';
import './recitation-tables.css';

export default function RecitationMultiplicationTable({ session, onSelect, focusRequest, animatePhraseId }) {
  const cells = buildRecitationMatrixView(session);
  const selectableCells = cells.filter(({ selectable }) => selectable);
  const preferredFocusKey = selectableCells.find(({ a, b }) => (
    session.selectedCoordinate?.a === a && session.selectedCoordinate?.b === b
  ))?.key ?? selectableCells[0]?.key ?? null;
  const [focusKey, setFocusKey] = useState(preferredFocusKey);
  const controls = useRef(new Map());

  useEffect(() => {
    if (!selectableCells.some(({ key }) => key === focusKey)) setFocusKey(preferredFocusKey);
  }, [focusKey, preferredFocusKey, selectableCells]);

  useEffect(() => {
    if (!focusRequest || selectableCells.length === 0) return;
    let target = selectableCells[0];
    if (focusRequest.after) {
      const afterIndex = cells.findIndex(({ a, b }) => a === focusRequest.after.a && b === focusRequest.after.b);
      target = cells.slice(afterIndex + 1).find(({ selectable }) => selectable)
        ?? cells.slice(0, afterIndex + 1).find(({ selectable }) => selectable)
        ?? target;
    }
    setFocusKey(target.key);
    window.requestAnimationFrame(() => controls.current.get(target.key)?.focus());
  }, [focusRequest]);

  const moveFocus = (cell, key) => {
    const directions = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const direction = directions[key];
    if (!direction) return false;
    let nextA = cell.a + direction[0];
    let nextB = cell.b + direction[1];
    while (nextA >= 1 && nextA <= 9 && nextB >= 1 && nextB <= 9) {
      const next = cells.find(({ a, b }) => a === nextA && b === nextB);
      if (next?.selectable) {
        setFocusKey(next.key);
        controls.current.get(next.key)?.focus();
        return true;
      }
      nextA += direction[0];
      nextB += direction[1];
    }
    return true;
  };
  return (
    <section className="recitation-table-panel" aria-labelledby="recitation-matrix-title">
      <div className="recitation-panel-label"><strong id="recitation-matrix-title">乘法表</strong><span>完成后展开对称算式</span></div>
      <div className="recitation-grid recitation-matrix" role="grid" aria-label="九九乘法背诵选择表" aria-rowcount={10} aria-colcount={10}>
        <div className="recitation-grid-row" role="row">
          <div className="recitation-cell table-header" role="columnheader">×</div>
          {Array.from({ length: 9 }, (_, index) => <div className="recitation-cell table-header" role="columnheader" key={index}>{index + 1}</div>)}
        </div>
        {Array.from({ length: 9 }, (_, rowIndex) => (
          <div className="recitation-grid-row" role="row" key={rowIndex}>
            <div className="recitation-cell table-header" role="rowheader">{rowIndex + 1}</div>
            {cells.slice(rowIndex * 9, rowIndex * 9 + 9).map((cell) => {
              const content = cell.state === 'done' ? <><span>{cell.value}</span><span className="learned-check" aria-hidden="true">✓</span></> : cell.state === 'current' ? '当前' : null;
              return (
                <div className="recitation-cell matrix-cell" data-state={cell.state} data-newly-completed={cell.state === 'done' && cell.phraseId === animatePhraseId ? 'true' : undefined} role="gridcell" aria-label={cell.selectable ? undefined : cell.ariaLabel} key={cell.key}>
                  {cell.selectable ? (
                    <button
                      type="button"
                      className="matrix-cell-control"
                      aria-label={cell.ariaLabel}
                      tabIndex={cell.key === focusKey ? 0 : -1}
                      ref={(node) => {
                        if (node) controls.current.set(cell.key, node);
                        else controls.current.delete(cell.key);
                      }}
                      onFocus={() => setFocusKey(cell.key)}
                      onKeyDown={(event) => {
                        if (moveFocus(cell, event.key)) event.preventDefault();
                      }}
                      onClick={() => onSelect?.({ a: cell.a, b: cell.b })}
                    >
                      {content}
                    </button>
                  ) : content}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
