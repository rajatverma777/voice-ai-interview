import React from 'react';

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
  return (
    <div className="flex flex-col gap-2.5 w-full">
      {MODES.map(mode => {
        const isActive = selected === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => onChange(mode.id)}
            disabled={disabled}
            className={`
              flex items-center gap-3.5 p-3.5 rounded-2xl border text-left
              transition-all duration-200 group w-full
              ${disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'}
              ${isActive
                ? `bg-accent/[0.04] border-accent/60 text-accent shadow-glow-sm`
                : `border-border/60 text-text-secondary bg-void/30 ${!disabled ? 'hover:border-accent/40 hover:bg-void/50 hover:text-white' : ''}`
              }
            `}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
              isActive 
                ? 'bg-void border border-accent/20 text-accent' 
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
