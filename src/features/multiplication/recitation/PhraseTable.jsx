import React from 'react';
import { buildRecitationTableView } from './model';

export default function PhraseTable({ session, animatePhraseId }) {
  const view = buildRecitationTableView(session);
  return (
    <section className="recitation-table-panel" aria-labelledby="phrase-table-title">
      <div className="recitation-panel-label"><strong id="phrase-table-title">45句口诀表</strong><span>未背 / 当前 / 已背</span></div>
      <div className="recitation-grid phrase-grid" role="grid" aria-label="完整45句口诀表" aria-rowcount={10} aria-colcount={9}>
        <div className="recitation-grid-row" role="row">
          {view.headers.map((header) => <div className="recitation-cell phrase-header" data-state={header.done ? 'done' : 'pending'} role="columnheader" aria-label={`第${header.group}组，${header.done ? '已背完' : '未背完'}`} key={header.group}>{header.label}</div>)}
        </div>
        {Array.from({ length: 9 }, (_, rowIndex) => (
          <div className="recitation-grid-row" role="row" key={rowIndex}>
            {view.cells.slice(rowIndex * 9, rowIndex * 9 + 9).map((cell) => (
              <div className="recitation-cell phrase-cell" data-state={cell.kind === 'phrase' ? cell.state : 'placeholder'} data-newly-completed={cell.kind === 'phrase' && cell.state === 'done' && cell.phrase.id === animatePhraseId ? 'true' : undefined} role="gridcell" aria-label={cell.kind === 'phrase' ? cell.ariaLabel : undefined} aria-hidden={cell.kind === 'placeholder' ? 'true' : undefined} key={`${cell.row}-${cell.column}`}>
                {cell.kind === 'phrase' ? cell.displayText : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
