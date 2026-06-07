import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [mode, setMode]     = useState('login'); // 'login' | 'register'
  const [form, setForm]     = useState({ username: '', email: '', password: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const containerRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, height: 0, opacity: 0 });
  const [hoveredMode, setHoveredMode] = useState(null);
  const activeMode = hoveredMode || mode;

  // Update tabs indicator coordinates dynamically
  useEffect(() => {
    const updateIndicator = () => {
      const container = containerRef.current;
      if (!container) return;

      const activeChild = container.querySelector('[data-active="true"]');
      if (activeChild) {
        setIndicatorStyle({
          left: activeChild.offsetLeft,
          width: activeChild.offsetWidth,
          height: activeChild.offsetHeight,
          opacity: 1,
        });
      } else {
        setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
      }
    };

    updateIndicator();

    window.addEventListener('resize', updateIndicator);
    return () => {
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeMode]);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (form.password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.username.trim()) {
          setError('Username is required');
          setLoading(false);
          return;
        }
        await register(form.username, form.email, form.password);
      }
      navigate('/interview');
    } catch (err) {
      setError(err.response?.data?.detail || 'Validation error. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden pt-12">

      <div className="relative w-full max-w-sm mt-6 z-10">
        
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8 text-center font-sans">
          <div className="w-12 h-12 rounded-2xl bg-accent/[0.05] border border-accent/40 flex items-center justify-center text-accent shadow-glow mb-4 card-liquid hover:bg-accent/[0.12] hover:scale-105 cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="text-xl font-display font-extrabold tracking-wide text-white uppercase">
            VOICE_AI <span className="text-accent font-light">COACH</span>
          </h1>
          <p className="text-text-muted text-[10px] tracking-wider mt-1 uppercase">Sign In to Your Account</p>
        </div>

        {/* glass Card */}
        <div className="bg-[#08080a]/10 backdrop-blur-[2px] border border-white/[0.06] shadow-[0_24px_80px_rgba(0,0,0,0.6)] card-liquid rounded-3xl p-6 md:p-8 relative">
          
          {/* Tab selector */}
          <div className="flex rounded-2xl relative border border-white/[0.08] hover:border-accent/30 bg-white/[0.02] p-1 mb-6 font-sans text-xs transition-all duration-300" ref={containerRef}>
            {/* iOS Liquid Sliding Tab Indicator */}
            <div
              className="absolute bg-accent/[0.10] border border-accent/30 rounded-xl pointer-events-none shadow-[0_0_15px_rgba(0,210,255,0.1)]"
              style={{
                transform: `translate3d(${indicatorStyle.left}px, -50%, 0)`,
                width: `${indicatorStyle.width}px`,
                height: `${indicatorStyle.height}px`,
                top: '50%',
                opacity: indicatorStyle.opacity,
                transition: 'transform 380ms cubic-bezier(0.25,1,0.5,1), width 380ms cubic-bezier(0.25,1,0.5,1), height 380ms cubic-bezier(0.25,1,0.5,1), opacity 380ms cubic-bezier(0.25,1,0.5,1)',
              }}
            />
            {['login', 'register'].map(m => (
              <button
                key={m}
                type="button"
                data-active={activeMode === m}
                onMouseEnter={() => setHoveredMode(m)}
                onMouseLeave={() => setHoveredMode(null)}
                onMouseDown={() => { setMode(m); setError(''); setConfirmPassword(''); }}
                className={`flex-1 py-2 font-bold rounded-xl btn-liquid relative z-10 text-center transition-colors duration-300 ${
                  activeMode === m
                    ? 'text-accent'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 font-sans">
            {mode === 'register' && (
              <InputField
                label="Username"
                name="username"
                type="text"
                placeholder="e.g. rajat_verma"
                value={form.username}
                onChange={handleChange}
                icon={<UserIcon />}
              />
            )}
            <InputField
              label="Email Address"
              name="email"
              type="email"
              placeholder="you@domain.com"
              value={form.email}
              onChange={handleChange}
              icon={<EmailIcon />}
            />
            <InputField
              label="Password"
              name="password"
              type="password"
              placeholder={mode === 'register' ? 'Min 6 characters' : 'Enter your password'}
              value={form.password}
              onChange={handleChange}
              icon={<LockIcon />}
            />

            {mode === 'register' && (
              <InputField
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                icon={<LockIcon />}
              />
            )}

            {error && (
              <div className="rounded-xl bg-red-500/5 border border-red-500/25 px-4 py-3 text-xs text-red-400 font-mono">
                [Error]: {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-white font-bold tracking-wider rounded-2xl btn-liquid-glass uppercase text-[11px] font-sans mt-4"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                  </svg>
                  Processing...
                </span>
              ) : (
                mode === 'login' ? 'Sign In →' : 'Register →'
              )}
            </button>
          </form>

          <p className="text-center text-text-muted text-xs mt-6 font-sans">
            {mode === 'login' ? "New user? " : 'Already have an account? '}
            <button
              onMouseDown={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setConfirmPassword(''); }}
              className="text-accent font-bold transition-colors uppercase tracking-wider underline decoration-accent/30 decoration-2 underline-offset-4 ml-1 text-[11px] btn-liquid"
            >
              {mode === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, name, type, placeholder, value, onChange, icon }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const showPasswordOption = type === 'password';

  return (
    <div className="space-y-1.5 text-left font-sans">
      <label className="text-[11px] font-semibold text-text-secondary tracking-wide uppercase">{label}</label>
      <div className={`relative rounded-xl border transition-all duration-300 ${
        focused
          ? 'border-accent bg-accent/[0.02] shadow-[0_0_15px_rgba(0,210,255,0.15)]'
          : 'border-white/[0.08] bg-white/[0.02] hover:border-accent/30'
      }`}>
        <span className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
          focused ? 'text-accent' : 'text-text-muted'
        }`}>{icon}</span>
        <input
          name={name}
          type={showPasswordOption && show ? 'text' : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required
          className="w-full bg-transparent border-0 rounded-xl pl-11 pr-10 py-2.5 text-xs text-white placeholder:text-text-muted focus:outline-none focus:ring-0 transition-all font-sans"
        />
        {showPasswordOption && (
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
          >
            {show ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
    </div>
  );
}

const UserIcon  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const EmailIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const LockIcon  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const EyeIcon   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const EyeOffIcon= () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
