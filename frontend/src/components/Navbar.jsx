import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut]       = useState(false);
  const [hoveredPath, setHoveredPath]     = useState(null);
  const [scrolled, setScrolled]           = useState(false);
  const [isCollapsed, setIsCollapsed]     = useState(false);

  const containerRef = useRef(null);
  const lastScrollY = useRef(0);
  
  // Track pathname synchronously during render to prevent transition race conditions
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  const lastPathname = useRef(location.pathname);
  const lastRouteTransitionTime = useRef(0);
  if (lastPathname.current !== location.pathname) {
    lastPathname.current = location.pathname;
    lastRouteTransitionTime.current = Date.now();
  }

  const currentPath = useRef(location.pathname);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, height: 0, opacity: 0 });
  const currentFullPath = location.pathname === '/auth'
    ? (location.pathname + (location.search || '?mode=login'))
    : location.pathname;
  const activePath = hoveredPath || currentFullPath;

  // Track scroll direction and scroll position to auto fold/unfold navigation capsule
  useEffect(() => {
    const handleScroll = (e) => {
      // Ignore scroll-based fold/unfold logic on the interview page to prevent chat history scrolls from collapsing/expanding it
      if (pathnameRef.current === '/interview') return;

      // Ignore scroll events for 500ms after a route transition to prevent scroll-restoration/layout shifts from folding the navbar
      if (Date.now() - lastRouteTransitionTime.current < 500) return;

      // If route changed, reset lastScrollY and ignore this scroll event to prevent layout/scroll resets from collapsing the navbar
      if (currentPath.current !== pathnameRef.current) {
        currentPath.current = pathnameRef.current;
        const target = e.target;
        lastScrollY.current = target === document
          ? (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0)
          : (target.scrollTop || 0);
        return;
      }

      const target = e.target;
      const scrollTop = target === document
        ? (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0)
        : (target.scrollTop || 0);

      // Update scrolled state
      if (scrollTop > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      // Auto collapse/unfold on scroll down/up
      const diff = scrollTop - lastScrollY.current;
      // Use 5px scroll diff threshold to ignore minor scroll jitters
      if (Math.abs(diff) > 5) {
        if (scrollTop <= 10) {
          // Always unfold when reaching the top of the page
          setIsCollapsed(false);
        } else if (diff > 0) {
          // Scrolling down - fold in icon by default
          setIsCollapsed(true);
        } else {
          // Scrolling up - unfold
          setIsCollapsed(false);
        }
      }
      lastScrollY.current = scrollTop;
    };

    // Use capturing phase (true) to intercept scroll events from nested containers
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [location.pathname]);

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
    const handler = e => {
      if (!e.target.closest('#user-menu') && !e.target.closest('#mobile-toggle')) {
        setDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // No auto-collapse by default on page load/transition

  const handleLogout = async () => {
    setLoggingOut(true);
    setDropdownOpen(false);
    await logout();
    setLoggingOut(false);
    navigate('/auth');
  };

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : '?';

  return (
    <>
      {/* Left Brand Capsule Container */}
      <div
        className={`fixed top-4 z-50 transition-all duration-500 left-[4%] xl:left-[calc(50%-650px)] flex items-center justify-center ${
          isCollapsed
            ? 'opacity-0 max-w-0 px-0 py-0 overflow-hidden translate-x-12 scale-90 pointer-events-none border-transparent'
            : scrolled
              ? 'bg-[#08080a]/15 backdrop-blur-[2px] border border-white/[0.06] shadow-[0_12px_40px_-10px_rgba(0,0,0,0.5)] px-5 py-2 rounded-full opacity-100 max-w-[400px]'
              : 'bg-[#08080a]/10 backdrop-blur-[2px] border border-white/[0.06] rounded-full px-5 py-2 card-liquid hover:border-accent/35 hover:shadow-[0_0_20px_rgba(0,210,255,0.06)] opacity-100 max-w-[400px]'
        }`}
      >
        <div className="flex items-center justify-center gap-2.5 whitespace-nowrap">
          {/* Toggle Button (Layers Icon inside Cyan Circle) */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsCollapsed(v => !v);
            }}
            className="w-7 h-7 rounded-full bg-accent/10 border border-accent/40 flex items-center justify-center text-accent shadow-sm hover:bg-accent/20 hover:border-accent hover:shadow-glow-sm hover:scale-105 transition-all duration-300 cursor-pointer"
            title={isCollapsed ? "Expand Navigation" : "Collapse Navigation"}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-500 ${isCollapsed ? 'rotate-180 text-accent' : 'text-accent/80'}`}>
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </button>
          
          <Link to="/" className="font-display text-xs font-bold uppercase tracking-wider text-white">
            VOICE_AI<span className="text-accent font-light ml-1">COACH</span>
          </Link>
        </div>
      </div>

      {/* Right Collapsible Navigation & Menu Capsule Container */}
      <div
        className={`fixed top-4 z-50 transition-all duration-300 ease-out flex items-center ${
          isCollapsed
            ? 'right-4 md:right-6 xl:right-6 w-11 h-11 p-0 justify-center rounded-full bg-[#08080a]/15 backdrop-blur-[2px] border border-accent/40 shadow-glow active:scale-95'
            : scrolled
              ? 'right-4 md:right-[4%] xl:right-[calc(50%-650px)] bg-[#08080a]/15 backdrop-blur-[2px] border border-white/[0.08] shadow-[0_12px_40px_-10px_rgba(0,0,0,0.5)] px-4 py-2 gap-3 rounded-full max-w-[450px]'
              : 'right-4 md:right-[4%] xl:right-[calc(50%-650px)] bg-[#08080a]/10 backdrop-blur-[2px] border border-white/[0.06] rounded-full px-4 py-2 card-liquid hover:border-accent/35 hover:shadow-[0_0_20px_rgba(0,210,255,0.06)] gap-3 max-w-[450px]'
        }`}
      >
        <div className={`transition-all duration-300 ease-out flex items-center gap-2.5 origin-right ${
          isCollapsed
            ? 'max-w-0 opacity-0 pointer-events-none overflow-hidden scale-90 -translate-x-5'
            : 'max-w-[450px] opacity-100'
        }`}>
          {/* Desktop/Tablet Navigation Links */}
          <div className="hidden md:flex items-center gap-1.5 relative py-0.5" ref={containerRef}>
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
            
            {isAuthenticated ? (
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
            ) : (
              <>
                <NavLink
                  to="/auth?mode=register"
                  active={activePath === '/auth?mode=register'}
                  onMouseEnter={() => setHoveredPath('/auth?mode=register')}
                  onMouseLeave={() => setHoveredPath(null)}
                >
                  Get Started
                </NavLink>
              </>
            )}
          </div>

          {/* User profile dropdown */}
          {isAuthenticated && (
            <div id="user-menu" className="relative ml-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownOpen(v => !v);
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border hover:border-accent/50 bg-void/15 btn-liquid group font-mono text-xs text-text-secondary hover:text-white"
              >
                {/* Avatar */}
                {user?.profile_photo ? (
                  <img
                    src={user.profile_photo}
                    alt={user?.username}
                    className="w-5 h-5 rounded-full object-cover border border-accent/30"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-void/20 border border-accent/30 flex items-center justify-center text-[10px] font-bold text-accent">
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

              {/* User Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute -right-4 top-full mt-3.5 w-60 z-50 flex flex-col gap-1.5 animate-scale-in text-white">
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
                  <DropdownItem
                    icon={loggingOut ? <SpinIcon /> : <LogoutIcon />}
                    label={loggingOut ? 'Signing Out...' : 'Sign Out'}
                    onClick={handleLogout}
                    danger
                    disabled={loggingOut}
                  />
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Toggle Button (only on mobile) */}
          <div id="mobile-toggle" className="relative block md:hidden">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMobileMenuOpen(v => !v);
                setDropdownOpen(false);
              }}
              className="w-8 h-8 rounded-full border border-border hover:border-accent/50 bg-void/15 flex items-center justify-center text-text-secondary hover:text-accent transition-all duration-300"
            >
              {mobileMenuOpen ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>

            {/* Mobile Dropdown Menu */}
            {mobileMenuOpen && (
              <div className="absolute -right-4 top-full mt-3.5 w-48 z-50 flex flex-col gap-1.5 animate-scale-in text-white">
                <DropdownItem
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
                  label="Home"
                  onClick={() => { navigate('/'); setMobileMenuOpen(false); }}
                />
                {isAuthenticated ? (
                  <>
                    <DropdownItem
                      icon={<MicIcon />}
                      label="Interview"
                      onClick={() => { navigate('/interview'); setMobileMenuOpen(false); }}
                    />
                    <DropdownItem
                      icon={<ProfileIcon />}
                      label="Profile"
                      onClick={() => { navigate('/profile'); setMobileMenuOpen(false); }}
                    />
                  </>
                ) : (
                  <DropdownItem
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>}
                    label="Get Started"
                    onClick={() => { navigate('/auth?mode=register'); setMobileMenuOpen(false); }}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Collapsed Layers Icon Logo Button */}
        {isCollapsed && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsCollapsed(false);
            }}
            className="w-full h-full rounded-full flex items-center justify-center text-accent cursor-pointer hover:bg-white/5 active:scale-90 transition-all duration-300"
            title="Expand Navigation"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </button>
        )}
      </div>
    </>
  );
}

function NavLink({ to, active, children, onMouseEnter, onMouseLeave, onClick }) {
  return (
    <Link
      to={to}
      data-active={active}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
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
      className={`w-full flex items-center gap-3.5 px-5 py-2.5 rounded-full border transition-all duration-300 disabled:opacity-50 text-left font-sans text-xs ${
        danger
          ? 'text-red-400 bg-red-500/10 hover:bg-red-500/15 border-red-500/20 hover:border-red-500/40 hover:shadow-[0_0_15px_rgba(239,68,68,0.08)]'
          : 'text-text-secondary bg-[#08080a]/50 backdrop-blur-[6px] border-white/[0.08] hover:border-accent/30 hover:text-accent hover:bg-accent/5 hover:shadow-[0_0_15px_rgba(0,210,255,0.05)]'
      }`}
    >
      <span className="opacity-80 flex-shrink-0 transition-colors duration-300">{icon}</span>
      <span className="font-semibold tracking-wide">{label}</span>
    </button>
  );
}

const MicIcon     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
const ProfileIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const LogoutIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const SpinIcon    = () => <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>;
