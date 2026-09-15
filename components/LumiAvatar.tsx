'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { BroSettings, BroIdentity, BroAgent, BroColor } from '@/lib/types';
import { ExpressionEngine, ExpressionType } from '@/lib/mcp/ExpressionEngine';

interface LumiAvatarProps {
  // Updated LumiSettings to BroSettings
  settings: BroSettings;
  // Updated LumiIdentity to BroIdentity
  identity: BroIdentity;
  isListening: boolean;
  isTalking: boolean;
  isThinking: boolean;
  // Updated LumiAgent to BroAgent
  activeAgent: BroAgent;
  isDragging?: boolean;
  onBellyClick?: () => void;
  manualExpression?: ExpressionType | null;
  onSetExpression?: (exp: ExpressionType | null) => void;
}

const COLOR_MAP: Record<BroColor, string> = {
  indigo: '#6366f1',
  pink: '#ec4899',
  teal: '#14b8a6',
  orange: '#f59e0b',
  purple: '#a855f7',
  gold: '#eab308',
  black: '#0f172a',
  green: '#22c55e',
  red: '#ef4444',
  cyan: '#06b6d4',
  lime: '#84cc16'
};

const HeartShape = ({ color, filter, width, height, opacity }: { color: string, filter: string, width: number, height: number, opacity: number }) => (
  <path 
    d="M 0 -8 C -2 -12, -10 -12, -10 -6 C -10 0, 0 8, 0 8 S 10 0, 10 -6 C 10 -12, 2 -12, 0 -8 Z" 
    fill={color} 
    filter={filter} 
    className="transition-all duration-500 animate-heart-pulse"
    style={{ 
      opacity, 
      transform: `scale(${width/20})`
    }} 
  />
);

