import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button, Typography } from 'antd';
import { CheckCircleFilled, RightCircleFilled, RedoOutlined } from '@ant-design/icons';

export default function AppleEatenAnimation({ params, onComplete }) {
  const { total, threshold } = params;
  const maxRemaining = threshold - 1;
  const finalAnswer = total - maxRemaining;
  const [step, setStep] = useState(0);
  const [displayRemaining, setDisplayRemaining] = useState(0);
  const containerRef = useRef(null);
  const TOTAL_STEPS = 5;
  const isFinished = step >= TOTAL_STEPS;

  const handleReplay = useCallback(() => {
    window.speechSynthesis?.cancel();
    setStep(0);
    setDisplayRemaining(0);
  }, []);

  useEffect(() => {
    if (step < TOTAL_STEPS) {
      const delays = [400, 6000, 7000, 10000, 8000, 6000];
      const delay = delays[step] || 6000;
      const timer = setTimeout(() => setStep((s) => s + 1), delay);
      return () => clearTimeout(timer);
    }
  }, [step]);

  useEffect(() => {
    if (step === 3) {
      if (displayRemaining < maxRemaining) {
        const timer = setTimeout(() => setDisplayRemaining((r) => r + 1), 800);
        return () => clearTimeout(timer);
      }
    } else {
      setDisplayRemaining(0);
    }
  }, [step, displayRemaining, maxRemaining]);

  const steps = useMemo(() => [
    {
      id: 1,
      label: `买了 ${total} 个苹果`,
      detail: `总共 ${total} 个`,
    },
    {
      id: 2,
      label: `剩下的不满 ${threshold} 个`,
      detail: `可以是 0~${maxRemaining} 个`,
    },
    {
      id: 3,
      label: `剩下越多，吃得越少`,
      detail: `选最多剩 ${maxRemaining} 个`,
    },
    {
      id: 4,
      label: `至少吃掉 ${finalAnswer} 个`,
      detail: `${total} − ${maxRemaining} = ${finalAnswer}`,
    },
    {
      id: 5,
      label: `答案：${finalAnswer} 个`,
      detail: `至少吃了 ${finalAnswer} 个`,
      highlight: true,
    },
  ], [total, threshold, maxRemaining, finalAnswer]);

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

  const apples = Array.from({ length: total }, (_, i) => i + 1);

  const getAppleColor = (num) => {
    if (step <= 3) return '#ff4d4f';
    if (num <= maxRemaining) return '#52c41a';
    if (step === 4) return '#d9d9d9';
    return '#e8e8e8';
  };

  const getAppleBorder = (num) => {
    if (step <= 3) return '2px solid rgba(255,255,255,0.3)';
    if (num <= maxRemaining) {
      return '2px solid rgba(255,255,255,0.3)';
    }
    if (step === 4) return '2px dashed #ff4d4f';
    return '2px dashed #d9d9d9';
  };

  const getAppleOpacity = (num) => {
    if (step <= 4) return 1;
    if (num <= maxRemaining) return 1;
    return 0.9;
  };

  const isEaten = (num) => num > maxRemaining && step >= 5;
  const isRemaining = (num) => num <= maxRemaining;

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
      {/* Left: apples visual */}
      <div ref={containerRef} style={{ flex: 1, minWidth: 360 }}>
        {step >= 1 && (
          <>
            {/* Apples grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' }}>
              {apples.map((num) => {
                const eaten = isEaten(num);
                const remaining = isRemaining(num);
                return (
                  <motion.div
                    key={num}
                    layout
                    initial={step === 1 ? { scale: 0, opacity: 0 } : {}}
                    animate={{
                      scale: 1,
                      opacity: getAppleOpacity(num),
                      backgroundColor: getAppleColor(num),
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 15,
                      delay: step === 1 ? (num - 1) * 0.025 : 0,
                    }}
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 26,
                      border: getAppleBorder(num),
                      boxShadow: 'none',
                      position: 'relative',
                    }}
                  >
                    🍎
                    {eaten && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{
                          width: 22, height: 4, borderRadius: 2,
                          background: '#ff4d4f', transform: 'rotate(-45deg)',
                        }} />
                        <div style={{
                          width: 22, height: 4, borderRadius: 2,
                          background: '#ff4d4f', transform: 'rotate(45deg)',
                          position: 'absolute',
                        }} />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Step 5: grid annotation */}
            {step === 5 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  marginTop: 6, display: 'flex', alignItems: 'center', gap: 16,
                  fontSize: 12,
                }}
              >
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                  ● 剩 {maxRemaining} 个
                </span>
                <span style={{ flex: 1, height: 1, background: '#e8e8e8' }} />
                <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                  ✕ 吃了 {finalAnswer} 个
                </span>
              </motion.div>
            )}

            {/* Step 2: range annotation */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: 14, padding: '10px 16px', borderRadius: 8,
                  background: '#fff7e6', textAlign: 'center', fontSize: 14,
                  border: '1px solid #ffd591',
                }}
              >
                "不满 {threshold} 个" 是比 {threshold} 少 → 可能剩
                <strong style={{ color: '#fa8c16', fontSize: 16, marginLeft: 6 }}>
                  0 个、1 个、...、{maxRemaining} 个
                </strong>
              </motion.div>
            )}

            {/* Step 3: remaining-more → eat-less animation */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: 14 }}
              >
                <div style={{
                  padding: '14px 16px', borderRadius: 8,
                  background: '#f0f5ff', border: '1px solid #adc6ff',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>
                    剩下越多 → 吃得越少
                  </div>

                  {/* Animated counter row */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 16, fontSize: 16, flexWrap: 'wrap',
                  }}>
                    <span>
                      剩 <strong style={{ color: '#52c41a', fontSize: 24 }}>{displayRemaining}</strong> 个
                    </span>
                    <motion.span
                      key={displayRemaining}
                      initial={{ scale: 1.3 }}
                      animate={{ scale: 1 }}
                      style={{ color: '#999', fontSize: 18 }}
                    >
                      →
                    </motion.span>
                    <span>
                      吃 <strong style={{ color: '#ff4d4f', fontSize: 24 }}>{total - displayRemaining}</strong> 个
                    </span>
                  </div>

                  {/* Key comparison pairs */}
                  <div style={{
                    marginTop: 12, display: 'flex', justifyContent: 'center', gap: 24,
                    fontSize: 12, color: '#999',
                  }}>
                    <span style={{
                      opacity: displayRemaining >= 0 ? 0.3 : 0,
                      background: '#f5f5f5', padding: '2px 8px', borderRadius: 4,
                    }}>
                      剩 0 → 吃 {total}
                    </span>
                    <span style={{
                      opacity: displayRemaining === maxRemaining ? 1 : 0,
                      background: '#e6f7ff', padding: '2px 8px', borderRadius: 4,
                      color: '#1677ff', fontWeight: 'bold',
                      transition: 'opacity 0.3s',
                    }}>
                      剩 {maxRemaining} → 吃 {finalAnswer} ✓
                    </span>
                  </div>

                  {displayRemaining === maxRemaining && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        marginTop: 10, padding: '6px 12px',
                        background: '#e6f7ff', borderRadius: 6,
                        fontSize: 14, fontWeight: 'bold', color: '#1677ff',
                      }}
                    >
                      所以剩下要最多（{maxRemaining} 个），吃得才最少（{finalAnswer} 个）
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 4: eating announcement */}
            {step === 4 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: 14, padding: '10px 16px', borderRadius: 8,
                  background: '#fff1f0', textAlign: 'center', fontSize: 15,
                  fontWeight: 'bold', color: '#ff4d4f',
                  border: '1px solid #ffa39e',
                }}
              >
                🍽 吃掉 <strong style={{ fontSize: 18 }}>{finalAnswer}</strong> 个，
                剩下 <strong style={{ color: '#52c41a', fontSize: 18 }}>{maxRemaining}</strong> 个
              </motion.div>
            )}

            {/* Step 5: final answer — eaten count is the hero */}
            {step === 5 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ marginTop: 14 }}
              >
                {/* Eaten section (hero) */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  style={{
                    padding: '16px 20px', borderRadius: 10,
                    background: '#fff1f0', border: '2px solid #ff4d4f',
                    textAlign: 'center', marginBottom: 8,
                    boxShadow: '0 2px 12px rgba(255,77,79,0.15)',
                  }}
                >
                  <div style={{ fontSize: 13, color: '#999', marginBottom: 4 }}>答案</div>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#ff4d4f' }}>
                    {finalAnswer} 个 🍎
                  </div>
                  <div style={{ marginTop: 6, fontSize: 14, color: '#666' }}>
                    至少吃了 {finalAnswer} 个
                  </div>
                </motion.div>

                {/* Remaining section (supporting) */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  style={{
                    padding: '8px 14px', borderRadius: 8,
                    background: '#f6ffed', border: '1px solid #b7eb8f',
                    textAlign: 'center', marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 13, color: '#666' }}>
                    还剩 <strong style={{ color: '#52c41a', fontSize: 15 }}>{maxRemaining}</strong> 个
                  </span>
                </motion.div>

                {/* Explanation */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  style={{
                    padding: '8px 14px', borderRadius: 8,
                    background: '#fafafa', border: '1px solid #e8e8e8',
                    textAlign: 'center', fontSize: 12, color: '#999', lineHeight: 1.6,
                  }}
                >
                  {total} − ({threshold} − 1) = {total} − {maxRemaining} = {finalAnswer}
                  <br />
                  妈妈买了 {total} 个，吃了 {finalAnswer} 个，剩 {maxRemaining} 个，不满 {threshold} 个 ✓
                </motion.div>
              </motion.div>
            )}
          </>
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
                    background: isCurrent ? '#fff1f0' : 'transparent',
                    border: isCurrent ? '1px solid #ffa39e' : '1px solid transparent',
                    opacity: isDone ? 0.7 : 1,
                  }}
                >
                  <div style={{ paddingTop: 2 }}>
                    {isDone ? (
                      <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />
                    ) : isCurrent ? (
                      <RightCircleFilled style={{ color: '#ff4d4f', fontSize: 16 }} />
                    ) : (
                      <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', border: '2px solid #d9d9d9' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: isCurrent ? 'bold' : 'normal',
                      color: isCurrent ? '#ff4d4f' : isDone ? '#666' : '#999',
                    }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#999' }}>{s.detail}</div>
                    {s.highlight && isCurrent && (
                      <div style={{ marginTop: 6, fontSize: 12, color: '#52c41a', fontWeight: 'bold' }}>
                        ✓ 至少吃了 {finalAnswer} 个
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
              <Button style={{ marginTop: 4, fontSize: 12, width: '100%' }} size="small" onClick={() => { setStep(TOTAL_STEPS); setDisplayRemaining(maxRemaining); }}>
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
