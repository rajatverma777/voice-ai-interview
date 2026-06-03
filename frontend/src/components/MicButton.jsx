import React from 'react';

export default function MicButton({ isRecording, isLoading, onClick, volume = 0 }) {
  const isDisabled = isLoading;

  // Compute a dynamic scale based on microphone volume (0–255)
  const dynamicScale = isRecording ? 1 + (volume / 255) * 0.3 : 1;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Outer glow ring — visible while recording */}
      <div className={`relative ${isRecording ? 'recording-ring' : ''}`}>
        {/* Pulse rings */}
        {isRecording && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
            <span className="absolute -inset-2 rounded-full bg-red-500/10 animate-ping delay-150" />
          </>
        )}

        <button
          onClick={onClick}
          disabled={isDisabled}
          title={isRecording ? 'Stop recording' : 'Start recording'}
          style={{ transform: `scale(${dynamicScale})`, transition: 'transform 0.1s ease' }}
          className={`
            relative z-10 w-16 h-16 rounded-full flex items-center justify-center
            transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-void
            ${isDisabled
              ? 'opacity-40 cursor-not-allowed bg-panel border border-border'
              : isRecording
                ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_24px_rgba(239,68,68,0.5)] focus:ring-red-500'
                : 'bg-gradient-to-br from-accent to-teal hover:shadow-glow focus:ring-accent shadow-glass'
            }
          `}
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

      {/* Waveform visualiser */}
      {isRecording && (
        <div className="flex items-end gap-[3px] h-6">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="wave-bar"
              style={{
                height: `${12 + Math.random() * 12}px`,
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
        </div>
      )}

      <span className={`text-xs font-medium transition-colors ${
        isRecording ? 'text-red-400' : isDisabled ? 'text-text-muted' : 'text-text-secondary'
      }`}>
        {isLoading ? 'Processing…' : isRecording ? 'Recording — click to stop' : 'Click to speak'}
      </span>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
    </svg>
  );
}
