import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button, Typography } from 'antd';
import { CheckCircleFilled, RightCircleFilled, RedoOutlined } from '@ant-design/icons';

export default function StickerProblemAnimation({ params, onComplete }) {
  const { a, b } = params;
  const diff = a - b;
  const days = diff / 2;
  const [step, setStep] = useState(0);
  const [day, setDay] = useState(0);
  const containerRef = useRef(null);
  const TOTAL_STEPS = 6;
  const isFinished = step >= TOTAL_STEPS;

  const handleReplay = useCallback(() => {
    window.speechSynthesis?.cancel();
    setStep(0);
    setDay(0);
  }, []);

  useEffect(() => {
    if (step < TOTAL_STEPS) {
      const delays = [400, 6600, 6600, 6600, days * 900 + 3000, 9000];
      const delay = delays[step] || 5000;
      const timer = setTimeout(() => {
        setStep((s) => s + 1);
        setDay(0);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [step, days]);

  useEffect(() => {
    if (step === 4 && day < days) {
      const timer = setTimeout(() => setDay((d) => d + 1), 900);
      return () => clearTimeout(timer);
    }
    if (step === 5 && day < 1) {
      const timer = setTimeout(() => setDay(1), 2000);
      return () => clearTimeout(timer);
    }
  }, [step, day, days]);

  const steps = useMemo(() => [
    {
      id: 1,
      label: `乐乐 ${a} 张，欢欢 ${b} 张`,
      detail: `共 ${a} 张贴纸`,
    },
    {
      id: 2,
      label: `乐乐比欢欢多 ${diff} 张`,
      detail: '多出的用蓝色标记',
    },
    {
      id: 3,
      label: `欢欢再添 ${diff} 张就相同`,
      detail: '蓝色补到欢欢那边',
    },
    {
      id: 4,
      label: `每天缩小2张，要 ${days} 天`,
      detail: `共 ${days} 天`,
    },
    {
      id: 5,
      label: `多出的 ${diff} 张分一半给欢欢`,
      detail: `一半 = ${days} 张，每天1张正好 ${days} 天`,
    },
    {
      id: 6,
      label: `答案：${diff} 张，${days} 天`,
      detail: `添 ${diff} 张，分${days}天`,
      highlight: true,
    },
  ], [a, b, diff, days]);

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

  const leleDots = Array.from({ length: a }, (_, i) => i + 1);
  const huanhuanDots = Array.from({ length: b }, (_, i) => i + 1);

  const getLeleDotColor = (num) => {
    if (step === 1) return '#b0b0b0';
    if (step === 2) return num > b ? '#1677ff' : '#91caff';
    if (step >= 3 && step <= 4) {
      const transferred = step === 3 ? diff : Math.min(day, diff);
      if (num > a - transferred) return '#d9d9d9';
      return '#91caff';
    }
    if (step >= 5) {
      if (num <= b) return '#91caff';
      if (day === 0) return '#1677ff';
      if (num <= b + days) return '#1677ff';
      return '#d9d9d9';
    }
    return '#b0b0b0';
  };

  const getHuanhuanDotColor = (num) => {
    if (step === 1) return '#b0b0b0';
    if (step === 2) return '#fa8c16';
    if (step >= 3 && step <= 4) {
      if (num > b) return '#52c41a';
      return '#fa8c16';
    }
    if (step >= 5) {
      if (num <= b) return '#fa8c16';
      if (day >= 1) return '#52c41a';
      return '#b0b0b0';
    }
    return '#b0b0b0';
  };

  const showExtra = step >= 2;
  const huanhuanReceived = step === 3 ? diff : (step === 4 ? Math.min(day, diff) : (step >= 5 && day >= 1 ? days : 0));

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
      {/* Left: stickers visual */}
      <div ref={containerRef} style={{ flex: 1, minWidth: 360 }}>
        {step >= 1 && (
          <>
            {/* 乐乐's row */}
            <div style={{ marginBottom: 12 }}>
              <Typography.Text strong style={{ fontSize: 14, color: '#1677ff', marginBottom: 4, display: 'block' }}>
                乐乐：{a} 张
              </Typography.Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {leleDots.map((num) => {
                  const color = getLeleDotColor(num);
                  const isTransferring = step >= 3 && step <= 4
                    ? num > a - huanhuanReceived
                    : step >= 5 && day >= 1 && num > b + days;
                  return (
                    <React.Fragment key={num}>
                      {step === 5 && day === 0 && num === b + days + 1 && (
                        <>
                          <div style={{
                            width: 2, height: 28, background: '#ff4d4f',
                            margin: '0 2px', borderRadius: 1, flexShrink: 0,
                          }} />
                          <div style={{
                            fontSize: 9, color: '#ff4d4f', fontWeight: 'bold',
                            writingMode: 'vertical-rl', letterSpacing: 2, flexShrink: 0,
                            padding: '0 1px',
                          }}>
                            分一半
                          </div>
                        </>
                      )}
                      <motion.div
                        data-num={num}
                        layout
                        initial={step === 1 ? { scale: 0, opacity: 0 } : {}}
                        animate={{
                          scale: 1,
                          opacity: isTransferring ? 0 : 1,
                          backgroundColor: isTransferring ? '#d9d9d9' : color,
                          width: 28,
                          height: 28,
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 300,
                          damping: 15,
                          delay: step === 1 ? (num - 1) * 0.025 : 0,
                        }}
                        style={{
                          width: 28, height: 28, borderRadius: 6,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 'bold', color: '#fff',
                          border: '2px solid rgba(255,255,255,0.3)',
                        }}
                      >
                        ★
                      </motion.div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* 欢欢's row */}
            <div style={{ marginBottom: 16 }}>
              <Typography.Text strong style={{ fontSize: 14, color: '#fa8c16', marginBottom: 4, display: 'block' }}>
                 欢欢：{b} 张{step >= 3 && huanhuanReceived > 0 && ` + ${huanhuanReceived} 张`}
              </Typography.Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {huanhuanDots.map((num) => (
                  <motion.div
                    key={num}
                    layout
                    initial={step === 1 ? { scale: 0, opacity: 0 } : {}}
                    animate={{
                      scale: 1,
                      opacity: 1,
                      backgroundColor: getHuanhuanDotColor(num),
                      width: 28, height: 28,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 15,
                      delay: step === 1 ? (num - 1) * 0.025 : 0,
                    }}
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 'bold', color: '#fff',
                      border: '2px solid rgba(255,255,255,0.3)',
                    }}
                  >
                    ★
                  </motion.div>
                ))}
                {/* Transferred stickers appearing on 欢欢's side */}
                {step >= 3 && huanhuanReceived > 0 && Array.from({ length: huanhuanReceived }, (_, i) => (
                  <motion.div
                    key={`t-${i}`}
                    initial={{ scale: 0, y: -40, opacity: 0 }}
                    animate={{ scale: [0, 1.3, 1], y: 0, opacity: 1 }}
                    transition={{
                      type: 'spring', stiffness: 350, damping: 14,
                      delay: i * 0.15,
                    }}
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 'bold', color: '#fff',
                      backgroundColor: '#52c41a',
                      border: '2px solid #ffeb3b',
                      boxShadow: '0 2px 8px rgba(82,196,26,0.4)',
                    }}
                  >
                    ★
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Difference indicator */}
            {showExtra && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '6px 12px',
                  background: step === 2 ? '#e6f4ff' : '#f6ffed',
                  borderRadius: 8,
                  fontSize: 14,
                  textAlign: 'center',
                }}
              >
                {step === 2 && <span>乐乐多出 <strong style={{ color: '#1677ff', fontSize: 18 }}>{diff}</strong> 张</span>}
                {step === 3 && <span>补上 {diff} 张后，两人同样多 <CheckCircleFilled style={{ color: '#52c41a', marginLeft: 6 }} /></span>}
                {step === 4 && (
                  <span>
                    第 <strong>{Math.min(day, days)}</strong> / {days} 天
                    {day > 0 && day <= days && (
                      <span>，差距还剩 <strong>{diff - day * 2}</strong> 张</span>
                    )}
                    {day > days && <span>，两人同样多！<CheckCircleFilled style={{ color: '#52c41a', marginLeft: 6 }} /></span>}
                  </span>
                )}
                {step === 5 && day === 0 && (
                  <span>
                    乐乐多出 <strong style={{ color: '#1677ff' }}>{diff}</strong> 张，分
                    <strong style={{ color: '#52c41a' }}>一半（{days} 张）</strong>给欢欢
                  </span>
                )}
                {step === 5 && day >= 1 && (
                  <span>
                    乐乐给出 <strong style={{ color: '#52c41a' }}>{days}</strong> 张后，两人同样多！
                    <CheckCircleFilled style={{ color: '#52c41a', marginLeft: 6 }} />
                  </span>
                )}
              </motion.div>
            )}

            {/* Daily transfer visual */}
            {step === 4 && day > 0 && day <= days && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: '#666' }}
              >
                <motion.span
                  animate={{ x: [0, 20, 0] }}
                  transition={{ repeat: day, duration: 0.6 }}
                  style={{ display: 'inline-block' }}
                >
                  ★
                </motion.span>
                {' '}每天送1张，差距缩小2张
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
                    display: 'flex', gap: 8, padding: '5px 8px', marginBottom: 4, borderRadius: 8,
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
                    <div style={{ fontSize: 13, fontWeight: isCurrent ? 'bold' : 'normal', color: isCurrent ? '#1677ff' : isDone ? '#666' : '#999' }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#999' }}>{s.detail}</div>
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
              <Button style={{ marginTop: 4, fontSize: 12, width: '100%' }} size="small" onClick={() => { setStep(TOTAL_STEPS); setDay(days); }}>
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
