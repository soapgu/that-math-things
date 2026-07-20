import React from 'react';
import AssistAnimationPlayer from './AssistAnimationPlayer';

const ids = (prefix, count) => Array.from({ length: count }, (_, index) => `${prefix}-${index}`);
const group = (id, count, extra = {}) => ({ id, count, ...extra });
const nonEmpty = (...groups) => groups.filter((item) => (item.unitIds?.length ?? item.count) > 0);

/**
 * 退位减法四步演示。每次数位计算都包含“划去过程”和“完成结果”内部阶段；
 * 进入下一数位后，已完成的数位只保留结果，不重新显示减数。
 */
export default function BorrowAnimation({ assistance, onComplete }) {
  const values = assistance.operands;
  const remainingTensCount = values.remainingTensValue / 10;
  const subtrahendTensCount = values.subtrahendTensValue / 10;
  const resultTensCount = values.tensResultValue / 10;
  const originalTenIds = ids('minuend-ten', remainingTensCount);
  const subtrahendTenIds = ids('subtrahend-ten', subtrahendTensCount);
  const originalOneIds = ids('minuend-one', values.minuendOnes);
  const borrowedOneIds = ids('borrowed-one', 10);
  const subtrahendOneIds = ids('subtrahend-one', values.subtrahendOnes);
  const remainingBorrowedIds = borrowedOneIds.slice(0, 10 - values.subtrahendOnes);
  const resultOneIds = [...originalOneIds, ...remainingBorrowedIds];
  const resultTenIds = originalTenIds.slice(0, resultTensCount);

  const remainingTens = () => nonEmpty(
    group('remaining-tens', remainingTensCount, { unitIds: originalTenIds }),
  );
  const subtrahendTens = () => nonEmpty(
    group('subtrahend-tens', subtrahendTensCount, { unitIds: subtrahendTenIds }),
  );
  const resultOnes = () => nonEmpty(
    group('ones-result', values.onesResult, { unitIds: resultOneIds }),
  );

  const originalRows = [
    {
      id: 'minuend',
      label: String(values.first),
      tens: nonEmpty(
        group('remaining-tens', remainingTensCount, { unitIds: originalTenIds }),
        group('borrow-source', 1, {
          unitIds: ['borrow-source-ten'],
          layoutId: 'borrow-transform',
          source: 'borrowed',
          highlighted: true,
        }),
      ),
      ones: nonEmpty(group('original-ones', values.minuendOnes, { unitIds: originalOneIds })),
    },
    {
      id: 'subtrahend',
      label: `−${values.second}`,
      tens: subtrahendTens(),
      ones: nonEmpty(group('subtrahend-ones', values.subtrahendOnes, { unitIds: subtrahendOneIds })),
    },
  ];

  const regroupedRows = [
    {
      id: 'minuend',
      label: String(values.first),
      tens: remainingTens(),
      ones: nonEmpty(
        group('original-ones', values.minuendOnes, { unitIds: originalOneIds }),
        group('borrowed-ones', 10, {
          unitIds: borrowedOneIds,
          columns: 10,
          layoutId: 'borrow-transform',
          source: 'borrowed',
          highlighted: true,
        }),
      ),
    },
    {
      id: 'subtrahend',
      label: `−${values.second}`,
      tens: subtrahendTens(),
      ones: nonEmpty(group('subtrahend-ones', values.subtrahendOnes, { unitIds: subtrahendOneIds })),
    },
  ];

  const subtractOnesProcess = [
    {
      id: 'minuend',
      label: String(values.first),
      tens: remainingTens(),
      ones: nonEmpty(
        group('original-ones', values.minuendOnes, { unitIds: originalOneIds }),
        group('borrowed-ones', 10, {
          unitIds: borrowedOneIds,
          columns: 10,
          crossedCount: values.subtrahendOnes,
          source: 'borrowed',
          highlighted: true,
        }),
      ),
    },
    {
      id: 'subtrahend',
      label: `−${values.second}`,
      tens: subtrahendTens(),
      ones: nonEmpty(group('subtrahend-ones', values.subtrahendOnes, { unitIds: subtrahendOneIds })),
    },
  ];

  const onesCompletedRows = [
    {
      id: 'minuend',
      label: String(values.first),
      tens: remainingTens(),
      ones: resultOnes(),
    },
    {
      id: 'subtrahend',
      label: `−${values.second}`,
      tens: subtrahendTens(),
      ones: [],
      onesStatus: '个位已减',
    },
  ];

  const subtractTensProcess = [
    {
      id: 'minuend',
      label: String(values.first),
      tens: nonEmpty(group('remaining-tens', remainingTensCount, {
        unitIds: originalTenIds,
        crossedCount: subtrahendTensCount,
        highlighted: subtrahendTensCount > 0,
      })),
      ones: resultOnes(),
    },
    {
      id: 'subtrahend',
      label: `−${values.second}`,
      tens: subtrahendTens(),
      ones: [],
      onesStatus: '个位已减',
    },
  ];

  const tensCompletedRows = [
    {
      id: 'minuend',
      label: String(values.first),
      tens: nonEmpty(group('tens-result', resultTensCount, { unitIds: resultTenIds })),
      tensStatus: resultTensCount === 0 ? '0 个十' : undefined,
      ones: resultOnes(),
    },
    {
      id: 'subtrahend',
      label: `−${values.second}`,
      tens: [],
      tensStatus: '十位已减',
      ones: [],
      onesStatus: '个位已减',
    },
  ];

  const frames = [
    {
      phaseDuration: 1400,
      phases: [
        {
          rows: originalRows,
          highlight: 'ones',
          caption: `${values.first} - ${values.second}：个位不够减，从十位退 1`,
        },
        {
          rows: regroupedRows,
          highlight: 'ones',
          exchange: 'borrow',
          caption: `1 个十拆成 10 个一，${values.first} 变成 ${remainingTensCount} 个十和 ${values.borrowedOnes} 个一`,
        },
      ],
    },
    {
      phaseDuration: 1600,
      phases: [
        {
          rows: subtractOnesProcess,
          highlight: 'ones',
          caption: `从 ${values.borrowedOnes} 个一中划去 ${values.subtrahendOnes} 个一`,
        },
        {
          rows: onesCompletedRows,
          highlight: 'ones',
          caption: `个位计算完成，剩下 ${values.onesResult} 个一`,
        },
      ],
    },
    {
      phaseDuration: 1600,
      phases: [
        {
          rows: subtractTensProcess,
          highlight: 'tens',
          caption: subtrahendTensCount > 0
            ? `再从 ${remainingTensCount} 个十中划去 ${subtrahendTensCount} 个十`
            : '十位没有需要再减的十，保持 0',
        },
        {
          rows: tensCompletedRows,
          highlight: 'tens',
          caption: subtrahendTensCount > 0
            ? `十位计算完成，剩下 ${resultTensCount} 个十`
            : '十位没有需要再减的十，保持 0',
        },
      ],
    },
    {
      rows: [
        {
          id: 'result',
          label: String(values.answer),
          tens: nonEmpty(group('tens-result', resultTensCount, { unitIds: resultTenIds })),
          ones: resultOnes(),
        },
      ],
      caption: `合起来是 ${values.answer}`,
    },
  ];

  return (
    <AssistAnimationPlayer
      assistance={assistance}
      frames={frames}
      title="退位计算演示"
      onComplete={onComplete}
    />
  );
}
