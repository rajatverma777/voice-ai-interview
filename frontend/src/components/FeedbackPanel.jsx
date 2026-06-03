import React from 'react';

export default function FeedbackPanel({ feedback, messageCount }) {
  if (!feedback) return null;

  const { technical_accuracy, communication_clarity, confidence_level, overall_score, suggestions } = feedback;

  const getGrade = (score) => {
    if (score >= 85) return { label: 'Excellent', color: 'text-emerald-400' };
    if (score >= 70) return { label: 'Good', color: 'text-accent' };
    if (score >= 55) return { label: 'Fair', color: 'text-amber-400' };
    return { label: 'Needs Work', color: 'text-red-400' };
  };

  const grade = getGrade(overall_score);

  const metrics = [
    { label: 'Technical', value: technical_accuracy, icon: '🧠' },
    { label: 'Clarity', value: communication_clarity, icon: '💬' },
    { label: 'Confidence', value: confidence_level, icon: '💪' },
  ];

  return (
    <div className="glass rounded-2xl p-4 border border-accent/20 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Session Feedback</h3>
          <p className="text-xs text-text-muted">{messageCount} exchanges completed</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-display font-bold gradient-text">{overall_score}%</div>
          <div className={`text-xs font-medium ${grade.color}`}>{grade.label}</div>
        </div>
      </div>

      {/* Metric bars */}
      <div className="space-y-2.5">
        {metrics.map(m => (
          <div key={m.label}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-text-secondary flex items-center gap-1.5">
                <span>{m.icon}</span> {m.label}
              </span>
              <span className="text-xs font-mono text-text-primary">{m.value}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
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
        <div className="rounded-xl bg-accent/5 border border-accent/15 p-3">
          <p className="text-xs text-text-secondary leading-relaxed">
            <span className="text-accent font-medium">💡 Tip: </span>
            {suggestions[0]}
          </p>
        </div>
      )}
    </div>
  );
}
