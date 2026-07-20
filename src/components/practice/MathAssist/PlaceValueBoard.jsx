import React from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import TenBundle from './TenBundle';
import OneUnit from './OneUnit';

const safeCount = (value) => Math.max(0, Math.floor(Number(value) || 0));

function Units({ group, type, highlighted }) {
  const Component = type === 'tens' ? TenBundle : OneUnit;
  const count = group.unitIds?.length ?? safeCount(group.count);
  const crossedCount = Math.min(count, safeCount(group.crossedCount));
  const ids = group.unitIds || Array.from({ length: count }, (_, index) => `${group.id}-${index}`);

  return (
    <motion.span
      layout
      layoutId={group.layoutId}
      data-group={group.id}
      data-source={group.source || 'original'}
      style={{
        display: group.columns ? 'inline-grid' : 'inline-flex',
        gridTemplateColumns: group.columns ? `repeat(${group.columns}, 8px)` : undefined,
        flexWrap: group.columns ? undefined : 'wrap',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: type === 'tens' ? 7 : group.columns ? 6 : 10,
        padding: group.source === 'carry' || group.source === 'borrowed' ? '5px 7px' : 0,
        border: group.source === 'carry' || group.source === 'borrowed'
          ? '1px dashed #fa8c16'
          : '1px solid transparent',
        borderRadius: 7,
        background: group.source === 'carry' || group.source === 'borrowed' ? '#fff7e6' : 'transparent',
      }}
      transition={{ duration: 0.5 }}
    >
      {ids.map((id, index) => {
        const crossedOut = index >= count - crossedCount;
        return (
          <motion.span
            layout
            layoutId={id}
            key={id}
            data-testid={type === 'tens' ? 'ten-bundle' : 'one-unit'}
            transition={{ duration: 0.55 }}
          >
            <Component
              crossedOut={crossedOut}
              highlighted={(highlighted || group.highlighted) && !crossedOut}
              decorative
            />
          </motion.span>
        );
      })}
    </motion.span>
  );
}

function GroupedCell({ groups = [], type, highlighted, status }) {
  const unitLabel = type === 'tens' ? '十' : '一';
  const count = groups.reduce(
    (total, group) => total + (group.unitIds?.length ?? safeCount(group.count)),
    0,
  );

  return (
    <div
      data-testid={`${type}-groups`}
      style={{
        minWidth: 0,
        minHeight: 62,
        padding: '8px 10px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
        background: highlighted ? '#e6fffb' : '#fff',
      }}
    >
      {count === 0 ? (
        <span style={{ color: '#bfbfbf', fontSize: 12 }}>{status || `0 个${unitLabel}`}</span>
      ) : groups.map((group) => (
        <Units key={group.id} group={group} type={type} highlighted={highlighted} />
      ))}
    </div>
  );
}

function GroupedBoard({ rows, highlight }) {
  return (
    <LayoutGroup id="place-value-board">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '54px minmax(0, 1fr) minmax(0, 1fr)',
          overflow: 'hidden',
          border: '1px solid #13c2c2',
          borderRadius: 8,
          background: '#fff',
        }}
      >
        <div style={{ background: '#e6fffb', borderBottom: '1px solid #13c2c2' }} />
        {['十位', '个位'].map((title, index) => (
          <div
            key={title}
            style={{
              padding: '8px 4px',
              textAlign: 'center',
              fontWeight: 600,
              color: highlight === (index === 0 ? 'tens' : 'ones') ? '#006d75' : '#595959',
              background: '#e6fffb',
              borderLeft: '1px solid #13c2c2',
              borderBottom: '1px solid #13c2c2',
            }}
          >
            {title}
          </div>
        ))}
        {rows.map((row, rowIndex) => (
          <React.Fragment key={row.id}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 3px',
                color: '#8c8c8c',
                fontSize: 12,
                fontWeight: 600,
                borderTop: rowIndex > 0 ? '1px dashed #d9d9d9' : 'none',
              }}
            >
              {row.label}
            </div>
            <div style={{ borderLeft: '1px solid #13c2c2', borderTop: rowIndex > 0 ? '1px dashed #d9d9d9' : 'none' }}>
              <GroupedCell groups={row.tens} type="tens" highlighted={highlight === 'tens'} status={row.tensStatus} />
            </div>
            <div style={{ borderLeft: '1px solid #13c2c2', borderTop: rowIndex > 0 ? '1px dashed #d9d9d9' : 'none' }}>
              <GroupedCell groups={row.ones} type="ones" highlighted={highlight === 'ones'} status={row.onesStatus} />
            </div>
          </React.Fragment>
        ))}
      </div>
    </LayoutGroup>
  );
}

function LegacyColumn({ title, count, crossedCount, highlighted, type, reducedMotion }) {
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
      <div style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 600, color: highlighted ? '#006d75' : '#595959', background: '#e6fffb', borderBottom: '1px solid #13c2c2' }}>
        {title}
      </div>
      <div
        data-testid={`${type}-units`}
        style={{ minHeight: 92, padding: 12, display: 'flex', flexWrap: 'wrap', alignContent: 'center', justifyContent: type === 'ones' ? 'flex-end' : 'center', gap: type === 'tens' ? 8 : 12 }}
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
 * 十位/个位演示面板。rows 存在时保留上下操作数及来源分组；否则兼容静态总数模式。
 */
export default function PlaceValueBoard({
  tensCount = 0,
  onesCount = 0,
  crossedTens = 0,
  crossedOnes = 0,
  rows,
  highlight = null,
  exchange = null,
  caption,
  reducedMotion = false,
}) {
  const groupedTens = rows?.reduce((total, row) => total + (row.tens || []).reduce((sum, group) => sum + (group.unitIds?.length ?? safeCount(group.count)), 0), 0);
  const groupedOnes = rows?.reduce((total, row) => total + (row.ones || []).reduce((sum, group) => sum + (group.unitIds?.length ?? safeCount(group.count)), 0), 0);
  const normalizedTens = rows ? groupedTens : safeCount(tensCount);
  const normalizedOnes = rows ? groupedOnes : safeCount(onesCount);
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
      {caption && <figcaption style={{ marginBottom: 8, textAlign: 'center', fontWeight: 600 }}>{caption}</figcaption>}
      {rows ? (
        <GroupedBoard rows={rows} highlight={highlight} />
      ) : (
        <div style={{ display: 'flex', overflow: 'hidden', border: '1px solid #13c2c2', borderRadius: 8, background: '#fff' }}>
          <LegacyColumn title="十位" type="tens" count={normalizedTens} crossedCount={crossedTens} highlighted={highlight === 'tens'} reducedMotion={reducedMotion} />
          <LegacyColumn title="个位" type="ones" count={normalizedOnes} crossedCount={crossedOnes} highlighted={highlight === 'ones'} reducedMotion={reducedMotion} />
        </div>
      )}
      {exchangeText && (
        <div role="status" style={{ marginTop: 8, padding: '5px 10px', borderRadius: 6, textAlign: 'center', color: exchange === 'carry' ? '#ad6800' : '#0958d9', background: exchange === 'carry' ? '#fff7e6' : '#e6f4ff', fontWeight: 600 }}>
          {exchangeText}
        </div>
      )}
    </figure>
  );
}

export { OneUnit, TenBundle };
