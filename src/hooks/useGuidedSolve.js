import { useState, useCallback, useMemo } from 'react';

const PHASES = {
  IDLE: 'idle',
  ANIMATION: 'animation',
  STEP_INPUT: 'step_input',
  FINAL_ANSWER: 'final_answer',
  CORRECT: 'correct',
  WRONG: 'wrong',
  HINT: 'hint',
};

export default function useGuidedSolve(steps) {
  const [phase, setPhase] = useState(PHASES.IDLE);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepAnswers, setStepAnswers] = useState({});
  const [, setFinalAttempt] = useState('');
  const [wrongAttempts, setWrongAttempts] = useState(0);

  const totalSteps = steps ? steps.length : 0;
  const isLastStep = stepIndex >= totalSteps - 1;

  const currentStep = useMemo(() => {
    if (!steps || stepIndex >= steps.length) return null;
    return steps[stepIndex];
  }, [steps, stepIndex]);

  const start = useCallback(() => {
    setPhase(PHASES.ANIMATION);
    setStepIndex(0);
    setStepAnswers({});
    setFinalAttempt('');
    setWrongAttempts(0);
  }, []);

  const finishAnimation = useCallback(() => {
    if (steps && steps.length > 0) {
      setPhase(PHASES.STEP_INPUT);
    } else {
      setPhase(PHASES.FINAL_ANSWER);
    }
  }, [steps]);

  const submitStepAnswer = useCallback((answer) => {
    const numAnswer = Number(answer);
    const isCorrect = numAnswer === currentStep.answer;

    setStepAnswers((prev) => ({
      ...prev,
      [stepIndex]: { value: numAnswer, correct: isCorrect },
    }));

    if (isCorrect) {
      if (isLastStep) {
        setPhase(PHASES.FINAL_ANSWER);
      } else {
        setStepIndex((i) => i + 1);
      }
    }
    return isCorrect;
  }, [currentStep, stepIndex, isLastStep]);

  const submitFinalAnswer = useCallback((answer) => {
    const numAnswer = Number(answer);
    const isCorrect = numAnswer === steps[totalSteps - 1]?.answer;

    if (isCorrect) {
      setPhase(PHASES.CORRECT);
    } else {
      setWrongAttempts((n) => n + 1);
      setPhase(PHASES.WRONG);
    }
    return isCorrect;
  }, [steps, totalSteps]);

  const showHint = useCallback(() => {
    setPhase(PHASES.HINT);
  }, []);

  const retryFinal = useCallback(() => {
    setPhase(PHASES.FINAL_ANSWER);
    setFinalAttempt('');
  }, []);

  const reset = useCallback(() => {
    setPhase(PHASES.IDLE);
    setStepIndex(0);
    setStepAnswers({});
    setFinalAttempt('');
    setWrongAttempts(0);
  }, []);

  return {
    phase,
    PHASES,
    stepIndex,
    totalSteps,
    currentStep,
    stepAnswers,
    wrongAttempts,
    start,
    finishAnimation,
    submitStepAnswer,
    submitFinalAnswer,
    showHint,
    retryFinal,
    reset,
  };
}
