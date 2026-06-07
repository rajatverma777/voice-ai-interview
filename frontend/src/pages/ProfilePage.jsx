import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listSessions, clearHistory, clearAllHistory } from '../services/api';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState(() => {
    const cached = localStorage.getItem('vai_cached_sessions');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem('vai_cached_sessions');
  });
  const [error, setError] = useState('');
  const [displayLimit, setDisplayLimit] = useState(10);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [editError, setEditError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const handleOpenEditModal = () => {
    setEditUsername(user?.username || '');
    setEditEmail(user?.email || '');
    setEditPhoto(user?.profile_photo || '');
    setEditError('');
    setEditModalOpen(true);
  };

  const fetchHistory = React.useCallback(async (showLoading = false, signal = null) => {
    try {
      if (showLoading) setLoading(true);
      const list = await listSessions({ signal });
      const newList = list || [];
      setSessions(newList);

      // ─── CRITICAL PERF FIX ────────────────────────────────────────────
      // localStorage.setItem is SYNCHRONOUS and blocks the main thread.
      // Writing full session message histories (potentially 500KB+ of JSON)
      // was causing 2-3 second UI freezes every time the user navigated away.
      //
      // Fix: immediately store only lightweight metadata (no messages) so the
      // cache still works for fast page loads. Then defer the heavy per-session
      // full-message writes to requestIdleCallback so they never block the UI.
      // ─────────────────────────────────────────────────────────────────────

      // Step 1: Fast write — minimal metadata only (instant, no blocking)
      const minimalList = newList.map(({ session_id, mode, created_at }) => ({
        session_id, mode, created_at,
      }));
      try { localStorage.setItem('vai_cached_sessions', JSON.stringify(minimalList)); } catch (_) {}

      // Step 2: Defer expensive per-session message caching to idle time
      const cacheSessionMessages = () => {
        newList.forEach(sess => {
          if (sess.session_id && sess.messages) {
            try {
              localStorage.setItem(
                `vai_session_cache_${sess.session_id}`,
                JSON.stringify({ messages: sess.messages })
              );
            } catch (_) {}
          }
        });
      };
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(cacheSessionMessages, { timeout: 4000 });
      } else {
        setTimeout(cacheSessionMessages, 500);
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        console.error(err);
        setError('Database telemetry link offline.');
      }
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    const controller = new AbortController();
    fetchHistory(false, controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchHistory]);

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm("Purge session log permanently? This record cannot be recovered.")) return;
    try {
      await clearHistory(sessionId);
      localStorage.removeItem(`vai_session_cache_${sessionId}`);
      fetchHistory(true);
    } catch (err) {
      console.error(err);
      setError('Failed to purge session record.');
    }
  };

  const handleClearAllSessions = async (e) => {
    e.stopPropagation();
    if (!window.confirm("WARNING: Purge ALL session logs permanently? This operation is irreversible and all archives will be lost.")) return;
    try {
      setLoading(true);
      await clearAllHistory();
      // Clear all cached messages and cached metadata list
      const cachedKeys = Object.keys(localStorage).filter(k => k.startsWith('vai_session_cache_'));
      cachedKeys.forEach(k => localStorage.removeItem(k));
      localStorage.removeItem('vai_cached_sessions');
      
      fetchHistory(true);
    } catch (err) {
      console.error(err);
      setError('Failed to purge all session records.');
      setLoading(false);
    }
  };

  // Stats are shown as N/A now since messages aren't included in the sessions list.
  // They will be populated if sessions have summary fields from the backend.
  const { stats, suggestions, totalExchanges } = React.useMemo(() => {
    let exchanges = 0;
    let avgTech = 0, avgClarity = 0, avgConf = 0, avgOverall = 0;
    let techCount = 0, clarityCount = 0, confCount = 0, overallCount = 0;
    const suggs = [];

    sessions.forEach(sess => {
      // Support both full message-based sessions (cached) and metadata-only sessions (from list API)
      if (sess.messages) {
        sess.messages.forEach(m => {
          if (m.role === 'user') exchanges++;
          if (m.role === 'assistant' && m.feedback) {
            const fb = m.feedback;
            if (fb.technical_accuracy != null) { avgTech += fb.technical_accuracy; techCount++; }
            if (fb.communication_clarity != null) { avgClarity += fb.communication_clarity; clarityCount++; }
            if (fb.confidence_level != null) { avgConf += fb.confidence_level; confCount++; }
            if (fb.overall_score != null) { avgOverall += fb.overall_score; overallCount++; }
            if (fb.suggestions) fb.suggestions.forEach(s => { if (s && !suggs.includes(s)) suggs.push(s); });
          }
        });
      }
      // Support pre-aggregated score fields if present
      if (sess.score_summary) {
        const s = sess.score_summary;
        if (s.technical != null) { avgTech += s.technical; techCount++; }
        if (s.clarity != null) { avgClarity += s.clarity; clarityCount++; }
        if (s.confidence != null) { avgConf += s.confidence; confCount++; }
        if (s.overall != null) { avgOverall += s.overall; overallCount++; }
      }
      if (sess.suggestions) {
        sess.suggestions.forEach(s => { if (s && !suggs.includes(s)) suggs.push(s); });
      }
      if (sess.message_count) exchanges += sess.message_count;
    });

    return {
      totalExchanges: exchanges,
      stats: {
        technical: techCount ? Math.round(avgTech / techCount) : 0,
        clarity: clarityCount ? Math.round(avgClarity / clarityCount) : 0,
        confidence: confCount ? Math.round(avgConf / confCount) : 0,
        overall: overallCount ? Math.round(avgOverall / overallCount) : 0,
      },
      suggestions: suggs
    };
  }, [sessions]);

  const getSessionScore = (sess) => {
    if (!sess.messages) return 0;
    const feedbackMsgs = sess.messages.filter(m => m.role === 'assistant' && m.feedback);
    if (feedbackMsgs.length === 0) return 0;
    const sum = feedbackMsgs.reduce((acc, m) => acc + m.feedback.overall_score, 0);
    return Math.round(sum / feedbackMsgs.length);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recent';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : '?';

  return (
    <div className="pt-24 min-h-screen relative overflow-hidden px-4 md:px-8 flex flex-col">

      <div className="w-full max-w-[94%] xl:max-w-[1440px] mx-auto relative z-10 flex-1 flex flex-col space-y-8 pb-16">
        
        {/* ── PROFILE HERO SECTION (SPLIT IN TWO PARTS) ── */}
        <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
          
          {/* Part 1: User Profile Details (Clickable) */}
          <div
            onClick={handleOpenEditModal}
            className="glass-profile card-liquid rounded-3xl p-6 md:p-8 border border-border/80 shadow-glass flex-1 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left relative overflow-hidden cursor-pointer group/profile transition-all duration-500 hover:border-accent/40"
          >
            {/* Ambient liquid glow blobs */}
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-accent/5 rounded-full blur-[60px] pointer-events-none group-hover/profile:bg-accent/10 transition-all duration-700 animate-pulse" />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-indigo/5 rounded-full blur-[60px] pointer-events-none group-hover/profile:bg-indigo/10 transition-all duration-700 animate-pulse delay-500" />
            <div className="absolute inset-0 bg-gradient-to-tr from-accent/[0.02] via-transparent to-indigo/[0.02] pointer-events-none" />

            {/* Edit Indicator Badge */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.08] text-[9px] font-mono text-text-muted uppercase tracking-widest group-hover/profile:border-accent/40 group-hover/profile:text-accent group-hover/profile:bg-accent/5 hover:shadow-glow transition-all duration-300">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              <span>Edit Info</span>
            </div>

            {/* Glowing Pulsing Avatar Container */}
            <div className="relative group/avatar z-10">
              {/* Ripple Ring 1 */}
              <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-tr from-accent to-indigo opacity-20 group-hover/profile:opacity-50 blur-[2px] transition-all duration-500" />
              {/* Ripple Ring 2 */}
              <div className="absolute -inset-3 rounded-2xl bg-gradient-to-tr from-accent/30 to-indigo/30 opacity-0 group-hover/profile:opacity-20 blur-[6px] group-hover/profile:scale-105 transition-all duration-500" />
              
              {user?.profile_photo ? (
                <img
                  src={user.profile_photo}
                  alt={user?.username}
                  className="w-20 h-20 rounded-2xl border border-accent/40 object-cover relative z-10 group-hover/profile:border-accent/70 transition-colors duration-500"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-void/30 border border-accent/40 flex items-center justify-center text-3xl font-display font-bold text-accent shadow-inner relative z-10 group-hover/profile:border-accent/70 transition-colors duration-500">
                  {initials}
                </div>
              )}
            </div>
            
            <div className="space-y-2.5 z-10 text-left sm:text-left flex flex-col items-center sm:items-start w-full">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight text-white uppercase group-hover/profile:text-accent transition-colors duration-300">
                  {user?.username || 'Guest Pilot'}
                </h1>
                
                {/* Active Coach Badge */}
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-mono tracking-widest bg-accent/10 border border-accent/40 text-accent uppercase font-bold shadow-[0_0_15px_rgba(0,210,255,0.05)] transition-all duration-300">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent"></span>
                  </span>
                  Active Coach
                </span>
              </div>
              
              <div className="space-y-0.5 text-center sm:text-left">
                <p className="text-xs text-text-secondary/95 font-mono tracking-wide">{user?.email || 'unregistered@voiceai.com'}</p>
                <p className="text-[10px] text-text-muted font-mono tracking-widest uppercase flex items-center justify-center sm:justify-start gap-1.5">
                  <span className="text-accent/60">OP_ID //</span>
                  <span>VAI-{user?.user_id?.slice(-6) || '8749'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Part 2: Quick Stats Dashboard */}
          <div className="glass-profile card-liquid rounded-3xl p-6 md:p-8 border border-border/80 shadow-glass flex flex-row items-stretch gap-4 font-mono justify-center relative overflow-hidden lg:min-w-[340px]">
            <div className="absolute inset-0 bg-gradient-to-l from-accent/5 via-transparent to-teal/5 pointer-events-none" />
            
            <div className="px-6 py-4 bg-void/10 border border-border/85 rounded-2xl min-w-[130px] flex-1 flex flex-col justify-between hover:border-accent/30 transition-colors z-10">
              <span className="text-text-muted text-[9px] uppercase tracking-widest font-bold whitespace-nowrap">Total Sessions</span>
              <span className="text-2xl font-display font-black text-accent mt-1">{sessions.length}</span>
            </div>
            <div className="px-6 py-4 bg-void/10 border border-border/85 rounded-2xl min-w-[130px] flex-1 flex flex-col justify-between hover:border-accent/30 transition-colors z-10">
              <span className="text-text-muted text-[9px] uppercase tracking-widest font-bold whitespace-nowrap">Total Queries</span>
              <span className="text-2xl font-display font-black text-accent mt-1">{totalExchanges}</span>
            </div>
          </div>

        </div>

        {error && (
          <div className="rounded-2xl bg-red-500/5 border border-red-500/25 px-5 py-4 text-xs text-red-400 font-mono flex items-center gap-2">
            <span>⚠️</span> <span>[SYSTEM_EXCEPTION]: {error}</span>
          </div>
        )}

        {loading ? (
          <div className="glass-profile rounded-3xl p-20 text-center border border-border flex-1 flex flex-col justify-center items-center">
            <div className="w-12 h-12 rounded-full border-2 border-accent/15 border-t-accent animate-spin mb-4" />
            <p className="text-text-secondary text-xs tracking-widest uppercase font-mono">Synchronizing Telemetry Records...</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8 flex-1 min-h-[calc(100vh-270px)] items-stretch">
            
            {/* ── LEFT COLUMN: PERFORMANCE DIAGNOSTICS & ADVISORY ── */}
            <div className="lg:col-span-1 flex flex-col gap-8">
              
              {/* DIAGNOSTICS CARD */}
              <div className="glass-profile card-liquid rounded-3xl p-6 border border-border/85 shadow-glass relative flex flex-col justify-between">
                <div>
                  <h2 className="font-display text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2 mb-6">
                    <span className="w-2 h-2 rounded-full bg-accent" />
                    Diagnostics Dashboard
                  </h2>
                  
                  {/* Radial Score Gauge */}
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="72"
                          cy="72"
                          r="62"
                          stroke="rgba(30, 41, 59, 0.4)"
                          strokeWidth="6"
                          fill="transparent"
                        />
                        <circle
                          cx="72"
                          cy="72"
                          r="62"
                          stroke="url(#radialGrad)"
                          strokeWidth="6"
                          fill="transparent"
                          strokeDasharray={389.56}
                          strokeDashoffset={389.56 - (389.56 * stats.overall) / 100}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                        <defs>
                          <linearGradient id="radialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#00d2ff" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-display font-black text-white tracking-tighter">{stats.overall}%</span>
                        <span className="text-[7.5px] text-text-muted font-mono uppercase tracking-widest font-bold mt-1">Overall Rank</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score Sliders */}
                <div className="space-y-4 mt-6">
                  <ScoreMeter label="Technical Correctness" value={stats.technical} />
                  <ScoreMeter label="Communication Clarity" value={stats.clarity} />
                  <ScoreMeter label="Confidence Indicators" value={stats.confidence} />
                </div>
              </div>

              {/* ACTIONABLE ADVICE CARD */}
              <div className="glass-profile card-liquid rounded-3xl p-6 border border-border/85 shadow-glass flex-1 flex flex-col">
                <h2 className="font-display text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-teal" />
                  Coach Recommendations
                </h2>
                <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
                  {suggestions.length > 0 ? (
                    suggestions.map((s, idx) => (
                      <div key={idx} className="p-3.5 bg-void/10 border border-border/40 rounded-2xl flex items-start gap-3 text-xs text-text-secondary leading-relaxed hover:border-accent/20 transition-colors">
                        <span className="text-accent text-sm mt-0.5">💡</span>
                        <span>{s}</span>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 font-mono text-[10px] text-text-muted uppercase tracking-widest">
                      <span>No advisory logs calibrated.</span>
                      <span className="text-[8px] mt-1.5 leading-normal normal-case font-sans tracking-normal text-text-muted">Complete a session to generate custom advice tips.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN: SESSION LOG ARCHIVES ── */}
            <div className="lg:col-span-2 flex flex-col">
              <div className="glass-profile card-liquid rounded-3xl p-6 border border-border/85 shadow-glass flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
                  <h2 className="font-display text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent" />
                    Interview Archives
                  </h2>
                  {sessions.length > 0 && (
                    <button
                      onMouseDown={handleClearAllSessions}
                      className="px-3.5 py-1.5 text-[10px] font-semibold rounded-xl border border-red-500/20 hover:border-red-500/40 bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-all duration-300 uppercase tracking-wider font-mono btn-liquid"
                    >
                      Clear All History
                    </button>
                  )}
                </div>
                
                {sessions.length > 0 ? (
                  <div className="space-y-3 overflow-y-auto p-3 -m-3 flex-1 scrollbar-thin">
                    {sessions.slice(0, displayLimit).map(sess => {
                      const score = getSessionScore(sess) || (sess.score_summary && sess.score_summary.overall != null ? Math.round(sess.score_summary.overall) : 0);
                      const hasScore = score > 0 || (sess.score_summary && sess.score_summary.overall != null);
                      const userMsgCount = sess.message_count || (sess.messages ? sess.messages.filter(m => m.role === 'user').length : 0);
                      
                      return (
                        <div
                          key={sess.session_id}
                          onClick={() => navigate(`/interview?session_id=${sess.session_id}&mode=${sess.mode}`)}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl cursor-pointer gap-4 group card-liquid-subtle shadow-sm"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-9 h-9 rounded-xl bg-void/20 border border-border/80 flex items-center justify-center text-slate-400 group-hover:border-accent/40 group-hover:text-accent transition-colors">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                              </svg>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center flex-wrap gap-2.5">
                                <span className="text-sm font-display font-semibold text-white uppercase tracking-wide">
                                  {sess.mode === 'dsa' ? 'Data Structures & Algorithms' : sess.mode === 'system_design' ? 'System Design' : 'Behavioral & HR'}
                                </span>
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-void/20 border border-border text-text-secondary uppercase">
                                  {userMsgCount} Queries
                                </span>
                              </div>
                              <div className="text-[11px] text-text-muted font-mono">
                                {formatDate(sess.created_at)}
                              </div>
                            </div>
                          </div>
 
                          <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                            <div className="text-left sm:text-right font-mono">
                              <div className="text-[8px] text-text-muted uppercase tracking-wider font-bold">Overall Score</div>
                              {hasScore ? (
                                <div className="text-sm font-display font-bold text-accent">{score}%</div>
                              ) : (
                                <div className="text-[10px] text-text-muted">Unfinished</div>
                              )}
                            </div>
                            
                            <div className="flex gap-2.5" onClick={e => e.stopPropagation()}>
                              <button
                                onMouseDown={() => navigate(`/interview?session_id=${sess.session_id}&mode=${sess.mode}`)}
                                className="px-4 py-2 text-xs font-semibold rounded-xl btn-liquid-glass uppercase tracking-wide font-mono"
                              >
                                Resume
                              </button>
                              <button
                                onMouseDown={(e) => handleDeleteSession(e, sess.session_id)}
                                className="p-2 border border-border/80 hover:border-red-500/40 rounded-xl text-text-muted hover:text-red-400 hover:bg-red-500/5 btn-liquid"
                                title="Purge Record"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {sessions.length > displayLimit && (
                      <button
                        onClick={() => setDisplayLimit(prev => prev + 10)}
                        className="w-full mt-4 py-3 text-[11px] font-semibold rounded-xl border border-border/80 hover:border-accent/40 text-text-secondary hover:text-white transition-all duration-200 uppercase tracking-widest font-mono bg-void/10 hover:bg-void/25 shadow-inner"
                      >
                        Show More Sessions ({sessions.length - displayLimit} remaining)
                      </button>
                    )}
                  </div>
                ) : (
                  /* PREMIUM SVG EMPTY STATE */
                  <div className="py-16 border border-dashed border-border/60 rounded-3xl flex-1 flex flex-col justify-center items-center text-center px-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent/5 to-teal/5 border border-border/80 flex items-center justify-center mb-6 shadow-inner animate-float">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
                        <circle cx="12" cy="12" r="9" strokeOpacity="0.2"/>
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="url(#micGrad)" strokeWidth="1.8"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeWidth="1.8"/>
                        <line x1="12" y1="19" x2="12" y2="23" strokeWidth="1.8"/>
                        <line x1="8" y1="23" x2="16" y2="23" strokeWidth="1.8"/>
                        <defs>
                          <linearGradient id="micGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#00d2ff"/>
                            <stop offset="100%" stopColor="#6366f1"/>
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                    
                    <h3 className="font-display text-base font-bold text-white mb-2">No Mock Sessions Found</h3>
                    <p className="text-text-secondary text-xs max-w-xs leading-relaxed mb-6 font-sans">
                      Start your first audio mock interview with our AI coach to review metrics and custom performance evaluations.
                    </p>
                    
                    <button
                      onClick={() => navigate('/interview')}
                      className="px-8 py-3.5 text-white font-bold tracking-widest rounded-2xl btn-liquid-glass uppercase text-xs font-mono"
                    >
                      Start Mock Session
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── iOS-STYLE SLIDING PROFILE EDIT SHEET ── */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md animate-fade-in">
          {/* Modal Card */}
          <div className="glass-premium max-w-md w-full rounded-3xl border border-accent/20 p-6 md:p-8 shadow-2xl relative animate-scale-in flex flex-col space-y-6">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-border/60">
              <h3 className="text-lg font-display font-bold text-white tracking-tight uppercase flex items-center gap-2">
                <span>⚙️</span> Edit Profile Details
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="w-8 h-8 rounded-full border border-border/80 hover:border-red-500/40 text-text-muted hover:text-red-400 hover:bg-red-500/5 flex items-center justify-center btn-liquid text-sm"
              >
                ✕
              </button>
            </div>

            {/* Error Message */}
            {editError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-mono">
                {editError}
              </div>
            )}

            {/* Avatar Selection & Upload */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-accent to-teal blur-md opacity-40 group-hover:opacity-75 transition-opacity" />
                {editPhoto ? (
                  <img
                    src={editPhoto}
                    alt="Preview"
                    className="w-24 h-24 rounded-2xl object-cover border border-accent/40 relative z-10"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-void border border-accent/40 flex items-center justify-center text-3xl font-display font-bold text-accent shadow-inner relative z-10">
                    {editUsername ? editUsername.slice(0, 2).toUpperCase() : '?'}
                  </div>
                )}
                {/* Clear Photo overlay */}
                {editPhoto && (
                  <button
                    onClick={() => setEditPhoto('')}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold border border-void z-20 shadow-md"
                    title="Remove Photo"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Upload Input */}
              <div className="flex flex-col items-center gap-2 w-full">
                <label className="px-4 py-2 rounded-xl border border-border/80 bg-void/50 hover:border-accent/40 text-text-secondary hover:text-white cursor-pointer btn-liquid font-mono text-xs text-center w-full">
                  <span>📷 Upload Custom Profile Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          setEditError("Image must be smaller than 2MB.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditPhoto(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                <span className="text-[10px] text-text-muted font-mono uppercase">Supports PNG, JPG (Max 2MB)</span>
              </div>
            </div>

            {/* Fields Form */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-text-muted">Username</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Enter name"
                  className="w-full px-4 py-3 bg-void/45 border border-border/80 rounded-xl focus:border-accent/60 outline-none text-white text-sm font-sans transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-text-muted">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Enter email"
                  className="w-full px-4 py-3 bg-void/45 border border-border/80 rounded-xl focus:border-accent/60 outline-none text-white text-sm font-sans transition-colors"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="flex-1 py-3 text-xs font-semibold rounded-xl border border-border/80 hover:border-red-500/40 text-text-secondary hover:text-red-400 font-mono uppercase btn-liquid"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingProfile}
                onClick={async () => {
                  if (!editUsername.trim()) {
                    setEditError("Username cannot be empty.");
                    return;
                  }
                  if (!editEmail.trim()) {
                    setEditError("Email cannot be empty.");
                    return;
                  }
                  try {
                    setSavingProfile(true);
                    setEditError('');
                    await updateUser(editUsername, editEmail, editPhoto);
                    setEditModalOpen(false);
                  } catch (err) {
                    console.error(err);
                    setEditError(err.response?.data?.detail || "Failed to update profile info.");
                  } finally {
                    setSavingProfile(false);
                  }
                }}
                className="flex-1 py-3 text-xs font-semibold rounded-xl bg-accent text-void font-bold font-mono uppercase hover:bg-accent/90 btn-liquid flex items-center justify-center gap-2"
              >
                {savingProfile ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-void/30 border-t-void rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreMeter({ label, value }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-text-secondary">{label}</span>
        <span className="font-bold text-white">{value}%</span>
      </div>
      <div className="h-2 bg-void rounded-full overflow-hidden border border-border/60 p-[1px]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-teal transition-all duration-1000"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
