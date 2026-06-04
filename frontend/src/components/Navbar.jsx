import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [scrolled, setScrolled]           = useState(false);
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [loggingOut, setLoggingOut]       = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = e => { if (!e.target.closest('#user-menu')) setDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    setDropdownOpen(false);
    await logout();
    setLoggingOut(false);
    navigate('/auth');
  };

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : '?';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'glass border-b border-border/60' : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-teal flex items-center justify-center shadow-glow-sm">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <circle cx="8" cy="8" r="2" fill="white"/>
            </svg>
          </div>
          <span className="font-display font-700 text-lg text-text-primary">
            VoiceAI <span className="gradient-text">Interview</span>
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <NavLink to="/" active={location.pathname === '/'}>Home</NavLink>
          {isAuthenticated && (
            <NavLink to="/interview" active={location.pathname === '/interview'}>Interview</NavLink>
          )}

          {isAuthenticated ? (
            /* ── User avatar + dropdown ── */
            <div id="user-menu" className="relative ml-2">
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-border hover:border-accent/40 bg-panel/50 hover:bg-panel transition-all duration-200 group"
              >
                {/* Avatar circle */}
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-teal flex items-center justify-center text-xs font-bold text-white">
                  {initials}
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text-primary max-w-[100px] truncate">
                  {user?.username}
                </span>
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  className={`text-text-muted transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 glass rounded-xl border border-border shadow-glass overflow-hidden z-50">
                  {/* User header */}
                  <div className="px-4 py-3 border-b border-border/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-teal flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {initials}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-text-primary truncate">{user?.username}</p>
                        <p className="text-xs text-text-muted truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="p-1.5 space-y-0.5">
                    <DropdownItem
                      icon={<MicIcon />}
                      label="Start Interview"
                      onClick={() => { navigate('/interview'); setDropdownOpen(false); }}
                    />
                    <DropdownItem
                      icon={<HomeIcon />}
                      label="Home"
                      onClick={() => { navigate('/'); setDropdownOpen(false); }}
                    />
                    <div className="border-t border-border/40 my-1" />
                    <DropdownItem
                      icon={loggingOut ? <SpinIcon /> : <LogoutIcon />}
                      label={loggingOut ? 'Signing out…' : 'Sign Out'}
                      onClick={handleLogout}
                      danger
                      disabled={loggingOut}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Guest buttons ── */
            <div className="flex items-center gap-2 ml-2">
              <Link
                to="/auth"
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border hover:border-accent/40 rounded-xl transition-all duration-200"
              >
                Sign In
              </Link>
              <Link
                to="/auth"
                className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-accent to-teal rounded-xl hover:shadow-glow transition-all duration-200 hover:scale-[1.03]"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-accent/10 text-accent border border-accent/30'
          : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
      }`}
    >
      {children}
    </Link>
  );
}

function DropdownItem({ icon, label, onClick, danger, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 disabled:opacity-50 ${
        danger
          ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
          : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
      }`}
    >
      <span className="opacity-70 flex-shrink-0">{icon}</span>
      {label}
    </button>
  );
}

const MicIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
const HomeIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const LogoutIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const SpinIcon   = () => <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>;
