import React, { useState, useEffect, useRef, useCallback } from 'react';
import { checkHealth } from '../services/api';

const POLL_INTERVAL_MS  = 10000;
const COUNTDOWN_SECONDS = 60;

export default function ServerStatusBanner() {
  const [isDown,    setIsDown]    = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  const countdownRef = useRef(null);
  const pollRef      = useRef(null);
  const isDownRef    = useRef(false);

  const startCountdown = useCallback(() => {
    if (countdownRef.current) return;
    setCountdown(COUNTDOWN_SECONDS);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(COUNTDOWN_SECONDS);
  }, []);

  const poll = useCallback(async () => {
    const result = await checkHealth();
    const up = result !== null && result?.status === 'healthy';
    if (!up && !isDownRef.current) {
      isDownRef.current = true;
      setIsDown(true);
      startCountdown();
    } else if (up && isDownRef.current) {
      isDownRef.current = false;
      setIsDown(false);
      stopCountdown();
    }
  }, [startCountdown, stopCountdown]);

  useEffect(() => {
    const init = setTimeout(poll, 2000);
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      clearTimeout(init);
      clearInterval(pollRef.current);
      stopCountdown();
    };
  }, [poll, stopCountdown]);

  if (!isDown) return null;

  const radius       = 25;
  const circumference = 2 * Math.PI * radius;
  const progress     = countdown / COUNTDOWN_SECONDS;
  const dashOffset   = circumference * (1 - progress);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(7,10,19,0.88)', backdropFilter: 'blur(12px)' }}
    >
      <div
        className="relative flex flex-col items-center gap-6 px-10 py-10 rounded-3xl text-center max-w-sm w-full mx-4"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
          border: '1px solid rgba(0,210,255,0.15)',
          boxShadow: '0 0 60px rgba(0,210,255,0.06), 0 25px 50px rgba(0,0,0,0.5)',
        }}
      >
        {/* Pulsing server icon */}
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{ backgroundColor: 'rgba(0,210,255,0.12)' }}
          />
          <div
            className="relative w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle, rgba(0,210,255,0.10), rgba(0,210,255,0.02))',
              border: '1px solid rgba(0,210,255,0.25)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(0,210,255,0.85)" strokeWidth="1.8">
              <rect x="2" y="2" width="20" height="8" rx="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <h2 className="text-white font-bold text-lg tracking-tight font-display">
            Server is Waking Up
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed font-mono">
            The backend is cold-starting on Render.<br />
            This usually takes about <span className="text-accent font-semibold">60 seconds</span>.
          </p>
        </div>

        {/* Circular countdown */}
        <div className="relative flex items-center justify-center">
          <svg width="100" height="100" className="-rotate-90">
            <circle
              cx="50" cy="50" r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="4"
            />
            <circle
              cx="50" cy="50" r={radius}
              fill="none"
              stroke="rgba(0,210,255,0.75)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.9s linear' }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-accent font-bold text-2xl font-mono leading-none">
              {countdown}
            </span>
            <span className="text-text-muted text-[10px] font-mono tracking-widest uppercase mt-0.5">
              sec
            </span>
          </div>
        </div>

        {/* Linear progress bar */}
        <div className="w-full space-y-2">
          <div className="flex justify-between text-[10px] font-mono text-text-muted">
            <span>AUTO RELOAD IN</span>
            <span className="text-accent">{countdown}s</span>
          </div>
          <div className="w-full h-1 rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress * 100}%`,
                background: 'linear-gradient(90deg, rgba(0,210,255,0.4), rgba(0,210,255,0.9))',
                transition: 'width 0.9s linear',
                boxShadow: '0 0 8px rgba(0,210,255,0.4)',
              }}
            />
          </div>
        </div>

        {/* Manual reload button */}
        <button
          onClick={() => window.location.reload()}
          className="w-full py-2.5 rounded-xl text-xs font-semibold font-mono tracking-widest uppercase transition-all duration-200 active:scale-95"
          style={{
            background: 'rgba(0,210,255,0.08)',
            border: '1px solid rgba(0,210,255,0.25)',
            color: 'rgba(0,210,255,0.9)',
          }}
        >
          ↺  Reload Now
        </button>
      </div>
    </div>
  );
}
