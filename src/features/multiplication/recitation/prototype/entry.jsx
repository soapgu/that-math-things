import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import PhraseTable from '../PhraseTable';
import RecitationMultiplicationTable from '../RecitationMultiplicationTable';
import {
  ORDERING_MODES,
  RECITATION_PHRASES,
  completeCurrentPhrase,
  createEmptyRecitationSession,
  createPhraseId,
  getPhraseById,
  resetRecitationSession,
  selectRecitationCoordinate,
  switchRecitationMode,
} from '../model';
import { createRecitationSpeechController } from '../speech';
import { RECITATION_STORAGE_KEY, loadRecitationSession, saveRecitationSession } from '../storage';
import './prototype.css';

function scenarioSession(name) {
  let session = createEmptyRecitationSession();
  const count = { empty: 0, mixed: 12, near: 44, complete: 45 }[name] ?? 0;
  for (let index = 0; index < count; index += 1) session = completeCurrentPhrase(session);
  return session;
}

export function TechnicalPrototype() {
  const loaded = useMemo(() => loadRecitationSession(), []);
  const [session, setSession] = useState(loaded.session);
  const [sessionRevision, setSessionRevision] = useState(0);
  const [viewport, setViewport] = useState(1440);
  const [speechState, setSpeechState] = useState('idle');
  const [storageWarning, setStorageWarning] = useState(loaded.status === 'recovered' ? '会话数据已损坏，已安全恢复为空进度。' : null);
  const speech = useRef(null);

  useEffect(() => {
    speech.current = createRecitationSpeechController(window);
    return () => speech.current?.dispose();
  }, []);

  useEffect(() => {
    if (sessionRevision === 0) return;
    const result = saveRecitationSession(session);
    setStorageWarning(result.ok ? null : '进度暂时无法保存，本次仍可继续背诵。');
  }, [session, sessionRevision]);

  const updateSession = (updater) => {
    setSession(updater);
    setSessionRevision((revision) => revision + 1);
  };

  const phrase = session.currentPhraseId ? getPhraseById(session.currentPhraseId) : null;
  const displayedCoordinate = session.selectedCoordinate ?? (phrase ? { a: phrase.a, b: phrase.b } : null);
  const complete = session.completedPhraseIds.length === 45;

  const speak = () => {
    if (!phrase) return;
    setSpeechState('speaking');
    speech.current.speak(phrase.text, {
      onEnd: () => setSpeechState('ready'),
      onError: () => setSpeechState('ready'),
      onUnavailable: () => setSpeechState('unavailable'),
    });
  };

  useEffect(() => {
    if (!phrase) {
      speech.current?.cancel();
      setSpeechState('idle');
      return undefined;
    }
    setSpeechState('speaking');
    speech.current?.speak(phrase.text, {
      onEnd: () => setSpeechState('ready'),
      onError: () => setSpeechState('ready'),
      onUnavailable: () => setSpeechState('unavailable'),
    });
    return () => speech.current?.cancel();
  }, [session.currentPhraseId, session.orderingMode, session.selectedCoordinate?.a, session.selectedCoordinate?.b]);

  const changeMode = (mode) => {
    if (session.orderingMode === mode) return;
    speech.current?.cancel();
    setSpeechState('idle');
    updateSession((current) => switchRecitationMode(current, mode));
  };

  const select = (coordinate) => {
    if (session.currentPhraseId === createPhraseId(coordinate.a, coordinate.b)
      && session.selectedCoordinate?.a === coordinate.a
      && session.selectedCoordinate?.b === coordinate.b) return;
    speech.current?.cancel();
    setSpeechState('idle');
    updateSession((current) => selectRecitationCoordinate(current, coordinate));
  };

  const confirm = () => {
    if (!phrase || speechState === 'speaking') return;
    const expectedPhraseId = phrase.id;
    speech.current?.cancel();
    setSpeechState('idle');
    updateSession((current) => completeCurrentPhrase(current, undefined, expectedPhraseId));
  };

  const reset = () => {
    speech.current?.cancel();
    setSpeechState('idle');
    updateSession(resetRecitationSession());
  };

  return (
    <div className="recitation-tech-page">
      <header className="review-toolbar">
        <strong>步骤5 · 背诵技术原型</strong>
        <label>评审宽度 <select value={viewport} onChange={(event) => setViewport(Number(event.target.value))}><option>768</option><option>1024</option><option>1440</option><option>1920</option></select></label>
        <label>快速状态 <select defaultValue="empty" onChange={(event) => updateSession(scenarioSession(event.target.value))}><option value="empty">0/45</option><option value="mixed">混合12/45</option><option value="near">44/45</option><option value="complete">45/45</option></select></label>
        <button type="button" onClick={() => { localStorage.setItem(RECITATION_STORAGE_KEY, '{bad'); location.reload(); }}>模拟损坏数据</button>
        <span>不进入生产路由</span>
      </header>
      <main className="prototype-shell" data-review-layout={viewport < 1200 ? 'stacked' : 'wide'} style={{ maxWidth: Math.min(viewport, 1400) }}>
        <div className="prototype-command-bar">
          <button type="button">← 背诵设置</button>
          <div className="mode-switch" aria-label="背诵方式">
            <button type="button" aria-pressed={session.orderingMode === ORDERING_MODES.SEQUENTIAL} onClick={() => changeMode(ORDERING_MODES.SEQUENTIAL)}>顺序背</button>
            <button type="button" aria-pressed={session.orderingMode === ORDERING_MODES.CUSTOM} onClick={() => changeMode(ORDERING_MODES.CUSTOM)}>自定义背</button>
          </div>
          <strong className="current-phrase">{complete ? '45句全部背完 · 两张表已展开' : phrase && displayedCoordinate ? `${displayedCoordinate.a} × ${displayedCoordinate.b} = ${phrase.product} · ${phrase.text}` : '请从乘法表选择未背口诀'}</strong>
          <button type="button" disabled={!phrase || speechState === 'unavailable'} onClick={speechState === 'speaking' ? () => { speech.current.cancel(); setSpeechState('ready'); } : speak}>{speechState === 'speaking' ? '停止领读' : speechState === 'unavailable' ? '语音不可用' : '再听一遍'}</button>
          <button type="button" className="primary" disabled={!phrase || speechState === 'speaking'} onClick={confirm}>我背完了</button>
          <strong>{session.completedPhraseIds.length}/45</strong>
          <button type="button" onClick={reset}>重新开始</button>
          <span className="progress-line" style={{ width: `${session.completedPhraseIds.length / 45 * 100}%` }} />
        </div>
        {storageWarning ? <div className="storage-warning" role="status">{storageWarning}</div> : null}
        <div className="prototype-tables">
          <RecitationMultiplicationTable session={session} onSelect={select} />
          <PhraseTable session={session} />
        </div>
      </main>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  const reactRoot = import.meta.hot?.data.reactRoot ?? ReactDOM.createRoot(root);
  if (import.meta.hot) import.meta.hot.data.reactRoot = reactRoot;
  reactRoot.render(<React.StrictMode><TechnicalPrototype /></React.StrictMode>);
}
