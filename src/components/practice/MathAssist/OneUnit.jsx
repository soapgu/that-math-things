import React from 'react';

/** 一个“一”的视觉单元。可独立使用，也可作为 PlaceValueBoard 的装饰子元素。 */
export default function OneUnit({
  crossedOut = false,
  highlighted = false,
  decorative = false,
  color = '#ff4d4f',
  ariaLabel = '1 个一',
}) {
  return (
    <span
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : ariaLabel}
      data-state={crossedOut ? 'crossed' : highlighted ? 'highlighted' : 'active'}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: 8,
        height: 30,
        borderRadius: 4,
        background: color,
        opacity: crossedOut ? 0.38 : 1,
        boxShadow: highlighted ? `0 0 0 4px ${color}26` : 'none',
      }}
    >
      {crossedOut && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: -5,
            top: 14,
            width: 18,
            height: 2,
            background: '#595959',
            transform: 'rotate(-48deg)',
            transformOrigin: 'center',
          }}
        />
      )}
    </span>
  );
}
