import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button, Typography } from 'antd';
import { CheckCircleFilled, RightCircleFilled } from '@ant-design/icons';

export default function ComputerNumberAnimation({ params, onComplete }) {
  const { x, y } = params;
  const [step, setStep] = useState(0);
  const containerRef = useRef(null);

  const allDots = Array.from({ length: y }, (_, i) => i + 1);
  const remaining = y - x;
  const answer = y - x + 1;
  const useGrid = y > 20;
  const TOTAL_STEPS = 5;

  useEffect(() => {
    if (step < TOTAL_STEPS) {
      const delay = step === 0 ? 2400 : 6600;
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

  const steps = [
    {
      id: 1,
      label: `画 ${y} 个点`,
      detail: `编号 1 ~ ${y}`,
      check: step >= 1,
    },
    {
      id: 2,
      label: `前 ${x} 个点`,
      detail: `编号 1 ~ ${x}`,
      check: step >= 2,
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
      label: `剩下 ${remaining} 个`,
      detail: `编号 ${x + 1} ~ ${y}`,
      check: step >= 3,
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
      check: step >= 4,
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
      check: step >= 5,
      highlight: true,
    },
  ];

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

            {/* Skip button */}
            {step < TOTAL_STEPS && (
              <Button style={{ marginTop: 4, fontSize: 12, width: '100%' }} size="small" onClick={() => setStep(TOTAL_STEPS)}>
                跳过动画
              </Button>
            )}

            {/* Continue button */}
            {step >= TOTAL_STEPS && (
              <Button type="primary" size="small" onClick={onComplete} style={{ marginTop: 8, width: '100%' }}>
                继续
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
