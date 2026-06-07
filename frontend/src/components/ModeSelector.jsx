import React, { useState, useEffect, useRef } from 'react';

const MODES = [
  {
    id: 'dsa',
    label: 'Algorithms & DSA',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    desc: 'Complexity, recursion, sorting, trees',
  },
  {
    id: 'hr',
    label: 'Behavioral & HR',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    desc: 'STAR framework, situational queries',
  },
  {
    id: 'system_design',
    label: 'System Design',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
      </svg>
    ),
    desc: 'Scalability, replication, microservices',
  },
];

export default function ModeSelector({ selected, onChange, disabled }) {
  const containerRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0, opacity: 0 });

  // Update vertical sliding indicator position dynamically
  useEffect(() => {
    const updateIndicator = () => {
      const container = containerRef.current;
      if (!container) return;

      const activeChild = container.querySelector('[data-active="true"]');
      if (activeChild) {
        setIndicatorStyle({
          top: activeChild.offsetTop,
          height: activeChild.offsetHeight,
          opacity: 1,
        });
      } else {
        setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
      }
    };

    updateIndicator();

    window.addEventListener('resize', updateIndicator);
    return () => {
      window.removeEventListener('resize', updateIndicator);
    };
  }, [selected]);

  return (
    <div className="flex flex-col gap-2.5 w-full relative" ref={containerRef}>
      {/* iOS Liquid Sliding Vertically Background Capsule */}
      <div 
        className="absolute left-0 w-full bg-accent/[0.10] border border-accent/30 rounded-[22px] pointer-events-none shadow-[0_0_15px_rgba(0,210,255,0.06)]"
        style={{
          transform: `translate3d(0, ${indicatorStyle.top}px, 0)`,
          height: `${indicatorStyle.height}px`,
          opacity: indicatorStyle.opacity,
          transition: 'transform 380ms cubic-bezier(0.25,1,0.5,1), height 380ms cubic-bezier(0.25,1,0.5,1), opacity 380ms cubic-bezier(0.25,1,0.5,1)',
        }}
      />

      {MODES.map(mode => {
        const isActive = selected === mode.id;
        return (
          <button
            key={mode.id}
            data-active={isActive}
            onClick={() => onChange(mode.id)}
            disabled={disabled}
            className={`
              flex items-center gap-3.5 p-3.5 rounded-[22px] border text-left
              group w-full btn-liquid relative z-10
              ${disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'}
              ${isActive
                ? `border-transparent text-accent`
                : `border-white/[0.06] text-text-secondary bg-white/[0.03] ${!disabled ? 'hover:border-accent/30 hover:bg-white/[0.06] hover:text-white' : ''}`
              }
            `}
          >
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
              isActive 
                ? 'bg-[#070a13]/80 border border-accent/40 text-accent shadow-sm' 
                : 'bg-void border border-border/80 text-text-muted group-hover:text-accent group-hover:border-accent/30'
            }`}>
              {mode.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-mono font-bold leading-tight uppercase tracking-wider">{mode.label}</div>
              <div className="text-[9.5px] text-text-muted mt-1 truncate">{mode.desc}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