const StarShape = ({ color, filter, size, opacity }: { color: string, filter: string, size: number, opacity: number }) => {
  const points = 5;
  const outerR = 10;
  const innerR = 4;
  const d = Array.from({ length: points * 2 }, (_, i) => {
    const angle = (Math.PI / 2 * -1) + (Math.PI / points) * i;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ') + ' Z';

  return (
    <path
      d={d}
      fill={color}
      filter={filter}
      className="transition-all duration-500"
      style={{
        opacity,
        transform: `scale(${size / 20})`,
      }}
    />
  );
};

const WhistleNote = ({ color, delay }: { color: string; delay: number }) => {
  const note = Math.random() > 0.5 ? '♪' : '♫';
  return (
    <div 
      className="absolute text-2xl pointer-events-none animate-note-float"
      style={{ 
        color, 
        animationDelay: `${delay}s`,
        left: `${40 + Math.random() * 20}%`,
        top: '50%'
      }}
    >
      {note}
    </div>
  );
};

const EXPRESSION_OPTIONS: { type: ExpressionType; emoji: string; label: string }[] = [
  { type: 'neutral', emoji: '😐', label: 'Neutral' },
  { type: 'happy', emoji: '😊', label: 'Happy' },
  { type: 'hearts', emoji: '😍', label: 'Hearts' },
  { type: 'curious', emoji: '🤔', label: 'Curious' },
  { type: 'excited', emoji: '🤩', label: 'Excited' },
  { type: 'surprised', emoji: '😲', label: 'Surprised' },
  { type: 'thinking', emoji: '💭', label: 'Thinking' },
  { type: 'mischievous', emoji: '😏', label: 'Mischievous' },
  { type: 'sleepy', emoji: '😴', label: 'Sleepy' },
  { type: 'wink', emoji: '😉', label: 'Wink' },
  { type: 'glitch', emoji: '👾', label: 'Glitch' },
];

export const LumiAvatar: React.FC<LumiAvatarProps> = ({ 
  settings, identity, isListening, isTalking, isThinking, activeAgent, isDragging = false, onBellyClick, manualExpression = null, onSetExpression
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFlaring, setIsFlaring] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMoveTime = useRef(Date.now());
  const idleTarget = useRef({ x: 0, y: 0 });
  const idlePos = useRef({ x: 0, y: 0 });
  
  // ExpressionEngine.getExpression now correctly accepts BroAgent
  const baseExpression = manualExpression || ExpressionEngine.getExpression(activeAgent, isTalking, isListening, isDragging, isThinking);
  const face = useMemo(() => ExpressionEngine.getConfig(baseExpression), [baseExpression]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const targetX = (e.clientX - window.innerWidth / 2) / 350;
      const targetY = (e.clientY - window.innerHeight / 2) / 350;
      setMousePos({ x: targetX, y: targetY });
      lastMoveTime.current = Date.now();
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  useEffect(() => {
    let raf: number;
    const updateIdle = () => {
      const isIdle = Date.now() - lastMoveTime.current > 5000 && !isListening && !isTalking && !isThinking;
      
      if (isIdle) {
        if (Math.random() > 0.99) {
          idleTarget.current = { 
            x: (Math.random() - 0.5) * 6, 
            y: (Math.random() - 0.5) * 4 
          };
        }
        idlePos.current.x += (idleTarget.current.x - idlePos.current.x) * 0.02;
        idlePos.current.y += (idleTarget.current.y - idlePos.current.y) * 0.02;
        setMousePos(prev => ({
          x: prev.x * 0.98 + idlePos.current.x * 0.02,
          y: prev.y * 0.98 + idlePos.current.y * 0.02
        }));
      }
      raf = requestAnimationFrame(updateIdle);
    };
    raf = requestAnimationFrame(updateIdle);
    return () => cancelAnimationFrame(raf);
  }, [isListening, isTalking, isThinking]);

  useEffect(() => {
    const interval = setInterval(() => { 
      setBlink(true); 
      setTimeout(() => setBlink(false), 120); 
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);

  const handleFaceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlaring(true);
    setTimeout(() => setIsFlaring(false), 400);
    onBellyClick?.();
  };

  const opticColor = COLOR_MAP[settings.color] || '#00f2ff'; 

  const renderVocalizer = useMemo(() => {
    const segments = 21;
    // Increased spacing by ~10% (from 4.05 to 4.45)
    const spacing = 4.45; 
    const bars = [];
    const isWhistling = baseExpression === 'whistle';

    for (let i = 0; i < segments; i++) {
      const x = (i - (segments - 1) / 2) * spacing;
      const centerDist = Math.abs(i - (segments-1)/2);
      
      let intensity = isTalking ? (6 + Math.random() * 12) : (isThinking ? 4.5 : 1.5);
      if (isWhistling) {
        intensity = centerDist < 3 ? (10 + Math.sin(Date.now() / 50) * 5) : 0.5;
      }
      
      let curveOffset = 0;
      if (baseExpression === 'happy' || baseExpression === 'excited' || baseExpression === 'hearts') {
        curveOffset = -(Math.pow(centerDist, 2) / 8);
      } else if (baseExpression === 'empathetic') {
        curveOffset = (Math.pow(centerDist, 2) / 10);
      }

      // Increased width by ~10% (from 1.9 to 2.1) and base height slightly
      bars.push(
        <rect 
          key={i}
          x={x - 1.05} 
          width={2.1} 
          rx={1.05} 
          fill={opticColor}
          filter="url(#vocalizerGlow)"
          className="transition-all duration-200"
          style={{ 
            transform: `translateY(${curveOffset}px)`,
            height: `${2.5 + (intensity * (1 - centerDist/(segments/1.5)))}px`,
            y: `${-1.25 - (intensity * 0.5 * (1 - centerDist/(segments/1.5)))}px`,
            opacity: (intensity > 1.5 || isThinking || isWhistling) ? 1.0 : 0.4
          }}
        />
      );
    }
    return bars;
  }, [baseExpression, isTalking, isThinking, opticColor]);

  // Increased eyeScale by 10% (from 3.1 to 3.41)
  const eyeScale = 3.41; 
  const eyeVerticalAnchor = 80; 

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full flex items-center justify-center transition-all duration-[1200ms] ease-in-out pointer-events-none"
      style={{ color: opticColor }}
    >
      <div 
        className="absolute rounded-full blur-[120px] transition-all duration-[1500ms] w-[60%] h-[60%] opacity-[0.07]" 
        style={{ backgroundColor: opticColor }} 
      />

      {baseExpression === 'whistle' && (
        <>
          <WhistleNote color={opticColor} delay={0} />
          <WhistleNote color={opticColor} delay={1.2} />
        </>
      )}

      <svg 
        className="w-full h-full overflow-visible" 
        viewBox="0 0 200 200" 
        preserveAspectRatio="xMidYMid meet"
        onClick={handleFaceClick}
      >
        <defs>
          <filter id="eveGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComponentTransfer in="blur" result="boost">
              <feFuncA type="linear" slope="3.0" />
            </feComponentTransfer>
            <feComposite in="SourceGraphic" in2="boost" operator="over" />
          </filter>

          <filter id="vocalizerGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComponentTransfer in="blur" result="boost">
              <feFuncA type="linear" slope="5.0" />
            </feComponentTransfer>
            <feComposite in="SourceGraphic" in2="boost" operator="over" />
          </filter>

          <pattern id="dotGrid" x="0" y="0" width="1.2" height="1.2" patternUnits="userSpaceOnUse">
            <circle cx="0.6" cy="0.6" r="0.4" fill="white" fillOpacity="0.5" />
          </pattern>

          <mask id="pixelMask">
            <rect x="-100" y="-100" width="400" height="400" fill="url(#dotGrid)" />
          </mask>
        </defs>

        <g transform={`translate(${mousePos.x * 4}, ${mousePos.y * 3})`} className="animate-camera-sway">
          {/* Masked background layer -- LED grid aesthetic for face silhouette */}
          <g mask="url(#pixelMask)" className="animate-lcd-flicker">
            {isThinking && (
              <g className="opacity-30">
                <circle cx="100" cy="100" r="85" fill="none" stroke={opticColor} strokeWidth="0.3" strokeDasharray="1 10" className="animate-spin-slow" />
                <circle cx="100" cy="100" r="80" fill="none" stroke={opticColor} strokeWidth="0.2" strokeDasharray="5 15" className="animate-spin-reverse" />
              </g>
            )}
            <circle cx="100" cy="100" r="130" fill={`radial-gradient(circle, ${opticColor} 0%, transparent 70%)`} className={`transition-opacity duration-500 pointer-events-none ${isFlaring ? 'opacity-30 scale-100' : 'opacity-0 scale-50'}`} />
          </g>

          {/* Unmasked layer -- crisp eyes and mouth rendered at full resolution */}
          <g className="animate-lcd-flicker">
            <g style={{ 
               transform: `translate(${62 + mousePos.x * 0.8}px, ${eyeVerticalAnchor + face.leftEye.yOffset + mousePos.y}px) rotate(${face.leftEye.tilt}deg)`,
               transformOrigin: '0 0'
            }} className="transition-transform duration-700 ease-out">
               {face.leftEye.shape === 'heart' ? (
                 <HeartShape color={opticColor} filter="url(#eveGlow)" width={face.leftEye.width * eyeScale} height={face.leftEye.height * eyeScale} opacity={face.leftEye.opacity} />
               ) : face.leftEye.shape === 'star' ? (
                 <StarShape color={opticColor} filter="url(#eveGlow)" size={face.leftEye.width * eyeScale} opacity={face.leftEye.opacity} />
               ) : (() => {
                 const ew = face.leftEye.width * eyeScale;
                 const eh = blink ? 0.7 : face.leftEye.height * eyeScale;
                 const erx = blink ? 0.35 : face.leftEye.rx * eyeScale;
                 const pw = ew * 0.45;
                 const ph = eh * 0.55;
                 const prx = pw / 2;
                 const gazeX = mousePos.x * 2.5;
                 const gazeY = mousePos.y * 1.5;
                 const clipId = 'lumiClipLeftEye';
                 return (
                   <g filter="url(#eveGlow)" style={{ opacity: face.leftEye.opacity }}>
                     <defs>
                       <clipPath id={clipId}>
                         <rect x={-(ew / 2)} y={-(eh / 2)} width={ew} height={eh} rx={erx} />
                       </clipPath>
                     </defs>
                     <rect x={-(ew / 2)} y={-(eh / 2)} width={ew} height={eh} rx={erx} fill={opticColor} opacity={0.35} className="transition-all duration-300" />
                     <rect x={-(pw / 2) + gazeX} y={-(ph / 2) + gazeY} width={pw} height={ph} rx={prx} fill={opticColor} clipPath={`url(#${clipId})`} className="transition-all duration-200" />
                   </g>
                 );
               })()}
            </g>

            <g style={{ 
               transform: `translate(${138 + mousePos.x * 0.8}px, ${eyeVerticalAnchor + face.rightEye.yOffset + mousePos.y}px) rotate(${face.rightEye.tilt}deg)`,
               transformOrigin: '0 0'
            }} className="transition-transform duration-700 ease-out">
               {face.rightEye.shape === 'heart' ? (
                 <HeartShape color={opticColor} filter="url(#eveGlow)" width={face.rightEye.width * eyeScale} height={face.rightEye.height * eyeScale} opacity={face.rightEye.opacity} />
               ) : face.rightEye.shape === 'star' ? (
                 <StarShape color={opticColor} filter="url(#eveGlow)" size={face.rightEye.width * eyeScale} opacity={face.rightEye.opacity} />
               ) : (() => {
                 const ew = face.rightEye.width * eyeScale;
                 const eh = blink ? 0.7 : face.rightEye.height * eyeScale;
                 const erx = blink ? 0.35 : face.rightEye.rx * eyeScale;
                 const pw = ew * 0.45;
                 const ph = eh * 0.55;
                 const prx = pw / 2;
                 const gazeX = mousePos.x * 2.5;
                 const gazeY = mousePos.y * 1.5;
                 const clipId = 'lumiClipRightEye';
                 return (
                   <g filter="url(#eveGlow)" style={{ opacity: face.rightEye.opacity }}>
                     <defs>
                       <clipPath id={clipId}>
                         <rect x={-(ew / 2)} y={-(eh / 2)} width={ew} height={eh} rx={erx} />
                       </clipPath>
                     </defs>
                     <rect x={-(ew / 2)} y={-(eh / 2)} width={ew} height={eh} rx={erx} fill={opticColor} opacity={0.35} className="transition-all duration-300" />
                     <rect x={-(pw / 2) + gazeX} y={-(ph / 2) + gazeY} width={pw} height={ph} rx={prx} fill={opticColor} clipPath={`url(#${clipId})`} className="transition-all duration-200" />
                   </g>
                 );
               })()}
            </g>

            <g transform="translate(100, 142)">{renderVocalizer}</g>
          </g>
        </g>
      </svg>

      {/* Manual Expressions Tray */}
      <div className="fixed bottom-10 left-10 z-[800] flex items-center gap-3 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className={`w-14 h-14 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-all shadow-xl group z-10 ${isDrawerOpen ? 'bg-white/10 rotate-180 border-white/20' : ''}`}
        >
          <ChevronRight size={24} className="transition-transform duration-500" />
        </button>

        <div className={`flex items-center gap-2 p-2 bg-black/60 backdrop-blur-2xl border border-white/5 rounded-[2rem] transition-all duration-500 overflow-hidden ${isDrawerOpen ? 'max-w-xl opacity-100' : 'max-w-0 opacity-0 px-0 border-none'}`}>
          {EXPRESSION_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => onSetExpression?.(opt.type)}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95 ${manualExpression === opt.type ? 'bg-white/10 shadow-lg scale-105' : 'hover:bg-white/5 opacity-60 hover:opacity-100'}`}
              title={opt.label}
            >
              <span className="text-xl">{opt.emoji}</span>
            </button>
          ))}
          <button 
            onClick={() => onSetExpression?.(null)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-all ml-2"
            title="Auto-Pilot"
          >
            <span className="flex items-center justify-center">
              <Sparkles size={14} />
            </span>
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes camera-sway { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-4px) rotate(0.1deg); } }
        @keyframes lcd-flicker { 0% { opacity: 1; } 48% { opacity: 1; } 50% { opacity: 0.94; } 52% { opacity: 1; } 98% { opacity: 1; } 100% { opacity: 0.96; } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes note-float {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { opacity: 0.7; }
          100% { transform: translateY(-100px) scale(1.6); opacity: 0; }
        }
        .animate-camera-sway { animation: camera-sway 12s cubic-bezier(0.445, 0.05, 0.55, 0.95) infinite; }
        .animate-lcd-flicker { animation: lcd-flicker 0.15s infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; transform-origin: center; }
        .animate-spin-reverse { animation: spin-reverse 15s linear infinite; transform-origin: center; }
        .animate-note-float { animation: note-float 3.5s ease-out infinite; }
      `}} />
    </div>
  );
};
