import React from 'react';

export default function FeedbackPanel({ feedback, messageCount }) {
  if (!feedback) return null;

  const { technical_accuracy, communication_clarity, confidence_level, overall_score, suggestions } = feedback;

  const getGrade = (score) => {
    if (score >= 85) return { label: 'Excellent Rank', color: 'text-accent' };
    if (score >= 70) return { label: 'Good Standing', color: 'text-teal' };
    if (score >= 55) return { label: 'Fair Standby', color: 'text-yellow-500' };
    return { label: 'Needs Calibrating', color: 'text-red-400' };
  };

  const grade = getGrade(overall_score);

  const metrics = [
    {
      label: 'Technical Accuracy',
      value: technical_accuracy,
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
          <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      )
    },
    {
      label: 'Communication Clarity',
      value: communication_clarity,
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      )
    },
    {
      label: 'Confidence Parameters',
      value: confidence_level,
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      )
    },
  ];

  return (
    <div className="glass rounded-2xl p-4 border border-border/80 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Session Feedback</h3>
          <p className="text-[10px] text-text-muted font-mono">{messageCount} exchanges completed</p>
        </div>
        <div className="text-right font-mono">
          <div className="text-xl font-display font-black text-white">{overall_score}%</div>
          <div className={`text-[9px] font-bold uppercase ${grade.color}`}>{grade.label}</div>
        </div>
      </div>

      {/* Metric bars */}
      <div className="space-y-3 font-mono">
        {metrics.map(m => (
          <div key={m.label}>
            <div className="flex justify-between items-center mb-1.5 text-[9px] text-text-secondary">
              <span className="flex items-center gap-2">
                <span className="flex-shrink-0">{m.icon}</span> {m.label}
              </span>
              <span className="font-bold text-white">{m.value}%</span>
            </div>
            <div className="h-1.5 bg-void rounded-full overflow-hidden border border-border/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-teal transition-all duration-1000"
                style={{ width: `${m.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Suggestion */}
      {suggestions?.length > 0 && (
        <div className="rounded-xl bg-void/50 border border-border/80 p-3 flex gap-2 items-start">
          <span className="text-xs text-accent">💡</span>
          <p className="text-[10px] text-text-secondary leading-relaxed font-sans">
            <span className="font-bold text-white font-mono uppercase text-[9px] block mb-0.5">Evaluation Tip</span>
            {suggestions[0]}
          </p>
        </div>
      )}
    </div>
  );
}
