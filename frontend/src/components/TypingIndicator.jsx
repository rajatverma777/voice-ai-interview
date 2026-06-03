import React from 'react';

export default function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start message-enter">
      {/* AI avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal to-emerald-600 flex items-center justify-center text-xs font-bold text-white">
        AI
      </div>

      <div className="glass-light rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="typing-dot w-2 h-2 rounded-full bg-teal-glow inline-block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-teal-glow inline-block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-teal-glow inline-block" />
      </div>
    </div>
  );
}
