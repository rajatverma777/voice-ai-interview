import React from 'react';

export default function MicButton({ isRecording, isLoading, onClick, volume = 0 }) {
  const isDisabled = isLoading;

  // Compute a dynamic scale based on microphone volume (0–255)
  const dynamicScale = isRecording ? 1 + (volume / 255) * 0.25 : 1;

  return (
    <div className="flex flex-col items-center gap-4 group">
      {/* Outer telemetry rings container */}
      <div className="relative p-6">
        {/* Dynamic hover glow overlay */}
        {!isDisabled && (
          <div className="absolute inset-0 rounded-full bg-accent/5 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 blur-md pointer-events-none" />
        )}

        {/* Dual-counter rotating sci-fi orbit rings */}
        {!isDisabled && (
          <>
            <div className={`absolute -inset-1 rounded-full border border-dashed transition-colors duration-500 animate-[spin_15s_linear_infinite] ${
              isRecording ? 'border-red-500/25' : 'border-accent/15'
            }`} />
            <div className={`absolute -inset-3.5 rounded-full border border-dashed transition-colors duration-500 animate-[spin_25s_linear_infinite_reverse] ${
              isRecording ? 'border-red-400/15' : 'border-teal/15'
            }`} />
          </>
        )}

        {/* Pulsing rings while recording */}
        {isRecording && (
          <>
            <span className="absolute inset-4 rounded-full bg-red-500/20 animate-ping pointer-events-none" />
            <span className="absolute inset-2 rounded-full bg-red-500/10 animate-ping delay-200 pointer-events-none" />
          </>
        )}

        {/* Tactile 3D Outer Button Wrapper */}
        <div
          className={`
            relative z-10 w-16 h-16 rounded-full flex items-center justify-center btn-liquid
            ${isDisabled
              ? 'opacity-40 cursor-not-allowed bg-white/[0.02] border border-white/[0.06]'
              : isRecording
                ? 'bg-gradient-to-r from-accent to-[#00a6ff] text-void shadow-[0_0_25px_rgba(0,210,255,0.35)]'
                : 'bg-white/[0.03] border border-accent/40 text-accent shadow-[0_0_25px_rgba(0,210,255,0.12),inset 0 1px 0 rgba(255,255,255,0.05)] hover:border-accent hover:bg-white/[0.06]'
            }
          `}
        >
          <button
            onClick={onClick}
            disabled={isDisabled}
            title={isRecording ? 'Stop recording' : 'Start recording'}
            style={{ transform: `scale(${dynamicScale})`, transition: 'transform 0.15s ease' }}
            className="w-full h-full rounded-full flex items-center justify-center focus:outline-none"
          >
            {isLoading ? (
              <LoadingSpinner />
            ) : isRecording ? (
              <StopIcon />
            ) : (
              <MicIcon />
            )}
          </button>
        </div>
      </div>

      {/* Symmetric Waveform Visualiser */}
      {isRecording && (
        <div className="flex items-center justify-center gap-[3px] h-6 mt-0.5 px-3 py-1 bg-void/45 border border-border/40 rounded-full shadow-inner">
          {[...Array(11)].map((_, i) => {
            // Symmetrical distribution: peak in center (index 5)
            const dist = Math.abs(i - 5);
            const baseVal = 18 - dist * 2.5;
            const delay = i * 0.08;
            return (
              <div
                key={i}
                className="w-[2.5px] rounded-full bg-gradient-to-t from-teal to-accent origin-center animate-[waveform_1s_ease-in-out_infinite_alternate]"
                style={{
                  height: `${baseVal}px`,
                  animationDelay: `${delay}s`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Telemetry Status Capsule */}
      <div className={`flex items-center gap-2 px-3.5 py-1 rounded-full border transition-all duration-300 bg-white/[0.02] font-mono
        ${isLoading 
          ? 'border-indigo-500/25' 
          : isRecording 
            ? 'border-red-500/25' 
            : 'border-white/[0.06]'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
          isLoading 
            ? 'bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]' 
            : isRecording 
              ? 'bg-red-500 animate-[ping_1.2s_infinite] shadow-[0_0_8px_rgba(239,68,68,0.6)]' 
              : 'bg-accent animate-[pulse_2s_infinite] shadow-[0_0_8px_rgba(0,210,255,0.6)]'
        }`} />
        <span className={`text-[9px] tracking-widest uppercase transition-colors select-none font-bold ${
          isRecording 
            ? 'text-red-400 font-bold' 
            : isLoading 
              ? 'text-indigo-300' 
              : 'text-text-secondary group-hover:text-accent'
        }`}>
          {isLoading ? 'Processing Signal' : isRecording ? 'Transmission Active' : 'Voice Core Ready'}
        </span>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2.5"/>
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin text-indigo-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
    </svg>
  );
}
