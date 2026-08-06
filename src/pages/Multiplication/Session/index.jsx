import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button, Card, Modal, Typography } from 'antd';
import { ArrowRightOutlined, CheckOutlined } from '@ant-design/icons';
import { useBlocker, useLocation, useNavigate } from 'react-router-dom';
import MultiplicationMatrix from '../../../features/multiplication/MultiplicationMatrix';
import {
  calculateMultiplicationResult,
  DIFFICULTIES,
  generateAnswerChoices,
  getCellKey,
  recordAnsweredCell,
} from '../../../features/multiplication/model';
import {
  isReloadNavigation,
  isValidMultiplicationSessionState,
  markReloadNavigationHandled,
} from '../../../features/multiplication/routeState';
import useTimer from '../../../hooks/useTimer';
import './session.css';

const PHASES = {
  LOCATING: 'LOCATING',
  READY: 'READY',
  FEEDBACK_CORRECT: 'FEEDBACK_CORRECT',
  FEEDBACK_WRONG: 'FEEDBACK_WRONG',
  ADVANCING: 'ADVANCING',
  FINISHED: 'FINISHED',
};

const SLIDING_MS = 600;
const FIRING_MS = 800;
const AUTO_ADVANCE_MS = 2000;
const TARGET_FEEDBACK_MS = 300;

function getHintKeys(question, difficulty) {
  if (difficulty === DIFFICULTIES.HARD) return [];
  const hints = [];
  if (difficulty === DIFFICULTIES.EASY) {
    for (let value = 1; value <= 9; value += 1) {
      if (value !== question.b) {
        hints.push({ key: getCellKey(question.a, value), axis: 'horizontal', position: value });
      }
      if (value !== question.a) {
        hints.push({ key: getCellKey(value, question.b), axis: 'vertical', position: value });
      }
    }
  } else {
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([rowDelta, columnDelta]) => {
      const row = question.a + rowDelta;
      const column = question.b + columnDelta;
      if (row >= 1 && row <= 9 && column >= 1 && column <= 9) {
        const vertical = rowDelta !== 0;
        hints.push({
          key: getCellKey(row, column),
          axis: vertical ? 'vertical' : 'horizontal',
          position: vertical ? row : column,
        });
      }
    });
  }
  return hints;
}

function revealDelayForHint({ position }) {
  return Math.round((position / 9) * FIRING_MS);
}

