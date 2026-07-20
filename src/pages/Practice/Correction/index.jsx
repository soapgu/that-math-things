import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Typography, Button, Input, Tag, Progress, message } from 'antd';
import { CheckOutlined, ReloadOutlined, HomeOutlined, BarChartOutlined } from '@ant-design/icons';
import { markQuestion, ERROR_CONFIG } from '../../../utils/marking';
import { OP_DISPLAY } from '../../../utils/mathGenerator';
import { normalizePracticeRecord } from '../../../utils/storage';

export default function PracticeCorrection() {
  const navigate = useNavigate();
  const location = useLocation();
  const record = useMemo(
    () => normalizePracticeRecord(location.state?.record),
    [location.state?.record],
  );
  const inputRef = useRef(null);

  const wrongItems = useMemo(() => {
    if (!record) return [];
    return record.items
      .filter(({ result }) => result && !result.isCorrect)
      .map(({ question, userAnswer, result }) => ({ ...question, userAnswer, result }));
  }, [record]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [corrected, setCorrected] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [lastResult, setLastResult] = useState(null);

  const current = wrongItems[currentIdx];

  useEffect(() => {
    if (!record) {
      navigate('/practice', { replace: true });
    }
  }, [record, navigate]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [currentIdx, lastResult]);

  const handleSubmit = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed === '' || lastResult?.isCorrect) return;

    if (!/^-?\d+$/.test(trimmed)) {
      message.warning('请输入数字');
      setInputValue('');
      inputRef.current?.focus();
      return;
    }

    const result = markQuestion(current, trimmed);
    if (result.isCorrect) {
      setLastResult({ ...result, userAnswer: trimmed });
      const next = [...corrected, currentIdx];
      setCorrected(next);
      setTimeout(() => {
        setLastResult(null);
        setInputValue('');
        if (currentIdx + 1 < wrongItems.length) {
          setCurrentIdx(i => i + 1);
        }
      }, 600);
    } else {
      setLastResult({ ...result, userAnswer: trimmed });
      setInputValue('');
      inputRef.current?.focus();
    }
  }, [inputValue, currentIdx, corrected, current, wrongItems.length, lastResult?.isCorrect]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  if (!record || wrongItems.length === 0) {
    if (record && wrongItems.length === 0) {
      return (
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', paddingTop: 80 }}>
          <Typography.Title level={4}>无需订正</Typography.Title>
          <p style={{ color: '#999', marginBottom: 24 }}>该次练习没有错题</p>
          <Button type="primary" onClick={() => navigate(-1)}>返回</Button>
        </div>
      );
    }
    return null;
  }

  const allDone = corrected.length === wrongItems.length;
  const progress = Math.round((corrected.length / wrongItems.length) * 100);

  if (allDone) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', paddingTop: 60 }}>
        <Typography.Title level={3}>🎉 全部订正完成！</Typography.Title>
        <p style={{ color: '#999', marginBottom: 24 }}>
          共 {wrongItems.length} 题，全部订正正确
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Button type="primary" icon={<ReloadOutlined />} onClick={() => navigate('/practice/result', { state: { record } })}>
            返回结果页
          </Button>
          <Button icon={<BarChartOutlined />} onClick={() => navigate('/practice/stats')}>
            统计数据
          </Button>
          <Button icon={<HomeOutlined />} onClick={() => navigate('/')}>
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <Typography.Title level={4}>订正练习</Typography.Title>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: '#999', userSelect: 'none' }}>
          {corrected.length + 1}/{wrongItems.length} 题
        </span>
      </div>
      <Progress percent={progress} showInfo={false} size="small" strokeColor="#1677ff" />

      <div style={{ margin: '40px 0', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span style={{ fontSize: 48, fontWeight: 600, userSelect: 'none', whiteSpace: 'nowrap' }}>
            {current.a} {OP_DISPLAY[current.op]} {current.b} =
          </span>
          <Input
            ref={inputRef}
            size="large"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="?"
            autoFocus
            style={{ width: 130, textAlign: 'center', fontSize: 40, fontWeight: 600 }}
            disabled={lastResult?.isCorrect}
          />
          <Button type="primary" icon={<CheckOutlined />} onClick={handleSubmit} disabled={!inputValue.trim() || lastResult?.isCorrect} style={{ height: 48, fontSize: 22 }}>
            {lastResult?.isCorrect ? '✓ 正确' : '提交'}
          </Button>
        </div>

        {lastResult && (
          <div style={{ marginTop: 20 }}>
            {lastResult.isCorrect ? (
              <div style={{ color: '#52c41a', fontSize: 16, fontWeight: 600 }}>✓ 正确</div>
            ) : (
              <>
                <div style={{ color: '#ff4d4f', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  ✗ 回答错误
                </div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                  {lastResult.errors.map(e => (
                    <Tag key={e} color={(ERROR_CONFIG.find(c => c.type === e) || {}).tagColor} style={{ margin: 0 }}>{e}</Tag>
                  ))}
                </div>
                {lastResult.detail && (() => {
                  const parts = Array.isArray(lastResult.detail) ? lastResult.detail : [{ text: lastResult.detail, bold: false }];
                  return (
                    <div style={{ fontSize: 13, color: '#999', userSelect: 'none' }}>
                      — {parts.map((p, i) => (
                        <span key={i}>
                          {i > 0 && '，'}
                          <span style={p.bold ? { fontWeight: 700, color: '#ff4d4f' } : undefined}>{p.text}</span>
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
