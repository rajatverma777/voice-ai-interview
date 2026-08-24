import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkHealth } from '../services/api';

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    ),
    title: 'Voice Capture Core',
    desc: 'Low-latency whisper speech-to-text processing engine.',
    tag: 'WHISPER_STT'
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent">
        <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
      </svg>
    ),
    title: 'Cognitive Engine',
    desc: 'LLMmock interviewer querying technical, algorithm, and behavioral logic.',
    tag: 'LLM_REASONING'
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg>
    ),
    title: 'Speech Synthesizer',
    desc: 'Neural text-to-speech audio rendering real-time questions.',
    tag: 'NEURAL_TTS'
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    title: 'Diagnostic Metrics',
    desc: 'Heuristic algorithms scoring technical accuracy, clarity, and confidence.',
    tag: 'DIAGNOSTICS_V2'
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent">
        <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
      </svg>
    ),
    title: 'Session Memory',
    desc: 'Persistent DB archives secure transcript logs and visual feedback metrics.',
    tag: 'DB_STORE'
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent">
        <rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="2" y1="12" x2="22" y2="12"/>
      </svg>
    ),
    title: 'Hybrid Workspace',
    desc: 'Seamless controls for toggling between voice microphone and keyboard inputs.',
    tag: 'HYBRID_UI'
  },
];

const AI_MODELS = [
  {
    id: 'gemini',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-violet-400">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    ),
    label: 'Cloud Tier',
    desc: 'Google Gemini & OpenAI cloud models. Maximum accuracy.',
    tag: 'CLOUD_APIS',
    accent: 'text-violet-400',
    glow: 'shadow-violet-500/10',
    activeBorder: 'border-violet-400/30',
    activeBg: 'bg-violet-500/[0.08]',
    iconActiveBg: 'bg-[#07050f]/80 border-violet-400/40',
    code: 'TIER_01',
  },
  {
    id: 'gpt2',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent">
        <rect x="2" y="2" width="20" height="8" rx="2"/>
        <rect x="2" y="14" width="20" height="8" rx="2"/>
        <line x1="6" y1="6" x2="6.01" y2="6"/>
        <line x1="6" y1="18" x2="6.01" y2="18"/>
      </svg>
    ),
    label: 'Local Tier',
    desc: 'Local transformer model. Fully offline, zero latency.',
    tag: 'LOCAL_TRANSFORMER',
    accent: 'text-accent',
    glow: 'shadow-accent/10',
    activeBorder: 'border-accent/30',
    activeBg: 'bg-accent/[0.08]',
    iconActiveBg: 'bg-[#070a13]/80 border-accent/40',
    code: 'TIER_02',
  },
  {
    id: 'svm',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-amber-400">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
        <polyline points="2 7 6 3 10 7"/>
      </svg>
    ),
    label: 'Fallback Tier',
    desc: 'Heuristic SVM ML model. Instant offline execution.',
    tag: 'LOCAL_HEURISTICS',
    accent: 'text-amber-400',
    glow: 'shadow-amber-500/10',
    activeBorder: 'border-amber-400/30',
    activeBg: 'bg-amber-500/[0.08]',
    iconActiveBg: 'bg-[#0f0a03]/80 border-amber-400/40',
    code: 'TIER_03',
  },
];



