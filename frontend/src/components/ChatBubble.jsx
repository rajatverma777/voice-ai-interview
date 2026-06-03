import React, { useState } from 'react';

export default function ChatBubble({ message }) {
  const { role, content, timestamp, feedback } = message;
  const isUser = role === 'user';
  const [showFeedback, setShowFeedback] = useState(false);

  const timeStr = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className={`message-enter flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
        isUser
          ? 'bg-gradient-to-br from-accent to-blue-600 text-white'
          : 'bg-gradient-to-br from-teal to-emerald-600 text-white'
      }`}>
        {isUser ? 'You' : 'AI'}
      </div>

      <div className={`flex flex-col gap-1 max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Bubble */}
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-accent/20 border border-accent/30 text-text-primary rounded-tr-sm'
            : 'glass-light text-text-primary rounded-tl-sm'
        }`}>
          <FormattedText text={content} />
        </div>

        {/* Timestamp + feedback toggle */}
        <div className={`flex items-center gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-xs text-text-muted">{timeStr}</span>
          {!isUser && feedback && (
            <button
              onClick={() => setShowFeedback(v => !v)}
              className="text-xs text-accent/70 hover:text-accent transition-colors flex items-center gap-1"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
              {showFeedback ? 'Hide' : 'Feedback'}
            </button>
          )}
        </div>

        {/* Inline feedback panel */}
        {!isUser && feedback && showFeedback && (
          <FeedbackMini feedback={feedback} />
        )}
      </div>
    </div>
  );
}

function FormattedText({ text }) {
  if (!text) return null;

  // Parse **bold** and `code` inline
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-text-primary">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded text-teal-glow">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function FeedbackMini({ feedback }) {
  const bars = [
    { label: 'Technical', value: feedback.technical_accuracy, color: '#3b82f6' },
    { label: 'Clarity', value: feedback.communication_clarity, color: '#14b8a6' },
    { label: 'Confidence', value: feedback.confidence_level, color: '#8b5cf6' },
  ];

  return (
    <div className="glass rounded-xl p-3 w-full text-xs space-y-2 border border-accent/20">
      <div className="flex items-center justify-between mb-1">
        <span className="text-text-secondary font-medium">Response Analysis</span>
        <span className="gradient-text font-bold">{feedback.overall_score}%</span>
      </div>

      {bars.map(bar => (
        <div key={bar.label} className="space-y-1">
          <div className="flex justify-between text-text-muted">
            <span>{bar.label}</span>
            <span>{bar.value}%</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${bar.value}%`, background: bar.color }}
            />
          </div>
        </div>
      ))}

      {feedback.suggestions?.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="text-text-muted">💡 {feedback.suggestions[0]}</p>
        </div>
      )}
    </div>
  );
}