export default function MultiplicationSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const reloadedDocument = isReloadNavigation();
  const validState = !reloadedDocument && isValidMultiplicationSessionState(location.state);
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
  const [phase, setPhase] = useState(PHASES.LOCATING);
  const [locateStage, setLocateStage] = useState('idle');
  const [revealedHintKeys, setRevealedHintKeys] = useState(() => new Set());
  const [announcement, setAnnouncement] = useState('');
  const [locateRun, setLocateRun] = useState(0);
  const [targetFeedbackStage, setTargetFeedbackStage] = useState('idle');
  const answerControlRef = useRef(null);
  const feedbackActionRef = useRef(null);
  const previousQuestionRef = useRef(null);
  const locateTimersRef = useRef([]);
  const autoTimerRef = useRef(null);
  const autoDeadlineRef = useRef(0);
  const autoRemainingRef = useRef(AUTO_ADVANCE_MS);
  const targetFeedbackTimerRef = useRef(null);
  const timeSpentSnapshotRef = useRef(0);
  const advanceLockRef = useRef(false);
  const resultLockRef = useRef(false);
  const allowNavigationRef = useRef(false);
  const exitSourceRef = useRef(null);
  const focusRestorePhaseRef = useRef(null);
  const timer = useTimer();
  const current = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const usesChoices = settings?.difficulty === DIFFICULTIES.EASY;
  const feedback = phase === PHASES.FEEDBACK_CORRECT
    || phase === PHASES.FEEDBACK_WRONG
    || phase === PHASES.FINISHED;
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clearLocateTimers = useCallback(() => {
    locateTimersRef.current.forEach(window.clearTimeout);
    locateTimersRef.current = [];
  }, []);

  const clearAutoTimer = useCallback(() => {
    if (autoTimerRef.current !== null) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, []);

  const clearTargetFeedbackTimer = useCallback(() => {
    if (targetFeedbackTimerRef.current !== null) {
      window.clearTimeout(targetFeedbackTimerRef.current);
      targetFeedbackTimerRef.current = null;
    }
  }, []);

  const blocker = useBlocker(() => validState && !allowNavigationRef.current);

  useEffect(() => {
    if (!validState) {
      if (reloadedDocument) markReloadNavigationHandled();
      allowNavigationRef.current = true;
      navigate('/multiplication', { replace: true });
    }
  }, [navigate, reloadedDocument, validState]);

  useEffect(() => {
    if (!validState || !current) return undefined;
    clearLocateTimers();
    clearAutoTimer();
    clearTargetFeedbackTimer();
    timer.stop();
    advanceLockRef.current = false;
    setPhase(PHASES.LOCATING);
    setLocateStage('idle');
    setRevealedHintKeys(new Set());
    setTargetFeedbackStage('idle');

    const hints = getHintKeys(current, settings.difficulty);
    const hintKeys = hints.map(({ key }) => key);
    const finishLocating = () => {
      setRevealedHintKeys(new Set(hintKeys));
      setLocateStage('revealed');
      setPhase(PHASES.READY);
      setAnnouncement(`第${currentIndex + 1}题，${current.a}乘${current.b}等于多少`);
      previousQuestionRef.current = current;
      timer.start();
    };

    if (reducedMotion) {
      finishLocating();
      return clearLocateTimers;
    }

    locateTimersRef.current.push(window.setTimeout(() => setLocateStage('sliding'), 20));
    locateTimersRef.current.push(window.setTimeout(() => {
      setLocateStage('firing');
      hints.forEach((hint) => {
        const timerId = window.setTimeout(() => {
          setRevealedHintKeys((previous) => new Set([...previous, hint.key]));
        }, revealDelayForHint(hint));
        locateTimersRef.current.push(timerId);
      });
    }, SLIDING_MS));
    locateTimersRef.current.push(window.setTimeout(finishLocating, SLIDING_MS + FIRING_MS));
    return clearLocateTimers;
  }, [
    clearAutoTimer,
    clearLocateTimers,
    clearTargetFeedbackTimer,
    current,
    currentIndex,
    locateRun,
    reducedMotion,
    settings,
    timer.start,
    timer.stop,
    validState,
  ]);

  useEffect(() => {
    if (phase === PHASES.READY) answerControlRef.current?.focus();
    if (feedback) feedbackActionRef.current?.focus();
  }, [feedback, phase]);

  const advanceOnceRef = useRef(() => {});
  const scheduleAutoAdvance = useCallback((delay = AUTO_ADVANCE_MS) => {
    clearAutoTimer();
    autoRemainingRef.current = delay;
    autoDeadlineRef.current = Date.now() + delay;
    autoTimerRef.current = window.setTimeout(() => advanceOnceRef.current(), delay);
  }, [clearAutoTimer]);

  useEffect(() => {
    if (feedback && !isLast) {
      scheduleAutoAdvance(AUTO_ADVANCE_MS);
    }
    return clearAutoTimer;
  }, [clearAutoTimer, feedback, isLast, scheduleAutoAdvance]);

  useEffect(() => {
    if (isLast && (phase === PHASES.FEEDBACK_CORRECT || phase === PHASES.FEEDBACK_WRONG)) {
      setPhase(PHASES.FINISHED);
    }
  }, [isLast, phase]);

  useEffect(() => {
    if (blocker.state !== 'blocked' || exitSourceRef.current) return;
    exitSourceRef.current = phase;
    if (phase === PHASES.READY) timer.stop();
    if (phase === PHASES.LOCATING) clearLocateTimers();
    if (feedback && !isLast) {
      autoRemainingRef.current = Math.max(0, autoDeadlineRef.current - Date.now());
      clearAutoTimer();
    }
  }, [blocker.state, clearAutoTimer, clearLocateTimers, feedback, isLast, phase, timer.stop]);

  useEffect(() => {
    if (!validState) return undefined;
    const handleBeforeUnload = (event) => {
      if (allowNavigationRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [validState]);

  useEffect(() => () => {
    clearLocateTimers();
    clearAutoTimer();
    clearTargetFeedbackTimer();
    timer.stop();
  }, [clearAutoTimer, clearLocateTimers, clearTargetFeedbackTimer, timer.stop]);

  if (!validState || !current) return null;

  const currentEntry = answeredCells[getCellKey(current.a, current.b)];
  const matrixPhase = phase === PHASES.FINISHED
    ? currentEntry?.correct ? PHASES.FEEDBACK_CORRECT : PHASES.FEEDBACK_WRONG
    : phase;
  const fullTableComplete = settings.questionCount === 81
    && isLast
    && feedback
    && Object.keys(answeredCells).length === 81;

  const submitAnswer = (value) => {
    if (phase !== PHASES.READY) return;
    timeSpentSnapshotRef.current = timer.stop();
    setInputError('');
    setSubmittedValue(value);
    setAnsweredCells((previous) => recordAnsweredCell(previous, current, value));
    const correct = value === current.answer;
    setPhase(correct ? PHASES.FEEDBACK_CORRECT : PHASES.FEEDBACK_WRONG);
    setLocateStage('feedback');
    if (!usesChoices) {
      clearTargetFeedbackTimer();
      if (reducedMotion) {
        setTargetFeedbackStage('result');
      } else {
        setTargetFeedbackStage('submitted');
        targetFeedbackTimerRef.current = window.setTimeout(() => {
          targetFeedbackTimerRef.current = null;
          setTargetFeedbackStage('result');
        }, TARGET_FEEDBACK_MS);
      }
    }
    setAnnouncement(correct
      ? `回答正确，${current.a}乘${current.b}等于${current.answer}${isLast ? '' : '，2秒后自动进入下一题'}`
      : `回答错误，你的答案是${value}，正确答案是${current.a}乘${current.b}等于${current.answer}${isLast ? '' : '，2秒后自动进入下一题'}`);
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

  const advanceOnce = () => {
    if (!feedback || advanceLockRef.current) return;
    if (isLast && phase !== PHASES.FINISHED) return;
    advanceLockRef.current = true;
    clearAutoTimer();
    clearLocateTimers();
    clearTargetFeedbackTimer();
    if (isLast) {
      if (resultLockRef.current) return;
      resultLockRef.current = true;
      const correct = Object.values(answeredCells).filter((entry) => entry.correct).length;
      const result = calculateMultiplicationResult({
        difficulty: settings.difficulty,
        total: settings.questionCount,
        correct,
        timeSpent: timeSpentSnapshotRef.current,
      });
      allowNavigationRef.current = true;
      navigate('/multiplication/result', {
        state: {
          settings,
          answeredCells,
          timeSpent: timeSpentSnapshotRef.current,
          result,
        },
      });
      return;
    }
    setPhase(PHASES.ADVANCING);
    setLocateStage('idle');
    setCurrentIndex((index) => index + 1);
    setSubmittedValue(null);
    setInputValue('');
    setInputError('');
    setTargetFeedbackStage('idle');
  };
  advanceOnceRef.current = advanceOnce;

  const handleStay = () => {
    const source = exitSourceRef.current;
    exitSourceRef.current = null;
    focusRestorePhaseRef.current = source;
    blocker.reset?.();
    if (source === PHASES.LOCATING) setLocateRun((run) => run + 1);
    if (source === PHASES.READY) {
      timer.start();
    }
    if ((source === PHASES.FEEDBACK_CORRECT || source === PHASES.FEEDBACK_WRONG) && !isLast) {
      scheduleAutoAdvance(autoRemainingRef.current);
    }
  };

  const restoreFocusAfterExitDialog = () => {
    const source = focusRestorePhaseRef.current;
    focusRestorePhaseRef.current = null;
    if (source === PHASES.READY) answerControlRef.current?.focus();
    if (source === PHASES.FEEDBACK_CORRECT
      || source === PHASES.FEEDBACK_WRONG
      || source === PHASES.FINISHED) {
      feedbackActionRef.current?.focus();
    }
  };

  const handleLeave = () => {
    allowNavigationRef.current = true;
    clearLocateTimers();
    clearAutoTimer();
    clearTargetFeedbackTimer();
    timer.stop();
    exitSourceRef.current = null;
    focusRestorePhaseRef.current = null;
    blocker.proceed?.();
  };

  const targetControl = !usesChoices && phase === PHASES.READY ? (
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
    <main
      className="multiplication-session-page"
      data-difficulty={settings.difficulty}
      data-session-phase={phase}
    >
      <section className="multiplication-matrix-panel">
        <MultiplicationMatrix
          question={current}
          difficulty={settings.difficulty}
          phase={matrixPhase}
          answeredCells={answeredCells}
          targetControl={targetControl}
          locateStage={locateStage}
          revealedHintKeys={revealedHintKeys}
          previousQuestion={previousQuestionRef.current}
          fullTableComplete={fullTableComplete}
          targetFeedback={!usesChoices && feedback ? {
            stage: targetFeedbackStage,
            submittedValue,
          } : null}
        />
      </section>

      <Card className="multiplication-answer-panel">
        <div className="multiplication-session-meta">
          第 {currentIndex + 1}/{questions.length} 题 · {phase === PHASES.LOCATING ? '定位中' : `作答 ${timer.formatted}`}
        </div>
        <Typography.Title level={2} className="multiplication-formula">
          {current.a} × {current.b} = ?
        </Typography.Title>

        {usesChoices && phase !== PHASES.LOCATING && phase !== PHASES.ADVANCING ? (
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
                  <span>{choice}</span>
                  {feedback && isCorrect ? ' ✓' : ''}
                  {feedback && isSelected && !isCorrect ? ' ✕' : ''}
                </Button>
              );
            })}
          </div>
        ) : (
          phase === PHASES.READY && (
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

        <div className="multiplication-feedback">
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
              {!isLast && <div className="multiplication-auto-note">2 秒后自动进入下一题</div>}
              <Button
                ref={feedbackActionRef}
                type="primary"
                icon={isLast ? <CheckOutlined /> : <ArrowRightOutlined />}
                onClick={advanceOnce}
              >
                {isLast ? '查看结果' : '下一题'}
              </Button>
            </>
          )}
        </div>
      </Card>

      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <Modal
        open={blocker.state === 'blocked'}
        title="确定离开本局吗？"
        closable={false}
        mask={{ closable: false }}
        keyboard={false}
        afterClose={restoreFocusAfterExitDialog}
        footer={[
          <Button danger key="leave" onClick={handleLeave}>确认离开</Button>,
          <Button type="primary" key="stay" autoFocus onClick={handleStay}>继续闯关</Button>,
        ]}
      >
        <p>离开后本局不保存。</p>
      </Modal>
    </main>
  );
}
