import React from 'react';

export default function TypingIndicator() {
  return (
    <div className="flex gap-3.5 items-start message-enter">
      {/* AI avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-mono font-bold border transition-all bg-void border-teal/40 text-teal shadow-glow-teal">
        AI
      </div>

      <div className="bg-void/45 border border-border/80 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5 shadow-glass card-liquid backdrop-blur-lg">
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-accent inline-block" />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-accent inline-block" />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-accent inline-block" />
      </div>
    </div>
  );
}
