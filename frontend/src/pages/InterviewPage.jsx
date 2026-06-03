import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MicButton from '../components/MicButton';
import ChatBubble from '../components/ChatBubble';
import TypingIndicator from '../components/TypingIndicator';
import ModeSelector from '../components/ModeSelector';
import FeedbackPanel from '../components/FeedbackPanel';
import useVoiceRecorder from '../hooks/useVoiceRecorder';
import useInterview from '../hooks/useInterview';

export default function InterviewPage() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') || 'dsa';

  const [sessionStarted, setSessionStarted] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [inputMode, setInputMode] = useState('voice'); // 'voice' | 'text'
  const [showSidebar, setShowSidebar] = useState(true);

  const chatEndRef = useRef(null);

  const {
    messages, isLoading, isPlaying, feedback, mode, error,
    sendMessage, processAudio, stopAudio, startSession, clearSession, setMode,
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

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleStartSession = () => {
    setSessionStarted(true);
    startSession(mode);
  };

  const handleClearSession = () => {
    clearSession();
    setSessionStarted(false);
    setTypingText('');
    resetRecording();
  };

  const handleTypingSubmit = (e) => {
    e.preventDefault();
    if (!typingText.trim() || isLoading) return;
    sendMessage(typingText.trim());
    setTypingText('');
  };

  const userMessageCount = messages.filter(m => m.role === 'user').length;

  return (
    <div className="pt-16 h-screen flex overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className={`flex-shrink-0 transition-all duration-300 ${showSidebar ? 'w-72' : 'w-0 overflow-hidden'}`}>
        <div className="h-full border-r border-border bg-surface p-4 flex flex-col gap-4 overflow-y-auto w-72">
          <div>
            <h2 className="font-display font-700 text-text-primary text-sm mb-1">Interview Mode</h2>
            <p className="text-xs text-text-muted mb-3">Select before starting</p>
            <ModeSelector
              selected={mode}
              onChange={setMode}
              disabled={sessionStarted}
            />
          </div>

          {/* Session controls */}
          <div className="space-y-2">
            {!sessionStarted ? (
              <button
                onClick={handleStartSession}
                className="w-full py-2.5 bg-gradient-to-r from-accent to-teal text-white text-sm font-semibold rounded-xl hover:shadow-glow transition-all hover:scale-[1.02]"
              >
                ▶ Start Session
              </button>
            ) : (
              <button
                onClick={handleClearSession}
                className="w-full py-2.5 bg-white/5 border border-border text-text-secondary text-sm rounded-xl hover:border-red-500/30 hover:text-red-400 transition-all"
              >
                ↺ Reset Session
              </button>
            )}
          </div>

          {/* Input mode toggle */}
          {sessionStarted && (
            <div>
              <p className="text-xs text-text-muted mb-2">Input Mode</p>
              <div className="flex rounded-lg overflow-hidden border border-border">
                {['voice', 'text'].map(m => (
                  <button
                    key={m}
                    onClick={() => setInputMode(m)}
                    className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                      inputMode === m
                        ? 'bg-accent text-white'
                        : 'bg-panel text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {m === 'voice' ? '🎙 Voice' : '✍️ Text'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          {sessionStarted && (
            <div className="glass rounded-xl p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Exchanges</span>
                <span className="text-text-primary font-mono">{userMessageCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Mode</span>
                <span className="text-accent capitalize">{mode.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">AI Voice</span>
                <span className={isPlaying ? 'text-emerald-400 animate-pulse' : 'text-text-muted'}>
                  {isPlaying ? '🔊 Playing' : '⏸ Idle'}
                </span>
              </div>
            </div>
          )}

          {/* Feedback panel */}
          {feedback && userMessageCount >= 1 && (
            <FeedbackPanel feedback={feedback} messageCount={userMessageCount} />
          )}

          {/* Tips */}
          <div className="mt-auto">
            <div className="rounded-xl bg-teal/5 border border-teal/20 p-3">
              <p className="text-xs text-teal-glow font-medium mb-1">💡 Pro Tips</p>
              <ul className="text-xs text-text-muted space-y-1 list-disc list-inside">
                <li>Speak clearly and at a normal pace</li>
                <li>Explain your thought process aloud</li>
                <li>Ask clarifying questions if unsure</li>
              </ul>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat header */}
        <div className="glass border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(v => !v)}
            className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            title="Toggle sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-medium text-text-primary">
              {sessionStarted ? 'Interview in progress' : 'Ready to start'}
            </span>
          </div>

          {isPlaying && (
            <button
              onClick={stopAudio}
              className="ml-auto text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
              Stop audio
            </button>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {!sessionStarted ? (
            <EmptyState onStart={handleStartSession} />
          ) : (
            <>
              {messages.map(msg => (
                <ChatBubble key={msg.id} message={msg} />
              ))}
              {isLoading && <TypingIndicator />}
            </>
          )}

          {/* Error display */}
          {(error || recorderError) && (
            <div className="mx-auto max-w-md">
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                ⚠️ {error || recorderError}
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* ── Input area ── */}
        {sessionStarted && (
          <div className="border-t border-border glass px-4 py-4">
            {inputMode === 'voice' ? (
              <div className="flex flex-col items-center gap-2">
                <MicButton
                  isRecording={isRecording}
                  isLoading={isLoading}
                  onClick={handleMicClick}
                  volume={volume}
                />
                <p className="text-xs text-text-muted">
                  {isRecording
                    ? 'Listening… click stop when done'
                    : isLoading
                      ? 'Processing your answer…'
                      : 'Press the mic and speak your answer'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleTypingSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={typingText}
                  onChange={e => setTypingText(e.target.value)}
                  placeholder="Type your answer here…"
                  disabled={isLoading}
                  className="flex-1 bg-panel border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !typingText.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-accent to-teal text-white text-sm font-semibold rounded-xl disabled:opacity-40 hover:shadow-glow transition-all"
                >
                  Send
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onStart }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/20 to-teal/20 border border-accent/20 flex items-center justify-center animate-float">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" strokeWidth="1.5">
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3b82f6"/>
              <stop offset="100%" stopColor="#14b8a6"/>
            </linearGradient>
          </defs>
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </div>
      <div>
        <h3 className="font-display text-xl font-700 text-text-primary mb-2">Ready to Practice?</h3>
        <p className="text-text-secondary text-sm max-w-xs leading-relaxed">
          Select an interview mode from the sidebar and click Start Session to begin your AI-powered mock interview.
        </p>
      </div>
      <button
        onClick={onStart}
        className="px-8 py-3 bg-gradient-to-r from-accent to-teal text-white font-semibold rounded-xl hover:shadow-glow transition-all hover:scale-105"
      >
        Start Session →
      </button>
    </div>
  );
}
