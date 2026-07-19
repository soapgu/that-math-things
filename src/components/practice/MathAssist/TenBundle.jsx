import React from 'react';

/** 一个“十”的视觉单元：十根小棒捆成一组。 */
export default function TenBundle({
  crossedOut = false,
  highlighted = false,
  decorative = false,
  color = '#1677ff',
  ariaLabel = '1 个十',
}) {
  return (
    <span
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : ariaLabel}
      data-state={crossedOut ? 'crossed' : highlighted ? 'highlighted' : 'active'}
      style={{
        position: 'relative',
        display: 'inline-grid',
        gridTemplateColumns: 'repeat(5, 3px)',
        gap: 1,
        padding: '4px 5px',
        border: `2px solid ${color}`,
        borderRadius: 5,
        background: `${color}12`,
        opacity: crossedOut ? 0.38 : 1,
        boxShadow: highlighted ? `0 0 0 4px ${color}26` : 'none',
      }}
    >
      {Array.from({ length: 10 }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          style={{ width: 3, height: 18, borderRadius: 2, background: color }}
        />
      ))}
      {crossedOut && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: -3,
            top: '50%',
            width: 'calc(100% + 6px)',
            height: 2,
            background: '#595959',
            transform: 'rotate(-35deg)',
          }}
        />
      )}
    </span>
  );
}
