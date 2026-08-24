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

const VOICE_LABELS = {
  'en-US-JennyNeural': 'Friendly Female (Jenny)',
  'en-US-AriaNeural': 'Warm Female (Aria)',
  'en-US-GuyNeural': 'Natural Male (Guy)',
  'en-GB-SoniaNeural': 'British Female (Sonia)',
  'en-GB-RyanNeural': 'British Male (Ryan)'
};

const MODEL_LABELS = {
  gemini: '✨ Google Gemini 2.5 Flash',
  openai_gpt4: '🧠 OpenAI GPT-4o API',
  openai: '🧠 OpenAI GPT-4o Mini',
  gpt2: '⚡ Local DistilGPT2 GPU',
  svm: '📊 Local SVM Heuristic',
};

const getModelIcon = (model) => {
  if (!model) return '🤖';
  const m = model.toLowerCase();
  if (m.includes('gemini')) return '✨';
  if (m.includes('gpt-4o-mini') || m === 'openai') return '🧠';
  if (m.includes('gpt-4o') || m === 'openai_gpt4') return '🧠';
  if (m.includes('distilgpt2') || m === 'gpt2') return '⚡';
  if (m.includes('svm')) return '📊';
  return '🤖';
};


export default function InterviewPage() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') || 'dsa';

  const [sessionStarted, setSessionStarted] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [inputMode, setInputMode] = useState('voice'); // 'voice' | 'text'
  const [showSidebar, setShowSidebar] = useState(() => window.innerWidth >= 1024);
  
  const [activeHint, setActiveHint] = useState('');
  const [showHintModal, setShowHintModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [voiceDropdownOpen, setVoiceDropdownOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const [settings, setSettings] = useState({
    voice: 'en-US-JennyNeural',
    voiceSpeed: 1.0,
    autoPlay: true,
    targetRole: '',
    targetCompany: '',
    preferredModel: 'gemini',
  });

  const chatEndRef = useRef(null);

  const {
    messages, isLoading, isPlaying, feedback, activeModel,
    modelPreference, changeModelPreference, isApiLimitReached, mode, difficulty, error,
    sendMessage, processAudio, playAudio, stopAudio, startSession, loadSession, clearSession, setMode, setDifficulty,
  } = useInterview();

  const difficultyContainerRef = useRef(null);
  const [difficultyIndicator, setDifficultyIndicator] = useState({ left: 0, width: 0, height: 0, opacity: 0 });
  const [hoveredDifficulty, setHoveredDifficulty] = useState(null);
  const activeDifficulty = hoveredDifficulty || difficulty;

  // Update difficulty indicator coordinates dynamically
  useEffect(() => {
    const updateIndicator = () => {
      const container = difficultyContainerRef.current;
      if (!container) return;

      const activeChild = container.querySelector('[data-active="true"]');
      if (activeChild) {
        setDifficultyIndicator({
          left: activeChild.offsetLeft,
          width: activeChild.offsetWidth,
          height: activeChild.offsetHeight,
          opacity: 1,
        });
      } else {
        setDifficultyIndicator(prev => ({ ...prev, opacity: 0 }));
      }
    };

    updateIndicator();

    window.addEventListener('resize', updateIndicator);
    return () => {
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeDifficulty]);

  const modelPreferenceContainerRef = useRef(null);
  const [modelPreferenceIndicator, setModelPreferenceIndicator] = useState({ top: 0, height: 0, opacity: 0 });
  const [hoveredModelPreference, setHoveredModelPreference] = useState(null);
  const activeModelPreference = hoveredModelPreference || modelPreference;

  const getDisplayedActiveModel = () => {
    if (activeModelPreference === 'gpt2' || activeModelPreference === 'local') {
      return 'Local DistilGPT2';
    }
    if (activeModelPreference === 'svm') {
      return 'Local SVM Classifier';
    }
    // Cloud Tier: check settings
    try {
      const settingsStr = localStorage.getItem('vai_settings');
      const settings = settingsStr ? JSON.parse(settingsStr) : {};
      const preferredModel = settings.preferredModel || 'gemini';
      if (preferredModel === 'openai_gpt4') {
        return 'GPT-4o';
      }
      if (preferredModel === 'openai') {
        return 'GPT-4o Mini';
      }
    } catch (_) {}
    return 'Gemini 2.5 Flash';
  };
  const displayedActiveModel = getDisplayedActiveModel();

  // Update model preference indicator coordinates dynamically (vertical Y-axis movement)
  useEffect(() => {
    const updateIndicator = () => {
      const container = modelPreferenceContainerRef.current;
      if (!container) return;

      const activeChild = container.querySelector('[data-active="true"]');
      if (activeChild) {
        setModelPreferenceIndicator({
          top: activeChild.offsetTop,
          height: activeChild.offsetHeight,
          opacity: 1,
        });
      } else {
        setModelPreferenceIndicator(prev => ({ ...prev, opacity: 0 }));
      }
    };

    updateIndicator();

    window.addEventListener('resize', updateIndicator);
    return () => {
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeModelPreference]);


  const inputModeContainerRef = useRef(null);
  const [inputModeIndicator, setInputModeIndicator] = useState({ left: 0, width: 0, height: 0, opacity: 0 });
  const [hoveredInputMode, setHoveredInputMode] = useState(null);
  const activeInputMode = hoveredInputMode || inputMode;

  // Update input mode indicator coordinates dynamically
  useEffect(() => {
    const updateIndicator = () => {
      const container = inputModeContainerRef.current;
      if (!container) return;

      const activeChild = container.querySelector('[data-active="true"]');
      if (activeChild) {
        setInputModeIndicator({
          left: activeChild.offsetLeft,
          width: activeChild.offsetWidth,
          height: activeChild.offsetHeight,
          opacity: 1,
        });
      } else {
        setInputModeIndicator(prev => ({ ...prev, opacity: 0 }));
      }
    };

    updateIndicator();

    window.addEventListener('resize', updateIndicator);
    return () => {
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeInputMode, sessionStarted]);

  const controlsContainerRef = useRef(null);
  const [controlsIndicator, setControlsIndicator] = useState({ left: 0, width: 0, height: 0, opacity: 0 });
  const [hoveredControl, setHoveredControl] = useState(null);

  // Update controls sliding indicator dynamically
  useEffect(() => {
    const updateIndicator = () => {
      const container = controlsContainerRef.current;
      if (!container) return;

      const activeChild = container.querySelector('[data-active="true"]');
      if (activeChild) {
        setControlsIndicator({
          left: activeChild.offsetLeft,
          width: activeChild.offsetWidth,
          height: activeChild.offsetHeight,
          opacity: 1,
        });
      } else {
        setControlsIndicator(prev => ({ ...prev, opacity: 0 }));
      }
    };

    updateIndicator();

    window.addEventListener('resize', updateIndicator);
    return () => {
      window.removeEventListener('resize', updateIndicator);
    };
  }, [hoveredControl]);

  const {
    isRecording, audioBlob, error: recorderError, volume,
    startRecording, stopRecording, resetRecording,
  } = useVoiceRecorder();

  // Load settings from localStorage
  useEffect(() => {
    const loadSettings = () => {
      const saved = localStorage.getItem('vai_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSettings(prev => ({
            ...prev,
            ...parsed,
            preferredModel: parsed.preferredModel || 'gemini'
          }));
        } catch (e) {
          console.error(e);
        }
      }
    };
    loadSettings();
    window.addEventListener('vai_settings_updated', loadSettings);
    return () => window.removeEventListener('vai_settings_updated', loadSettings);
  }, []);

  // Initialize mode from URL search parameters on fresh load
  useEffect(() => {
    const sessionIdParam = searchParams.get('session_id');
    if (!sessionIdParam && initialMode) {
      setMode(initialMode);
    }
  }, [initialMode, searchParams, setMode]);

  const updateSetting = (key, value) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('vai_settings', JSON.stringify(updated));
      return updated;
    });
  };

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
      loadSession(sessionIdParam, modeParam || 'dsa').then(data => {
        if (data) {
          if (data.target_role !== undefined) updateSetting('targetRole', data.target_role || '');
          if (data.target_company !== undefined) updateSetting('targetCompany', data.target_company || '');
        }
      });
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
        if (!isNaN(firstTime) && !isNaN(lastTime)) {
          const diffSeconds = Math.max(0, Math.floor((lastTime - firstTime) / 1000));
          setTimerSeconds(diffSeconds);
        }
      }
    }
  }, [messages, sessionStarted]);

  // Interview Timer
  useEffect(() => {
    let interval = null;
    if (sessionStarted && !isLoading && !isPaused) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [sessionStarted, isLoading, isPaused]);

  // Close preferences dropdown on outside click
  useEffect(() => {
    const handler = e => {
      if (!e.target.closest('#preferences-container')) {
        setShowSettingsModal(false);
        setVoiceDropdownOpen(false);
      }
    };
    if (showSettingsModal) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [showSettingsModal]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleMicClick = () => {
    if (isPaused) return;
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
    setIsPaused(false);
    resetRecording();
  };

  const handleTogglePause = () => {
    setIsPaused(v => !v);
    stopAudio();
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
  const isHintSkipActive = lastMsgIsAssistant && !isLoading;

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
    <div className="pt-20 h-[100dvh] flex overflow-hidden relative">

      {/* ── Sidebar Backdrop (only on mobile/tablet to close sidebar by clicking outside) ── */}
      {showSidebar && (
        <div 
          onClick={() => setShowSidebar(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden block"
          style={{ top: '80px' }}
        />
      )}

      {/* ── Sidebar Deck ── */}
      <aside className={`fixed lg:relative top-20 lg:top-0 left-0 bottom-0 h-[calc(100dvh-80px)] lg:h-full flex-shrink-0 transition-all duration-300 ${showSidebar ? 'w-72' : 'w-0 overflow-hidden'} z-30 lg:z-20 bg-surface/98 lg:bg-transparent shadow-[20px_0_50px_rgba(0,0,0,0.8)] lg:shadow-none`}>
        <div className="h-full border-r border-border/80 bg-[#0c1122]/95 lg:bg-void/40 p-5 flex flex-col gap-5 overflow-y-auto w-72 scrollbar-thin">
          
          <div>
            <h2 className="font-display font-extrabold text-white text-xs mb-1 tracking-wider uppercase">Interview Module</h2>
            <p className="text-[9px] text-text-muted font-mono tracking-widest uppercase mb-3.5">Configure protocol type</p>
            <ModeSelector
              selected={mode}
              onChange={setMode}
              disabled={sessionStarted || messages.length > 0}
            />
          </div>

          {!(sessionStarted || messages.length > 0) ? (
            <div className="space-y-3 font-mono text-[11px]">
              <div>
                <p className="text-[9px] text-text-muted mb-1.5 font-bold tracking-widest uppercase">Target Job Role</p>
                <input
                  type="text"
                  placeholder="e.g. Frontend Engineer"
                  value={settings.targetRole || ''}
                  onChange={(e) => updateSetting('targetRole', e.target.value)}
                  className="w-full input-target-personalization"
                />
              </div>
              <div>
                <p className="text-[9px] text-text-muted mb-1.5 font-bold tracking-widest uppercase">Target Company</p>
                <input
                  type="text"
                  placeholder="e.g. Google"
                  value={settings.targetCompany || ''}
                  onChange={(e) => updateSetting('targetCompany', e.target.value)}
                  className="w-full input-target-personalization"
                />
              </div>
            </div>
          ) : (
            (settings.targetRole || settings.targetCompany) && (
              <div className="p-3 bg-void/25 border border-white/[0.06] rounded-2xl space-y-1.5 font-mono text-[10px]">
                <span className="text-text-muted uppercase tracking-widest font-bold block">Target Profile</span>
                {settings.targetRole && (
                  <div className="text-white">
                    <span className="text-accent font-semibold">Role:</span> {settings.targetRole}
                  </div>
                )}
                {settings.targetCompany && (
                  <div className="text-white">
                    <span className="text-accent font-semibold">Company:</span> {settings.targetCompany}
                  </div>
                )}
              </div>
            )
          )}

          {/* Difficulty Selector */}
          <div className="font-mono">
            <p className="text-[9px] text-text-muted mb-2 font-bold tracking-widest uppercase">Difficulty Level</p>
            <div className={`flex rounded-full relative border border-white/[0.08] bg-white/[0.04] p-1 text-[11px] card-liquid transition-all duration-300 ${!(sessionStarted || messages.length > 0) ? 'hover:border-accent/35 hover:shadow-[0_0_20px_rgba(0,210,255,0.06)]' : 'opacity-60'}`} ref={difficultyContainerRef}>
              {/* iOS Liquid Sliding Tab Indicator — Color-coded by difficulty */}
              <div
                className="absolute left-0 top-1/2 rounded-full pointer-events-none transition-all duration-300"
                style={{
                  willChange: 'transform, width, height, background-color, border-color, box-shadow',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  backgroundColor: (
                    activeDifficulty === 'easy'   ? 'rgba(16,185,129,0.09)' :
                    activeDifficulty === 'medium' ? 'rgba(0,210,255,0.09)'  :
                                                    'rgba(239,68,68,0.09)'
                  ),
                  borderColor: (
                    activeDifficulty === 'easy'   ? 'rgba(16,185,129,0.30)' :
                    activeDifficulty === 'medium' ? 'rgba(0,210,255,0.35)'  :
                                                    'rgba(239,68,68,0.35)'
                  ),
                  boxShadow: (
                    activeDifficulty === 'easy'   ? '0 0 15px rgba(16,185,129,0.12)' :
                    activeDifficulty === 'medium' ? '0 0 15px rgba(0,210,255,0.12)'  :
                                                    '0 0 15px rgba(239,68,68,0.12)'
                  ),
                  transform: `translate3d(${difficultyIndicator.left}px, -50%, 0)`,
                  width: `${difficultyIndicator.width}px`,
                  height: `${difficultyIndicator.height}px`,
                  opacity: difficultyIndicator.opacity,
                  transition: 'transform 380ms cubic-bezier(0.25,1,0.5,1), width 380ms cubic-bezier(0.25,1,0.5,1), height 380ms cubic-bezier(0.25,1,0.5,1), opacity 380ms cubic-bezier(0.25,1,0.5,1), background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
                }}
              />
              {['easy', 'medium', 'hard'].map(d => {
                const isActive = activeDifficulty === d;
                
                const getActiveTextClass = () => {
                  if (d === 'easy')   return 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.25)]';
                  if (d === 'medium') return 'text-accent shadow-glow';
                  return 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.25)]';
                };

                return (
                  <button
                    key={d}
                    data-active={isActive}
                    disabled={sessionStarted || messages.length > 0}
                    onMouseEnter={() => setHoveredDifficulty(d)}
                    onMouseLeave={() => setHoveredDifficulty(null)}
                    onMouseDown={(e) => { e.preventDefault(); setDifficulty(d); }}
                    className={`flex-1 py-2 rounded-full text-xs font-semibold tracking-wide btn-liquid z-10 relative transition-all duration-300 capitalize text-center ${
                      isActive
                        ? getActiveTextClass()
                        : 'text-text-secondary hover:text-white disabled:opacity-30'
                    }`}
                    style={{ border: 'none', background: 'transparent' }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model Switcher Selector — Vertical stack for clean spacing */}
          <div className="font-mono">
            <p className="text-[9px] text-text-muted mb-2 font-bold tracking-widest uppercase">AI Model Engine</p>
            <div className={`flex flex-col gap-1 rounded-2xl relative border border-white/[0.08] bg-white/[0.04] p-1 text-[11px] card-liquid transition-all duration-300 ${(sessionStarted || messages.length > 0) ? 'opacity-60' : 'hover:border-accent/35 hover:shadow-[0_0_20px_rgba(0,210,255,0.06)]'}`} ref={modelPreferenceContainerRef}>
              {/* iOS Liquid Sliding Tab Indicator — Vertical translation anchored at top-0 */}
              <div
                className="absolute top-0 left-1 right-1 rounded-xl pointer-events-none transition-all duration-300"
                style={{
                  willChange: 'transform, height, background-color, border-color, box-shadow',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  backgroundColor: 'rgba(0,210,255,0.09)',
                  borderColor: 'rgba(0,210,255,0.35)',
                  boxShadow: '0 0 15px rgba(0,210,255,0.12)',
                  transform: `translate3d(0, ${modelPreferenceIndicator.top}px, 0)`,
                  height: `${modelPreferenceIndicator.height}px`,
                  opacity: modelPreferenceIndicator.opacity,
                  transition: 'transform 320ms cubic-bezier(0.25,1,0.5,1), height 320ms cubic-bezier(0.25,1,0.5,1), opacity 300ms ease, background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
                }}
              />

              {['cloud', 'gpt2', 'svm'].map(pref => {
                const isActive = activeModelPreference === pref || (pref === 'gpt2' && activeModelPreference === 'local');
                const isCloudDisabled = pref === 'cloud' && isApiLimitReached;
                const isSwitcherDisabled = sessionStarted || messages.length > 0;
                const isDisabled = isCloudDisabled || isSwitcherDisabled;
                
                const getLabel = () => {
                  if (pref === 'cloud') return 'Cloud Tier';
                  if (pref === 'gpt2') return 'Local Tier';
                  return 'Fallback Tier';
                };

                const getActiveTextClass = () => {
                  return 'text-accent shadow-glow';
                };

                const getIcon = () => {
                  if (pref === 'cloud') {
                    return (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={isActive ? 'text-accent' : 'text-text-muted transition-colors'}>
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                        <path d="M2 12l10 5 10-5"/>
                      </svg>
                    );
                  }
                  if (pref === 'gpt2') {
                    return (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={isActive ? 'text-accent' : 'text-text-muted transition-colors'}>
                        <rect x="2" y="2" width="20" height="8" rx="2"/>
                        <rect x="2" y="14" width="20" height="8" rx="2"/>
                        <line x1="6" y1="6" x2="6.01" y2="6"/>
                        <line x1="6" y1="18" x2="6.01" y2="18"/>
                      </svg>
                    );
                  }
                  return (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={isActive ? 'text-accent' : 'text-text-muted transition-colors'}>
                      <line x1="18" y1="20" x2="18" y2="10"/>
                      <line x1="12" y1="20" x2="12" y2="4"/>
                      <line x1="6" y1="20" x2="6" y2="14"/>
                      <polyline points="2 7 6 3 10 7"/>
                    </svg>
                  );
                };
                
                return (
                  <button
                    key={pref}
                    data-active={isActive}
                    disabled={isDisabled}
                    onMouseEnter={() => setHoveredModelPreference(pref)}
                    onMouseLeave={() => setHoveredModelPreference(null)}
                    onMouseDown={(e) => { 
                      e.preventDefault(); 
                      if (!isDisabled) {
                        changeModelPreference(pref);
                        updateSetting('preferredModel', pref);
                      }
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide btn-liquid z-10 relative transition-all duration-300 flex items-center justify-center gap-2.5 text-center ${
                      isActive
                        ? getActiveTextClass()
                        : 'text-text-secondary bg-white/[0.01] hover:text-white disabled:opacity-25 disabled:cursor-not-allowed'
                    }`}
                    style={{ border: 'none', background: 'transparent' }}
                    title={
                      isSwitcherDisabled
                        ? 'Cannot change engine during active session'
                        : isCloudDisabled
                        ? 'API rate limit reached or key invalid'
                        : `Switch to ${getLabel()} engine`
                    }
                  >
                    {getIcon()}
                    <span>{getLabel()}</span>
                  </button>
                );
              })}
            </div>


            {isApiLimitReached && (
              <span className="text-[8px] text-red-400 font-bold block mt-1 tracking-wide animate-pulse">
                ⚠️ API Limit Reached — Locked to Local
              </span>
            )}
          </div>
          {/* Session controllers */}
          <div className="space-y-2.5 font-mono text-[11px]">
            {!sessionStarted ? (
              messages.length > 0 ? (
                <button
                  onMouseDown={(e) => { e.preventDefault(); handleResumeSessionClick(); }}
                  className="w-full py-3.5 text-white font-extrabold rounded-2xl btn-liquid-glass uppercase tracking-wider"
                >
                  Resume Interview
                </button>
              ) : (
                <button
                  onMouseDown={(e) => { e.preventDefault(); handleStartSession(); }}
                  className="w-full py-3.5 text-white font-extrabold rounded-2xl btn-liquid-glass uppercase tracking-wider"
                >
                  Start Session
                </button>
              )
            ) : (
              <div className="flex gap-3 w-full">
                <button
                  onMouseDown={(e) => { e.preventDefault(); handleClearSession(); }}
                  className="flex-1 py-3.5 rounded-2xl btn-liquid-glass-danger uppercase tracking-wider text-xs font-extrabold"
                >
                  End Session
                </button>
                <button
                  onMouseDown={(e) => { e.preventDefault(); handleTogglePause(); }}
                  className={`flex-1 py-3.5 text-white font-extrabold rounded-2xl uppercase tracking-wider text-xs transition-all duration-300 flex items-center justify-center gap-1.5 ${
                    isPaused ? 'btn-liquid-glass bg-amber-500/25 border-amber-500/50 hover:bg-amber-500/35' : 'btn-liquid-glass'
                  }`}
                >
                  {isPaused ? '▶ Resume' : '⏸ Pause'}
                </button>
              </div>
            )}
          </div>

          {sessionStarted && (
            <div className="font-mono">
              <p className="text-[9px] text-text-muted mb-2 font-bold tracking-widest uppercase">Input Mode</p>
              <div className="flex rounded-full relative border border-white/[0.08] bg-white/[0.04] p-1 text-[11px] card-liquid hover:border-accent/35 hover:shadow-[0_0_20px_rgba(0,210,255,0.06)] transition-all duration-300" ref={inputModeContainerRef}>
                {/* iOS Liquid Sliding Tab Indicator */}
                <div
                  className="absolute left-0 top-1/2 bg-accent/[0.10] border border-accent/30 rounded-full pointer-events-none shadow-[0_0_15px_rgba(0,210,255,0.06)]"
                  style={{
                    transform: `translate3d(${inputModeIndicator.left}px, -50%, 0)`,
                    width: `${inputModeIndicator.width}px`,
                    height: `${inputModeIndicator.height}px`,
                    opacity: inputModeIndicator.opacity,
                    transition: 'transform 380ms cubic-bezier(0.25,1,0.5,1), width 380ms cubic-bezier(0.25,1,0.5,1), height 380ms cubic-bezier(0.25,1,0.5,1), opacity 380ms cubic-bezier(0.25,1,0.5,1)',
                  }}
                />
                {['voice', 'text'].map(m => {
                  const isActive = activeInputMode === m;
                  return (
                    <button
                      key={m}
                      data-active={isActive}
                      onMouseEnter={() => setHoveredInputMode(m)}
                      onMouseLeave={() => setHoveredInputMode(null)}
                      onMouseDown={(e) => { e.preventDefault(); setInputMode(m); }}
                      className={`flex-1 py-1.5 rounded-full text-xs font-semibold tracking-wide btn-liquid z-10 relative border transition-all duration-300 capitalize text-center ${
                        isActive
                          ? 'border-transparent text-accent'
                          : 'border-white/[0.06] text-text-secondary bg-white/[0.03] hover:border-accent/30 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      {m === 'voice' ? '🎙️ Voice' : '✍️ Text'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Diagnostics summary metrics */}
          {(sessionStarted || messages.length > 0) && (
            <div className="bg-white/[0.03] rounded-2xl p-4 space-y-2.5 text-[10px] border border-white/[0.06] font-mono card-liquid hover:bg-white/[0.06] hover:border-accent/30 hover:shadow-[0_0_20px_rgba(0,210,255,0.06)]">
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
              <div className="flex justify-between items-center pt-2 border-t border-white/[0.06]">
                <span className="text-text-secondary">ACTIVE MODEL</span>
                <span className="text-white font-bold flex items-center gap-1.5">
                  <span className="text-xs">{getModelIcon(displayedActiveModel)}</span>
                  <span>{displayedActiveModel}</span>
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
      <div className="flex-1 flex flex-col overflow-hidden bg-transparent relative z-10">
        
        {/* Workspace Floating Header (Split 2-Part Design) */}
        <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between font-mono bg-transparent z-20 gap-3 md:gap-4">
          
          {/* Left Pill Group */}
          <div className="flex items-center gap-3">
            <div className="bg-[#08080a]/10 backdrop-blur-[2px] border border-white/[0.06] rounded-full px-3 py-1.5 flex items-center gap-4 shadow-glass card-liquid hover:border-accent/35 hover:shadow-[0_0_15px_rgba(0,210,255,0.06)]">
              <button
                onClick={() => setShowSidebar(v => !v)}
                className="w-8 h-8 rounded-full hover:bg-white/5 border border-transparent hover:border-border flex items-center justify-center text-text-secondary hover:text-white btn-liquid"
                title="Toggle settings panel"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>

              <div className="flex items-center gap-2.5 pr-2">
                <div className={`w-2 h-2 rounded-full ${sessionStarted ? (isPaused ? 'bg-amber-500 shadow-none' : 'bg-accent animate-pulse shadow-glow') : 'bg-red-500'}`} />
                <span className="text-[10px] font-bold tracking-wider text-white hidden sm:inline">
                  {sessionStarted ? (isPaused ? 'SESSION PAUSED' : 'SESSION ACTIVE') : 'STANDBY'}
                </span>
                {(sessionStarted || messages.length > 0) && (
                  <span className="text-[9.5px] bg-accent/15 border border-accent/25 text-accent px-2.5 py-0.5 rounded-full ml-1 font-bold font-mono">
                    ⏱ {formatTime(timerSeconds)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Pill Group */}
          <div id="preferences-container" className="bg-[#08080a]/10 backdrop-blur-[2px] border border-white/[0.06] rounded-full p-1.5 flex items-center gap-2 shadow-glass card-liquid hover:border-accent/35 hover:shadow-[0_0_15px_rgba(0,210,255,0.06)] relative">
            {isPlaying && (
              <button
                onClick={stopAudio}
                className="px-3.5 py-1.5 text-[10px] text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 bg-red-500/5 rounded-full flex items-center gap-1.5 btn-liquid font-bold uppercase tracking-wider"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                Pause TTS
              </button>
            )}

            {/* Settings Trigger Gear Button */}
            <button
              onClick={() => setShowSettingsModal(v => !v)}
              className="w-8 h-8 rounded-full hover:bg-white/5 border border-transparent hover:border-border flex items-center justify-center text-text-secondary hover:text-white btn-liquid"
              title="Adjust preferences"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>

            {/* Dropdown Preferences Modal */}
            {showSettingsModal && (
              <div className="absolute right-0 top-full mt-3 w-72 bg-[#08080a]/35 backdrop-blur-[2px] rounded-3xl border border-accent/30 p-5 shadow-glow z-50 animate-scale-in text-white">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="absolute top-4 right-4 text-text-muted hover:text-white btn-liquid text-sm"
                >
                  ✕
                </button>
                <div className="flex items-center gap-2.5 mb-6">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  <h4 className="font-display font-bold text-white text-sm tracking-wide uppercase">Preferences</h4>
                </div>

                <div className="space-y-5">
                  {/* Voice select */}
                  <div className="space-y-2 text-left relative">
                    <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-wider block">AI Voice Model</label>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); setVoiceDropdownOpen(v => !v); }}
                      className="w-full bg-void/50 border border-border/85 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-accent/60 transition-colors font-sans flex items-center justify-between hover:border-accent/30"
                    >
                      <span>{VOICE_LABELS[settings.voice || 'en-US-JennyNeural']}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-200 ${voiceDropdownOpen ? 'rotate-180' : ''}`}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                    
                    {voiceDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-[#08080a] border border-border/85 rounded-xl overflow-hidden z-[60] shadow-2xl p-1 space-y-0.5 animate-scale-in">
                        {Object.entries(VOICE_LABELS).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              updateSetting('voice', value);
                              setVoiceDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-[11px] rounded-lg transition-colors hover:bg-accent/10 hover:text-accent font-sans ${
                              (settings.voice || 'en-US-JennyNeural') === value ? 'text-accent bg-accent/5 font-semibold' : 'text-text-secondary'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Model select */}
                  <div className="space-y-2 text-left relative">
                    <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-wider block">AI Interviewer Model</label>
                    <button
                      type="button"
                      disabled={sessionStarted || messages.length > 0}
                      onMouseDown={(e) => { 
                        e.preventDefault(); 
                        if (!(sessionStarted || messages.length > 0)) {
                          setModelDropdownOpen(v => !v); 
                        }
                      }}
                      className="w-full bg-void/50 border border-border/85 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-accent/60 transition-colors font-sans flex items-center justify-between hover:border-accent/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>{MODEL_LABELS[settings.preferredModel || 'gemini']}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-200 ${modelDropdownOpen ? 'rotate-180' : ''}`}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                    
                    {modelDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-[#08080a] border border-border/85 rounded-xl overflow-hidden z-[60] shadow-2xl p-1 space-y-0.5 animate-scale-in">
                        {Object.entries(MODEL_LABELS).map(([value, label]) => {
                          const isCloud = value === 'gemini' || value === 'openai' || value === 'openai_gpt4';
                          const isCloudDisabled = isCloud && isApiLimitReached;
                          
                          return (
                            <button
                              key={value}
                              type="button"
                              disabled={isCloudDisabled}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                if (!isCloudDisabled) {
                                  updateSetting('preferredModel', value);
                                  changeModelPreference(isCloud ? 'cloud' : 'local');
                                  setModelDropdownOpen(false);
                                }
                              }}
                              className={`w-full px-3 py-2 text-left text-[11px] rounded-lg transition-colors hover:bg-accent/10 hover:text-accent font-sans disabled:opacity-25 disabled:cursor-not-allowed ${
                                (settings.preferredModel || 'gemini') === value ? 'text-accent bg-accent/5 font-semibold' : 'text-text-secondary'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Voice Speed */}
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold text-text-secondary uppercase tracking-wider">
                      <span>Speech Speed</span>
                      <span className="text-accent font-semibold">{settings.voiceSpeed || 1.0}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="1.5"
                      step="0.05"
                      value={settings.voiceSpeed || 1.0}
                      onChange={e => updateSetting('voiceSpeed', parseFloat(e.target.value))}
                      className="w-full h-1 bg-void/50 rounded-lg appearance-none cursor-pointer accent-accent"
                    />
                  </div>

                  {/* Auto play */}
                  <div className="flex items-center justify-between p-3.5 bg-void/10 border border-border/85 rounded-2xl">
                    <div className="text-left font-sans">
                      <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-wider block">Autoplay Audio</label>
                      <span className="text-[9.5px] text-text-muted font-mono">Speak responses automatically</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={settings.autoPlay !== false}
                        onChange={e => updateSetting('autoPlay', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-void/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-secondary after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent peer-checked:after:bg-void/50" />
                    </label>
                  </div>
                </div>

                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="w-full py-3 text-xs font-mono font-bold rounded-xl btn-liquid-glass tracking-wider uppercase mt-6"
                >
                  Save Settings
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Workspace Chat Console */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 scrollbar-thin">
          {!sessionStarted && messages.length === 0 ? (
            <EmptyState selectedMode={mode} onStart={handleStartSession} />
          ) : (
            <>
              {messages.map(msg => (
                <ChatBubble key={msg.id} message={msg} playAudio={playAudio} />
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
          <div className="bg-transparent px-4 py-5 font-mono">
            {inputMode === 'voice' ? (
              <div className="flex flex-col items-center gap-4 relative">
                <div className="flex items-center justify-center gap-4 sm:gap-8 w-full">
                  <button
                    onMouseDown={(e) => { e.preventDefault(); handleGetHint(); }}
                    disabled={!isHintSkipActive}
                    className={`px-5 py-2 border text-xs font-semibold rounded-full btn-liquid flex items-center gap-2 font-sans
                      ${isHintSkipActive
                        ? "border-accent/30 bg-transparent text-accent hover:border-accent/60 hover:bg-accent/8 hover:text-white cursor-pointer shadow-[0_0_12px_rgba(0,210,255,0.06)]"
                        : "opacity-25 pointer-events-none border-white/[0.06] bg-transparent text-text-muted"
                      }`}
                    title={isHintSkipActive ? "Request Hint" : "Hint unavailable"}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={isHintSkipActive ? "text-accent" : "text-text-muted"}>
                      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/>
                    </svg>
                    Hint
                  </button>

                   <MicButton
                    isRecording={isRecording}
                    isLoading={isLoading}
                    isPaused={isPaused}
                    onClick={handleMicClick}
                    volume={volume}
                  />

                  <button
                    onMouseDown={(e) => { e.preventDefault(); sendMessage('next question'); }}
                    disabled={!isHintSkipActive}
                    className={`px-5 py-2 border text-xs font-semibold rounded-full btn-liquid flex items-center gap-2 font-sans
                      ${isHintSkipActive
                        ? "border-indigo-500/30 bg-transparent text-indigo-400 hover:border-indigo-500/60 hover:bg-indigo-500/8 hover:text-white cursor-pointer shadow-[0_0_12px_rgba(99,102,241,0.06)]"
                        : "opacity-25 pointer-events-none border-white/[0.06] bg-transparent text-text-muted"
                      }`}
                    title={isHintSkipActive ? "Skip question" : "Skip unavailable"}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={isHintSkipActive ? "text-indigo-400" : "text-text-muted"}>
                      <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
                    </svg>
                    Skip
                  </button>
                </div>

                {/* Inline Mode Switch button */}
                <button
                  onMouseDown={(e) => { e.preventDefault(); setInputMode('text'); }}
                  className="mt-1 text-[10px] font-mono tracking-wider text-text-muted hover:text-accent flex items-center gap-1.5 px-3 py-1 rounded-full border border-transparent hover:border-accent/20 hover:bg-accent/5 btn-liquid"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Switch to Keyboard Input
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 max-w-4xl mx-auto w-full">
                <form onSubmit={handleTypingSubmit} className="flex gap-2.5 w-full items-center">
                   <input
                    type="text"
                    value={typingText}
                    onChange={e => setTypingText(e.target.value)}
                    placeholder={isPaused ? "Session is paused. Click Resume to continue..." : "Type your response here..."}
                    disabled={isLoading || isPaused}
                    className="flex-1 bg-transparent border border-white/[0.06] rounded-full px-5 py-3 text-xs text-white placeholder:text-text-muted focus:outline-none focus:border-accent/80 focus:shadow-[0_0_15px_rgba(0,210,255,0.1)] transition-all disabled:opacity-50 font-sans min-w-0 input-keyboard-response"
                  />
                  
                  <div className="flex items-center gap-1.5 relative p-1 rounded-full border border-white/[0.08] bg-white/[0.02] card-liquid hover:border-accent/35 hover:shadow-[0_0_20px_rgba(0,210,255,0.06)] transition-all duration-300" ref={controlsContainerRef}>
                    {/* iOS Liquid Sliding Tab Indicator */}
                    <div
                      className="absolute left-0 top-1/2 bg-accent/[0.10] border border-accent/30 rounded-full pointer-events-none shadow-[0_0_15px_rgba(0,210,255,0.06)]"
                      style={{
                        transform: `translate3d(${controlsIndicator.left}px, -50%, 0)`,
                        width: `${controlsIndicator.width}px`,
                        height: `${controlsIndicator.height}px`,
                        opacity: controlsIndicator.opacity,
                        transition: 'transform 380ms cubic-bezier(0.25,1,0.5,1), width 380ms cubic-bezier(0.25,1,0.5,1), height 380ms cubic-bezier(0.25,1,0.5,1), opacity 380ms cubic-bezier(0.25,1,0.5,1)',
                      }}
                    />

                    <button
                      type="button"
                      data-active={hoveredControl === 'hint'}
                      onMouseEnter={() => isHintSkipActive && setHoveredControl('hint')}
                      onMouseLeave={() => setHoveredControl(null)}
                      onMouseDown={(e) => { e.preventDefault(); handleGetHint(); }}
                      disabled={!isHintSkipActive}
                      className={`px-4 py-2 text-xs font-semibold rounded-full btn-liquid relative z-10 flex items-center gap-1.5 font-sans border transition-all duration-300
                        ${isHintSkipActive
                          ? (hoveredControl === 'hint'
                              ? "border-transparent text-accent hover:text-white"
                              : "border-white/[0.06] text-text-secondary bg-white/[0.03] hover:border-accent/30 hover:bg-white/[0.06] hover:text-white cursor-pointer"
                            )
                          : "opacity-25 pointer-events-none border-white/[0.06] text-text-muted bg-white/[0.01]"
                        }`}
                      title={isHintSkipActive ? "Request Hint" : "Hint unavailable"}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={isHintSkipActive ? (hoveredControl === 'hint' ? "text-accent animate-pulse" : "text-text-secondary") : "text-text-muted"}>
                        <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/>
                      </svg>
                      <span className="hidden sm:inline">Hint</span>
                    </button>
                    
                    <button
                      type="button"
                      data-active={hoveredControl === 'skip'}
                      onMouseEnter={() => isHintSkipActive && setHoveredControl('skip')}
                      onMouseLeave={() => setHoveredControl(null)}
                      onMouseDown={(e) => { e.preventDefault(); sendMessage('next question'); }}
                      disabled={!isHintSkipActive}
                      className={`px-4 py-2 text-xs font-semibold rounded-full btn-liquid relative z-10 flex items-center gap-1.5 font-sans border transition-all duration-300
                        ${isHintSkipActive
                          ? (hoveredControl === 'skip'
                              ? "border-transparent text-indigo-400 hover:text-white"
                              : "border-white/[0.06] text-text-secondary bg-white/[0.03] hover:border-indigo-500/30 hover:bg-white/[0.06] hover:text-white cursor-pointer"
                            )
                          : "opacity-25 pointer-events-none border-white/[0.06] text-text-muted bg-white/[0.01]"
                        }`}
                      title={isHintSkipActive ? "Skip question" : "Skip unavailable"}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={isHintSkipActive ? (hoveredControl === 'skip' ? "text-indigo-400" : "text-text-secondary") : "text-text-muted"}>
                        <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
                      </svg>
                      <span className="hidden sm:inline">Skip</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isLoading || !typingText.trim()}
                      className={`px-5 py-2 text-xs font-bold rounded-full relative z-10 uppercase tracking-wider border transition-all duration-300
                        ${!(isLoading || !typingText.trim())
                          ? "btn-liquid-glass-accent cursor-pointer"
                          : "opacity-25 pointer-events-none border-white/[0.06] text-text-muted bg-white/[0.01]"
                        }`}
                    >
                      Send
                    </button>
                  </div>
                </form>

                {/* Inline Mode Toggle Link below the text input form */}
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setInputMode('voice'); }}
                  className="text-[10px] font-mono tracking-wider text-text-muted hover:text-accent flex items-center gap-1.5 px-3 py-1 rounded-full border border-transparent hover:border-accent/20 hover:bg-accent/5 btn-liquid"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  </svg>
                  Switch to Voice Input
                </button>
              </div>
            )}
          </div>
        ) : (
          messages.length > 0 && (
            <div className="bg-transparent px-4 py-6 flex flex-col items-center gap-3 font-mono">
              <button
                onClick={handleResumeSessionClick}
                className="px-8 py-3.5 text-xs font-bold rounded-xl btn-liquid-glass uppercase"
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
              className="absolute top-4 right-4 text-text-muted hover:text-white btn-liquid text-sm"
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
              className="w-full py-3 text-xs font-mono font-bold rounded-xl btn-liquid-glass tracking-wider uppercase"
            >
              Close Portal
            </button>
          </div>
        </div>
      )}


    </div>
  );
}

const WORKSPACE_CONFIGS = {
  dsa: {
    title: "INITIALIZE DSA WORKSPACE",
    description: "Configure recursion, sorting, tree structures, and Big-O complexity parameters from the side menu to begin your technical mock session.",
    focus: ["Big-O Complexity Analysis", "Recursive Logic Tracing", "Graph & Tree Traversal"],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
        <circle cx="12" cy="5" r="2.5" />
        <circle cx="5" cy="12" r="2.5" />
        <circle cx="19" cy="12" r="2.5" />
        <circle cx="12" cy="19" r="2.5" />
        <line x1="12" y1="7.5" x2="5" y2="12" />
        <line x1="12" y1="7.5" x2="19" y2="12" />
        <line x1="5" y1="12" x2="12" y2="19" />
        <line x1="19" y1="12" x2="12" y2="19" />
        <line x1="12" y1="7.5" x2="12" y2="16.5" />
      </svg>
    )
  },
  hr: {
    title: "INITIALIZE BEHAVIORAL WORKSPACE",
    description: "Prepare to align with the STAR framework (Situation, Task, Action, Result), situational queries, leadership principles, and communication metrics.",
    focus: ["Situation & Task framing", "Action & Resolution strategies", "Leadership Core Principles"],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <path d="M8 10h.01M12 10h.01M16 10h.01" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    )
  },
  system_design: {
    title: "INITIALIZE SYSTEM DESIGN WORKSPACE",
    description: "Assess scalable databases, data replication schemes, load balancing, API gateways, CDN caching, and microservices architecture.",
    focus: ["Database Sharding & Replication", "Load Balancing & CDN Caching", "API Gateway & Routing Topology"],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
        <rect x="2" y="2" width="20" height="6" rx="1"/>
        <rect x="2" y="9" width="20" height="6" rx="1"/>
        <rect x="2" y="16" width="20" height="6" rx="1"/>
        <path d="M6 5h.01M6 12h.01M6 19h.01" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M10 5h2M10 12h2M10 19h2"/>
      </svg>
    )
  }
};

function EmptyState({ selectedMode, onStart }) {
  const activeConfig = WORKSPACE_CONFIGS[selectedMode] || WORKSPACE_CONFIGS.dsa;

  return (
    <div
      key={selectedMode}
      className="flex flex-col items-center justify-center h-full gap-7 text-center px-4 font-mono select-none max-w-lg mx-auto animate-workspace-enter"
    >
      {/* Floating Icon Wrapper */}
      <div className="w-18 h-18 rounded-2xl bg-gradient-to-tr from-accent/5 to-teal/5 border border-accent/25 flex items-center justify-center animate-float shadow-[0_0_20px_rgba(0,210,255,0.05)]">
        {activeConfig.icon}
      </div>

      <div className="space-y-3">
        <h3 className="font-display text-sm font-bold text-white tracking-widest uppercase transition-all duration-300">
          {activeConfig.title}
        </h3>
        <p className="text-text-secondary text-xs max-w-sm leading-relaxed font-sans normal-case">
          {activeConfig.description}
        </p>
      </div>

      {/* focus/detail parameters list */}
      <div className="w-full bg-void/35 border border-border/60 rounded-2xl p-4 space-y-2 text-[10px] text-left">
        <p className="text-[9px] text-text-muted font-bold tracking-widest uppercase mb-2">Protocol Focus Areas</p>
        <div className="grid grid-cols-1 gap-2.5">
          {activeConfig.focus.map((item, index) => (
            <div key={index} className="flex items-center gap-2 font-sans text-text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onStart}
        className="px-8 py-3.5 text-xs font-bold rounded-full btn-liquid-glass uppercase tracking-wider font-mono"
      >
        Start Session →
      </button>
    </div>
  );
}
