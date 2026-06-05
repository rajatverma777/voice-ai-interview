import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [loggingOut, setLoggingOut]       = useState(false);

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
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="w-full max-w-[94%] xl:max-w-[1440px] mx-auto h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-xl bg-void border border-accent/40 flex items-center justify-center text-accent shadow-sm group-hover:border-accent transition-all duration-300">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="font-display text-sm font-bold uppercase tracking-wider text-white">
            VOICE_AI <span className="text-accent font-light">COACH</span>
          </span>
        </Link>

        {/* Navigation Deck */}
        <div className="flex items-center gap-2">
          <NavLink to="/" active={location.pathname === '/'}>Home</NavLink>
          
          {isAuthenticated && (
            <>
              <NavLink to="/interview" active={location.pathname === '/interview'}>Interview</NavLink>
              <NavLink to="/profile" active={location.pathname === '/profile'}>Profile</NavLink>
            </>
          )}

          {isAuthenticated ? (
            /* User dropdown */
            <div id="user-menu" className="relative ml-2">
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border hover:border-accent/50 bg-void/50 transition-all duration-200 group font-mono text-xs text-text-secondary hover:text-white"
              >
                {/* Avatar */}
                <div className="w-5 h-5 rounded-lg bg-void border border-accent/30 flex items-center justify-center text-[10px] font-bold text-accent">
                  {initials}
                </div>
                <span className="max-w-[90px] truncate">
                  {user?.username}
                </span>
                <svg
                  width="10" height="10" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  className="text-text-muted transition-transform duration-200"
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 glass rounded-2xl border border-border shadow-2xl overflow-hidden z-50 animate-scale-in">
                  {/* User header */}
                  <div className="px-4 py-3.5 border-b border-border/60 bg-void/40">
                    <p className="text-xs font-semibold text-white truncate font-display">{user?.username}</p>
                    <p className="text-[10px] text-text-muted truncate mt-0.5 font-mono">{user?.email}</p>
                  </div>

                  {/* Menu items */}
                  <div className="p-1.5 space-y-1 font-mono text-xs">
                    <DropdownItem
                      icon={<MicIcon />}
                      label="Start Interview"
                      onClick={() => { navigate('/interview'); setDropdownOpen(false); }}
                    />
                    <DropdownItem
                      icon={<ProfileIcon />}
                      label="Profile & Stats"
                      onClick={() => { navigate('/profile'); setDropdownOpen(false); }}
                    />
                    <div className="border-t border-border/50 my-1.5" />
                    <DropdownItem
                      icon={loggingOut ? <SpinIcon /> : <LogoutIcon />}
                      label={loggingOut ? 'Signing Out...' : 'Sign Out'}
                      onClick={handleLogout}
                      danger
                      disabled={loggingOut}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Guest buttons */
            <div className="flex items-center gap-2 ml-2 font-mono text-xs">
              <Link
                to="/auth"
                className="px-4 py-2 text-text-secondary hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/auth"
                className="px-4 py-2 font-bold text-void bg-accent hover:bg-accent/90 rounded-xl transition-all shadow-glow hover:shadow-[0_0_20px_rgba(0,210,255,0.4)]"
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
      className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
        active
          ? 'bg-accent/10 border border-accent/25 text-accent font-bold'
          : 'text-text-secondary border border-transparent hover:text-white'
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
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 disabled:opacity-50 text-left ${
        danger
          ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
          : 'text-text-secondary hover:bg-white/5 hover:text-white'
      }`}
    >
      <span className="opacity-70 flex-shrink-0">{icon}</span>
      {label}
    </button>
  );
}

const MicIcon     = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
const ProfileIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const LogoutIcon  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const SpinIcon    = () => <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>;
