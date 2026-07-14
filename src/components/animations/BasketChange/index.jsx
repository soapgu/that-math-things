import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button, Typography } from 'antd';
import { CheckCircleFilled, RightCircleFilled, RedoOutlined } from '@ant-design/icons';

export default function BasketChangeAnimation({ params, onComplete }) {
  const { takeAway, putIn } = params;
  const net = putIn - takeAway;
  const absNet = Math.abs(net);
  const minCount = Math.min(takeAway, putIn);
  const [step, setStep] = useState(0);
  const [pairIndex, setPairIndex] = useState(0);
  const containerRef = useRef(null);
  const TOTAL_STEPS = 4;
  const isFinished = step >= TOTAL_STEPS;
  const isMore = net > 0;
  const isLess = net < 0;
  const isSame = net === 0;
  const allPaired = pairIndex >= minCount;
  const PAIR_MS = 800;
  const APPLE_MS = 60;
  const PAIR_START_DELAY = Math.min(putIn * APPLE_MS + 1000, 3000);

  const handleReplay = useCallback(() => {
    window.speechSynthesis?.cancel();
    setStep(0);
    setPairIndex(0);
  }, []);

  // Auto-advance step timer
  useEffect(() => {
    if (step < TOTAL_STEPS) {
      const delays = [
        5000,                                           // step 0 → 1: red apples appear
        5000,                                           // step 1 → 2: green apples appear
        PAIR_START_DELAY + minCount * PAIR_MS + 4000,   // step 2 → 3: wait + pairing + buffer
        6000,                                           // step 3 → 4: result display
      ];
      const delay = delays[step] || 6000;
      const timer = setTimeout(() => {
        setStep((s) => s + 1);
        if (step === 2) setPairIndex(minCount);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [step, minCount]);

  // Pairing counter (starts after green apples finish appearing)
  useEffect(() => {
    if (step === 2 && pairIndex < minCount) {
      const delay = pairIndex === 0 ? PAIR_START_DELAY : PAIR_MS;
      const timer = setTimeout(() => setPairIndex((p) => p + 1), delay);
      return () => clearTimeout(timer);
    }
    if (step < 2) setPairIndex(0);
  }, [step, pairIndex, minCount, PAIR_START_DELAY]);

  const steps = useMemo(() => [
    {
      id: 1,
      label: `拿掉 ${takeAway} 个`,
      detail: `第一天，少了 ${takeAway} 个`,
    },
    {
      id: 2,
      label: `放进去 ${putIn} 个`,
      detail: `第二天，多了 ${putIn} 个`,
    },
    {
      id: 3,
      label: isMore
        ? `多了 ${net} 个`
        : isLess
          ? `少了 ${absNet} 个`
          : '一样多',
      detail: isMore
        ? `${putIn} − ${takeAway} = ${net}`
        : isLess
          ? `${takeAway} − ${putIn} = ${absNet}`
          : `${putIn} − ${takeAway} = 0`,
    },
    {
      id: 4,
      label: isMore
        ? `多了 ${net} 个 ✓`
        : isLess
          ? `少了 ${absNet} 个 ✓`
          : '一样多 ✓',
      detail: '答案',
      highlight: true,
    },
  ], [takeAway, putIn, net, absNet, isMore, isLess]);

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

    return () => window.speechSynthesis.cancel();
  }, [step, steps]);

  const redApples = Array.from({ length: takeAway }, (_, i) => i + 1);
  const greenApples = Array.from({ length: putIn }, (_, i) => i + 1);

  // Red apple: turns gray when paired (pairIndex >= num)
  const isRedPaired = (num) => step >= 2 && pairIndex >= num;
  // Green apple: visible from step 1, turns gray when paired
  const isGreenPaired = (num) => step >= 2 && pairIndex >= num;

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
      {/* Left: visual area */}
      <div ref={containerRef} style={{ flex: 1, minWidth: 360 }}>
        {/* Step 0: original apples (abstract, approximate) */}
        {step === 0 && (
          <div style={{
            marginBottom: 14, padding: '12px 16px', borderRadius: 8,
            background: '#fafafa', border: '1px dashed #d9d9d9',
            textAlign: 'center',
          }}>
            <Typography.Text style={{ fontSize: 14, color: '#999' }}>
              🧺 原来有一些苹果...
            </Typography.Text>
            <div style={{
              marginTop: 8, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6, fontSize: 22, color: '#ccc',
            }}>
              🍎 🍎 🍎 <span style={{ fontSize: 16, letterSpacing: 2 }}>...</span>
            </div>
          </div>
        )}

        {/* Step 1+: red apples (taken away, exact count) */}
        {step >= 1 && (
        <div style={{ marginBottom: 14 }}>
          <Typography.Text strong style={{ fontSize: 14, color: '#ff4d4f', marginBottom: 4, display: 'block' }}>
            ✕ 拿掉：{takeAway} 个
          </Typography.Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {redApples.map((num) => {
              const paired = isRedPaired(num);
              return (
                <motion.div
                  key={`r-${num}`}
                  layout
                  initial={step === 1 ? { scale: 0, opacity: 0 } : {}}
                  animate={{
                    scale: 1,
                    opacity: paired ? 0.4 : 1,
                    backgroundColor: paired ? '#d9d9d9' : '#ff4d4f',
                  }}
                  transition={{
                    type: 'spring', stiffness: 300, damping: 15,
                    delay: step === 1 ? (num - 1) * (APPLE_MS / 1000) : 0,
                  }}
                  style={{
                    width: 46, height: 46, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24,
                    border: paired ? '2px solid #d9d9d9' : '2px solid rgba(255,255,255,0.3)',
                    position: 'relative',
                  }}
                >
                  🍎
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ width: 20, height: 3, borderRadius: 2, background: paired ? '#999' : '#ff4d4f', transform: 'rotate(-45deg)' }} />
                    <div style={{ width: 20, height: 3, borderRadius: 2, background: paired ? '#999' : '#ff4d4f', transform: 'rotate(45deg)', position: 'absolute' }} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
        )}

        {/* Green apples (visible from step 2) */}
        {step >= 2 && (
          <div style={{ marginBottom: 16 }}>
            <Typography.Text strong style={{ fontSize: 14, color: '#52c41a', marginBottom: 4, display: 'block' }}>
              ➕ 放进去：{putIn} 个
            </Typography.Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {greenApples.map((num) => {
                const paired = isGreenPaired(num);
                return (
                  <motion.div
                    key={`g-${num}`}
                    layout
                    initial={step === 2 ? { scale: 0, opacity: 0, y: -20 } : {}}
                    animate={{
                      scale: 1,
                      opacity: paired ? 0.4 : 1,
                      backgroundColor: paired ? '#d9d9d9' : '#52c41a',
                      y: 0,
                    }}
                    transition={{
                      type: 'spring', stiffness: 300, damping: 15,
                      delay: step === 2 ? (num - 1) * (APPLE_MS / 1000) : 0,
                    }}
                    style={{
                      width: 46, height: 46, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24,
                      border: paired ? '2px solid #d9d9d9' : '2px solid rgba(255,255,255,0.3)',
                      position: 'relative',
                    }}
                  >
                    🍎
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2-3: Pairing progress + result */}
        {step >= 2 && (
          <div style={{ marginTop: 4 }}>
            {!allPaired && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  padding: '8px 14px', borderRadius: 8,
                  background: '#f0f5ff', border: '1px solid #adc6ff',
                  textAlign: 'center', fontSize: 13, color: '#666',
                }}
              >
                一对一抵消中...
                <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
                  已抵消 <strong style={{ color: '#1677ff' }}>{pairIndex}</strong> / {minCount} 对
                </div>
              </motion.div>
            )}

            {allPaired && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                {/* Comparison summary */}
                {step <= 3 && (
                  <div style={{
                    padding: '8px 14px', borderRadius: 8, marginBottom: 10,
                    background: '#fafafa', border: '1px solid #e8e8e8',
                    textAlign: 'center', fontSize: 13, color: '#666',
                  }}>
                    拿掉 <strong style={{ color: '#ff4d4f' }}>{takeAway}</strong> 个 ✕，
                    放进去 <strong style={{ color: '#52c41a' }}>{putIn}</strong> 个 ➕
                    <br />
                    抵消 {minCount} 对
                    {isSame
                      ? '，全部抵消，不多不少'
                      : isMore
                        ? `，还剩 ${absNet} 个绿色`
                        : `，还剩 ${absNet} 个红色`}
                  </div>
                )}

                {/* Answer card */}
                <div style={{
                  padding: '16px 20px', borderRadius: 10,
                  background: isSame ? '#fafafa' : isMore ? '#f6ffed' : '#fff1f0',
                  border: isSame
                    ? '1px solid #d9d9d9'
                    : isMore
                      ? '2px solid #52c41a'
                      : '2px solid #ff4d4f',
                  textAlign: 'center',
                  boxShadow: isMore
                    ? '0 2px 12px rgba(82,196,26,0.15)'
                    : isLess
                      ? '0 2px 12px rgba(255,77,79,0.15)'
                      : 'none',
                }}>
                  <div style={{ fontSize: 13, color: '#999', marginBottom: 4 }}>答案</div>
                  <div style={{
                    fontSize: 26, fontWeight: 'bold',
                    color: isSame ? '#999' : isMore ? '#52c41a' : '#ff4d4f',
                  }}>
                    {isSame ? '一样多 ✓' : `${isMore ? '多了' : '少了'} ${absNet} 个`}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: '#666' }}>
                    {isMore
                      ? `放进去 ${putIn} 个比拿掉 ${takeAway} 个多 ${absNet} 个`
                      : isLess
                        ? `拿掉 ${takeAway} 个比放进去 ${putIn} 个多 ${absNet} 个`
                        : `拿掉 ${takeAway} 个，放进去 ${putIn} 个，不多不少`}
                  </div>
                  <div style={{
                    marginTop: 8, padding: '4px 10px', borderRadius: 6,
                    background: '#f5f5f5', display: 'inline-block',
                    fontSize: 12, color: '#999',
                  }}>
                    {isMore
                      ? `${putIn} − ${takeAway} = ${absNet}`
                      : isLess
                        ? `${takeAway} − ${putIn} = ${absNet}`
                        : `${putIn} − ${takeAway} = 0`}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
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
                    background: isCurrent ? '#f6ffed' : 'transparent',
                    border: isCurrent ? '1px solid #b7eb8f' : '1px solid transparent',
                    opacity: isDone ? 0.7 : 1,
                  }}
                >
                  <div style={{ paddingTop: 2 }}>
                    {isDone ? (
                      <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />
                    ) : isCurrent ? (
                      <RightCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />
                    ) : (
                      <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', border: '2px solid #d9d9d9' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: isCurrent ? 'bold' : 'normal',
                      color: isCurrent ? '#52c41a' : isDone ? '#666' : '#999',
                    }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#999' }}>{s.detail}</div>
                    {s.highlight && isCurrent && (
                      <div style={{ marginTop: 6, fontSize: 12, color: '#52c41a', fontWeight: 'bold' }}>
                        ✓ {s.label}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {(step < TOTAL_STEPS || isFinished) && (
              <Button icon={<RedoOutlined />} style={{ marginTop: 4, fontSize: 12, width: '100%' }} size="small" onClick={handleReplay}>
                重放动画
              </Button>
            )}

            {!isFinished && (
              <Button style={{ marginTop: 4, fontSize: 12, width: '100%' }} size="small" onClick={() => { setStep(TOTAL_STEPS); setPairIndex(minCount); }}>
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
