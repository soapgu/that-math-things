import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PhraseTable from '../../../features/multiplication/recitation/PhraseTable';
import RecitationMultiplicationTable from '../../../features/multiplication/recitation/RecitationMultiplicationTable';
import {
  ORDERING_MODES,
  completeCurrentPhrase,
  createPhraseId,
  getPhraseById,
  isValidRecitationSession,
  selectRecitationCoordinate,
  switchRecitationMode,
} from '../../../features/multiplication/recitation/model';
import { createRecitationSpeechController } from '../../../features/multiplication/recitation/speech';
import { loadRecitationSession, saveRecitationSession } from '../../../features/multiplication/recitation/storage';
import './recitation.css';

function resolveInitialSession(locationState) {
  const routeSession = isValidRecitationSession(locationState?.recitationSession)
    ? locationState.recitationSession
    : null;
  const loaded = loadRecitationSession();
  const storedSession = loaded.status === 'loaded' ? loaded.session : null;
  // 浏览器刷新会保留进入页面时的history.state；按更新时间选择会话，避免旧路由快照覆盖最新存储进度。
  const session = routeSession && (!storedSession || routeSession.updatedAt > storedSession.updatedAt)
    ? routeSession
    : storedSession;
  return session;
}

export default function MultiplicationRecitation() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialSession = useMemo(() => resolveInitialSession(location.state), [location.state]);
  const [session, setSession] = useState(initialSession);
  const [speechState, setSpeechState] = useState('idle');
  const [storageWarning, setStorageWarning] = useState(location.state?.storageWarning ?? null);
  const speech = useRef(null);

  useEffect(() => {
    if (!session) navigate('/multiplication?mode=recitation', { replace: true });
  }, [navigate, session]);

  useEffect(() => {
    speech.current = createRecitationSpeechController(window);
    return () => speech.current?.dispose();
  }, []);

  const phrase = session?.currentPhraseId ? getPhraseById(session.currentPhraseId) : null;
  const displayedCoordinate = session?.selectedCoordinate ?? (phrase ? { a: phrase.a, b: phrase.b } : null);

  const speak = () => {
    if (!phrase) return;
    setSpeechState('speaking');
    speech.current?.speak(phrase.text, {
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
  }, [session?.currentPhraseId, session?.orderingMode, session?.selectedCoordinate?.a, session?.selectedCoordinate?.b]);

  if (!session) return null;

  const stopSpeaking = () => {
    speech.current?.cancel();
    setSpeechState('ready');
  };

  const persistSession = (nextSession) => {
    const result = saveRecitationSession(nextSession);
    setStorageWarning(result.ok ? null : '进度暂时无法保存，本次仍可继续背诵。');
    setSession(nextSession);
  };

  const changeMode = (mode) => {
    if (session.orderingMode === mode) return;
    speech.current?.cancel();
    setSpeechState('idle');
    persistSession(switchRecitationMode(session, mode));
  };

  const select = (coordinate) => {
    if (session.currentPhraseId === createPhraseId(coordinate.a, coordinate.b)
      && session.selectedCoordinate?.a === coordinate.a
      && session.selectedCoordinate?.b === coordinate.b) return;
    speech.current?.cancel();
    setSpeechState('idle');
    persistSession(selectRecitationCoordinate(session, coordinate));
  };

  const confirm = () => {
    if (!phrase || speechState === 'speaking') return;
    const nextSession = completeCurrentPhrase(session, undefined, phrase.id);
    if (nextSession === session) return;
    speech.current?.cancel();
    persistSession(nextSession);
  };

  const leave = () => {
    speech.current?.cancel();
    navigate('/multiplication?mode=recitation');
  };

  const completed = session.completedPhraseIds.length;

  return (
    <main className="multiplication-recitation-page">
      <div className="recitation-command-bar">
        <button type="button" onClick={leave}>← 背诵设置</button>
        <div className="recitation-mode-switch" aria-label="背诵方式">
          <button type="button" aria-pressed={session.orderingMode === ORDERING_MODES.SEQUENTIAL} onClick={() => changeMode(ORDERING_MODES.SEQUENTIAL)}>顺序背</button>
          <button type="button" aria-pressed={session.orderingMode === ORDERING_MODES.CUSTOM} onClick={() => changeMode(ORDERING_MODES.CUSTOM)}>自定义背</button>
        </div>
        <strong className="recitation-current-phrase">
          {phrase && displayedCoordinate
            ? `${displayedCoordinate.a} × ${displayedCoordinate.b} = ${phrase.product} · ${phrase.text}`
            : completed === 45 ? '45句全部背完 · 两张表已展开' : '请从乘法表选择未背口诀'}
        </strong>
        <button
          type="button"
          disabled={!phrase || speechState === 'unavailable'}
          onClick={speechState === 'speaking' ? stopSpeaking : speak}
        >
          {speechState === 'speaking' ? '停止领读' : speechState === 'unavailable' ? '语音不可用' : '再听一遍'}
        </button>
        <button type="button" className="recitation-primary-action" disabled={!phrase || speechState === 'speaking'} onClick={confirm}>我背完了</button>
        <strong className="recitation-progress-text">{completed}/45</strong>
        <span className="recitation-progress-line" style={{ width: `${completed / 45 * 100}%` }} aria-hidden="true" />
      </div>
      {storageWarning ? <div className="recitation-storage-warning" role="status">{storageWarning}</div> : null}
      <div className="recitation-production-tables">
        <RecitationMultiplicationTable session={session} onSelect={select} />
        <PhraseTable session={session} />
      </div>
    </main>
  );
}
