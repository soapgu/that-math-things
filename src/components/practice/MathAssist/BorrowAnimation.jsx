import React from 'react';
import AssistAnimationPlayer from './AssistAnimationPlayer';
import { BORROW_ONES_METHODS } from '../../../utils/practiceSettings';

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
  const onesStrategy = assistance.steps.find((step) => step.type === 'subtractOnes').strategy;

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

  const breakTenProcess = [
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

  const bridgeFirstPartIds = subtrahendOneIds.slice(0, onesStrategy.subtractToTen || 0);
  const bridgeRemainingIds = subtrahendOneIds.slice(onesStrategy.subtractToTen || 0);
  const bridgeToTenProcess = [
    {
      id: 'minuend',
      label: String(values.first),
      tens: remainingTens(),
      ones: nonEmpty(
        group('original-ones', values.minuendOnes, {
          unitIds: originalOneIds,
          crossedCount: values.minuendOnes,
          highlighted: true,
        }),
        group('borrowed-ones', 10, {
          unitIds: borrowedOneIds,
          columns: 10,
          source: 'borrowed',
        }),
      ),
    },
    {
      id: 'subtrahend',
      label: `−${values.second}`,
      tens: subtrahendTens(),
      ones: nonEmpty(
        group('subtract-to-ten', bridgeFirstPartIds.length, {
          unitIds: bridgeFirstPartIds,
          crossedCount: bridgeFirstPartIds.length,
          highlighted: true,
        }),
        group('remaining-subtract', bridgeRemainingIds.length, { unitIds: bridgeRemainingIds }),
      ),
    },
  ];
  const bridgeRemainingProcess = [
    {
      id: 'minuend',
      label: String(values.first),
      tens: remainingTens(),
      ones: nonEmpty(group('borrowed-ones', 10, {
        unitIds: borrowedOneIds,
        columns: 10,
        crossedCount: onesStrategy.remainingSubtract,
        source: 'borrowed',
        highlighted: true,
      })),
    },
    {
      id: 'subtrahend',
      label: `−${values.second}`,
      tens: subtrahendTens(),
      ones: nonEmpty(group('remaining-subtract', bridgeRemainingIds.length, {
        unitIds: bridgeRemainingIds,
        highlighted: true,
      })),
    },
  ];

  const breakTenPhases = [
    {
      rows: breakTenProcess,
      highlight: 'ones',
      caption: `破十法：先算 10 − ${values.subtrahendOnes} = ${onesStrategy.tenRemainder}`,
    },
    {
      rows: onesCompletedRows,
      highlight: 'ones',
      caption: onesStrategy.skipAddBack
        ? `原个位是 0，省略加回，个位结果是 ${values.onesResult}`
        : `再加回原来的 ${values.minuendOnes} 个一，得到 ${values.onesResult}`,
    },
  ];
  const bridgeTenPhases = onesStrategy.skipToTen
    ? [
      {
        rows: breakTenProcess,
        highlight: 'ones',
        caption: `平十法：现在已经是 10，省略“先减到 10”，直接算 10 − ${values.subtrahendOnes}`,
      },
      {
        rows: onesCompletedRows,
        highlight: 'ones',
        caption: `个位计算完成，剩下 ${values.onesResult} 个一`,
      },
    ]
    : [
      {
        rows: bridgeToTenProcess,
        highlight: 'ones',
        caption: `平十法：先减 ${onesStrategy.subtractToTen} 个一，${values.borrowedOnes} − ${onesStrategy.subtractToTen} = 10`,
      },
      {
        rows: bridgeRemainingProcess,
        highlight: 'ones',
        caption: `再减剩下的 ${onesStrategy.remainingSubtract} 个一，10 − ${onesStrategy.remainingSubtract} = ${values.onesResult}`,
      },
      {
        rows: onesCompletedRows,
        highlight: 'ones',
        caption: `个位计算完成，剩下 ${values.onesResult} 个一`,
      },
    ];
  const subtractOnesPhases = onesStrategy.type === BORROW_ONES_METHODS.BRIDGE_TEN
    ? bridgeTenPhases
    : breakTenPhases;

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
      phaseDuration: 1400,
      phases: subtractOnesPhases,
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
