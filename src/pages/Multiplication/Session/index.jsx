import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Typography } from 'antd';
import { ArrowRightOutlined, CheckOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import MultiplicationMatrix from '../../../features/multiplication/MultiplicationMatrix';
import {
  calculateMultiplicationResult,
  DIFFICULTIES,
  generateAnswerChoices,
  getCellKey,
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
    () => (validState && settings.difficulty === DIFFICULTIES.EASY
      ? questions.map((question) => generateAnswerChoices(question))
      : []),
    [questions, settings, validState],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answeredCells, setAnsweredCells] = useState({});
  const [submittedValue, setSubmittedValue] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const answerControlRef = useRef(null);
  const feedbackActionRef = useRef(null);
  const timer = useTimer();
  const startedRef = useRef(false);
  const current = questions[currentIndex];
  const feedback = submittedValue !== null;

  useEffect(() => {
    if (!validState) navigate('/multiplication', { replace: true });
  }, [navigate, validState]);

  useEffect(() => {
    if (validState && !startedRef.current) {
      startedRef.current = true;
      timer.start();
    }
    return timer.stop;
  }, [timer.start, timer.stop, validState]);

  useEffect(() => {
    if (!validState) return;
    if (feedback) feedbackActionRef.current?.focus();
    else answerControlRef.current?.focus();
  }, [currentIndex, feedback, validState]);

  if (!validState || !current) return null;

  const currentEntry = answeredCells[getCellKey(current.a, current.b)];
  const phase = feedback
    ? currentEntry?.correct ? 'FEEDBACK_CORRECT' : 'FEEDBACK_WRONG'
    : 'READY';
  const isLast = currentIndex === questions.length - 1;
  const usesChoices = settings.difficulty === DIFFICULTIES.EASY;

  const submitAnswer = (value) => {
    if (feedback) return;
    timer.stop();
    setInputError('');
    setSubmittedValue(value);
    setAnsweredCells((previous) => recordAnsweredCell(previous, current, value));
  };

  const handleInputSubmit = () => {
    const trimmed = inputValue.trim();
    const value = Number(trimmed);
    if (!/^\d+$/.test(trimmed) || !Number.isSafeInteger(value) || value <= 0) {
      setInputError('请输入有效的正整数');
      answerControlRef.current?.focus();
      return;
    }
    submitAnswer(value);
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
    setSubmittedValue(null);
    setInputValue('');
    setInputError('');
    timer.start();
  };

  const targetControl = !usesChoices && !feedback ? (
    <input
      ref={answerControlRef}
      className="multiplication-target-control"
      value={inputValue}
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={`${current.a}乘${current.b}的答案`}
      aria-describedby="multiplication-input-help multiplication-input-error"
      aria-invalid={Boolean(inputError)}
      onChange={(event) => {
        setInputValue(event.target.value);
        if (inputError) setInputError('');
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          handleInputSubmit();
        }
      }}
    />
  ) : null;

  return (
    <main className="multiplication-session-page" data-difficulty={settings.difficulty}>
      <section className="multiplication-matrix-panel">
        <MultiplicationMatrix
          question={current}
          difficulty={settings.difficulty}
          phase={phase}
          answeredCells={answeredCells}
          targetControl={targetControl}
        />
      </section>

      <Card className="multiplication-answer-panel">
        <div className="multiplication-session-meta">
          第 {currentIndex + 1}/{questions.length} 题 · 作答 {timer.formatted}
        </div>
        <Typography.Title level={2} className="multiplication-formula">
          {current.a} × {current.b} = ?
        </Typography.Title>

        {usesChoices ? (
          <div className="multiplication-choices" aria-label="答案选项">
            {choices[currentIndex].map((choice, index) => {
              const isSelected = submittedValue === choice;
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
                  ref={index === 0 ? answerControlRef : null}
                  key={choice}
                  size="large"
                  disabled={feedback}
                  aria-pressed={isSelected}
                  data-choice-state={state}
                  aria-label={feedback
                    ? `${choice}，${isSelected ? '你的选择，' : ''}${isCorrect ? '正确答案' : isSelected ? '回答错误' : '未选择'}`
                    : `选择答案 ${choice}`}
                  onClick={() => submitAnswer(choice)}
                >
                  {choice}
                  {feedback && isCorrect ? ' ✓' : ''}
                  {feedback && isSelected && !isCorrect ? ' ✕' : ''}
                </Button>
              );
            })}
          </div>
        ) : (
          !feedback && (
            <div className="multiplication-input-actions">
              <div id="multiplication-input-help">请在矩阵目标格内填写正整数，按 Enter 或点击按钮提交。</div>
              <div id="multiplication-input-error" className="multiplication-input-error" aria-live="polite">
                {inputError || '\u00a0'}
              </div>
              <Button type="primary" disabled={!inputValue.trim()} onClick={handleInputSubmit}>
                提交答案
              </Button>
            </div>
          )
        )}

        <div className="multiplication-feedback" aria-live="polite">
          {feedback && (
            <>
              <div className={currentEntry.correct ? 'feedback-correct' : 'feedback-wrong'}>
                {currentEntry.correct
                  ? `回答正确：${current.a} × ${current.b} = ${current.answer}`
                  : `你的答案是 ${submittedValue}，正确答案：${current.a} × ${current.b} = ${current.answer}`}
              </div>
              <div className="multiplication-law">
                {current.a === current.b
                  ? `${current.a} × ${current.b} 位于乘法表对角线上。`
                  : `${current.a} × ${current.b} 和 ${current.b} × ${current.a} 都等于 ${current.answer}。`}
              </div>
              <Button
                ref={feedbackActionRef}
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
