import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkHealth } from '../services/api';

const FEATURES = [
  {
    icon: '🎙️',
    title: 'Voice Input',
    desc: 'Speak naturally — Whisper AI converts your speech to text in real time.',
  },
  {
    icon: '🤖',
    title: 'AI Interviewer',
    desc: 'GPT-powered interviewer asks DSA, HR, and System Design questions.',
  },
  {
    icon: '🔊',
    title: 'Voice Responses',
    desc: 'Hear AI responses spoken aloud via natural text-to-speech.',
  },
  {
    icon: '📊',
    title: 'Live Feedback',
    desc: 'Get scored on technical accuracy, clarity, and confidence after each answer.',
  },
  {
    icon: '💾',
    title: 'Session Memory',
    desc: 'Conversation context is preserved so the interview flows naturally.',
  },
  {
    icon: '✍️',
    title: 'Typing Mode',
    desc: "Prefer typing? Switch between voice and text input at any time.",
  },
];

const MODES = [
  { id: 'dsa', emoji: '⚡', label: 'DSA & Algorithms', color: 'from-blue-500 to-cyan-500' },
  { id: 'hr', emoji: '🤝', label: 'HR & Behavioral', color: 'from-teal-500 to-emerald-500' },
  { id: 'system_design', emoji: '🏗️', label: 'System Design', color: 'from-purple-500 to-pink-500' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    checkHealth().then(data => {
      setBackendStatus(data ? 'online' : 'offline');
    });
  }, []);

  return (
    <div className="pt-16 min-h-screen">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-6 py-24 flex flex-col items-center text-center">
        {/* Background glow blobs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-32 right-1/4 w-80 h-80 bg-teal/8 rounded-full blur-3xl pointer-events-none" />

        {/* Status badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 border ${
          backendStatus === 'online'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            : backendStatus === 'offline'
              ? 'border-red-500/30 bg-red-500/10 text-red-400'
              : 'border-border bg-panel text-text-muted'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            backendStatus === 'online' ? 'bg-emerald-400 animate-pulse' :
            backendStatus === 'offline' ? 'bg-red-400' : 'bg-text-muted'
          }`} />
          {backendStatus === 'online' ? 'Backend connected' :
           backendStatus === 'offline' ? 'Backend offline — start the server' : 'Checking connection…'}
        </div>

        {/* Headline */}
        <h1 className="font-display text-5xl md:text-7xl font-800 leading-none tracking-tight text-text-primary mb-6 max-w-4xl">
          Your AI
          <br />
          <span className="gradient-text">Interview Coach</span>
        </h1>
        <p className="text-lg text-text-secondary max-w-xl mb-10 leading-relaxed">
          Practice technical interviews with voice interaction. Speak your answers,
          get AI feedback, and ace your next interview.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={() => navigate('/interview')}
            className="px-8 py-3.5 bg-gradient-to-r from-accent to-teal text-white font-semibold rounded-xl hover:shadow-glow transition-all duration-300 hover:scale-105"
          >
            Start Interview →
          </button>
          <a
            href="#features"
            className="px-8 py-3.5 glass border border-border text-text-secondary hover:text-text-primary font-medium rounded-xl hover:border-accent/30 transition-all duration-200"
          >
            Learn more
          </a>
        </div>

        {/* Mock chat preview */}
        <div className="mt-16 w-full max-w-2xl glass rounded-2xl border border-border/60 p-6 text-left">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-amber-500/60" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
            <span className="ml-2 text-xs text-text-muted font-mono">Interview Session</span>
          </div>
          <MockMessage role="ai" text="Hello! Let's start with a classic — Can you explain the difference between an array and a linked list?" />
          <MockMessage role="user" text="Sure! Arrays store elements in contiguous memory with O(1) random access, while linked lists use nodes with pointers allowing O(1) insertion..." />
          <MockMessage role="ai" text="Great answer! What's the time complexity for searching in an unsorted linked list, and how does that compare to a binary search tree?" />
          <div className="flex gap-2 mt-4 items-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-teal flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
            </div>
            <div className="flex items-end gap-[3px] h-5">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="wave-bar" style={{ height: `${8 + i * 2}px` }} />
              ))}
            </div>
            <span className="text-xs text-red-400 animate-pulse ml-1">● Recording</span>
          </div>
        </div>
      </section>

      {/* ── Mode cards ── */}
      <section className="px-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-700 text-center text-text-primary mb-8">
            Choose Your Interview Mode
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => navigate(`/interview?mode=${mode.id}`)}
                className="glass rounded-2xl p-5 text-left border border-border hover:border-accent/40 transition-all duration-200 hover:shadow-glow-sm group"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform`}>
                  {mode.emoji}
                </div>
                <div className="font-semibold text-text-primary text-sm">{mode.label}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="px-6 pb-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-2xl font-700 text-center text-text-primary mb-2">
            Everything You Need
          </h2>
          <p className="text-center text-text-secondary text-sm mb-10">
            Built with React, FastAPI, Whisper AI, and gTTS
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="glass-light rounded-2xl p-5 border border-border/60 hover:border-accent/20 transition-colors">
                <div className="text-2xl mb-3">{f.icon}</div>
                <div className="font-semibold text-text-primary text-sm mb-1">{f.title}</div>
                <div className="text-xs text-text-secondary leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 px-6 text-center">
        <p className="text-text-muted text-xs">
          Voice AI Interview Assistant · Built with React + FastAPI + Whisper ·{' '}
          <span className="gradient-text">Open Source</span>
        </p>
      </footer>
    </div>
  );
}

function MockMessage({ role, text }) {
  const isUser = role === 'user';
  return (
    <div className={`flex gap-2.5 mb-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
        isUser ? 'bg-gradient-to-br from-accent to-blue-600' : 'bg-gradient-to-br from-teal to-emerald-600'
      } text-white`}>
        {isUser ? 'Y' : 'AI'}
      </div>
      <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs text-text-secondary leading-relaxed ${
        isUser ? 'bg-accent/15 border border-accent/20 rounded-tr-sm' : 'bg-white/5 border border-white/10 rounded-tl-sm'
      }`}>
        {text}
      </div>
    </div>
  );
}
