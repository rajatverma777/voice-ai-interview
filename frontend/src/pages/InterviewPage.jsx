import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MicButton from '../components/MicButton';
import ChatBubble from '../components/ChatBubble';
import TypingIndicator from '../components/TypingIndicator';
import ModeSelector from '../components/ModeSelector';
import FeedbackPanel from '../components/FeedbackPanel';
import useVoiceRecorder from '../hooks/useVoiceRecorder';
import useInterview from '../hooks/useInterview';
import { getQuestionHint } from '../services/api';

export default function InterviewPage() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') || 'dsa';

  const [sessionStarted, setSessionStarted] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [inputMode, setInputMode] = useState('voice'); // 'voice' | 'text'
  const [showSidebar, setShowSidebar] = useState(true);
  
  const [activeHint, setActiveHint] = useState('');
  const [showHintModal, setShowHintModal] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  const chatEndRef = useRef(null);

  const {
    messages, isLoading, isPlaying, feedback, mode, difficulty, error,
    sendMessage, processAudio, stopAudio, startSession, loadSession, clearSession, setMode, setDifficulty,
  } = useInterview();

  const {
    isRecording, audioBlob, error: recorderError, volume,
    startRecording, stopRecording, resetRecording,
  } = useVoiceRecorder();

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Process recorded audio when blob is ready
  useEffect(() => {
    if (audioBlob) {
      processAudio(audioBlob).finally(resetRecording);
    }
  }, [audioBlob]);

  // Auto-load past session if session_id query param is present
  useEffect(() => {
    const sessionIdParam = searchParams.get('session_id');
    const modeParam = searchParams.get('mode');
    if (sessionIdParam) {
      loadSession(sessionIdParam, modeParam || 'dsa');
      setSessionStarted(false); // Standby mode
    }
  }, [searchParams, loadSession]);

  // Calculate elapsed time from loaded history
  useEffect(() => {
    if (!sessionStarted && messages.length > 1) {
      const firstMsg = messages[0];
      const lastMsg = messages[messages.length - 1];
      if (firstMsg.timestamp && lastMsg.timestamp) {
        const firstTime = new Date(firstMsg.timestamp).getTime();
        const lastTime = new Date(lastMsg.timestamp).getTime();
        const diffSeconds = Math.max(0, Math.floor((lastTime - firstTime) / 1000));
        setTimerSeconds(diffSeconds);
      }
    }
  }, [messages, sessionStarted]);

  // Interview Timer
  useEffect(() => {
    let interval = null;
    if (sessionStarted && !isLoading) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [sessionStarted, isLoading]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleStartSession = () => {
    setSessionStarted(true);
    setTimerSeconds(0);
    startSession(mode, difficulty);
  };

  const handleResumeSessionClick = () => {
    setSessionStarted(true);
  };

  const handleClearSession = () => {
    clearSession();
    setSessionStarted(false);
    setTypingText('');
    setTimerSeconds(0);
    resetRecording();
  };

  const handleGetHint = async () => {
    const assistantMsgs = messages.filter(m => m.role === 'assistant');
    if (assistantMsgs.length === 0) return;
    const currentQuestion = assistantMsgs[assistantMsgs.length - 1].content;
    
    try {
      const hint = await getQuestionHint(mode, currentQuestion);
      setActiveHint(hint);
      setShowHintModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTypingSubmit = (e) => {
    e.preventDefault();
    if (!typingText.trim() || isLoading) return;
    sendMessage(typingText.trim());
    setTypingText('');
  };

  const userMessageCount = messages.filter(m => m.role === 'user').length;
  const lastMsgIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant';

  // Compute cumulative feedback
  const feedbackMessages = messages.filter(m => m.role === 'assistant' && m.feedback);
  let cumulativeFeedback = null;
  if (feedbackMessages.length > 0) {
    const total = feedbackMessages.reduce(
      (acc, m) => {
        acc.technical += m.feedback.technical_accuracy;
        acc.clarity += m.feedback.communication_clarity;
        acc.confidence += m.feedback.confidence_level;
        acc.overall += m.feedback.overall_score;
        return acc;
      },
      { technical: 0, clarity: 0, confidence: 0, overall: 0 }
    );
    const count = feedbackMessages.length;
    cumulativeFeedback = {
      technical_accuracy: Math.round(total.technical / count),
      communication_clarity: Math.round(total.clarity / count),
      confidence_level: Math.round(total.confidence / count),
      overall_score: Math.round(total.overall / count),
      suggestions: feedbackMessages[feedbackMessages.length - 1].feedback.suggestions,
    };
  }

  return (
    <div className="pt-16 h-screen flex overflow-hidden relative bg-void">
      {/* Dynamic background light */}
      <div className="absolute top-1/2 left-1/3 w-[500px] h-[500px] bg-accent/2 rounded-full blur-[140px] pointer-events-none" />

      {/* ── Sidebar Deck ── */}
      <aside className={`flex-shrink-0 transition-all duration-300 ${showSidebar ? 'w-72' : 'w-0 overflow-hidden'} z-20`}>
        <div className="h-full border-r border-border/80 bg-void/40 p-5 flex flex-col gap-5 overflow-y-auto w-72 scrollbar-thin">
          
          <div>
            <h2 className="font-display font-extrabold text-white text-xs mb-1 tracking-wider uppercase">Interview Module</h2>
            <p className="text-[9px] text-text-muted font-mono tracking-widest uppercase mb-3.5">Configure protocol type</p>
            <ModeSelector
              selected={mode}
              onChange={setMode}
              disabled={sessionStarted || messages.length > 0}
            />
          </div>

          {/* Difficulty Selector */}
          <div className="font-mono">
            <p className="text-[9px] text-text-muted mb-2 font-bold tracking-widest uppercase">Difficulty Level</p>
            <div className="flex rounded-2xl overflow-hidden border border-border bg-void/50 p-1 text-[11px]">
              {['easy', 'medium', 'hard'].map(d => (
                <button
                  key={d}
                  disabled={sessionStarted || messages.length > 0}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2 font-bold capitalize transition-all rounded-xl ${
                    difficulty === d
                      ? 'bg-gradient-to-r from-accent to-teal text-white shadow-glow-sm'
                      : 'text-text-secondary hover:text-white disabled:opacity-40'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Session controllers */}
          <div className="space-y-2.5 font-mono text-[11px]">
            {!sessionStarted ? (
              messages.length > 0 ? (
                <button
                  onClick={handleResumeSessionClick}
                  className="w-full py-3 bg-gradient-to-r from-accent to-teal text-white font-extrabold rounded-xl shadow-glow hover:shadow-[0_0_20px_rgba(0,210,255,0.4)] transition-all uppercase tracking-wider"
                >
                  Resume Interview
                </button>
              ) : (
                <button
                  onClick={handleStartSession}
                  className="w-full py-3 bg-gradient-to-r from-accent to-teal text-white font-extrabold rounded-xl shadow-glow hover:shadow-[0_0_20px_rgba(0,210,255,0.4)] transition-all uppercase tracking-wider"
                >
                  Start Session
                </button>
              )
            ) : (
              <button
                onClick={handleClearSession}
                className="w-full py-3 bg-void border border-red-500/35 text-red-400 hover:text-red-300 font-bold rounded-xl hover:bg-red-500/5 transition-all uppercase tracking-wider"
              >
                End Session
              </button>
            )}
          </div>

          {/* Input mode toggle */}
          {sessionStarted && (
            <div className="font-mono">
              <p className="text-[9px] text-text-muted mb-2 font-bold tracking-widest uppercase">Input Mode</p>
              <div className="flex rounded-2xl overflow-hidden border border-border bg-void/50 p-1 text-[11px]">
                {['voice', 'text'].map(m => (
                  <button
                    key={m}
                    onClick={() => setInputMode(m)}
                    className={`flex-1 py-2 font-bold capitalize rounded-xl transition-all ${
                      inputMode === m
                        ? 'bg-gradient-to-r from-accent to-teal text-white shadow-glow-sm'
                        : 'text-text-secondary hover:text-white'
                    }`}
                  >
                    {m === 'voice' ? '🎙️ Voice' : '✍️ Text'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Diagnostics summary metrics */}
          {(sessionStarted || messages.length > 0) && (
            <div className="glass rounded-2xl p-4 space-y-2.5 text-[10px] border border-border/80 font-mono">
              <div className="flex justify-between">
                <span className="text-text-secondary">EXCHANGES</span>
                <span className="text-white font-bold">{userMessageCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">ACTIVE MODE</span>
                <span className="text-accent capitalize font-bold">{mode.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">SPEECH Synthesizer</span>
                <span className={isPlaying ? 'text-accent animate-pulse font-bold' : 'text-text-muted'}>
                  {isPlaying ? 'ACTIVE' : 'STANDBY'}
                </span>
              </div>
            </div>
          )}

          {/* Cumulative Feedback Panel */}
          {cumulativeFeedback && userMessageCount >= 1 && (
            <FeedbackPanel feedback={cumulativeFeedback} messageCount={userMessageCount} />
          )}
        </div>
      </aside>

      {/* ── Main Workspace ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-void relative z-10">
        
        {/* Workspace Header */}
        <div className="glass border-b border-border/80 px-4 py-3 flex items-center gap-3 font-mono">
          <button
            onClick={() => setShowSidebar(v => !v)}
            className="w-9 h-9 rounded-xl hover:bg-white/5 border border-transparent hover:border-border flex items-center justify-center text-text-secondary hover:text-white transition-all"
            title="Toggle settings panel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${sessionStarted ? 'bg-accent animate-pulse shadow-glow' : 'bg-red-500'}`} />
            <span className="text-xs font-semibold text-white">
              {sessionStarted ? 'SESSION ACTIVE' : 'STANDBY'}
            </span>
            {(sessionStarted || messages.length > 0) && (
              <span className="text-[10px] bg-accent/10 border border-accent/25 text-accent px-3 py-0.5 rounded-full ml-3 font-bold">
                ⏱ {formatTime(timerSeconds)}
              </span>
            )}
          </div>

          {isPlaying && (
            <button
              onClick={stopAudio}
              className="ml-auto text-xs text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors font-bold uppercase tracking-wider"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
              Pause TTS
            </button>
          )}
        </div>

        {/* Workspace Chat Console */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 scrollbar-thin">
          {!sessionStarted && messages.length === 0 ? (
            <EmptyState onStart={handleStartSession} />
          ) : (
            <>
              {messages.map(msg => (
                <ChatBubble key={msg.id} message={msg} />
              ))}
              {isLoading && <TypingIndicator />}
            </>
          )}

          {/* Diagnostic Error Log */}
          {(error || recorderError) && (
            <div className="mx-auto max-w-md font-mono mt-4">
              <div className="rounded-xl bg-red-500/5 border border-red-500/25 px-4 py-3.5 text-xs text-red-400">
                ⚠️ [STREAM_ERROR]: {error || recorderError}
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* ── Interactive Input Dock ── */}
        {sessionStarted ? (
          <div className="border-t border-border/80 glass px-4 py-5 font-mono">
            {inputMode === 'voice' ? (
              <div className="flex flex-col items-center gap-2 relative">
                <div className="flex items-center justify-center gap-6 w-full">
                  {lastMsgIsAssistant && !isLoading && (
                    <button
                      onClick={handleGetHint}
                      className="px-4.5 py-2.5 bg-accent/10 border border-accent/30 text-accent text-xs font-semibold rounded-xl hover:bg-accent/20 hover:text-white transition-all flex items-center gap-1.5 font-mono"
                      title="Request Hint"
                    >
                      💡 Hint
                    </button>
                  )}
                  <MicButton
                    isRecording={isRecording}
                    isLoading={isLoading}
                    onClick={handleMicClick}
                    volume={volume}
                  />
                  {lastMsgIsAssistant && !isLoading && (
                    <button
                      onClick={() => sendMessage('next question')}
                      className="px-4.5 py-2.5 bg-teal/10 border border-teal/30 text-teal text-xs font-semibold rounded-xl hover:bg-teal/25 hover:text-white transition-all flex items-center gap-1.5 font-mono"
                      title="Skip question"
                    >
                      ⏭ Skip
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleTypingSubmit} className="flex gap-3 max-w-4xl mx-auto">
                <div className="flex gap-2 flex-1">
                  <input
                    type="text"
                    value={typingText}
                    onChange={e => setTypingText(e.target.value)}
                    placeholder="Enter response message parameters..."
                    disabled={isLoading}
                    className="flex-1 bg-void border border-border/80 rounded-xl px-4 py-3 text-xs text-white placeholder:text-text-muted focus:outline-none focus:border-accent/60 transition-colors disabled:opacity-50 font-sans"
                  />
                  {lastMsgIsAssistant && !isLoading && (
                    <>
                      <button
                        type="button"
                        onClick={handleGetHint}
                        className="px-4.5 py-2.5 bg-accent/10 border border-accent/30 text-accent text-xs font-semibold rounded-xl hover:bg-accent/20 hover:text-white transition-all flex items-center gap-1.5"
                        title="Request Hint"
                      >
                        💡 Hint
                      </button>
                      <button
                        type="button"
                        onClick={() => sendMessage('next question')}
                        className="px-4.5 py-2.5 bg-teal/10 border border-teal/30 text-teal text-xs font-semibold rounded-xl hover:bg-teal/25 hover:text-white transition-all flex items-center gap-1.5"
                        title="Skip question"
                      >
                        ⏭ Skip
                      </button>
                    </>
                  )}
                  <button
                    type="submit"
                    disabled={isLoading || !typingText.trim()}
                    className="px-5 py-3 bg-gradient-to-r from-accent to-teal text-white text-xs font-bold rounded-xl disabled:opacity-40 hover:shadow-glow transition-all uppercase"
                  >
                    Send
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          messages.length > 0 && (
            <div className="border-t border-border/80 glass px-4 py-6 flex flex-col items-center gap-3 font-mono">
              <button
                onClick={handleResumeSessionClick}
                className="px-8 py-3.5 bg-gradient-to-r from-accent to-teal text-white text-xs font-bold tracking-widest rounded-xl hover:shadow-glow transition-all uppercase"
              >
                Resume Mock Session
              </button>
              <p className="text-[10px] text-text-muted font-mono tracking-wide uppercase">Press to restore audio input protocols</p>
            </div>
          )
        )}
      </div>

      {/* ── Hint Modal ── */}
      {showHintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/75 backdrop-blur-sm animate-fade-in">
          <div className="glass-premium max-w-md w-full mx-4 rounded-3xl border border-accent/30 p-6 shadow-glow relative animate-scale-in">
            <button
              onClick={() => setShowHintModal(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors text-sm"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">💡</span>
              <h4 className="font-display font-bold text-white text-sm tracking-wide uppercase">Diagnostic Tip</h4>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed mb-6 bg-void/50 p-4 rounded-2xl border border-border">
              {activeHint}
            </p>
            <button
              onClick={() => setShowHintModal(false)}
              className="w-full py-3 bg-gradient-to-r from-accent to-teal text-white font-bold rounded-xl hover:shadow-glow transition-all text-xs font-mono tracking-wider uppercase"
            >
              Close Portal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onStart }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4 font-mono select-none">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent/5 to-teal/5 border border-border/80 flex items-center justify-center animate-float shadow-inner">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </div>
      <div>
        <h3 className="font-display text-sm font-bold text-white tracking-wider mb-2">INITIALIZE SESSION WORKSPACE</h3>
        <p className="text-text-secondary text-xs max-w-xs leading-relaxed font-sans normal-case">
          Configure interview difficulty parameters and mode selections from the side menu, then run your mock audio practice session.
        </p>
      </div>
      <button
        onClick={onStart}
        className="px-6 py-3 bg-gradient-to-r from-accent to-teal text-white text-xs font-bold rounded-xl hover:shadow-glow transition-all uppercase tracking-wider font-mono hover:scale-[1.02]"
      >
        Start Session →
      </button>
    </div>
  );
}
