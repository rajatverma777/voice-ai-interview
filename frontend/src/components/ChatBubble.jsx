import React, { useState } from 'react';

export default function ChatBubble({ message, playAudio }) {
  const { role, content, timestamp, feedback } = message;
  const isUser = role === 'user';
  const [showFeedback, setShowFeedback] = useState(false);

  const timeStr = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className={`message-enter flex gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start`}>
      {/* Avatar Container */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-mono font-bold border transition-all ${
        isUser
          ? 'bg-void border-accent/40 text-accent shadow-glow-sm'
          : 'bg-void border-teal/40 text-teal shadow-glow-teal'
      }`}>
        {isUser ? 'USR' : 'AI'}
      </div>

      <div className={`flex flex-col gap-1.5 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Chat Bubble Box */}
        <div className={`rounded-2xl px-4 py-3 text-xs leading-relaxed font-sans card-liquid ${
          isUser
            ? 'bg-accent/[0.04] border border-accent/30 text-white rounded-tr-none shadow-glass hover:bg-accent/[0.08] hover:border-accent/50 hover:shadow-[0_0_20px_rgba(0,210,255,0.08)]'
            : 'bg-void/45 border border-border/80 text-text-secondary rounded-tl-none shadow-glass hover:bg-void/60 hover:border-border hover:shadow-[0_0_20px_rgba(99,102,241,0.05)]'
        }`}>
          <FormattedText text={content} />
        </div>

        {/* Timestamp & Diagnostic Toggle */}
        <div className={`flex items-center gap-3 font-mono text-[9px] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-text-muted">{timeStr}</span>
          {!isUser && playAudio && (
            <button
              onClick={() => playAudio(content, true)}
              className="text-text-secondary hover:text-accent transition-colors flex items-center gap-1 font-bold"
              title="Repeat Audio Speech"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
              [Speak]
            </button>
          )}
          {!isUser && feedback && (
            <button
              onClick={() => setShowFeedback(v => !v)}
              className="text-accent/80 hover:text-accent transition-colors flex items-center gap-1 font-bold"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              {showFeedback ? '[Hide Diagnostics]' : '[Run Diagnostics]'}
            </button>
          )}
        </div>

        {/* Inline Feedback Box */}
        {!isUser && feedback && showFeedback && (
          <FeedbackMini feedback={feedback} />
        )}
      </div>
    </div>
  );
}

function FormattedText({ text }) {
  if (!text) return null;

  // Split bold **text** and `code` segments
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="font-mono text-[10px] bg-void/80 border border-border px-1.5 py-0.5 rounded text-accent mx-0.5 font-bold">
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
    { label: 'Technical Accuracy', value: feedback.technical_accuracy, color: 'bg-accent' },
    { label: 'Communication Clarity', value: feedback.communication_clarity, color: 'bg-teal' },
    { label: 'Confidence Score', value: feedback.confidence_level, color: 'bg-accent' },
  ];

  return (
    <div className="glass rounded-2xl p-4 w-full max-w-sm text-[10px] font-mono space-y-2 border border-border/80 shadow-glass animate-scale-in">
      <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-1.5">
        <span className="text-text-muted font-bold tracking-wider uppercase">Diagnostics</span>
        <span className="text-xs font-display font-black text-white">{feedback.overall_score}%</span>
      </div>

      {bars.map(bar => (
        <div key={bar.label} className="space-y-1">
          <div className="flex justify-between text-[9px] text-text-secondary">
            <span>{bar.label}</span>
            <span className="font-bold text-white">{bar.value}%</span>
          </div>
          <div className="h-1.5 bg-void rounded-full overflow-hidden border border-border/60">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${bar.color}`}
              style={{ width: `${bar.value}%` }}
            />
          </div>
        </div>
      ))}

      {feedback.suggestions?.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-border/40 text-[9px] text-text-secondary leading-relaxed">
          <span className="text-accent font-bold">EVALUATION: </span> {feedback.suggestions[0]}
        </div>
      )}
    </div>
  );
}
