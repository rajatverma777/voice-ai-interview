import React, { useState, useEffect, useRef, useCallback } from 'react';
import { checkHealth } from '../services/api';

const POLL_INTERVAL_MS = 5000;

const BOOT_STEPS = [
  { icon: '⚡', text: 'Establishing secure connection' },
  { icon: '🚀', text: 'Waking up Render backend server' },
  { icon: '🧠', text: 'Loading AI Interview Engine' },
  { icon: '📊', text: 'Warming up SVM Classifier' },
  { icon: '🎙️', text: 'Initializing Whisper Speech Model' },
  { icon: '🌐', text: 'Connecting to Gemini AI API' },
  { icon: '💾', text: 'Syncing MongoDB Atlas session' },
  { icon: '🔐', text: 'Verifying authentication layer' },
  { icon: '✨', text: 'Preparing your interview room' },
  { icon: '☕', text: 'Server had too much coffee. Retrying' },
  { icon: '💪', text: 'Render free tier doing its absolute best' },
  { icon: '🔄', text: 'Almost there, final system checks running' },
];

export default function ServerStatusBanner() {
  const [isDown,       setIsDown]       = useState(false);
  const [connected,    setConnected]    = useState(false);
  const [stepIndex,    setStepIndex]    = useState(0);
  const [visibleSteps, setVisibleSteps] = useState([BOOT_STEPS[0]]);
  const [dots,         setDots]         = useState('');

  const pollRef   = useRef(null);
  const stepRef   = useRef(null);
  const dotsRef   = useRef(null);
  const isDownRef = useRef(false);

  const startCycle = useCallback(() => {
    setStepIndex(0);
    setVisibleSteps([BOOT_STEPS[0]]);
    let idx = 0;
    stepRef.current = setInterval(() => {
      idx = Math.min(idx + 1, BOOT_STEPS.length - 1);
      setStepIndex(idx);
      setVisibleSteps(BOOT_STEPS.slice(Math.max(0, idx - 2), idx + 1));
    }, 4000);
    dotsRef.current = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 450);
  }, []);

  const stopCycle = useCallback(() => {
    if (stepRef.current) { clearInterval(stepRef.current); stepRef.current = null; }
    if (dotsRef.current) { clearInterval(dotsRef.current); dotsRef.current = null; }
  }, []);

  const poll = useCallback(async () => {
    const result = await checkHealth();
    const up = result?.status === 'healthy';
    if (!up && !isDownRef.current) {
      isDownRef.current = true;
      setIsDown(true);
      startCycle();
    } else if (up && isDownRef.current) {
      isDownRef.current = false;
      stopCycle();
      setConnected(true);
      setTimeout(() => {
        setIsDown(false);
        setConnected(false);
        window.location.reload();
      }, 1800);
    }
  }, [startCycle, stopCycle]);

  useEffect(() => {
    const t = setTimeout(poll, 1500);
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => { clearTimeout(t); clearInterval(pollRef.current); stopCycle(); };
  }, [poll, stopCycle]);

  if (!isDown) return null;

  const currentStep = BOOT_STEPS[stepIndex];

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#070a13' }}
    >
      {/* ── Keyframes ─────────────────────────────────────────── */}
      <style>{`
        @keyframes ssbRotateCw  { to { transform: rotate(360deg);  } }
        @keyframes ssbRotateCcw { to { transform: rotate(-360deg); } }
        @keyframes ssbPulseRing {
          0%,100% { opacity:0.25; transform:scale(1);    }
          50%     { opacity:0.7;  transform:scale(1.06); }
        }
        @keyframes ssbBlobA {
          0%,100% { transform:translate(0,0)     scale(1);    }
          40%     { transform:translate(28px,-18px) scale(1.06); }
          70%     { transform:translate(-15px,12px) scale(0.96); }
        }
        @keyframes ssbBlobB {
          0%,100% { transform:translate(0,0)      scale(1);    }
          35%     { transform:translate(-22px,14px) scale(1.05); }
          65%     { transform:translate(18px,-10px) scale(0.97); }
        }
        @keyframes ssbFadeUp {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        @keyframes ssbGlowPulse {
          0%,100% { box-shadow:0 0 25px rgba(0,210,255,0.15); }
          50%     { box-shadow:0 0 55px rgba(0,210,255,0.45); }
        }
        @keyframes ssbSuccessPop {
          0%  { transform:scale(0.7); opacity:0; }
          60% { transform:scale(1.12); opacity:1; }
          100%{ transform:scale(1);   opacity:1; }
        }
        @keyframes ssbScanLine {
          0%  { top:-2px;  }
          100%{ top:100%;  }
        }
        @keyframes ssbOrbit {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── Background blobs ──────────────────────────────────── */}
      <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
        <div style={{
          position:'absolute', top:'-15%', left:'-10%',
          width:'55%', height:'55%', borderRadius:'50%',
          background:'radial-gradient(circle, rgba(0,210,255,0.07) 0%, transparent 70%)',
          animation:'ssbBlobA 14s ease-in-out infinite',
        }}/>
        <div style={{
          position:'absolute', bottom:'-12%', right:'-8%',
          width:'50%', height:'50%', borderRadius:'50%',
          background:'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
          animation:'ssbBlobB 18s ease-in-out infinite',
        }}/>
        <div style={{
          position:'absolute', top:'35%', right:'8%',
          width:'32%', height:'32%', borderRadius:'50%',
          background:'radial-gradient(circle, rgba(0,210,255,0.04) 0%, transparent 70%)',
          animation:'ssbBlobA 11s ease-in-out infinite 5s',
        }}/>
      </div>

      {/* ── Scan line ─────────────────────────────────────────── */}
      <div style={{
        position:'absolute', left:0, right:0, height:'1px',
        background:'linear-gradient(90deg, transparent 0%, rgba(0,210,255,0.12) 50%, transparent 100%)',
        animation:'ssbScanLine 7s linear infinite',
        pointerEvents:'none',
      }}/>

      {/* ══════════════════════════════════════════════════════ */}
      {!connected ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'32px', maxWidth:'400px', width:'100%', padding:'0 24px' }}>

          {/* ── Neural Core ──────────────────────────────────── */}
          <div style={{ position:'relative', width:172, height:172, display:'flex', alignItems:'center', justifyContent:'center' }}>

            {/* Outermost pulse rings */}
            <div style={{ position:'absolute', inset:-18, borderRadius:'50%', border:'1px solid rgba(0,210,255,0.06)', animation:'ssbPulseRing 3s ease-in-out infinite 1.2s' }}/>
            <div style={{ position:'absolute', inset:-6,  borderRadius:'50%', border:'1px solid rgba(0,210,255,0.09)', animation:'ssbPulseRing 3s ease-in-out infinite 0.4s' }}/>

            {/* Ring 1 — slow CW */}
            <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'1.5px dashed rgba(0,210,255,0.18)', animation:'ssbRotateCw 9s linear infinite' }}>
              <div style={{ position:'absolute', top:-5, left:'50%', transform:'translateX(-50%)', width:9, height:9, borderRadius:'50%', background:'rgba(0,210,255,1)', boxShadow:'0 0 12px 3px rgba(0,210,255,0.7)' }}/>
            </div>

            {/* Ring 2 — medium CCW */}
            <div style={{ position:'absolute', inset:22, borderRadius:'50%', border:'1.5px dashed rgba(99,102,241,0.22)', animation:'ssbRotateCcw 6s linear infinite' }}>
              <div style={{ position:'absolute', top:-4, left:'50%', transform:'translateX(-50%)', width:7, height:7, borderRadius:'50%', background:'rgba(99,102,241,1)', boxShadow:'0 0 10px 3px rgba(99,102,241,0.7)' }}/>
            </div>

            {/* Ring 3 — fast CW */}
            <div style={{ position:'absolute', inset:42, borderRadius:'50%', border:'1px solid rgba(0,210,255,0.15)', animation:'ssbRotateCw 3.5s linear infinite' }}>
              <div style={{ position:'absolute', top:-4, left:'50%', transform:'translateX(-50%)', width:6, height:6, borderRadius:'50%', background:'rgba(0,210,255,0.9)', boxShadow:'0 0 8px 2px rgba(0,210,255,0.6)' }}/>
            </div>

            {/* Core glow */}
            <div style={{ position:'absolute', inset:56, borderRadius:'50%', background:'radial-gradient(circle, rgba(0,210,255,0.22), rgba(0,210,255,0.04))', animation:'ssbGlowPulse 2.2s ease-in-out infinite' }}/>

            {/* Center icon */}
            <div style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'center', width:60, height:60, borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'1px solid rgba(0,210,255,0.25)', boxShadow:'inset 0 0 20px rgba(0,210,255,0.08)' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(0,210,255,0.9)" strokeWidth="1.8">
                <rect x="2" y="2" width="20" height="8" rx="2"/>
                <rect x="2" y="14" width="20" height="8" rx="2"/>
                <line x1="6" y1="6" x2="6.01" y2="6"/>
                <line x1="6" y1="18" x2="6.01" y2="18"/>
              </svg>
            </div>
          </div>

          {/* ── Title ────────────────────────────────────────── */}
          <div style={{ textAlign:'center' }}>
            <h1 style={{ color:'#f8fafc', fontWeight:700, fontSize:'20px', letterSpacing:'-0.02em', margin:0, fontFamily:'Outfit, sans-serif' }}>
              Voice AI Interview Lab
            </h1>
            <p style={{ color:'#64748b', fontSize:'10px', fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.15em', textTransform:'uppercase', margin:'6px 0 0' }}>
              Initializing Systems
            </p>
          </div>

          {/* ── Terminal log ─────────────────────────────────── */}
          <div style={{
            width:'100%', borderRadius:'16px', overflow:'hidden',
            background:'rgba(0,0,0,0.45)', border:'1px solid rgba(0,210,255,0.1)',
            padding:'14px 16px', fontFamily:'JetBrains Mono, monospace', fontSize:'11px',
          }}>
            {/* Terminal top bar */}
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12, paddingBottom:10, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'rgba(239,68,68,0.7)' }}/>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'rgba(245,158,11,0.7)' }}/>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'rgba(16,185,129,0.7)' }}/>
              <span style={{ marginLeft:8, color:'rgba(100,116,139,0.8)', fontSize:'10px', letterSpacing:'0.1em' }}>system.boot</span>
            </div>

            {/* Completed steps */}
            {visibleSteps.slice(0, -1).map((s, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, opacity:0.35 }}>
                <span style={{ fontSize:'12px' }}>{s.icon}</span>
                <span style={{ color:'#94a3b8', flex:1 }}>{s.text}</span>
                <span style={{ color:'#10b981' }}>✓</span>
              </div>
            ))}

            {/* Current step */}
            <div key={stepIndex} style={{ display:'flex', alignItems:'center', gap:8, animation:'ssbFadeUp 0.35s ease-out' }}>
              <span style={{ fontSize:'12px' }}>{currentStep.icon}</span>
              <span style={{ color:'rgba(0,210,255,0.9)', flex:1 }}>{currentStep.text}{dots}</span>
              <span style={{ color:'rgba(0,210,255,0.8)', animation:'pulse 1s ease-in-out infinite' }}>▊</span>
            </div>
          </div>

          {/* ── Force reload ─────────────────────────────────── */}
          <button
            onClick={() => window.location.reload()}
            style={{
              background:'transparent', border:'none', cursor:'pointer',
              color:'rgba(100,116,139,0.6)', fontSize:'10px',
              fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.15em',
              textTransform:'uppercase', padding:'4px 12px',
              transition:'color 0.2s',
            }}
            onMouseEnter={e => e.target.style.color = 'rgba(248,250,252,0.7)'}
            onMouseLeave={e => e.target.style.color = 'rgba(100,116,139,0.6)'}
          >
            ↺  force reload
          </button>
        </div>
      ) : (
        /* ── Success state ────────────────────────────────── */
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20, animation:'ssbSuccessPop 0.55s cubic-bezier(0.34,1.56,0.64,1) both' }}>
          <div style={{ width:88, height:88, borderRadius:'50%', background:'rgba(16,185,129,0.1)', border:'2px solid rgba(16,185,129,0.5)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 50px rgba(16,185,129,0.25)' }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="rgba(16,185,129,0.95)" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div style={{ textAlign:'center' }}>
            <p style={{ color:'#10b981', fontWeight:700, fontSize:'18px', fontFamily:'JetBrains Mono, monospace', margin:0 }}>
              All Systems Online!
            </p>
            <p style={{ color:'#64748b', fontSize:'11px', margin:'6px 0 0', fontFamily:'JetBrains Mono, monospace' }}>
              Redirecting to home...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
