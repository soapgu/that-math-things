import React from 'react';
import { render } from '@testing-library/react';
import { createAssistance } from '../../../utils/assistGenerator';
import CarryAnimation from './CarryAnimation';

vi.mock('framer-motion', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, useReducedMotion: () => true };
});

it('系统要求减少动态效果时直接展示当前步骤的稳定帧', () => {
  const assistance = createAssistance({ a: 19, b: 24, op: '+', answer: 43 });
  const { getByRole, getByText } = render(
    <CarryAnimation assistance={assistance} onComplete={vi.fn()} />,
  );

  expect(getByRole('figure')).toHaveAttribute('data-reduced-motion', 'true');
  expect(getByText(assistance.steps[0].text)).toBeTruthy();
});
