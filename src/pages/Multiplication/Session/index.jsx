import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Typography } from 'antd';
import { ArrowRightOutlined, CheckOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import MultiplicationMatrix from '../../../features/multiplication/MultiplicationMatrix';
import {
  calculateMultiplicationResult,
  generateAnswerChoices,
  recordAnsweredCell,
} from '../../../features/multiplication/model';
import { isValidMultiplicationSessionState } from '../../../features/multiplication/routeState';
import useTimer from '../../../hooks/useTimer';
import './session.css';

export default function MultiplicationSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const validState = isValidMultiplicationSessionState(location.state);
  const settings = validState ? location.state.settings : null;
  const questions = validState ? location.state.questions : [];
  const choices = useMemo(
    () => (validState ? questions.map((question) => generateAnswerChoices(question)) : []),
    [validState, questions],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answeredCells, setAnsweredCells] = useState({});
  const [selectedValue, setSelectedValue] = useState(null);
  const timer = useTimer();
  const startedRef = useRef(false);
  const current = questions[currentIndex];
  const feedback = selectedValue !== null;

  useEffect(() => {
    if (!validState) {
      navigate('/multiplication', { replace: true });
    }
  }, [navigate, validState]);

  useEffect(() => {
    if (validState && !startedRef.current) {
      startedRef.current = true;
      timer.start();
    }
    return timer.stop;
  }, [timer.start, timer.stop, validState]);

  if (!validState || !current) return null;

  const currentEntry = answeredCells[`${current.a}×${current.b}`];
  const phase = feedback
    ? currentEntry?.correct ? 'FEEDBACK_CORRECT' : 'FEEDBACK_WRONG'
    : 'READY';
  const isLast = currentIndex === questions.length - 1;

  const handleChoice = (value) => {
    if (feedback) return;
    timer.stop();
    setSelectedValue(value);
    setAnsweredCells((previous) => recordAnsweredCell(previous, current, value));
  };

  const handleAdvance = () => {
    if (!feedback) return;
    if (isLast) {
      const correct = Object.values(answeredCells).filter((entry) => entry.correct).length;
      const result = calculateMultiplicationResult({
        difficulty: settings.difficulty,
        total: settings.questionCount,
        correct,
        timeSpent: timer.seconds,
      });
      navigate('/multiplication/result', {
        state: { settings, answeredCells, timeSpent: timer.seconds, result },
      });
      return;
    }
    setCurrentIndex((index) => index + 1);
    setSelectedValue(null);
    timer.start();
  };

  return (
    <main className="multiplication-session-page">
      <section className="multiplication-matrix-panel">
        <MultiplicationMatrix
          question={current}
          difficulty={settings.difficulty}
          phase={phase}
          answeredCells={answeredCells}
        />
      </section>

      <Card className="multiplication-answer-panel">
        <div className="multiplication-session-meta">
          第 {currentIndex + 1}/{questions.length} 题 · 作答 {timer.formatted}
        </div>
        <Typography.Title level={2} className="multiplication-formula">
          {current.a} × {current.b} = ?
        </Typography.Title>

        <div className="multiplication-choices" aria-label="答案选项">
          {choices[currentIndex].map((choice) => {
            const isSelected = selectedValue === choice;
            const isCorrect = choice === current.answer;
            const state = !feedback
              ? 'ready'
              : isSelected && isCorrect
                ? 'selected-correct'
                : isSelected
                  ? 'selected-wrong'
                  : isCorrect
                    ? 'correct-answer'
                    : 'inactive';
            return (
              <Button
                key={choice}
                size="large"
                disabled={feedback}
                aria-pressed={isSelected}
                data-choice-state={state}
                aria-label={feedback
                  ? `${choice}，${isSelected ? '你的选择，' : ''}${isCorrect ? '正确答案' : isSelected ? '回答错误' : '未选择'}`
                  : `选择答案 ${choice}`}
                onClick={() => handleChoice(choice)}
              >
                {choice}
                {feedback && isCorrect ? ' ✓' : ''}
                {feedback && isSelected && !isCorrect ? ' ✕' : ''}
              </Button>
            );
          })}
        </div>

        <div className="multiplication-feedback" aria-live="polite">
          {feedback && (
            <>
              <div className={currentEntry.correct ? 'feedback-correct' : 'feedback-wrong'}>
                {currentEntry.correct
                  ? `回答正确：${current.a} × ${current.b} = ${current.answer}`
                  : `你的答案是 ${selectedValue}，正确答案：${current.a} × ${current.b} = ${current.answer}`}
              </div>
              <div className="multiplication-law">
                {current.a === current.b
                  ? `${current.a} × ${current.b} 位于乘法表对角线上。`
                  : `${current.a} × ${current.b} 和 ${current.b} × ${current.a} 都等于 ${current.answer}。`}
              </div>
              <Button
                type="primary"
                icon={isLast ? <CheckOutlined /> : <ArrowRightOutlined />}
                onClick={handleAdvance}
              >
                {isLast ? '查看结果' : '下一题'}
              </Button>
            </>
          )}
        </div>
      </Card>
    </main>
  );
}