const MODES = [
  {
    id: 'dsa',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    label: 'Algorithms & DSA',
    desc: 'Complexity, recursion, sorting, trees, and logic queries.',
    code: 'MOD_01'
  },
  {
    id: 'hr',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    label: 'Behavioral & HR',
    desc: 'Situational assessments, STAR method, and culture fit.',
    code: 'MOD_02'
  },
  {
    id: 'system_design',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
        <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
      </svg>
    ),
    label: 'System Design',
    desc: 'High scalability, routing, caching, database replication.',
    code: 'MOD_03'
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus]   = useState('checking');
  const [selectedMode, setSelectedMode]     = useState('dsa');
  const [hoveredMode, setHoveredMode]       = useState(null);
  const [selectedModel, setSelectedModel]   = useState('gemini');
  const [hoveredModel, setHoveredModel]     = useState(null);

  const modesContainerRef  = useRef(null);
  const modelsContainerRef = useRef(null);

  const [modesIndicator, setModesIndicator]   = useState({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });
  const [modelsIndicator, setModelsIndicator] = useState({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

  useEffect(() => {
    checkHealth().then(data => {
      setBackendStatus(data ? 'online' : 'offline');
    });
  }, []);

  // Sliding indicator for MODULE selector
  useEffect(() => {
    let raf;
    const update = () => {
      const container = modesContainerRef.current;
      if (!container) return;
      const active = container.querySelector('[data-active="true"]');
      if (active) {
        setModesIndicator({
          left:    active.offsetLeft,
          top:     active.offsetTop,
          width:   active.offsetWidth,
          height:  active.offsetHeight,
          opacity: 1,
        });
      } else {
        setModesIndicator(prev => ({ ...prev, opacity: 0 }));
      }
    };
    // rAF ensures offsetLeft is measured after the browser has painted the new layout
    raf = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
    };
  }, [selectedMode, hoveredMode]);

  // Sliding indicator for MODEL selector
  useEffect(() => {
    let raf;
    const update = () => {
      const container = modelsContainerRef.current;
      if (!container) return;
      const active = container.querySelector('[data-active="true"]');
      if (active) {
        setModelsIndicator({
          left:    active.offsetLeft,
          top:     active.offsetTop,
          width:   active.offsetWidth,
          height:  active.offsetHeight,
          opacity: 1,
        });
      } else {
        setModelsIndicator(prev => ({ ...prev, opacity: 0 }));
      }
    };
    raf = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
    };
  }, [selectedModel, hoveredModel]);

  const handleModeClick = (modeId) => {
    setSelectedMode(modeId);
    setTimeout(() => navigate(`/interview?mode=${modeId}&model=${selectedModel}`), 280);
  };

  const handleModelClick = (modelId) => {
    setSelectedModel(modelId);
  };

  return (
    <div className="pt-24 min-h-screen relative overflow-hidden px-4 md:px-8 flex flex-col justify-between">
      
      {/* ── HERO BANNER ── */}
      <section className="relative w-full max-w-[94%] xl:max-w-[1440px] mx-auto flex flex-col items-center text-center pt-10 pb-20 flex-1 justify-center z-10">
        
        {/* Status Badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono tracking-wider uppercase mb-8 border transition-all ${
          backendStatus === 'online'
            ? 'border-accent/30 bg-accent/5 text-accent shadow-glow'
            : backendStatus === 'offline'
              ? 'border-red-500/35 bg-red-500/5 text-red-400'
              : 'border-border bg-panel/30 text-text-secondary'
        }`}>
          {backendStatus === 'checking' ? (
            <svg className="animate-spin h-3 w-3 text-accent" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-80" fill="currentColor" d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          ) : (
            <span className={`w-1.5 h-1.5 rounded-full ${backendStatus === 'online' ? 'bg-accent animate-pulse shadow-glow' : 'bg-red-500 animate-pulse'}`} />
          )}
          <span>
            {backendStatus === 'online' 
              ? 'Server Connected' 
              : backendStatus === 'offline' 
                ? 'Server Offline' 
                : 'Connecting to Server...'}
          </span>
        </div>

        {/* Clean Sci-Fi Heading */}
        <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-extrabold leading-tight tracking-tight text-white mb-6 max-w-4xl">
          PRACTICE INTERVIEWS
          <br />
          <span className="gradient-text font-black uppercase tracking-normal">WITH ARTIFICIAL INTELLIGENCE</span>
        </h1>
        <p className="text-sm text-text-secondary max-w-lg mb-10 leading-relaxed font-sans">
          Receive real-time heuristic analytics on technical correctness, communication clarity, and voice confidence values.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center font-mono text-xs w-full sm:w-auto">
          <button
            onClick={() => navigate(`/interview?mode=${selectedMode}&model=${selectedModel}`)}
            disabled={backendStatus !== 'online'}
            className={`px-8 py-3.5 text-white font-bold tracking-widest rounded-2xl btn-liquid-glass-accent uppercase ${
              backendStatus === 'online'
                ? 'cursor-pointer'
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            Start Interview
          </button>
          <a
            href="#modes"
            className="px-8 py-3.5 border border-white/[0.08] bg-white/[0.04] text-text-secondary hover:text-white hover:border-accent/40 rounded-2xl btn-liquid uppercase"
          >
            Select Modules
          </a>
        </div>

        {/* HUD IDE Dashboard Mockup */}
        <div className="mt-20 w-full max-w-2xl bg-[#08080a]/10 backdrop-blur-[2px] border border-white/[0.06] rounded-2xl p-6 text-left relative overflow-hidden shadow-2xl">
          {/* Header console */}
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4 font-mono text-[9px] text-text-muted">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-800" />
              <span className="w-2 h-2 rounded-full bg-slate-800" />
              <span className="w-2 h-2 rounded-full bg-slate-800" />
              <span className="ml-2 tracking-wider uppercase font-bold text-[8px]">STREAMING_CONVERSATION_TELEMETRY</span>
            </div>
            <span className="text-accent uppercase font-bold animate-pulse text-[8px]">SYS_DECODING</span>
          </div>
          
          <div className="space-y-4 font-mono text-[11px] text-text-secondary">
            <MockMessage role="ai" text="Could you explain the difference between processes and threads, and how they share memory?" />
            <MockMessage role="user" text="A process represents an independent executing program with its own address space, whereas threads share the memory of their parent process..." />
          </div>
          
          <div className="flex gap-4 mt-5 pt-3.5 border-t border-border/40 items-center justify-between font-mono text-[9px] text-text-muted">
            <div className="flex items-center gap-2.5">
              <div className="flex items-end gap-[2px] h-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="wave-bar bg-accent" style={{ height: `${4 + Math.random() * 10}px`, width: '2px' }} />
                ))}
              </div>
              <span className="text-accent animate-pulse font-bold tracking-wider uppercase text-[8px]">RECEIVING_AUDIO_DATA</span>
            </div>
            <span className="bg-panel border border-border px-2 py-0.5 rounded text-[8px] uppercase">SPEECH_TO_TEXT_STT</span>
          </div>
        </div>
      </section>

      {/* ── CONSOLE MODULE PROTOCOLS ── */}
      <section id="modes" className="relative w-full max-w-[94%] xl:max-w-[1440px] mx-auto py-16 border-t border-border/50">
        <div className="text-center mb-12">
          <h2 className="text-xl font-display font-bold text-white uppercase tracking-wide">
            Interview Modules
          </h2>
          <p className="text-text-muted text-xs font-mono mt-2 uppercase tracking-widest">Select specific training protocols</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto relative p-1" ref={modesContainerRef}>
          {/* iOS Liquid Sliding Tab Indicator — GPU composited, no position jump */}
          <div
            className="absolute rounded-[22px] pointer-events-none"
            style={{
              willChange: 'transform, opacity',
              backgroundColor: 'rgba(0,210,255,0.10)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'rgba(0,210,255,0.30)',
              boxShadow: '0 0 15px rgba(0,210,255,0.06)',
              transform: `translate3d(${modesIndicator.left}px, ${modesIndicator.top}px, 0)`,
              width:   `${modesIndicator.width}px`,
              height:  `${modesIndicator.height}px`,
              left: 0,
              top:  0,
              opacity: modesIndicator.opacity,
              transition: 'transform 380ms cubic-bezier(0.25,1,0.5,1), width 380ms cubic-bezier(0.25,1,0.5,1), height 380ms cubic-bezier(0.25,1,0.5,1), opacity 300ms ease',
            }}
          />

          {MODES.map(mode => {
            // isActive drives ONLY color changes — never layout/geometry
            const isActive = hoveredMode ? hoveredMode === mode.id : selectedMode === mode.id;

            return (
              <button
                key={mode.id}
                data-active={isActive}
                onMouseEnter={() => setHoveredMode(mode.id)}
                onMouseLeave={() => setHoveredMode(null)}
                onClick={() => handleModeClick(mode.id)}
                className={[
                  // Fixed geometry — padding/border-width NEVER change, only colors
                  'flex items-center gap-4 p-5 rounded-[22px] border text-left',
                  'group w-full btn-liquid relative z-10 cursor-pointer',
                  // transition-colors only — never transition size/padding/margin
                  'transition-colors duration-200',
                  isActive
                    ? 'border-transparent text-accent'
                    // No hover:bg / hover:border — the indicator handles hover feedback
                    : 'border-transparent text-text-secondary',
                ].join(' ')}
              >
                {/* Icon Squircle — fixed w-12 h-12, only color transitions */}
                <div className={[
                  'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
                  'transition-colors duration-200',
                  isActive
                    ? 'bg-[#070a13]/80 border border-accent/40 text-accent'
                    : 'bg-void border border-border/85 text-text-secondary',
                ].join(' ')}>
                  {mode.icon}
                </div>

                {/* Text — static layout, nothing conditionally rendered */}
                <div className="min-w-0 flex-1 relative">
                  <div className="text-[9px] font-mono opacity-30 text-text-muted absolute -top-1.5 right-0">{mode.code}</div>
                  <div className="text-xs font-mono font-bold leading-tight uppercase tracking-wider">{mode.label}</div>
                  <div className="text-[10.5px] text-text-muted mt-1.5 leading-relaxed font-sans">{mode.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── AI MODEL ENGINE SELECTION ── */}
      <section id="model-select" className="relative w-full max-w-[94%] xl:max-w-[1440px] mx-auto py-16 border-t border-border/50">
        <div className="text-center mb-12">
          <h2 className="text-xl font-display font-bold text-white uppercase tracking-wide">
            AI Model Engine
          </h2>
          <p className="text-text-muted text-xs font-mono mt-2 uppercase tracking-widest">Select inference backend protocol</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto relative p-1" ref={modelsContainerRef}>
          {/* iOS Liquid Sliding Tab Indicator — separate borderColor so CSS can interpolate */}
          <div
            className="absolute rounded-[22px] pointer-events-none"
            style={{
              willChange: 'transform, opacity, background-color, border-color',
              // Split border into discrete properties so the browser can interpolate borderColor
              borderWidth: '1px',
              borderStyle: 'solid',
              // Color pair keyed off the active model — CSS will smooth-interpolate these
              backgroundColor: (
                (hoveredModel || selectedModel) === 'gemini'      ? 'rgba(167,139,250,0.09)' :
                (hoveredModel || selectedModel) === 'openai_gpt4' ? 'rgba(34,211,238,0.09)'  :
                (hoveredModel || selectedModel) === 'openai'      ? 'rgba(52,211,153,0.09)'  :
                (hoveredModel || selectedModel) === 'gpt2'        ? 'rgba(0,210,255,0.09)'   :
                (hoveredModel || selectedModel) === 'svm'         ? 'rgba(251,191,36,0.09)'  :
                                                                    'rgba(0,210,255,0.09)'
              ),
              borderColor: (
                (hoveredModel || selectedModel) === 'gemini'      ? 'rgba(167,139,250,0.35)' :
                (hoveredModel || selectedModel) === 'openai_gpt4' ? 'rgba(34,211,238,0.35)'  :
                (hoveredModel || selectedModel) === 'openai'      ? 'rgba(52,211,153,0.35)'  :
                (hoveredModel || selectedModel) === 'gpt2'        ? 'rgba(0,210,255,0.35)'   :
                (hoveredModel || selectedModel) === 'svm'         ? 'rgba(251,191,36,0.35)'  :
                                                                    'rgba(0,210,255,0.35)'
              ),
              transform: `translate3d(${modelsIndicator.left}px, ${modelsIndicator.top}px, 0)`,
              width:   `${modelsIndicator.width}px`,
              height:  `${modelsIndicator.height}px`,
              left: 0,
              top:  0,
              opacity: modelsIndicator.opacity,
              // Only transition transform/size/opacity — color changes are nearly instant by design
              transition: 'transform 380ms cubic-bezier(0.25,1,0.5,1), width 380ms cubic-bezier(0.25,1,0.5,1), height 380ms cubic-bezier(0.25,1,0.5,1), opacity 300ms ease, background-color 200ms ease, border-color 200ms ease',
            }}
          />


          {AI_MODELS.map(model => {
            // isActive drives ONLY color changes — never layout/geometry
            const isActive = hoveredModel ? hoveredModel === model.id : selectedModel === model.id;
            return (
              <button
                key={model.id}
                data-active={isActive}
                onMouseEnter={() => setHoveredModel(model.id)}
                onMouseLeave={() => setHoveredModel(null)}
                onClick={() => handleModelClick(model.id)}
                className={[
                  // Fixed geometry: same padding, same border-width always — only colors change
                  'flex items-center gap-4 p-5 rounded-[22px] border text-left',
                  'group w-full btn-liquid relative z-10 cursor-pointer',
                  // transition-colors ONLY — never animate size, padding, or layout
                  'transition-colors duration-200',
                  isActive
                    ? `border-transparent ${model.accent}`
                    // transparent border keeps geometry identical to active state (no 1px shift)
                    : 'border-transparent text-text-secondary',
                ].join(' ')}
              >
                {/* Icon Squircle — strictly fixed w-12 h-12, only color transitions */}
                <div className={[
                  'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
                  'transition-colors duration-200',
                  isActive
                    ? `${model.iconActiveBg}`
                    : 'bg-void border border-border/85 text-text-secondary',
                ].join(' ')}>
                  {model.icon}
                </div>

                {/* Text — completely static layout, NOTHING conditionally rendered inside */}
                <div className="min-w-0 flex-1 relative">
                  <div className="text-[9px] font-mono opacity-30 text-text-muted absolute -top-1.5 right-0">{model.code}</div>
                  <div className="text-xs font-mono font-bold leading-tight uppercase tracking-wider">{model.label}</div>
                  <div className="text-[10.5px] text-text-muted mt-1.5 leading-relaxed font-sans">{model.desc}</div>
                  {/* ↑ No conditional badge here — any conditional content causes height shift → grid reflow → indicator jump */}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active engine confirmation strip */}
        <div className="mt-8 max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-3 px-5 py-2.5 rounded-2xl border border-border/40 bg-white/[0.02] font-mono text-[9px] text-text-muted uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Active engine:&nbsp;
            <span className="text-white font-bold">
              {AI_MODELS.find(m => m.id === selectedModel)?.label}
            </span>
            <span className="mx-2 opacity-30">·</span>
            <span>{AI_MODELS.find(m => m.id === selectedModel)?.tag}</span>
          </div>
        </div>
      </section>

      {/* ── DIAGNOSTICS & SPECS ── */}

      <section className="relative w-full max-w-[94%] xl:max-w-[1440px] mx-auto py-16 border-t border-border/50">
        <div className="text-center mb-12">
          <h2 className="text-xl font-display font-bold text-white uppercase tracking-wide">
            System Capabilities
          </h2>
        </div>
        
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {FEATURES.map(f => (
            <div key={f.title} className="glass-light futuristic-card rounded-2xl p-5 flex flex-col justify-between min-h-[140px]">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-void/20 border border-border/85 flex items-center justify-center text-accent">
                    {f.icon}
                  </div>
                  <span className="text-[8px] font-mono bg-white/5 border border-border px-2 py-0.5 rounded text-text-muted tracking-widest">{f.tag}</span>
                </div>
                <h4 className="font-display font-bold text-white text-xs mt-4 uppercase tracking-wide">{f.title}</h4>
                <p className="text-xs text-text-secondary mt-1 leading-normal font-sans">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/50 py-8 text-center bg-void font-mono text-[9px] text-text-muted uppercase tracking-widest">
        <span>© 2026 VOICE_AI · METRICS CALIBRATED & SECURED</span>
      </footer>
    </div>
  );
}

function MockMessage({ role, text }) {
  const isUser = role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start message-enter`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold border ${
        isUser ? 'border-accent/40 text-accent bg-accent/5' : 'border-border text-text-secondary bg-void/20'
      }`}>
        {isUser ? 'USR' : 'AI'}
      </div>
      <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-xs leading-relaxed border ${
        isUser ? 'bg-accent/5 border-accent/20 rounded-tr-none' : 'bg-panel/30 border-border/40 rounded-tl-none'
      }`}>
        {text}
      </div>
    </div>
  );
}

