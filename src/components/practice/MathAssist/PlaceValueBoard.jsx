import React from 'react';
import TenBundle from './TenBundle';
import OneUnit from './OneUnit';

const safeCount = (value) => Math.max(0, Math.floor(Number(value) || 0));

function Column({ title, count, crossedCount, highlighted, type, reducedMotion }) {
  const normalizedCount = safeCount(count);
  const normalizedCrossed = Math.min(normalizedCount, safeCount(crossedCount));
  const Component = type === 'tens' ? TenBundle : OneUnit;
  const unitLabel = type === 'tens' ? '十' : '一';

  return (
    <section
      aria-label={`${title}：${normalizedCount} 个${unitLabel}，划去 ${normalizedCrossed} 个`}
      data-highlighted={highlighted ? 'true' : 'false'}
      style={{
        flex: 1,
        minWidth: 0,
        borderLeft: type === 'ones' ? '1px solid #13c2c2' : 'none',
        background: highlighted ? '#e6fffb' : '#fff',
        transition: reducedMotion ? 'none' : 'background-color 180ms ease',
      }}
    >
      <div
        style={{
          padding: '8px 4px',
          textAlign: 'center',
          fontWeight: 600,
          color: highlighted ? '#006d75' : '#595959',
          background: '#e6fffb',
          borderBottom: '1px solid #13c2c2',
          userSelect: 'none',
        }}
      >
        {title}
      </div>
      <div
        style={{
          minHeight: 92,
          padding: 12,
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'center',
          justifyContent: 'center',
          gap: type === 'tens' ? 8 : 12,
        }}
      >
        {normalizedCount === 0 ? (
          <span style={{ color: '#bfbfbf', fontSize: 12 }}>0 个{unitLabel}</span>
        ) : Array.from({ length: normalizedCount }, (_, index) => {
          const crossedOut = index >= normalizedCount - normalizedCrossed;
          return (
            <span key={index} data-testid={type === 'tens' ? 'ten-bundle' : 'one-unit'}>
              <Component crossedOut={crossedOut} highlighted={highlighted && !crossedOut} decorative />
            </span>
          );
        })}
      </div>
    </section>
  );
}

/**
 * 十位/个位静态演示面板。
 * Phase 4 通过更新 counts、crossed counts、highlight 和 exchange 来组成动画帧。
 */
export default function PlaceValueBoard({
  tensCount = 0,
  onesCount = 0,
  crossedTens = 0,
  crossedOnes = 0,
  highlight = null,
  exchange = null,
  caption,
  reducedMotion = false,
}) {
  const normalizedTens = safeCount(tensCount);
  const normalizedOnes = safeCount(onesCount);
  const exchangeText = exchange === 'carry'
    ? '进位：10 个一换成 1 个十 ↑'
    : exchange === 'borrow'
      ? '退位：1 个十换成 10 个一 ↓'
      : null;

  return (
    <figure
      aria-label={`数位表：${normalizedTens} 个十，${normalizedOnes} 个一`}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-exchange={exchange || 'none'}
      style={{ margin: 0, width: '100%', maxWidth: 520 }}
    >
      {caption && (
        <figcaption style={{ marginBottom: 8, textAlign: 'center', fontWeight: 600 }}>
          {caption}
        </figcaption>
      )}
      <div
        style={{
          display: 'flex',
          overflow: 'hidden',
          border: '1px solid #13c2c2',
          borderRadius: 8,
          background: '#fff',
        }}
      >
        <Column
          title="十位"
          type="tens"
          count={normalizedTens}
          crossedCount={crossedTens}
          highlighted={highlight === 'tens'}
          reducedMotion={reducedMotion}
        />
        <Column
          title="个位"
          type="ones"
          count={normalizedOnes}
          crossedCount={crossedOnes}
          highlighted={highlight === 'ones'}
          reducedMotion={reducedMotion}
        />
      </div>
      {exchangeText && (
        <div
          role="status"
          style={{
            marginTop: 8,
            padding: '5px 10px',
            borderRadius: 6,
            textAlign: 'center',
            color: exchange === 'carry' ? '#ad6800' : '#0958d9',
            background: exchange === 'carry' ? '#fff7e6' : '#e6f4ff',
            fontWeight: 600,
          }}
        >
          {exchangeText}
        </div>
      )}
    </figure>
  );
}

export { OneUnit, TenBundle };
