import { renderHook, act } from '@testing-library/react';
import useGuidedSolve from './useGuidedSolve';

const mockSteps = [
  { description: '第一步', hint: '提示1', answer: 10 },
  { description: '第二步', hint: '提示2', answer: 5 },
  { description: '第三步', hint: '提示3', answer: 3 },
];

describe('useGuidedSolve', () => {
  it('starts in IDLE phase', () => {
    const { result } = renderHook(() => useGuidedSolve(mockSteps));
    expect(result.current.phase).toBe(result.current.PHASES.IDLE);
  });

  it('transitions to ANIMATION on start', () => {
    const { result } = renderHook(() => useGuidedSolve(mockSteps));
    act(() => result.current.start());
    expect(result.current.phase).toBe(result.current.PHASES.ANIMATION);
  });

  it('transitions to STEP_INPUT after animation finishes', () => {
    const { result } = renderHook(() => useGuidedSolve(mockSteps));
    act(() => result.current.start());
    act(() => result.current.finishAnimation());
    expect(result.current.phase).toBe(result.current.PHASES.STEP_INPUT);
    expect(result.current.stepIndex).toBe(0);
  });

  it('returns current step info', () => {
    const { result } = renderHook(() => useGuidedSolve(mockSteps));
    act(() => result.current.start());
    act(() => result.current.finishAnimation());
    expect(result.current.currentStep).toEqual(mockSteps[0]);
    expect(result.current.totalSteps).toBe(3);
    expect(result.current.stepIndex).toBe(0);
  });

  it('advances to next step on correct step answer', () => {
    const { result } = renderHook(() => useGuidedSolve(mockSteps));
    act(() => result.current.start());
    act(() => result.current.finishAnimation());
    act(() => result.current.submitStepAnswer('10'));
    expect(result.current.stepIndex).toBe(1);
    expect(result.current.currentStep).toEqual(mockSteps[1]);
  });

  it('does not advance on wrong step answer', () => {
    const { result } = renderHook(() => useGuidedSolve(mockSteps));
    act(() => result.current.start());
    act(() => result.current.finishAnimation());
    act(() => result.current.submitStepAnswer('999'));
    expect(result.current.stepIndex).toBe(0);
    expect(result.current.stepAnswers[0]?.correct).toBe(false);
  });

  it('transitions to CORRECT after last step answered correctly', () => {
    const { result } = renderHook(() => useGuidedSolve(mockSteps));
    act(() => result.current.start());
    act(() => result.current.finishAnimation());
    act(() => result.current.submitStepAnswer('10'));
    act(() => result.current.submitStepAnswer('5'));
    act(() => result.current.submitStepAnswer('3'));
    expect(result.current.phase).toBe(result.current.PHASES.CORRECT);
  });

  it('stays on last step when answer is wrong', () => {
    const { result } = renderHook(() => useGuidedSolve(mockSteps));
    act(() => result.current.start());
    act(() => result.current.finishAnimation());
    act(() => result.current.submitStepAnswer('10'));
    act(() => result.current.submitStepAnswer('5'));
    act(() => result.current.submitStepAnswer('999'));
    expect(result.current.phase).toBe(result.current.PHASES.STEP_INPUT);
    expect(result.current.stepIndex).toBe(2);
    expect(result.current.stepAnswers[2]?.correct).toBe(false);
  });

  it('allows retrying last step after wrong answer', () => {
    const { result } = renderHook(() => useGuidedSolve(mockSteps));
    act(() => result.current.start());
    act(() => result.current.finishAnimation());
    act(() => result.current.submitStepAnswer('10'));
    act(() => result.current.submitStepAnswer('5'));
    act(() => result.current.submitStepAnswer('999'));
    expect(result.current.phase).toBe(result.current.PHASES.STEP_INPUT);
    act(() => result.current.submitStepAnswer('3'));
    expect(result.current.phase).toBe(result.current.PHASES.CORRECT);
  });

  it('reset goes back to IDLE', () => {
    const { result } = renderHook(() => useGuidedSolve(mockSteps));
    act(() => result.current.start());
    act(() => result.current.finishAnimation());
    act(() => result.current.reset());
    expect(result.current.phase).toBe(result.current.PHASES.IDLE);
    expect(result.current.stepIndex).toBe(0);
  });

  it('handles empty steps gracefully', () => {
    const { result } = renderHook(() => useGuidedSolve([]));
    expect(result.current.totalSteps).toBe(0);
    act(() => result.current.start());
    act(() => result.current.finishAnimation());
    expect(result.current.phase).toBe(result.current.PHASES.CORRECT);
  });
});
