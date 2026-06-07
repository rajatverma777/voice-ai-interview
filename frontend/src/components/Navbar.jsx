import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [loggingOut, setLoggingOut]       = useState(false);
  const [hoveredPath, setHoveredPath]     = useState(null);
  const [scrolled, setScrolled]           = useState(false);

  const containerRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, height: 0, opacity: 0 });
  const activePath = hoveredPath || location.pathname;

  // Track scroll position to merge navbar capsules
  useEffect(() => {
    const handleScroll = (e) => {
      const target = e.target;
      const scrollTop = target === document
        ? (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0)
        : (target.scrollTop || 0);

      if (scrollTop > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    // Use capturing phase (true) to intercept scroll events from any nested scrollable containers
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  // Update navigation indicator tab bounds dynamically
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
  }, [activePath, isAuthenticated]);

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
    <nav className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] xl:max-w-[1300px] flex items-center justify-between rounded-full border transition-all duration-500 ease-in-out ${
      scrolled
        ? 'bg-[#08080a]/80 backdrop-blur-2xl border-white/[0.07] shadow-[0_12px_40px_-10px_rgba(0,0,0,0.5)] pointer-events-auto'
        : 'bg-transparent border-transparent pointer-events-none'
    }`}>
      
      {/* Left Brand Capsule */}
      <div className={`transition-all duration-500 flex items-center justify-center pointer-events-auto ${
        scrolled
          ? 'bg-transparent border-transparent shadow-none px-5 py-2'
          : 'glass rounded-full px-5 py-2 card-liquid hover:border-accent/35 hover:shadow-[0_0_20px_rgba(0,210,255,0.06)]'
      }`}>
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-full bg-void/50 border border-accent/40 flex items-center justify-center text-accent shadow-sm group-hover:border-accent transition-all duration-300">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="font-display text-xs font-bold uppercase tracking-wider text-white">
            VOICE_AI <span className="text-accent font-light">COACH</span>
          </span>
        </Link>
      </div>

      {/* Right Navigation & Menu Capsule */}
      <div className={`transition-all duration-500 flex items-center gap-2.5 pointer-events-auto ${
        scrolled
          ? 'bg-transparent border-transparent shadow-none px-4 py-2'
          : 'glass rounded-full px-4 py-2 card-liquid hover:border-accent/35 hover:shadow-[0_0_20px_rgba(0,210,255,0.06)]'
      }`}>
        <div className="flex items-center gap-1.5 relative py-0.5" ref={containerRef}>
          {/* iOS Liquid Sliding Tab Indicator */}
          <div
            className="absolute left-0 top-1/2 bg-accent/[0.10] border border-accent/30 rounded-full pointer-events-none shadow-[0_0_15px_rgba(0,210,255,0.06)]"
            style={{
              transform: `translate3d(${indicatorStyle.left}px, -50%, 0)`,
              width: `${indicatorStyle.width}px`,
              height: `${indicatorStyle.height}px`,
              opacity: indicatorStyle.opacity,
              transition: 'transform 380ms cubic-bezier(0.25,1,0.5,1), width 380ms cubic-bezier(0.25,1,0.5,1), height 380ms cubic-bezier(0.25,1,0.5,1), opacity 380ms cubic-bezier(0.25,1,0.5,1)',
            }}
          />

          <NavLink
            to="/"
            active={activePath === '/'}
            onMouseEnter={() => setHoveredPath('/')}
            onMouseLeave={() => setHoveredPath(null)}
          >
            Home
          </NavLink>
          
          {isAuthenticated && (
            <>
              <NavLink
                to="/interview"
                active={activePath === '/interview'}
                onMouseEnter={() => setHoveredPath('/interview')}
                onMouseLeave={() => setHoveredPath(null)}
              >
                Interview
              </NavLink>
              <NavLink
                to="/profile"
                active={activePath === '/profile'}
                onMouseEnter={() => setHoveredPath('/profile')}
                onMouseLeave={() => setHoveredPath(null)}
              >
                Profile
              </NavLink>
            </>
          )}
        </div>

        {isAuthenticated ? (
          /* User dropdown */
          <div id="user-menu" className="relative ml-1">
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border hover:border-accent/50 bg-void/50 btn-liquid group font-mono text-xs text-text-secondary hover:text-white"
            >
              {/* Avatar */}
              {user?.profile_photo ? (
                <img
                  src={user.profile_photo}
                  alt={user?.username}
                  className="w-5 h-5 rounded-full object-cover border border-accent/30"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-void border border-accent/30 flex items-center justify-center text-[10px] font-bold text-accent">
                  {initials}
                </div>
              )}
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
              <div className="absolute right-0 top-full mt-2.5 w-56 bg-surface/95 backdrop-blur-2xl rounded-2xl border border-border/80 shadow-2xl overflow-hidden z-50 animate-scale-in">
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
          <div className="flex items-center gap-2 ml-1 font-mono text-xs">
            <Link
              to="/auth"
              className="px-3 py-1.5 text-text-secondary hover:text-white btn-liquid"
            >
              Sign In
            </Link>
            <Link
              to="/auth"
              className="px-4 py-1.5 font-bold text-void bg-accent hover:bg-accent/90 rounded-full btn-liquid shadow-glow hover:shadow-[0_0_20px_rgba(0,210,255,0.4)]"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

function NavLink({ to, active, children, onMouseEnter, onMouseLeave }) {
  return (
    <Link
      to={to}
      data-active={active}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide btn-liquid z-10 relative border transition-all duration-300 ${
        active
          ? 'border-transparent text-accent'
          : 'border-white/[0.06] text-text-secondary bg-white/[0.03] hover:border-accent/30 hover:bg-white/[0.06] hover:text-white'
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
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl btn-liquid disabled:opacity-50 text-left ${
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
