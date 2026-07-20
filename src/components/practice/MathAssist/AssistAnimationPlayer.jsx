import React, { useEffect, useState } from 'react';
import { Button, Progress, Segmented, Space, Typography } from 'antd';
import { motion, useReducedMotion } from 'framer-motion';
import PlaceValueBoard from './PlaceValueBoard';

export const PLAYBACK_SPEEDS = { fast: 5000, medium: 10000, slow: 20000 };
export const STEP_DURATION = PLAYBACK_SPEEDS.medium;

function StepBoard({ frame, stepIndex, reducedMotion }) {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const phases = frame.phases || (frame.intro ? [frame.intro, frame] : [frame]);
    if (reducedMotion || phases.length === 1) {
      setPhaseIndex(phases.length - 1);
      return undefined;
    }
    setPhaseIndex(0);
    const timers = phases.slice(1).map((_, index) => window.setTimeout(
      () => setPhaseIndex(index + 1),
      (frame.phaseDuration || frame.introDuration || 1200) * (index + 1),
    ));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
    // stepIndex 是稳定的播放位置；frame 会随父组件渲染产生新对象，不能作为计时依赖。
  }, [stepIndex, reducedMotion]);

  const phases = frame.phases || (frame.intro ? [frame.intro, frame] : [frame]);
  const board = phases[Math.min(phaseIndex, phases.length - 1)];
  return (
    <PlaceValueBoard
      {...board}
      reducedMotion={Boolean(reducedMotion)}
    />
  );
}

/**
 * 进位、退位共用的步骤播放器。
 * steps 决定教材顺序，frames 只描述对应的数位状态；前后切换不会重算教学公式。
 */
export default function AssistAnimationPlayer({ assistance, frames, title, onComplete }) {
  const shouldReduceMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState('medium');
  const steps = assistance?.steps || [];
  const lastIndex = Math.max(0, steps.length - 1);
  const isFinished = stepIndex >= lastIndex;
  const step = steps[stepIndex];
  const frame = frames[stepIndex] || {};
  const goToNextStep = () => setStepIndex((current) => Math.min(current + 1, lastIndex));
  const goToPreviousStep = () => setStepIndex((current) => Math.max(current - 1, 0));

  useEffect(() => {
    if (!step || isFinished) return undefined;
    const timer = window.setTimeout(
      () => setStepIndex((current) => Math.min(current + 1, lastIndex)),
      PLAYBACK_SPEEDS[playbackSpeed],
    );
    return () => window.clearTimeout(timer);
    // 只依赖稳定的步骤索引；练习计时器刷新父组件时不会重置本定时器。
  }, [isFinished, lastIndex, playbackSpeed, stepIndex]);

  if (!step) return null;

  return (
    <section aria-label={title}>
      <Typography.Title level={5} style={{ margin: '0 0 8px', textAlign: 'center' }}>
        {title}
      </Typography.Title>
      <div style={{ marginBottom: 10, textAlign: 'right' }}>
        <Typography.Text type="secondary" style={{ marginRight: 8, fontSize: 12 }}>自动播放</Typography.Text>
        <Segmented
          size="small"
          value={playbackSpeed}
          onChange={setPlaybackSpeed}
          options={[
            { label: '快 5秒', value: 'fast' },
            { label: '中 10秒', value: 'medium' },
            { label: '慢 20秒', value: 'slow' },
          ]}
          aria-label="自动播放速度"
        />
      </div>
      <Progress
        percent={Math.round(((stepIndex + 1) / steps.length) * 100)}
        showInfo={false}
        size="small"
        aria-label={`第 ${stepIndex + 1} 步，共 ${steps.length} 步`}
      />
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
        style={{ marginTop: 12 }}
      >
        <StepBoard frame={frame} stepIndex={stepIndex} reducedMotion={shouldReduceMotion} />
        <div aria-live="polite" style={{ minHeight: 58, marginTop: 12, textAlign: 'center' }}>
          <Typography.Text strong>{step.text}</Typography.Text>
          {step.expression && (
            <div style={{ marginTop: 4 }}>
              <Typography.Text code style={{ fontSize: 16 }}>{step.expression}</Typography.Text>
            </div>
          )}
        </div>
      </motion.div>
      <Space wrap style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
        {isFinished ? (
          <>
            <Button onClick={goToPreviousStep}>上一步</Button>
            <Button onClick={() => setStepIndex(0)}>重新播放</Button>
            <Button type="primary" onClick={onComplete}>回到题目</Button>
          </>
        ) : (
          <>
            <Button type="text" onClick={onComplete}>跳过演示</Button>
            <Button disabled={stepIndex === 0} onClick={goToPreviousStep}>上一步</Button>
            <Button type="primary" onClick={goToNextStep}>下一步</Button>
          </>
        )}
      </Space>
      {!isFinished && (
        <div style={{ marginTop: 6, textAlign: 'center' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            可手动前后查看，也会按所选速度自动进入下一步
          </Typography.Text>
        </div>
      )}
    </section>
  );
}
