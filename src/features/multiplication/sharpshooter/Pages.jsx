import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Typography } from 'antd';
import { AimOutlined, AudioMutedOutlined, SoundFilled } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import useTimer, { formatTimerDuration } from '../../../hooks/useTimer';
import { isReloadNavigation, markReloadNavigationHandled } from '../routeState';
import { createMultiplicationSoundPlayer, loadMultiplicationSoundEnabled, saveMultiplicationSoundEnabled } from '../sound';
import { CELLS, createGame, createSharpshooterRouteState, isValidSharpshooterRoute, isValidSharpshooterResult,
  targetCells, roundShots, isRoundOver, roundRating, shoot, nextRound, calculateSharpshooterResult } from './model';
import './sharpshooter.css';

function useRouteGuard(validate) {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [reloaded] = useState(isReloadNavigation);
  const valid = !reloaded && validate(state);
  useEffect(() => {
    if (!valid) {
      if (reloaded) markReloadNavigationHandled();
      navigate('/multiplication', { replace: true });
    }
  }, [valid, navigate, reloaded]);
  return valid ? state : null;
}

export function SharpshooterSession() {
  const route = useRouteGuard(isValidSharpshooterRoute);
  return route ? <ShootingGame key={route.rounds.join(',')} route={route} /> : null;
}

function ShootingGame({ route }) {
  const navigate = useNavigate();
  const [game, setGame] = useState(() => createGame(route.rounds));
  // 同步引用锁定快速连点；副作用只在成功接收的射击事件中执行，不放进React更新函数。
  const gameRef = useRef(game);
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);
  const [soundEnabled, setSoundEnabled] = useState(loadMultiplicationSoundEnabled);
  const playerRef = useRef(null);
  const [flash, setFlash] = useState(null);
  const flashTimer = useRef(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const buttons = useRef([]);
  const nextButton = useRef(null);
  const timer = useTimer();
  const over = isRoundOver(game);
  const product = game.rounds[game.roundIndex];
  const targets = targetCells(product);
  const shots = roundShots(game);
  const remaining = targets.length - shots.length;
  const rating = roundRating(game);

  useEffect(() => {
    playerRef.current = createMultiplicationSoundPlayer();
    return () => { playerRef.current?.dispose(); clearTimeout(flashTimer.current); };
  }, []);
  useEffect(() => {
    if (over) nextButton.current?.focus();
  }, [over]);


  const fire = (key) => {
    if (!startedRef.current) return;
    const previous = gameRef.current;
    const next = shoot(previous, key);
    if (next === previous) return;
    gameRef.current = next;
    setGame(next);
    setFlash(next.event);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 650);
    if (soundEnabled) {
      if (next.event.hit) playerRef.current?.playShot(next.event.combo, next.event.perfect);
      else playerRef.current?.playMiss();
    }
    if (isRoundOver(next)) timer.stop();
  };
  const advance = () => {
    if (gameRef.current.roundIndex === 35) {
      startedRef.current = false;
      const timeSpent = timer.stop();
      navigate('/multiplication/result', { state: { ...route, shots: gameRef.current.shots, timeSpent,
        result: calculateSharpshooterResult(gameRef.current, timeSpent) } });
      return;
    }
    const next = nextRound(gameRef.current);
    if (next === gameRef.current) return;
    gameRef.current = next;
    setGame(next);
    setFlash(null);
    playerRef.current?.stop();
    timer.start();
    const index = CELLS.findIndex((cell) => !next.hits.includes(cell.key));
    setFocusIndex(index);
    buttons.current[index]?.focus();
  };
  const moveFocus = (event, index) => {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[event.key];
    if (!delta) return;
    event.preventDefault();
    const next = Math.max(0, Math.min(80, index + delta));
    setFocusIndex(next);
    buttons.current[next]?.focus();
  };

  return <main className="sharpshooter-page" aria-label="九九神枪手">
    <div className="sharpshooter-layout">
      <section className="sharpshooter-board-panel" aria-label="射击区">
        <div className="sharpshooter-board" role="group" aria-label="九九乘法射击表">
          <span className="sharpshooter-axis" aria-hidden="true">×</span>
          {Array.from({ length: 9 }, (_, i) => <span className="sharpshooter-axis" key={`col${i}`}>{i + 1}</span>)}
          {Array.from({ length: 9 }, (_, row) => <React.Fragment key={row}>
            <span className="sharpshooter-axis">{row + 1}</span>
            {CELLS.slice(row * 9, row * 9 + 9).map((cell, column) => {
              const index = row * 9 + column;
              const shot = shots.find((entry) => entry.key === cell.key);
              const hit = game.hits.includes(cell.key);
              const missed = over && cell.product === product && !hit;
              const blocked = !started || over || hit || Boolean(shot);
              const kind = hit ? 'hit' : shot ? 'wrong' : missed ? 'missed' : 'hidden';
              const label = hit ? `已命中，乘积${cell.product}` : shot ? '打空' : missed ? `漏射，乘积${cell.product}` : '未射击';
              return <button type="button" key={cell.key} ref={(el) => { buttons.current[index] = el; }}
                data-cell={cell.key} data-kind={kind} className={`sharpshooter-cell ${kind} ${flash?.key === cell.key ? 'shot-flash' : ''}`}
                aria-label={`${cell.a}乘${cell.b}，${label}`} aria-disabled={blocked}
                tabIndex={focusIndex === index ? 0 : -1} onFocus={() => setFocusIndex(index)}
                onKeyDown={(event) => { moveFocus(event, index); if (event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault(); }}
                onClick={() => { if (!blocked) fire(cell.key); }}>
                {hit || missed ? cell.product : shot ? '×' : <span aria-hidden="true">·</span>}
              </button>;
            })}
          </React.Fragment>)}
        </div>
        <p className="sharpshooter-legend">绿色：命中　橙色虚线：漏射　叉号：打空</p>
      </section>
      <aside className="sharpshooter-controls">
        <Card className="sharpshooter-target-card">
          <div className="sharpshooter-progress">
            <span>第 {game.roundIndex + 1} / 36 轮 · 累计命中 {game.hits.length} / 81</span>
            <Button
              type="text"
              size="small"
              icon={soundEnabled ? <SoundFilled /> : <AudioMutedOutlined />}
              aria-label={soundEnabled ? '关闭音效' : '开启音效'}
              aria-pressed={soundEnabled}
              onClick={() => {
                const enabled = !soundEnabled;
                setSoundEnabled(enabled);
                saveMultiplicationSoundEnabled(enabled);
                if (!enabled) playerRef.current?.stop();
              }}
            />
          </div>
          <div className="sharpshooter-eyebrow">寻找乘积</div><div className="sharpshooter-target">{product}</div>
          <p>找出全部 <strong>{targets.length}</strong> 格</p>
          <div className="sharpshooter-ammo" aria-label={`剩余子弹${remaining}发`}>{Array.from({ length: targets.length }, (_, i) => <span key={i} className={i < remaining ? 'loaded' : ''}>●</span>)}</div>
          <div>剩余 {remaining} 发 · 作答用时 {timer.formatted}</div>
        </Card>
        <div className={`sharpshooter-combo ${flash?.milestone ? 'milestone' : ''}`} aria-hidden="true">
          <div key={flash?.id ?? `round-${game.roundIndex}`} className={flash ? 'combo-pop' : ''}>
            {flash?.broken ? '连击中断' : game.combo >= 2 ? `${game.combo} 连击` : (
              <span className="sharpshooter-aim"><AimOutlined aria-hidden="true" />瞄准，再出手</span>
            )}
            {flash?.milestone && <small>连续命中，势不可挡！</small>}
          </div>
        </div>
        <div role="status" className="sharpshooter-status">{game.event ? `${game.event.hit ? '命中' : '打空'}，剩余${remaining}发` : '选择行列对应的格子射击'}</div>
        {!started ? <Card title="准备好了吗？"><p>根据乘积找齐所有位置，每格一发子弹。命中会开图，打空会中断连击。想清楚再出手，不限时。</p>
          <Button type="primary" size="large" onClick={() => { startedRef.current = true; setStarted(true); timer.start(); buttons.current[0]?.focus(); }}>开始射击</Button></Card>
          : over ? <Card className="sharpshooter-round-result" title={rating.title}>
            <p>{rating.message}</p><p>命中 {shots.filter((shot) => shot.hit).length} / {targets.length}</p>
            <ul>{targets.map((cell) => <li key={cell.key}>{cell.a} × {cell.b} = {product}</li>)}</ul>
            <Button ref={nextButton} type="primary" size="large" onClick={advance}>{game.roundIndex === 35 ? '查看结果' : '下一轮'}</Button>
          </Card> : <p className="sharpshooter-tip">连续命中可跨轮累计，慢慢思考也不会断连。</p>}
        <Button className="sharpshooter-back" onClick={() => { if (!started || window.confirm('离开后本局进度不会保留，确定返回？')) { startedRef.current = false; navigate('/multiplication'); } }}>返回难度选择</Button>
      </aside>
    </div>
  </main>;
}

