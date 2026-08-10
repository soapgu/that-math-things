import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PhraseTable from '../../../features/multiplication/recitation/PhraseTable';
import RecitationMultiplicationTable from '../../../features/multiplication/recitation/RecitationMultiplicationTable';
import RecitationResetDialog from '../../../features/multiplication/recitation/RecitationResetDialog';
import {
  ORDERING_MODES,
  completeCurrentPhrase,
  createPhraseId,
  getPhraseById,
  isValidRecitationSession,
  resetRecitationSession,
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
  const [resetOpen, setResetOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [focusRequest, setFocusRequest] = useState(null);
  const [animatePhraseId, setAnimatePhraseId] = useState(null);
  const [completionGlow, setCompletionGlow] = useState(false);
  const speech = useRef(null);
  const currentRef = useRef(null);
  const confirmRef = useRef(null);
  const resetTriggerRef = useRef(null);
  const animationTimer = useRef(null);
  const confirmFocusFrame = useRef(null);
  const pendingAnnouncement = useRef('');
  const resetOpenRef = useRef(false);
  const focusRequestSequence = useRef(0);
  const pendingCustomFocus = useRef(null);

  useEffect(() => {
    if (!session) navigate('/multiplication?mode=recitation', { replace: true });
  }, [navigate, session]);

  useEffect(() => {
    speech.current = createRecitationSpeechController(window);
    return () => {
      speech.current?.dispose();
      if (animationTimer.current) window.clearTimeout(animationTimer.current);
      if (confirmFocusFrame.current) window.cancelAnimationFrame(confirmFocusFrame.current);
    };
  }, []);

  const phrase = session?.currentPhraseId ? getPhraseById(session.currentPhraseId) : null;
  const displayedCoordinate = session?.selectedCoordinate ?? (phrase ? { a: phrase.a, b: phrase.b } : null);

  useEffect(() => {
    if (!session) return;
    if (phrase && displayedCoordinate) {
      currentRef.current?.focus();
      const prefix = pendingAnnouncement.current ? `${pendingAnnouncement.current}。` : '';
      pendingAnnouncement.current = '';
      setAnnouncement(`${prefix}当前口诀，${displayedCoordinate.a}乘${displayedCoordinate.b}`);
    } else if (session.completedPhraseIds.length === 45) {
      currentRef.current?.focus();
    } else if (session.orderingMode === ORDERING_MODES.CUSTOM) {
      focusRequestSequence.current += 1;
      setFocusRequest({
        type: pendingCustomFocus.current ? 'after' : 'first',
        after: pendingCustomFocus.current,
        nonce: focusRequestSequence.current,
      });
      pendingCustomFocus.current = null;
    }
  }, [session?.currentPhraseId, session?.orderingMode, session?.selectedCoordinate?.a, session?.selectedCoordinate?.b, session?.updatedAt]);

  const markSpeechReady = (state = 'ready') => {
    setSpeechState(state);
    if (state === 'unavailable') setAnnouncement('语音不可用，可以继续手动背诵。');
    if (confirmFocusFrame.current) window.cancelAnimationFrame(confirmFocusFrame.current);
    if (!resetOpenRef.current) {
      confirmFocusFrame.current = window.requestAnimationFrame(() => {
        confirmFocusFrame.current = null;
        if (!resetOpenRef.current) confirmRef.current?.focus();
      });
    }
  };

  const speak = () => {
    if (!phrase) return;
    setSpeechState('speaking');
    speech.current?.speak(phrase.text, {
      onEnd: () => markSpeechReady(),
      onError: () => markSpeechReady('unavailable'),
      onUnavailable: () => markSpeechReady('unavailable'),
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
      onEnd: () => markSpeechReady(),
      onError: () => markSpeechReady('unavailable'),
      onUnavailable: () => markSpeechReady('unavailable'),
    });
    return () => speech.current?.cancel();
  }, [session?.currentPhraseId, session?.orderingMode, session?.selectedCoordinate?.a, session?.selectedCoordinate?.b, session?.updatedAt]);

  if (!session) return null;

  const stopSpeaking = () => {
    speech.current?.cancel();
    markSpeechReady();
  };

  const persistSession = (nextSession) => {
    const result = saveRecitationSession(nextSession);
    setStorageWarning(result.ok ? null : '本次可以继续，但离开后可能无法恢复。');
    setSession(nextSession);
  };

  const openReset = () => {
    resetOpenRef.current = true;
    if (confirmFocusFrame.current) {
      window.cancelAnimationFrame(confirmFocusFrame.current);
      confirmFocusFrame.current = null;
    }
    setResetOpen(true);
  };

  const closeReset = () => {
    resetOpenRef.current = false;
    setResetOpen(false);
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
    const completedCoordinate = session.selectedCoordinate;
    speech.current?.cancel();
    setAnimatePhraseId(phrase.id);
    if (animationTimer.current) window.clearTimeout(animationTimer.current);
    animationTimer.current = window.setTimeout(() => {
      animationTimer.current = null;
      setAnimatePhraseId(null);
      setCompletionGlow(false);
    }, nextSession.completedPhraseIds.length === 45 ? 700 : 260);
    if (nextSession.completedPhraseIds.length === 45) {
      setCompletionGlow(true);
      setAnnouncement('45句全部背完，乘法表已经全部展开。');
    } else {
      pendingAnnouncement.current = `已完成${nextSession.completedPhraseIds.length}/45`;
      setAnnouncement(pendingAnnouncement.current);
      if (nextSession.orderingMode === ORDERING_MODES.CUSTOM) {
        pendingCustomFocus.current = completedCoordinate;
      }
    }
    persistSession(nextSession);
  };

  const reset = () => {
    speech.current?.cancel();
    closeReset();
    if (animationTimer.current) {
      window.clearTimeout(animationTimer.current);
      animationTimer.current = null;
    }
    setCompletionGlow(false);
    setAnimatePhraseId(null);
    const nextSession = resetRecitationSession();
    pendingAnnouncement.current = '背诵进度已清空';
    persistSession(nextSession);
    setAnnouncement('背诵进度已清空。');
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
        <strong className="recitation-current-phrase" ref={currentRef} tabIndex={-1} key={`${session.currentPhraseId ?? 'empty'}-${session.updatedAt}`}>
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
        <button ref={confirmRef} type="button" className="recitation-primary-action" disabled={!phrase || speechState === 'speaking'} onClick={confirm}>我背完了</button>
        <strong className="recitation-progress-text">{completed}/45</strong>
        <button ref={resetTriggerRef} type="button" aria-label="重新开始" onClick={openReset}><span className="recitation-wide-label">重新开始</span><span className="recitation-compact-label">重置</span></button>
        <span className="recitation-progress-line" style={{ width: `${completed / 45 * 100}%` }} aria-hidden="true" />
      </div>
      {storageWarning ? <div className="recitation-storage-warning" role="status">{storageWarning}</div> : null}
      <div className={`recitation-production-tables${completionGlow ? ' is-completing' : ''}`}>
        <RecitationMultiplicationTable session={session} onSelect={select} focusRequest={focusRequest} animatePhraseId={animatePhraseId} />
        <PhraseTable session={session} animatePhraseId={animatePhraseId} />
      </div>
      <div className="recitation-live-region" aria-live="polite" aria-atomic="true">{announcement}</div>
      <RecitationResetDialog open={resetOpen} onCancel={closeReset} onConfirm={reset} triggerRef={resetTriggerRef} />
    </main>
  );
}
