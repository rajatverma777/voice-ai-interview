import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listSessions, clearHistory } from '../services/api';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const list = await listSessions();
      setSessions(list || []);
    } catch (err) {
      console.error(err);
      setError('Database telemetry link offline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm("Purge session log permanently? This record cannot be recovered.")) return;
    try {
      await clearHistory(sessionId);
      fetchHistory();
    } catch (err) {
      console.error(err);
      setError('Failed to purge session record.');
    }
  };

  // Compile statistics
  let totalExchanges = 0;
  let avgTech = 0, avgClarity = 0, avgConf = 0, avgOverall = 0;
  let techCount = 0, clarityCount = 0, confCount = 0, overallCount = 0;
  const suggestions = [];

  sessions.forEach(sess => {
    if (sess.messages) {
      sess.messages.forEach(m => {
        if (m.role === 'user') {
          totalExchanges++;
        }
        if (m.role === 'assistant' && m.feedback) {
          const fb = m.feedback;
          if (fb.technical_accuracy !== undefined && fb.technical_accuracy !== null) {
            avgTech += fb.technical_accuracy;
            techCount++;
          }
          if (fb.communication_clarity !== undefined && fb.communication_clarity !== null) {
            avgClarity += fb.communication_clarity;
            clarityCount++;
          }
          if (fb.confidence_level !== undefined && fb.confidence_level !== null) {
            avgConf += fb.confidence_level;
            confCount++;
          }
          if (fb.overall_score !== undefined && fb.overall_score !== null) {
            avgOverall += fb.overall_score;
            overallCount++;
          }
          if (fb.suggestions) {
            fb.suggestions.forEach(s => {
              if (s && !suggestions.includes(s)) {
                suggestions.push(s);
              }
            });
          }
        }
      });
    }
  });

  const stats = {
    technical: techCount ? Math.round(avgTech / techCount) : 0,
    clarity: clarityCount ? Math.round(avgClarity / clarityCount) : 0,
    confidence: confCount ? Math.round(avgConf / confCount) : 0,
    overall: overallCount ? Math.round(avgOverall / overallCount) : 0,
  };

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
    <div className="pt-24 min-h-screen bg-void dot-grid relative overflow-hidden px-4 md:px-8 flex flex-col">
      {/* Dynamic ambient backdrop light */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-teal/5 rounded-full blur-[180px] pointer-events-none pulse-glow" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-accent/3 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-[94%] xl:max-w-[1440px] mx-auto relative z-10 flex-1 flex flex-col space-y-8 pb-16">
        
        {/* ── PROFILE HERO BANNER ── */}
        <header className="glass rounded-3xl p-6 md:p-8 border border-border/80 shadow-glass flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
          {/* Subtle gradient background slide */}
          <div className="absolute inset-0 bg-gradient-to-r from-teal/5 via-transparent to-accent/5 pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left z-10">
            {/* Glowing Avatar */}
            <div className="relative group">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-accent to-teal blur-md opacity-40 group-hover:opacity-75 transition-opacity duration-300" />
              <div className="w-20 h-20 rounded-2xl bg-void border border-accent/40 flex items-center justify-center text-2xl font-display font-bold text-accent shadow-inner relative z-10">
                {initials}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white uppercase">
                  {user?.username || 'Guest Pilot'}
                </h1>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-mono tracking-wider bg-accent/10 border border-accent/30 text-accent uppercase font-bold animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Active Coach
                </span>
              </div>
              <p className="text-sm text-text-secondary font-mono">{user?.email || 'unregistered@voiceai.com'}</p>
              <p className="text-[10px] text-text-muted font-mono tracking-widest uppercase">OPERATOR ID: VAI-{user?.user_id?.slice(-6) || '8749'}</p>
            </div>
          </div>
          
          {/* Dashboard Quick Stats */}
          <div className="flex flex-wrap gap-4 w-full lg:w-auto justify-center lg:justify-end z-10 font-mono">
            <div className="px-6 py-4 bg-void/45 border border-border/85 rounded-2xl min-w-[140px] flex flex-col justify-between hover:border-teal/30 transition-colors">
              <span className="text-text-muted text-[9px] uppercase tracking-widest font-bold">Total Sessions</span>
              <span className="text-2xl font-display font-black text-white mt-1">{sessions.length}</span>
            </div>
            <div className="px-6 py-4 bg-void/45 border border-border/85 rounded-2xl min-w-[140px] flex flex-col justify-between hover:border-accent/30 transition-colors">
              <span className="text-text-muted text-[9px] uppercase tracking-widest font-bold">Audio Exchanges</span>
              <span className="text-2xl font-display font-black text-accent mt-1">{totalExchanges}</span>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl bg-red-500/5 border border-red-500/25 px-5 py-4 text-xs text-red-400 font-mono flex items-center gap-2">
            <span>⚠️</span> <span>[SYSTEM_EXCEPTION]: {error}</span>
          </div>
        )}

        {loading ? (
          <div className="glass rounded-3xl p-20 text-center border border-border flex-1 flex flex-col justify-center items-center">
            <div className="w-12 h-12 rounded-full border-2 border-accent/15 border-t-accent animate-spin mb-4" />
            <p className="text-text-secondary text-xs tracking-widest uppercase font-mono">Synchronizing Telemetry Records...</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8 flex-1 min-h-[calc(100vh-270px)] items-stretch">
            
            {/* ── LEFT COLUMN: PERFORMANCE DIAGNOSTICS & ADVISORY ── */}
            <div className="lg:col-span-1 flex flex-col gap-8">
              
              {/* DIAGNOSTICS CARD */}
              <div className="glass rounded-3xl p-6 border border-border/85 shadow-glass relative flex flex-col justify-between">
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
              <div className="glass rounded-3xl p-6 border border-border/85 shadow-glass flex-1 flex flex-col">
                <h2 className="font-display text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-teal" />
                  Coach Recommendations
                </h2>
                <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
                  {suggestions.length > 0 ? (
                    suggestions.map((s, idx) => (
                      <div key={idx} className="p-3.5 bg-void/50 border border-border/40 rounded-2xl flex items-start gap-3 text-xs text-text-secondary leading-relaxed hover:border-accent/20 transition-colors">
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
              <div className="glass rounded-3xl p-6 border border-border/85 shadow-glass flex-1 flex flex-col">
                <h2 className="font-display text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2 mb-6">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  Interview Archives
                </h2>
                
                {sessions.length > 0 ? (
                  <div className="space-y-3 overflow-y-auto pr-1.5 flex-1 scrollbar-thin">
                    {sessions.map(sess => {
                      const score = getSessionScore(sess);
                      const hasScore = score > 0;
                      const userMsgCount = sess.messages ? sess.messages.filter(m => m.role === 'user').length : 0;
                      
                      return (
                        <div
                          key={sess.session_id}
                          onClick={() => navigate(`/interview?session_id=${sess.session_id}&mode=${sess.mode}`)}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-void/35 border border-border/40 hover:border-accent/40 rounded-2xl hover:bg-accent/[0.02] cursor-pointer transition-all duration-200 gap-4 group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-9 h-9 rounded-xl bg-void border border-border/80 flex items-center justify-center text-slate-400 group-hover:border-accent/40 group-hover:text-accent transition-colors">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                              </svg>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center flex-wrap gap-2.5">
                                <span className="text-sm font-display font-semibold text-white uppercase tracking-wide">
                                  {sess.mode === 'dsa' ? 'Data Structures & Algorithms' : sess.mode === 'system_design' ? 'System Design' : 'Behavioral & HR'}
                                </span>
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-void border border-border text-text-secondary uppercase">
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
                                onClick={() => navigate(`/interview?session_id=${sess.session_id}&mode=${sess.mode}`)}
                                className="px-4 py-2 bg-accent/10 border border-accent/30 text-accent text-xs font-semibold rounded-xl hover:bg-accent hover:text-void transition-all uppercase tracking-wide font-mono"
                              >
                                Resume
                              </button>
                              <button
                                onClick={(e) => handleDeleteSession(e, sess.session_id)}
                                className="p-2 border border-border/80 hover:border-red-500/40 rounded-xl text-text-muted hover:text-red-400 hover:bg-red-500/5 transition-all"
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
                      className="px-6 py-3 bg-gradient-to-r from-accent to-teal text-white text-xs font-bold font-mono tracking-widest rounded-xl hover:shadow-glow transition-all uppercase hover:scale-[1.02]"
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
