import React from 'react';
import AssistAnimationPlayer from './AssistAnimationPlayer';

/**
 * 进位加法的五帧数位演示。
 * 所有数字均来自 assistGenerator，组件只把步骤映射成数位表状态，不重新推导算法。
 */
export default function CarryAnimation({ assistance, onComplete }) {
  const values = assistance.operands;
  const originalTensCount = values.firstTensCount + values.secondTensCount;
  const resultBoard = {
    tensCount: values.tensResultCount,
    onesCount: values.onesResult,
  };
  const frames = [
    {
      tensCount: originalTensCount,
      onesCount: values.onesSum,
      caption: `${values.first} + ${values.second}`,
    },
    {
      tensCount: originalTensCount,
      onesCount: values.onesSum,
      highlight: 'ones',
      caption: '先算个位',
    },
    {
      ...resultBoard,
      highlight: 'ones',
      exchange: 'carry',
      caption: '满十进一',
    },
    {
      ...resultBoard,
      highlight: 'tens',
      caption: '再算十位，别忘了进来的 1',
    },
    {
      ...resultBoard,
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
