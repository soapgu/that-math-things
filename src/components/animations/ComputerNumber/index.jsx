import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button, Typography } from 'antd';
import { CheckCircleFilled, RightCircleFilled, RedoOutlined } from '@ant-design/icons';

export default function ComputerNumberAnimation({ params, onComplete }) {
  const { x, y } = params;
  const [step, setStep] = useState(0);
  const containerRef = useRef(null);

  const allDots = Array.from({ length: y }, (_, i) => i + 1);
  const remaining = y - x;
  const answer = y - x + 1;
  const useGrid = y > 20;
  const TOTAL_STEPS = 5;
  const isFinished = step >= TOTAL_STEPS;

  const handleReplay = useCallback(() => {
    window.speechSynthesis?.cancel();
    setStep(0);
  }, []);

  useEffect(() => {
    if (step < TOTAL_STEPS) {
      const delays = [400, 6600, 6600,9000, 6600];
      const delay = delays[step] || 6600;
      const timer = setTimeout(() => setStep((s) => s + 1), delay);
      return () => clearTimeout(timer);
    }
  }, [step]);

  useEffect(() => {
    if (step >= 2 && step <= 4 && containerRef.current) {
      const target = step === 2 ? 1 : x;
      const el = containerRef.current.querySelector(`[data-num="${target}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }
  }, [step, x]);

  const steps = useMemo(() => [
    {
      id: 1,
      label: `画 ${y} 个点`,
      detail: `编号 1 到 ${y}`,
    },
    {
      id: 2,
      label: `前 ${x} 个点`,
      detail: `编号 1 到 ${x}`,
      extra: (
        <Button
          shape="round"
          style={{ background: '#1677ff', color: '#fff', border: 'none', cursor: 'default', height: 22, fontSize: 11, marginTop: 2 }}
        >
          {x} 个
        </Button>
      ),
    },
    {
      id: 3,
      label: `${y} 个点去掉前${x}个点，剩下 ${remaining} 个`,
      detail: `编号 ${x + 1} 到 ${y}`,
      extra: (
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
          <Button shape="round" style={{ background: '#1677ff', color: '#fff', border: 'none', cursor: 'default', height: 20, fontSize: 10 }}>
            {x} 个
          </Button>
          <span style={{ fontSize: 14, color: '#666' }}>−</span>
          <span style={{ fontSize: 15, fontWeight: 'bold', color: '#fa8c16' }}>{remaining}</span>
        </div>
      ),
    },
    {
      id: 4,
      label: `少了第 ${x} 号`,
      detail: '被减掉了，加回来！',
      extra: (
        <motion.span
          initial={{ scale: 0.8 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: 2, duration: 0.6 }}
          style={{
            marginTop: 2,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            padding: '1px 8px',
            background: '#f6ffed',
            borderRadius: 12,
            border: '2px solid #52c41a',
            fontWeight: 'bold',
            color: '#52c41a',
            fontSize: 12,
          }}
        >
          ⊕ 加回第 {x} 号
        </motion.span>
      ),
    },
    {
      id: 5,
      label: `${y} − ${x} + 1 = ${answer}`,
      detail: '少1台要加回去！两头都算',
      highlight: true,
    },
  ], [x, y, remaining, answer]);

  useEffect(() => {
    if (step < 1 || step > TOTAL_STEPS) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const s = steps[step - 1];
    const text = `${s.label}，${s.detail}`;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.85;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [step, steps]);

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
      {/* Left: dots grid */}
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          justifyContent: 'flex-start',
          alignContent: 'flex-start',
          padding: '4px',
          maxHeight: 380,
          overflowY: useGrid ? 'auto' : 'visible',
          overflowX: useGrid ? 'hidden' : 'auto',
          scrollBehavior: 'smooth',
          width: useGrid ? 480 : 'auto',
          minWidth: useGrid ? 360 : 200,
        }}
      >
        {step >= 1 && allDots.map((num) => {
          let bg = '#b0b0b0';
          let size = useGrid ? 40 : 32;
          let border = 'none';
          let shadow = 'none';
          let zIndex = 1;

          if (step >= 2 && num <= x) {
            bg = '#1677ff';
          }
          if (step >= 3 && num > x) {
            bg = '#fa8c16';
          }
          const isAddedBack = step >= 4 && num === x;
          if (isAddedBack) {
            bg = '#52c41a';
            size = useGrid ? 48 : 40;
            border = '3px solid #ffeb3b';
            shadow = '0 0 20px rgba(82,196,26,0.5)';
            zIndex = 2;
          }

          return (
            <motion.div
              key={num}
              data-num={num}
              layout
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: isAddedBack ? [0, 1.5, 1] : 1,
                opacity: 1,
                backgroundColor: bg,
                width: size,
                height: size,
              }}
              transition={isAddedBack ? {
                scale: { type: 'spring', stiffness: 350, damping: 14, delay: 0.2 },
                default: { type: 'spring', stiffness: 350, damping: 14, delay: 0 },
              } : {
                type: 'spring',
                stiffness: 350,
                damping: 14,
                delay: step === 1 ? (num - 1) * 0.035 : 0,
              }}
              style={{
                width: size,
                height: size,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: size > 38 ? 14 : 11,
                fontWeight: 'bold',
                color: '#fff',
                flexShrink: 0,
                border,
                boxShadow: shadow,
                zIndex,
              }}
            >
              {num}
            </motion.div>
          );
        })}
      </div>

      {/* Right: step timeline */}
      <div style={{ width: 220, flexShrink: 0 }}>
        {step === 0 && (
          <div style={{ paddingTop: 40, textAlign: 'center' }}>
            <Typography.Text style={{ fontSize: 14, color: '#999' }}>准备开始...</Typography.Text>
          </div>
        )}

        {step >= 1 && (
          <div>
            {steps.map((s) => {
              const isCurrent = s.id === step;
              const isDone = s.id < step;

              return (
                <motion.div
                  key={s.id}
                  initial={isCurrent ? { opacity: 0, x: 15 } : {}}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                  style={{
                    display: 'flex',
                    gap: 8,
                    padding: '5px 8px',
                    marginBottom: 4,
                    borderRadius: 8,
                    background: isCurrent ? '#e6f4ff' : 'transparent',
                    border: isCurrent ? '1px solid #91caff' : '1px solid transparent',
                    opacity: isDone ? 0.7 : 1,
                  }}
                >
                  <div style={{ paddingTop: 2 }}>
                    {isDone ? (
                      <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />
                    ) : isCurrent ? (
                      <RightCircleFilled style={{ color: '#1677ff', fontSize: 16 }} />
                    ) : (
                      <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', border: '2px solid #d9d9d9' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: isCurrent ? 'bold' : 'normal',
                        color: isCurrent ? '#1677ff' : isDone ? '#666' : '#999',
                      }}
                    >
                      {s.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#999' }}>{s.detail}</div>
                    {isCurrent && s.extra}
                    {s.highlight && isCurrent && (
                      <div style={{ marginTop: 6, fontSize: 12, color: '#52c41a', fontWeight: 'bold' }}>
                        ⚠ 少 1 台要加回去！
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {(step < TOTAL_STEPS || isFinished) && (
              <Button
                icon={<RedoOutlined />}
                style={{ marginTop: 4, fontSize: 12, width: '100%' }}
                size="small"
                onClick={handleReplay}
              >
                重放动画
              </Button>
            )}

            {!isFinished && (
              <Button style={{ marginTop: 4, fontSize: 12, width: '100%' }} size="small" onClick={() => setStep(TOTAL_STEPS)}>
                跳过动画
              </Button>
            )}

            {isFinished && (
              <Button type="primary" size="small" onClick={onComplete} style={{ marginTop: 4, width: '100%' }}>
                继续
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
