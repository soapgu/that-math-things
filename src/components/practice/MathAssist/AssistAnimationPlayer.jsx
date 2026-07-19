import React, { useEffect, useState } from 'react';
import { Button, Progress, Space, Typography } from 'antd';
import { motion, useReducedMotion } from 'framer-motion';
import PlaceValueBoard from './PlaceValueBoard';

export const STEP_DURATION = 1800;
export const REDUCED_STEP_DURATION = 700;

/**
 * 进位、退位共用的步骤播放器。
 *
 * assistance.steps 是教材顺序的唯一来源，frames 只负责描述每一步对应的数位表状态。
 * 系统开启“减少动态效果”时仍逐步讲解，但取消位移动画并缩短等待时间。
 */
export default function AssistAnimationPlayer({ assistance, frames, title, onComplete }) {
  const shouldReduceMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const steps = assistance?.steps || [];
  const lastIndex = Math.max(0, steps.length - 1);
  const isFinished = stepIndex >= lastIndex;
  const step = steps[stepIndex];
  const frame = frames[stepIndex] || {};
  const goToNextStep = () => {
    setStepIndex((current) => Math.min(current + 1, lastIndex));
  };

  useEffect(() => {
    if (!step || isFinished) return undefined;
    const timer = window.setTimeout(
      () => setStepIndex((current) => Math.min(current + 1, lastIndex)),
      shouldReduceMotion ? REDUCED_STEP_DURATION : STEP_DURATION,
    );
    return () => window.clearTimeout(timer);
    // 只依赖稳定的步骤索引，不能依赖 step 对象：练习计时器会让父组件每秒刷新，
    // 新生成的 assistance 会带来新的 step 对象引用，从而反复清除并重启本定时器。
  }, [isFinished, lastIndex, shouldReduceMotion, stepIndex]);

  if (!step) return null;

  return (
    <section aria-label={title}>
      <Typography.Title level={5} style={{ margin: '0 0 8px', textAlign: 'center' }}>
        {title}
      </Typography.Title>
      <Progress
        percent={Math.round(((stepIndex + 1) / steps.length) * 100)}
        showInfo={false}
        size="small"
        aria-label={`第 ${stepIndex + 1} 步，共 ${steps.length} 步`}
      />
      <motion.div
        key={step.type}
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
        style={{ marginTop: 12 }}
      >
        <PlaceValueBoard {...frame} reducedMotion={Boolean(shouldReduceMotion)} />
        <div aria-live="polite" style={{ minHeight: 58, marginTop: 12, textAlign: 'center' }}>
          <Typography.Text strong>{step.text}</Typography.Text>
          {step.expression && (
            <div style={{ marginTop: 4 }}>
              <Typography.Text code style={{ fontSize: 16 }}>{step.expression}</Typography.Text>
            </div>
          )}
        </div>
      </motion.div>
      <Space style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
        {isFinished ? (
          <>
            <Button onClick={() => setStepIndex(0)}>重新播放</Button>
            <Button type="primary" onClick={onComplete}>回到题目</Button>
          </>
        ) : (
          <>
            <Button type="text" onClick={onComplete}>跳过演示</Button>
            <Button type="primary" onClick={goToNextStep}>下一步</Button>
          </>
        )}
      </Space>
      {!isFinished && (
        <div style={{ marginTop: 6, textAlign: 'center' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            可点击“下一步”，也会自动进入下一步
          </Typography.Text>
        </div>
      )}
    </section>
  );
}
