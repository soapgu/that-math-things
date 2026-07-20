import React from 'react';
import AssistAnimationPlayer from './AssistAnimationPlayer';

const ids = (prefix, count) => Array.from({ length: count }, (_, index) => `${prefix}-${index}`);
const group = (id, count, extra = {}) => ({ id, count, ...extra });

/**
 * 进位加法五步演示。两个加数在真正计算前始终保持上下两排，
 * 个位补十、进位以及十位融合都通过稳定的元素标识产生位置过渡。
 */
export default function CarryAnimation({ assistance, onComplete }) {
  const values = assistance.operands;
  const firstTenIds = ids('first-ten', values.firstTensCount);
  const secondTenIds = ids('second-ten', values.secondTensCount);
  const firstOneIds = ids('first-one', values.firstOnes);
  const secondOneIds = ids('second-one', values.secondOnes);
  const onesNeededToMakeTen = 10 - values.firstOnes;
  const makeTenIds = [...firstOneIds, ...secondOneIds.slice(0, onesNeededToMakeTen)];
  const remainingOneIds = secondOneIds.slice(onesNeededToMakeTen);
  const resultTenIds = [...firstTenIds, ...secondTenIds, 'carry-ten-0'];

  const alignedRows = [
    {
      id: 'first-operand',
      label: String(values.first),
      tens: [group('first-tens', values.firstTensCount, { unitIds: firstTenIds })],
      ones: [group('first-ones', values.firstOnes, { unitIds: firstOneIds })],
    },
    {
      id: 'second-operand',
      label: `+${values.second}`,
      tens: [group('second-tens', values.secondTensCount, { unitIds: secondTenIds })],
      ones: [group('second-ones', values.secondOnes, { unitIds: secondOneIds })],
    },
  ];

  const frames = [
    {
      rows: alignedRows,
      caption: `${values.first} + ${values.second}：相同数位上下对齐`,
    },
    {
      rows: [
        {
          id: 'first-operand',
          label: String(values.first),
          tens: alignedRows[0].tens,
          ones: [group('make-ten', 10, {
            unitIds: makeTenIds,
            layoutId: 'carry-transform',
            highlighted: true,
          })],
        },
        {
          id: 'second-operand',
          label: `+${values.second}`,
          tens: alignedRows[1].tens,
          ones: [group('remaining-ones', values.onesResult, { unitIds: remainingOneIds })],
        },
      ],
      highlight: 'ones',
      caption: `${values.firstOnes} + ${values.secondOnes}：从下排移 ${onesNeededToMakeTen} 个一补成 10`,
    },
    {
      rows: [
        {
          id: 'first-operand',
          label: String(values.first),
          tens: alignedRows[0].tens,
          ones: [],
        },
        {
          id: 'second-operand',
          label: `+${values.second}`,
          tens: [
            ...alignedRows[1].tens,
            group('carry-ten', 1, {
              unitIds: ['carry-ten-0'],
              layoutId: 'carry-transform',
              source: 'carry',
              highlighted: true,
            }),
          ],
          ones: [group('remaining-ones', values.onesResult, { unitIds: remainingOneIds })],
        },
      ],
      highlight: 'ones',
      exchange: 'carry',
      caption: '10 个一捆成 1 个十，移动到十位',
    },
    {
      rows: [
        {
          id: 'tens-combination',
          label: '十位',
          tens: [
            group('first-tens', values.firstTensCount, { unitIds: firstTenIds }),
            group('second-tens', values.secondTensCount, { unitIds: secondTenIds }),
            group('carry-ten', 1, { unitIds: ['carry-ten-0'], source: 'carry', highlighted: true }),
          ],
          ones: [group('remaining-ones', values.onesResult, { unitIds: remainingOneIds })],
        },
      ],
      highlight: 'tens',
      caption: '原来的十与进来的 1 个十靠拢合并',
    },
    {
      rows: [
        {
          id: 'result',
          label: String(values.answer),
          tens: [group('result-tens', values.tensResultCount, { unitIds: resultTenIds })],
          ones: [group('result-ones', values.onesResult, { unitIds: remainingOneIds })],
        },
      ],
      caption: `合起来是 ${values.answer}`,
    },
  ];

  return (
    <AssistAnimationPlayer
      assistance={assistance}
      frames={frames}
      title="进位计算演示"
      onComplete={onComplete}
    />
  );
}
