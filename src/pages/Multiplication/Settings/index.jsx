import React, { useRef, useState } from 'react';
import { CheckCircleFilled, PlayCircleOutlined } from '@ant-design/icons';
import { Button, Progress, Tabs, Typography } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  DEFAULT_MULTIPLICATION_SETTINGS,
  DIFFICULTIES,
  generateMultiplicationQuestions,
  QUESTION_COUNTS,
} from '../../../features/multiplication/model';
import {
  createEmptyRecitationSession,
  isRecitationComplete,
  resetRecitationSession,
} from '../../../features/multiplication/recitation/model';
import RecitationResetDialog from '../../../features/multiplication/recitation/RecitationResetDialog';
import { loadRecitationSession, saveRecitationSession } from '../../../features/multiplication/recitation/storage';
import './settings.css';

const DIFFICULTY_OPTIONS = [
  { value: DIFFICULTIES.EASY, label: '简单', description: '显示目标所在整行和整列，使用四选一作答' },
  { value: DIFFICULTIES.MEDIUM, label: '提升', description: '只显示目标格上下左右的相邻乘积' },
  { value: DIFFICULTIES.HARD, label: '挑战', description: '隐藏其他乘积，在目标格内填写答案' },
];

function ChallengeSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_MULTIPLICATION_SETTINGS }));

  const handleStart = () => {
    navigate('/multiplication/session', {
      state: {
        settings: { ...settings },
        questions: generateMultiplicationQuestions(settings.questionCount),
      },
    });
  };

  return (
    <div className="multiplication-challenge-settings">
      <Typography.Title level={4}>难度</Typography.Title>
      <div className="multiplication-difficulty-options" aria-label="选择难度">
        {DIFFICULTY_OPTIONS.map((option) => {
          const selected = settings.difficulty === option.value;
          return (
            <button
              type="button"
              className="multiplication-difficulty-option"
              data-difficulty={option.value}
              aria-pressed={selected}
              onClick={() => setSettings((previous) => ({ ...previous, difficulty: option.value }))}
              key={option.value}
            >
              <span className="difficulty-option-title">{option.label}</span>
              <span className="difficulty-option-description">{option.description}</span>
              <span className="difficulty-option-selected">
                {selected ? <><CheckCircleFilled aria-hidden="true" /> 已选择</> : '选择此难度'}
              </span>
            </button>
          );
        })}
      </div>

      <Typography.Title level={4}>题目数量</Typography.Title>
      <div className="multiplication-count-options" aria-label="选择题目数量">
        {QUESTION_COUNTS.map((count) => (
          <button
            type="button"
            aria-pressed={settings.questionCount === count}
            onClick={() => setSettings((previous) => ({ ...previous, questionCount: count }))}
            key={count}
          >
            {count} 题
          </button>
        ))}
      </div>
      <div className="multiplication-count-note" aria-live="polite">
        {settings.questionCount === 81 ? '完成整张九九乘法表' : '\u00a0'}
      </div>

      <Button type="primary" size="large" block icon={<PlayCircleOutlined />} onClick={handleStart}>
        开始闯关
      </Button>
    </div>
  );
}

function RecitationSettings() {
  const navigate = useNavigate();
  const loaded = loadRecitationSession();
  const hasSession = loaded.status === 'loaded';
  const session = hasSession ? loaded.session : createEmptyRecitationSession();
  const completed = session.completedPhraseIds.length;
  const complete = hasSession && isRecitationComplete(session);
  const [resetOpen, setResetOpen] = useState(false);
  const resetTriggerRef = useRef(null);

  const enterSession = (nextSession) => {
    const saveResult = saveRecitationSession(nextSession);
    navigate('/multiplication/recitation', {
      state: {
        recitationSession: nextSession,
        storageWarning: saveResult.ok ? null : '本次可以继续，但离开后可能无法恢复。',
      },
    });
  };

  const handleEnter = () => {
    enterSession(hasSession ? session : createEmptyRecitationSession());
  };

  const handleReset = () => {
    setResetOpen(false);
    enterSession(resetRecitationSession());
  };

  const storageMessage = loaded.status === 'recovered'
    ? '背诵进度数据异常，已安全恢复为空进度。'
    : loaded.status === 'unavailable'
      ? '无法读取本机进度，本次仍可背诵，但离开后可能无法恢复。'
      : null;

  return (
    <section className="multiplication-recitation-settings" aria-labelledby="recitation-settings-title">
      <Typography.Title id="recitation-settings-title" level={4}>口诀背诵</Typography.Title>
      <Typography.Paragraph type="secondary">
        跟着中文领读逐句背诵；背完一句，乘法表会同步展开相关算式。
      </Typography.Paragraph>
      <div className="recitation-settings-progress">
        <strong>{hasSession ? `已背 ${completed}/45 句` : '0/45'}</strong>
        <Progress percent={Math.round(completed / 45 * 100)} showInfo={false} />
        {hasSession ? (
          <span className="recitation-settings-session-meta">
            {complete ? '整张口诀表已经背完' : `上次方式：${session.orderingMode === 'custom' ? '自定义背' : '顺序背'}`}
          </span>
        ) : null}
      </div>
      {storageMessage ? <div className="recitation-settings-warning" role="status">{storageMessage}</div> : null}
      <Button type="primary" size="large" block icon={<PlayCircleOutlined />} onClick={handleEnter}>
        {complete ? '查看完成结果' : hasSession ? '继续背诵' : '开始背诵'}
      </Button>
      {hasSession ? (
        <Button ref={resetTriggerRef} className="recitation-settings-reset" size="large" block onClick={() => setResetOpen(true)}>
          重新开始
        </Button>
      ) : null}
      <RecitationResetDialog open={resetOpen} onCancel={() => setResetOpen(false)} onConfirm={handleReset} triggerRef={resetTriggerRef} />
    </section>
  );
}

export default function MultiplicationSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const requestedMode = new URLSearchParams(location.search).get('mode');
  const activeMode = requestedMode === 'recitation' ? 'recitation' : 'challenge';

  const items = [
    { key: 'challenge', label: '闯关', children: <ChallengeSettings /> },
    { key: 'recitation', label: '背诵', children: <RecitationSettings /> },
  ];

  return (
    <main className="multiplication-settings-page">
      <Typography.Title level={2}>九九乘法</Typography.Title>
      <Tabs
        activeKey={activeMode}
        items={items}
        onChange={(mode) => navigate(`/multiplication?mode=${mode}`, { replace: true })}
      />
    </main>
  );
}