export function SharpshooterResult() {
  const state = useRouteGuard(isValidSharpshooterResult);
  const navigate = useNavigate();
  if (!state) return null;
  const { result } = state;
  return <main className="sharpshooter-result sharpshooter-page"><Typography.Title level={2}>九九神枪手 · 闯关结果</Typography.Title>
    <Card><div className="sharpshooter-stars" aria-label={`${result.stars}星`}>{'★'.repeat(result.stars)}{'☆'.repeat(3 - result.stars)}</div>
      <div className="sharpshooter-target">{result.score}<small> 分</small></div>
      <dl className="sharpshooter-stats">
        <div><dt>命中格数</dt><dd>{result.hitCount} / 81</dd></div>
        <div><dt>命中率</dt><dd>{(result.hitCount / 81 * 100).toFixed(1)}%</dd></div>
        <div><dt>全中轮数</dt><dd>{result.perfectRounds} / 36</dd></div>
        <div><dt>最高连击</dt><dd>{result.maxCombo}</dd></div>
        <div><dt>作答用时</dt><dd>{formatTimerDuration(result.timeSpent)}</dd></div>
      </dl><p>想清楚再出手，每一次命中都值得喝彩！</p>
    </Card><div className="sharpshooter-result-actions"><Button type="primary" size="large" onClick={() => navigate('/multiplication/session', { state: createSharpshooterRouteState() })}>再来一局</Button>
      <Button size="large" onClick={() => navigate('/multiplication')}>返回难度选择</Button></div>
  </main>;
}
