import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Typography, Input, Button, Progress, message } from 'antd';
import { ArrowRightOutlined, CheckOutlined } from '@ant-design/icons';
import { generateQuestions, OP_DISPLAY } from '../../../utils/mathGenerator';
import { createAssistance } from '../../../utils/assistGenerator';
import { createAssistUsage, promoteAssistUsage } from '../../../utils/assistUsage';
import { loadPracticeSettings, normalizePracticeSettings } from '../../../utils/practiceSettings';
import { savePracticeRecord } from '../../../utils/storage';
import MathAssist from '../../../components/practice/MathAssist';
import useTimer from '../../../hooks/useTimer';

export default function PracticeSession() {
  const navigate = useNavigate();
  const location = useLocation();

  // 从 location.state 或 localStorage 读取设置
  const settings = useMemo(() => {
    if (location.state?.settings) return normalizePracticeSettings(location.state.settings);
    return loadPracticeSettings({ useDefaults: false });
  }, [location.state]);

  const questions = useMemo(() => {
    if (!settings) return [];
    return generateQuestions(settings);
  }, [settings]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [started, setStarted] = useState(false);
  const inputRef = useRef(null);
  const timer = useTimer();
  const current = questions[currentIndex];

  // 将每道题的辅助内容和使用情况放在同一个 entry 中，避免两组数组依靠下标关联。
  // 单场练习的题目和设置不会变化，因此只初始化一次；ref 也不会因计时器刷新触发渲染。
  const questionAssistsRef = useRef(null);
  if (questionAssistsRef.current === null) {
    questionAssistsRef.current = questions.map((question) => {
      const model = createAssistance(question, settings);
      return { model, usage: createAssistUsage(model) };
    });
  }

  const currentAssist = questionAssistsRef.current[currentIndex];
  const assistance = currentAssist?.model ?? null;

  const handleAssistLevelChange = useCallback((level) => {
    currentAssist.usage = promoteAssistUsage(currentAssist.usage, level, currentAssist.model);
  }, [currentAssist]);

  // 无设置时退回参数页
  useEffect(() => {
    if (!settings) {
      navigate('/practice', { replace: true });
    }
  }, [settings, navigate]);

  // 生成题目后自动开始
  useEffect(() => {
    if (questions.length > 0 && !started) {
      setStarted(true);
      timer.start();
    }
  }, [questions, started, timer]);

  // 每题切换时聚焦输入框
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [currentIndex]);

  const handleSubmit = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed === '') return;

    if (!/^-?\d+$/.test(trimmed)) {
      message.warning('请输入数字');
      setInputValue('');
      inputRef.current?.focus();
      return;
    }

    const newAnswers = [...userAnswers, trimmed];
    setUserAnswers(newAnswers);
    setInputValue('');

    if (currentIndex >= questions.length - 1) {
      timer.stop();
      const record = savePracticeRecord({
        questions,
        userAnswers: newAnswers,
        // Phase 5.1 在会话结束时把逐题快照交给存储边界；Phase 5.2 再负责将其写入
        // schemaVersion: 2 的 items[]，此处不直接拼接持久化记录。
        assistUsage: questionAssistsRef.current.map(({ usage }) => ({ ...usage })),
        timeSpent: timer.seconds,
        settings,
      });
      navigate('/practice/result', {
        state: { record },
      });
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [inputValue, userAnswers, currentIndex, questions, timer, navigate, settings]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  if (!settings || questions.length === 0) return null;

  const canShowAssist = settings.assistEnabled && assistance.eligible;
  const isLast = currentIndex >= questions.length - 1;
  const progress = Math.round(((currentIndex) / questions.length) * 100);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      {/* 进度条 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: '#999', userSelect: 'none' }}>
            第 {currentIndex + 1}/{questions.length} 题
          </span>
          <span style={{ fontSize: 13, color: '#999', userSelect: 'none' }}>
            {timer.formatted}
          </span>
        </div>
        <Progress
          percent={progress}
          showInfo={false}
          size="small"
          strokeColor="#1677ff"
        />
      </div>

      {/* 题目 + 输入区 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          margin: '48px 0 16px',
        }}
      >
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
        />
        <Button
          type="primary"
          icon={isLast ? <CheckOutlined /> : <ArrowRightOutlined />}
          onClick={handleSubmit}
          disabled={!inputValue.trim()}
          style={{ height: 48, fontSize: 22 }}
        >
          {isLast ? '完成' : '下一题'}
        </Button>
      </div>

      {canShowAssist && (
        <div style={{ minHeight: 32, marginBottom: 32 }}>
          <MathAssist
            key={currentIndex}
            assistance={assistance}
            onLevelChange={handleAssistLevelChange}
            onReturnToQuestion={() => inputRef.current?.focus()}
          />
        </div>
      )}
    </div>
  );
}
