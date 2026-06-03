import React from 'react';

const MODES = [
  {
    id: 'dsa',
    label: 'DSA & Algorithms',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    desc: 'Arrays, trees, graphs, DP',
    color: 'accent',
  },
  {
    id: 'hr',
    label: 'HR & Behavioral',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    desc: 'Soft skills, STAR method',
    color: 'teal',
  },
  {
    id: 'system_design',
    label: 'System Design',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    desc: 'Scalability, architecture',
    color: 'purple',
  },
];

const colorMap = {
  accent: {
    active: 'bg-accent/10 border-accent/50 text-accent',
    icon: 'text-accent',
    hover: 'hover:border-accent/30',
  },
  teal: {
    active: 'bg-teal/10 border-teal/50 text-teal',
    icon: 'text-teal',
    hover: 'hover:border-teal/30',
  },
  purple: {
    active: 'bg-purple-500/10 border-purple-500/50 text-purple-400',
    icon: 'text-purple-400',
    hover: 'hover:border-purple-500/30',
  },
};

export default function ModeSelector({ selected, onChange, disabled }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {MODES.map(mode => {
        const isActive = selected === mode.id;
        const c = colorMap[mode.color];
        return (
          <button
            key={mode.id}
            onClick={() => onChange(mode.id)}
            disabled={disabled}
            className={`
              flex flex-col items-center gap-2 p-3 rounded-xl border text-center
              transition-all duration-200 group
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${isActive
                ? `${c.active} shadow-sm`
                : `border-border text-text-secondary bg-panel/50 ${!disabled ? c.hover : ''}`
              }
            `}
          >
            <span className={`transition-colors ${isActive ? c.icon : 'text-text-muted group-hover:' + c.icon.split('-')[1]}`}>
              {mode.icon}
            </span>
            <div>
              <div className="text-xs font-semibold leading-tight">{mode.label}</div>
              <div className="text-xs text-text-muted mt-0.5 hidden sm:block">{mode.desc}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
