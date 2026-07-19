import React from 'react';
import AssistAnimationPlayer from './AssistAnimationPlayer';

/**
 * 退位减法的四帧数位演示。
 * 第一帧直接呈现“退 1 个十并换成 10 个一”后的重组状态，后续依次划去个位和十位。
 */
export default function BorrowAnimation({ assistance, onComplete }) {
  const values = assistance.operands;
  const remainingTensCount = values.remainingTensValue / 10;
  const subtrahendTensCount = values.subtrahendTensValue / 10;
  const resultTensCount = values.tensResultValue / 10;
  const regroupedBoard = {
    tensCount: remainingTensCount,
    onesCount: values.borrowedOnes,
  };
  const frames = [
    {
      ...regroupedBoard,
      highlight: 'ones',
      exchange: 'borrow',
      caption: `${values.first} - ${values.second}：先退位重组`,
    },
    {
      ...regroupedBoard,
      crossedOnes: values.subtrahendOnes,
      highlight: 'ones',
      caption: '先减个位',
    },
    {
      ...regroupedBoard,
      crossedOnes: values.subtrahendOnes,
      crossedTens: subtrahendTensCount,
      highlight: 'tens',
      caption: '再减十位',
    },
    {
      tensCount: resultTensCount,
      onesCount: values.onesResult,
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
