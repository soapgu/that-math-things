import React, { useState } from 'react';
import { CheckCircleFilled, PlayCircleOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  DEFAULT_MULTIPLICATION_SETTINGS,
  DIFFICULTIES,
  generateMultiplicationQuestions,
  QUESTION_COUNTS,
} from '../../../features/multiplication/model';
import './settings.css';

const DIFFICULTY_OPTIONS = [
  { value: DIFFICULTIES.EASY, label: '简单', description: '显示目标所在整行和整列，使用四选一作答' },
  { value: DIFFICULTIES.MEDIUM, label: '提升', description: '只显示目标格上下左右的相邻乘积' },
  { value: DIFFICULTIES.HARD, label: '挑战', description: '隐藏其他乘积，在目标格内填写答案' },
];

export default function MultiplicationSettings() {
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
    <main className="multiplication-settings-page">
      <Typography.Title level={2}>九九乘法</Typography.Title>
      <Typography.Paragraph type="secondary">
        沿着乘法矩阵找到答案，一题一题点亮九九乘法表。
      </Typography.Paragraph>

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
    </main>
  );
}
