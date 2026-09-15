'use client';

import React, { useEffect, useState, useRef, useMemo, memo, useCallback } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { BroSettings, BroIdentity, BroAgent, BroColor } from '@/lib/types';
import { ExpressionEngine, ExpressionType } from '@/lib/mcp/ExpressionEngine';

interface BroAvatarProps {
  settings: BroSettings;
  identity: BroIdentity;
  isListening: boolean;
  isTalking: boolean;
  isThinking: boolean;
  activeAgent: BroAgent;
  isDragging?: boolean;
  onBellyClick?: () => void;
  manualExpression?: ExpressionType | null;
  onSetExpression?: (exp: ExpressionType | null) => void;
}

// CRT phosphor green - bright, alive, electric like old terminals
const CRT_GREEN = '#39FF14';

const COLOR_MAP: Record<BroColor, string> = {
  indigo: '#a5b4fc', // Brighter indigo
  pink: '#f9a8d4',   // Brighter pink
  teal: '#5eead4',   // Brighter teal
  orange: '#fdba74', // Brighter orange
  purple: '#d8b4fe', // Brighter purple
  gold: '#fde047',   // Brighter gold
  black: '#39FF14',  // CRT green instead of black
  green: '#39FF14',  // Electric CRT green
  red: '#fca5a5',    // Brighter red
  cyan: '#67e8f9',   // Brighter cyan
  lime: '#bef264'    // Brighter lime
};

const WhistleNote = memo(({ color, delay }: { color: string; delay: number }) => {
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
});

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
  { type: 'suspicious', emoji: '🤨', label: 'Suspicious' },
  { type: 'empathetic', emoji: '🥺', label: 'Empathetic' },
  { type: 'focused', emoji: '🎯', label: 'Focused' },
  { type: 'analytical', emoji: '🧐', label: 'Analytical' },
  { type: 'dizzy', emoji: '😵', label: 'Dizzy' },
  { type: 'whistle', emoji: '😙', label: 'Whistle' },
  { type: 'shifty', emoji: '👀', label: 'Shifty' },
];

// Expression config - CINEMATIC QUALITY, full expressiveness for movie-ready UI
interface CRTFaceConfig {
  leftEye: { shape: 'dot' | 'arc' | 'line' | 'heart' | 'star' | 'x' | 'spiral', size: number, offsetY: number, offsetX?: number };
  rightEye: { shape: 'dot' | 'arc' | 'line' | 'heart' | 'star' | 'x' | 'spiral', size: number, offsetY: number, offsetX?: number };
  mouth: { shape: 'line' | 'smile' | 'frown' | 'o' | 'smirk' | 'wide' | 'grin' | 'worried', width: number, offsetY: number, curve?: number };
  eyebrows: { left: number, right: number, thickness?: number, curve?: number };
  glassesStyle: 'round' | 'square' | 'none';
  extras?: { blush?: boolean, sweat?: boolean, sparkle?: boolean, tears?: boolean };
}

// 20 FULLY MAPPED EXPRESSIONS - each one unique and expressive
const CRT_EXPRESSIONS: Record<ExpressionType, CRTFaceConfig> = {
  // 1. NEUTRAL - calm, present, attentive
  neutral: {
    leftEye: { shape: 'dot', size: 14, offsetY: 0 },
    rightEye: { shape: 'dot', size: 14, offsetY: 0 },
    mouth: { shape: 'line', width: 26, offsetY: 0 },
    eyebrows: { left: 0, right: 0, thickness: 4 },
    glassesStyle: 'round'
  },
  // 2. HAPPY - warm, genuine smile, eyes squint with joy
  happy: {
    leftEye: { shape: 'arc', size: 16, offsetY: 2 },
    rightEye: { shape: 'arc', size: 16, offsetY: 2 },
    mouth: { shape: 'smile', width: 34, offsetY: 0, curve: 14 },
    eyebrows: { left: -10, right: 10, thickness: 4, curve: -8 },
    glassesStyle: 'round',
    extras: { blush: true }
  },
  // 3. HEARTS - deep love, heart-shaped eyes, dreamy
  hearts: {
    leftEye: { shape: 'heart', size: 20, offsetY: 0 },
    rightEye: { shape: 'heart', size: 20, offsetY: 0 },
    mouth: { shape: 'smile', width: 30, offsetY: 3, curve: 12 },
    eyebrows: { left: -12, right: 12, thickness: 3, curve: -10 },
    glassesStyle: 'round',
    extras: { blush: true, sparkle: true }
  },
  // 4. CURIOUS - one eyebrow raised, asymmetric, intrigued
  curious: {
    leftEye: { shape: 'dot', size: 16, offsetY: -3 },
    rightEye: { shape: 'dot', size: 12, offsetY: 1 },
    mouth: { shape: 'o', width: 12, offsetY: 0 },
    eyebrows: { left: -18, right: 8, thickness: 4 },
    glassesStyle: 'round'
  },
  // 5. EXCITED - stars in eyes, huge grin, maximum energy
  excited: {
    leftEye: { shape: 'star', size: 22, offsetY: -3 },
    rightEye: { shape: 'star', size: 22, offsetY: -3 },
    mouth: { shape: 'grin', width: 40, offsetY: 0, curve: 18 },
    eyebrows: { left: -15, right: 15, thickness: 5 },
    glassesStyle: 'round',
    extras: { sparkle: true }
  },
  // 6. SURPRISED - wide eyes, raised brows, open mouth
  surprised: {
    leftEye: { shape: 'dot', size: 22, offsetY: -5 },
    rightEye: { shape: 'dot', size: 22, offsetY: -5 },
    mouth: { shape: 'o', width: 16, offsetY: 2 },
    eyebrows: { left: -25, right: 25, thickness: 4 },
    glassesStyle: 'round'
  },
  // 7. THINKING - asymmetric, looking up-right, contemplative
  thinking: {
    leftEye: { shape: 'dot', size: 10, offsetY: -2, offsetX: 3 },
    rightEye: { shape: 'line', size: 14, offsetY: 1 },
    mouth: { shape: 'smirk', width: 22, offsetY: 4 },
    eyebrows: { left: 12, right: -18, thickness: 4 },
    glassesStyle: 'round'
  },
  // 8. MISCHIEVOUS - sly grin, one eye squinted, plotting
  mischievous: {
    leftEye: { shape: 'arc', size: 14, offsetY: 1 },
    rightEye: { shape: 'line', size: 14, offsetY: 3 },
    mouth: { shape: 'smirk', width: 28, offsetY: 0 },
    eyebrows: { left: 18, right: -12, thickness: 4 },
    glassesStyle: 'round'
  },
  // 9. SLEEPY - droopy eyes, tired, peaceful
  sleepy: {
    leftEye: { shape: 'line', size: 16, offsetY: 5 },
    rightEye: { shape: 'line', size: 16, offsetY: 5 },
    mouth: { shape: 'line', width: 20, offsetY: 6 },
    eyebrows: { left: 10, right: -10, thickness: 3 },
    glassesStyle: 'round'
  },
  // 10. WINK - one eye closed, friendly, playful
  wink: {
    leftEye: { shape: 'dot', size: 14, offsetY: 0 },
    rightEye: { shape: 'arc', size: 14, offsetY: 2 },
    mouth: { shape: 'smile', width: 30, offsetY: 0, curve: 12 },
    eyebrows: { left: -6, right: 12, thickness: 4 },
    glassesStyle: 'round'
  },
  // 11. GLITCH - broken, chaotic, digital corruption
  glitch: {
    leftEye: { shape: 'x', size: 18, offsetY: -5, offsetX: -3 },
    rightEye: { shape: 'dot', size: 20, offsetY: 6, offsetX: 4 },
    mouth: { shape: 'line', width: 36, offsetY: -6 },
    eyebrows: { left: 25, right: -30, thickness: 6 },
    glassesStyle: 'square'
  },
  // 12. EMPATHETIC - soft, caring, understanding
  empathetic: {
    leftEye: { shape: 'arc', size: 14, offsetY: 1 },
    rightEye: { shape: 'arc', size: 14, offsetY: 1 },
    mouth: { shape: 'smile', width: 28, offsetY: 1, curve: 8 },
    eyebrows: { left: -10, right: 10, thickness: 3, curve: -6 },
    glassesStyle: 'round',
    extras: { tears: true }
  },
  // 13. SUSPICIOUS - narrowed eyes, skeptical, doubtful
  suspicious: {
    leftEye: { shape: 'line', size: 18, offsetY: 3 },
    rightEye: { shape: 'line', size: 18, offsetY: 3 },
    mouth: { shape: 'line', width: 22, offsetY: 3 },
    eyebrows: { left: 22, right: -22, thickness: 5 },
    glassesStyle: 'round'
  },
  // 14. ANALYTICAL - focused, sharp, examining
  analytical: {
    leftEye: { shape: 'dot', size: 10, offsetY: 0 },
    rightEye: { shape: 'dot', size: 10, offsetY: 0 },
    mouth: { shape: 'line', width: 18, offsetY: 1 },
    eyebrows: { left: -5, right: 5, thickness: 4 },
    glassesStyle: 'square'
  },
  // 15. FOCUSED - intense, determined, locked in
  focused: {
    leftEye: { shape: 'dot', size: 12, offsetY: -2 },
    rightEye: { shape: 'dot', size: 12, offsetY: -2 },
    mouth: { shape: 'line', width: 20, offsetY: 0 },
    eyebrows: { left: -8, right: 8, thickness: 5 },
    glassesStyle: 'round'
  },
  // 16. DIZZY - spiral/x eyes, disoriented, overwhelmed
  dizzy: {
    leftEye: { shape: 'spiral', size: 16, offsetY: 0 },
    rightEye: { shape: 'spiral', size: 16, offsetY: 0 },
    mouth: { shape: 'o', width: 10, offsetY: 3 },
    eyebrows: { left: 18, right: -18, thickness: 3 },
    glassesStyle: 'round',
    extras: { sweat: true }
  },
  // 17. WHISTLE - pursed lips, happy squint, carefree
  whistle: {
    leftEye: { shape: 'arc', size: 14, offsetY: 1 },
    rightEye: { shape: 'arc', size: 14, offsetY: 1 },
    mouth: { shape: 'o', width: 8, offsetY: -3 },
    eyebrows: { left: -6, right: 6, thickness: 3 },
    glassesStyle: 'round'
  },
  // 18. SHIFTY - eyes looking different directions, nervous
  shifty: {
    leftEye: { shape: 'dot', size: 10, offsetY: 4, offsetX: -5 },
    rightEye: { shape: 'dot', size: 10, offsetY: -4, offsetX: 5 },
    mouth: { shape: 'worried', width: 16, offsetY: 3 },
    eyebrows: { left: 15, right: -8, thickness: 4 },
    glassesStyle: 'round',
    extras: { sweat: true }
  }
};

export const BroAvatar = memo(({ 
  settings, identity, isListening, isTalking, isThinking, activeAgent, isDragging = false, onBellyClick, manualExpression = null, onSetExpression
}: BroAvatarProps) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFlaring, setIsFlaring] = useState(false);
  const [microExpression, setMicroExpression] = useState({ eyeSquint: 0, mouthTwitch: 0 });
  const [breathPhase, setBreathPhase] = useState(0);
  const [pupilDilation, setPupilDilation] = useState(1);
  // Speech animation - creates natural mouth movement synced with voice
  const [mouthOpenness, setMouthOpenness] = useState(0);
  const [mouthShape, setMouthShape] = useState<'closed' | 'small' | 'medium' | 'wide'>('closed');
  const speechPhaseRef = useRef(0);
  const speechTargetRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMoveTime = useRef(Date.now());
  const idleTarget = useRef({ x: 0, y: 0 });
  const idlePos = useRef({ x: 0, y: 0 });
  
  const baseExpression = manualExpression || ExpressionEngine.getExpression(activeAgent as any, isTalking, isListening, isDragging, isThinking);
  const crtFace = useMemo(() => CRT_EXPRESSIONS[baseExpression] || CRT_EXPRESSIONS.neutral, [baseExpression]);

  // Mouse tracking for eye gaze
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

  // Idle eye drift
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

  // Blinking - natural intervals with occasional double-blinks
  useEffect(() => {
    const doBlink = () => {
      setBlink(true);
      setTimeout(() => {
        setBlink(false);
        // 20% chance of double blink
        if (Math.random() < 0.2) {
          setTimeout(() => {
            setBlink(true);
            setTimeout(() => setBlink(false), 80);
          }, 150);
        }
      }, 100 + Math.random() * 50);
    };
    const interval = setInterval(doBlink, 3000 + Math.random() * 4000);
    return () => clearInterval(interval);
  }, []);

  // Breathing animation - subtle vertical movement
  useEffect(() => {
    let raf: number;
    const updateBreath = () => {
      setBreathPhase(prev => (prev + 0.02) % (Math.PI * 2));
      raf = requestAnimationFrame(updateBreath);
    };
    raf = requestAnimationFrame(updateBreath);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Micro-expressions - tiny random twitches for life
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.3) {
        setMicroExpression({
          eyeSquint: (Math.random() - 0.5) * 0.1,
          mouthTwitch: (Math.random() - 0.5) * 2
        });
        setTimeout(() => setMicroExpression({ eyeSquint: 0, mouthTwitch: 0 }), 200);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Pupil dilation based on state
  useEffect(() => {
    if (isListening) setPupilDilation(1.3);
    else if (isTalking) setPupilDilation(1.1);
    else if (isThinking) setPupilDilation(0.8);
    else setPupilDilation(1);
  }, [isListening, isTalking, isThinking]);

  // Speech-synced mouth animation - creates natural talking motion
  useEffect(() => {
    if (!isTalking) {
      // Smooth close when not talking
      const closeInterval = setInterval(() => {
        setMouthOpenness(prev => {
          const next = prev * 0.85;
          if (next < 0.05) {
            clearInterval(closeInterval);
            return 0;
          }
          return next;
        });
      }, 30);
      setMouthShape('closed');
      return () => clearInterval(closeInterval);
    }

    // When talking, simulate natural speech patterns
    let raf: number;
    let lastTime = Date.now();
    
    const animateSpeech = () => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;
      
      // Update phase - creates varying rhythm
      speechPhaseRef.current += delta * 0.015;
      
      // Natural speech has varying intensity - combine multiple waves
      const wave1 = Math.sin(speechPhaseRef.current * 1.0) * 0.4;
      const wave2 = Math.sin(speechPhaseRef.current * 2.3) * 0.3;
      const wave3 = Math.sin(speechPhaseRef.current * 0.7) * 0.2;
      const burst = Math.random() < 0.08 ? Math.random() * 0.3 : 0; // Occasional emphasis
      
      // Combine for natural movement
      const rawOpenness = 0.3 + wave1 + wave2 + wave3 + burst;
      const clampedOpenness = Math.max(0.1, Math.min(1, rawOpenness));
      
      // Smooth interpolation toward target
      speechTargetRef.current = clampedOpenness;
      setMouthOpenness(prev => prev + (speechTargetRef.current - prev) * 0.25);
      
      // Determine mouth shape based on openness
      if (clampedOpenness < 0.3) setMouthShape('small');
      else if (clampedOpenness < 0.6) setMouthShape('medium');
      else setMouthShape('wide');
      
      raf = requestAnimationFrame(animateSpeech);
    };
    
    raf = requestAnimationFrame(animateSpeech);
    return () => cancelAnimationFrame(raf);
  }, [isTalking]);

  const handleFaceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlaring(true);
    setTimeout(() => setIsFlaring(false), 400);
    onBellyClick?.();
  };

  // CRT green as primary, but can be tinted by settings.color
  const crtColor = settings.color === 'green' ? CRT_GREEN : COLOR_MAP[settings.color] || CRT_GREEN;
  const breathOffset = Math.sin(breathPhase) * 1.5; 

  // Render CRT-style eye - cinematic, alive, expressive
  const renderCRTEye = useCallback((config: CRTFaceConfig['leftEye'], side: 'left' | 'right', gazeX: number, gazeY: number) => {
    const size = config.size * pupilDilation * 1.2; // Bigger eyes
    const blinkHeight = blink ? 0.15 : 1;
    const gazeOffsetX = gazeX * 4;
    const gazeOffsetY = gazeY * 3;
    
    switch (config.shape) {
      case 'dot':
        // Solid pupil that follows gaze - the main look
        return (
          <g style={{ transform: `translate(${gazeOffsetX}px, ${gazeOffsetY}px)` }}>
            <ellipse 
              rx={size * 0.6} 
              ry={size * 0.6 * blinkHeight}
              fill={crtColor} 
              filter="url(#crtGlow)"
            />
            {/* Highlight for life */}
            {!blink && (
              <circle 
                cx={-size * 0.15} cy={-size * 0.15} r={size * 0.15}
                fill={crtColor}
                opacity={0.6}
              />
            )}
          </g>
        );
      case 'arc':
        // Happy squinted eye - curved line (like ^_^)
        const arcW = size * 1.2;
        return (
          <path 
            d={`M ${-arcW/2} 4 Q 0 ${-arcW/2} ${arcW/2} 4`}
            fill="none" 
            stroke={crtColor} 
            strokeWidth={3}
            strokeLinecap="round"
            filter="url(#crtGlow)"
          />
        );
      case 'line':
        // Sleepy/suspicious - horizontal line
        return (
          <line 
            x1={-size * 0.7} y1={0} x2={size * 0.7} y2={0}
            stroke={crtColor} 
            strokeWidth={3}
            strokeLinecap="round"
            filter="url(#crtGlow)"
          />
        );
      case 'heart':
        // Proper heart shape - two bumps at top, point at bottom
        const hs = size * 0.55;
        return (
          <path 
            d={`M 0 ${hs * 0.9}
               L ${-hs * 0.55} ${hs * 0.1}
               C ${-hs * 0.55} ${-hs * 0.35}, ${-hs * 0.3} ${-hs * 0.6}, 0 ${-hs * 0.3}
               C ${hs * 0.3} ${-hs * 0.6}, ${hs * 0.55} ${-hs * 0.35}, ${hs * 0.55} ${hs * 0.1}
               Z`}
            fill={crtColor}
            filter="url(#crtGlow)"
            className="animate-heartbeat"
          />
        );
      case 'star':
        const points = 5;
        const outerR = size * 0.6;
        const innerR = size * 0.25;
        const starPath = Array.from({ length: points * 2 }, (_, i) => {
          const angle = (Math.PI / 2 * -1) + (Math.PI / points) * i;
          const r = i % 2 === 0 ? outerR : innerR;
          return `${i === 0 ? 'M' : 'L'} ${Math.cos(angle) * r} ${Math.sin(angle) * r}`;
        }).join(' ') + ' Z';
        return (
          <path 
            d={starPath}
            fill={crtColor}
            filter="url(#crtGlow)"
            className="animate-twinkle"
          />
        );
      case 'x':
        // Dizzy/glitch X eyes
        const xs = size * 0.5;
        return (
          <g filter="url(#crtGlow)">
            <line x1={-xs} y1={-xs} x2={xs} y2={xs} stroke={crtColor} strokeWidth={3} strokeLinecap="round" />
            <line x1={xs} y1={-xs} x2={-xs} y2={xs} stroke={crtColor} strokeWidth={3} strokeLinecap="round" />
          </g>
        );
      case 'spiral':
        // Dizzy spiral eyes - spinning effect
        const sr = size * 0.5;
        return (
          <g filter="url(#crtGlow)" className="animate-spin-slow">
            <path 
              d={`M 0 0 
                  Q ${sr * 0.3} ${-sr * 0.3}, ${sr * 0.5} 0 
                  Q ${sr * 0.3} ${sr * 0.5}, 0 ${sr * 0.6}
                  Q ${-sr * 0.5} ${sr * 0.4}, ${-sr * 0.7} 0
                  Q ${-sr * 0.5} ${-sr * 0.6}, 0 ${-sr * 0.8}`}
              fill="none"
              stroke={crtColor}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          </g>
        );
      default:
        return <circle r={size * 0.5} fill={crtColor} filter="url(#crtGlow)" />;
    }
  }, [blink, crtColor, pupilDilation]);

  // Render mouth - crisp, speech-synced, alive
  const renderCRTMouth = useCallback((config: CRTFaceConfig['mouth']) => {
    const w = config.width * 1.1;
    const curve = config.curve || 10;
    const twitchOffset = microExpression.mouthTwitch * 0.2;
    const strokeW = 2.5;
    
    // Speech-synced opening (0 to 1 scale)
    const openAmt = mouthOpenness * 12; // Scale for visual impact
    const widthMod = 1 + mouthOpenness * 0.15; // Mouth widens slightly when open
    
    switch (config.shape) {
      case 'smile':
        // Smile that opens naturally when talking
        const smileCurve = curve/2 + openAmt;
        const smileW = w * widthMod;
        return (
          <g filter="url(#crtGlow)">
            {/* Main smile curve - opens when talking */}
            <path 
              d={`M ${-smileW/2} ${-2 + twitchOffset} 
                  C ${-smileW/4} ${smileCurve}, ${smileW/4} ${smileCurve}, ${smileW/2} ${-2 + twitchOffset}`}
              fill="none" 
              stroke={crtColor} 
              strokeWidth={strokeW}
              strokeLinecap="round"
            />
            {/* Upper lip when mouth opens */}
            {mouthOpenness > 0.2 && (
              <path 
                d={`M ${-smileW/3} ${twitchOffset} C ${-smileW/6} ${-2}, ${smileW/6} ${-2}, ${smileW/3} ${twitchOffset}`}
                fill="none" 
                stroke={crtColor} 
                strokeWidth={2}
                strokeLinecap="round"
                opacity={Math.min(0.7, mouthOpenness)}
              />
            )}
          </g>
        );
      case 'grin':
        // Big excited grin - very animated when talking
        const grinOpen = curve + openAmt + 4;
        const grinW = w * widthMod;
        return (
          <g filter="url(#crtGlow)">
            <path 
              d={`M ${-grinW/2} 0 
                  C ${-grinW/4} ${grinOpen}, ${grinW/4} ${grinOpen}, ${grinW/2} 0`}
              fill="none" 
              stroke={crtColor} 
              strokeWidth={strokeW}
              strokeLinecap="round"
            />
            {/* Upper lip */}
            <path 
              d={`M ${-grinW/3} -1 C ${-grinW/6} ${-3 - openAmt * 0.2}, ${grinW/6} ${-3 - openAmt * 0.2}, ${grinW/3} -1`}
              fill="none" 
              stroke={crtColor} 
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.6}
            />
            {/* Teeth hint when wide open */}
            {mouthOpenness > 0.5 && (
              <line 
                x1={-grinW/5} y1={grinOpen * 0.4} 
                x2={grinW/5} y2={grinOpen * 0.4}
                stroke={crtColor} 
                strokeWidth={1.5}
                opacity={0.4}
              />
            )}
          </g>
        );
      case 'frown':
        const frownCurve = -curve/3 + openAmt * 0.3;
        return (
          <path 
            d={`M ${-w/2} ${curve/3} 
                C ${-w/4} ${frownCurve}, ${w/4} ${frownCurve}, ${w/2} ${curve/3}`}
            fill="none" 
            stroke={crtColor} 
            strokeWidth={strokeW}
            strokeLinecap="round"
            filter="url(#crtGlow)"
          />
        );
      case 'o':
        // O shape - naturally animates for speech
        const oW = w/4 + mouthOpenness * 4;
        const oH = w/3 + openAmt * 0.8;
        return (
          <ellipse 
            rx={oW}
            ry={oH}
            fill="none" 
            stroke={crtColor} 
            strokeWidth={strokeW}
            filter="url(#crtGlow)"
          />
        );
      case 'smirk':
        // Asymmetric smirk - subtle speech movement
        const smirkOpen = openAmt * 0.4;
        return (
          <path 
            d={`M ${-w/3} ${3 + twitchOffset + smirkOpen * 0.3} 
                Q 0 ${1 + smirkOpen * 0.2}, ${w/3} ${-5 - smirkOpen * 0.2}`}
            fill="none" 
            stroke={crtColor} 
            strokeWidth={strokeW}
            strokeLinecap="round"
            filter="url(#crtGlow)"
          />
        );
      case 'wide':
        // Very wide excited mouth
        const wideOpen = curve + openAmt;
        const wideW = w * widthMod;
        return (
          <g filter="url(#crtGlow)">
            <path 
              d={`M ${-wideW/2} -2 
                  C ${-wideW/3} ${wideOpen}, ${wideW/3} ${wideOpen}, ${wideW/2} -2`}
              fill="none" 
              stroke={crtColor} 
              strokeWidth={strokeW + 1}
              strokeLinecap="round"
            />
            {/* Upper definition when very open */}
            {mouthOpenness > 0.3 && (
              <path 
                d={`M ${-wideW/3} -3 C 0 ${-5 - openAmt * 0.1}, 0 ${-5 - openAmt * 0.1}, ${wideW/3} -3`}
                fill="none" 
                stroke={crtColor} 
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.5}
              />
            )}
          </g>
        );
      case 'worried':
        // Worried/nervous wavy mouth
        const worryW = w * 0.8;
        return (
          <path 
            d={`M ${-worryW/2} ${2 + twitchOffset} 
                Q ${-worryW/4} ${-2 + openAmt * 0.2}, 0 ${2 + twitchOffset}
                Q ${worryW/4} ${6 + openAmt * 0.2}, ${worryW/2} ${2 + twitchOffset}`}
            fill="none" 
            stroke={crtColor} 
            strokeWidth={strokeW}
            strokeLinecap="round"
            filter="url(#crtGlow)"
          />
        );
      case 'line':
      default:
        // Neutral line - transforms to open mouth when talking
        if (mouthOpenness > 0.15) {
          // Open mouth shape when talking
          const lineOpen = openAmt * 0.8;
          return (
            <g filter="url(#crtGlow)">
              {/* Lower lip */}
              <path 
                d={`M ${-w/3 + twitchOffset} 0 
                    Q 0 ${lineOpen}, ${w/3 + twitchOffset} 0`}
                fill="none"
                stroke={crtColor} 
                strokeWidth={strokeW}
                strokeLinecap="round"
              />
              {/* Upper lip hint */}
              <path 
                d={`M ${-w/4 + twitchOffset} ${-1} 
                    Q 0 ${-2 - lineOpen * 0.1}, ${w/4 + twitchOffset} ${-1}`}
                fill="none"
                stroke={crtColor} 
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.5}
              />
            </g>
          );
        }
        // Closed neutral line
        return (
          <path 
            d={`M ${-w/3 + twitchOffset} 0 L ${w/3 + twitchOffset} 0`}
            fill="none"
            stroke={crtColor} 
            strokeWidth={strokeW}
            strokeLinecap="round"
            filter="url(#crtGlow)"
          />
        );
    }
  }, [crtColor, microExpression.mouthTwitch, mouthOpenness]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full flex items-center justify-center transition-all duration-[1200ms] ease-in-out pointer-events-none"
      style={{ color: crtColor }}
    >
      {/* Ambient glow - larger, more cinematic */}
      <div 
        className="absolute rounded-full blur-[100px] transition-all duration-[1500ms] w-[80%] h-[80%] opacity-[0.2]" 
        style={{ backgroundColor: crtColor }} 
      />

      {baseExpression === 'whistle' && (
        <>
          <WhistleNote color={crtColor} delay={0} />
          <WhistleNote color={crtColor} delay={1.2} />
        </>
      )}

      <svg 
        className="w-full h-full overflow-visible pointer-events-auto cursor-pointer" 
        viewBox="0 0 200 200" 
        preserveAspectRatio="xMidYMid meet"
        onClick={handleFaceClick}
      >
        <defs>
          {/* CRT phosphor glow - SHARP with subtle outer glow */}
          <filter id="crtGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feComponentTransfer in="blur" result="boost">
              <feFuncA type="linear" slope="2.5" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="boost" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Extra glow for emphasis - still sharp */}
          <filter id="crtGlowStrong" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComponentTransfer in="blur" result="boost">
              <feFuncA type="linear" slope="4" />
            </feComponentTransfer>
            <feComposite in="SourceGraphic" in2="boost" operator="over" />
          </filter>
        </defs>

        {/* Main face - BIG, centered, floating freely (NO BOX) */}
        <g 
          style={{ 
            transform: `translate(${mousePos.x * 3}px, ${mousePos.y * 2 + breathOffset}px)`,
            transformOrigin: 'center center'
          }} 
          className="transition-transform duration-200 ease-out"
        >
          
          {/* GLASSES - sleek, refined, crisp lines */}
          {crtFace.glassesStyle !== 'none' && (
            <g filter="url(#crtGlow)">
              {/* Bridge - elegant connector */}
              <path 
                d={`M 80 ${76 + crtFace.leftEye.offsetY} Q 100 ${72 + (crtFace.leftEye.offsetY + crtFace.rightEye.offsetY) / 2} 120 ${76 + crtFace.rightEye.offsetY}`}
                fill="none"
                stroke={crtColor}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              
              {/* Left lens frame */}
              {crtFace.glassesStyle === 'round' ? (
                <circle 
                  cx={60} cy={80 + crtFace.leftEye.offsetY} r={28}
                  fill="none" 
                  stroke={crtColor} 
                  strokeWidth={2.5}
                />
              ) : (
                <rect 
                  x={32} y={52 + crtFace.leftEye.offsetY} width={56} height={56} rx={6}
                  fill="none" 
                  stroke={crtColor} 
                  strokeWidth={2.5}
                />
              )}
              
              {/* Right lens frame */}
              {crtFace.glassesStyle === 'round' ? (
                <circle 
                  cx={140} cy={80 + crtFace.rightEye.offsetY} r={28}
                  fill="none" 
                  stroke={crtColor} 
                  strokeWidth={2.5}
                />
              ) : (
                <rect 
                  x={112} y={52 + crtFace.rightEye.offsetY} width={56} height={56} rx={6}
                  fill="none" 
                  stroke={crtColor} 
                  strokeWidth={2.5}
                />
              )}
            </g>
          )}

          {/* EYEBROWS - always visible, expressive, crisp */}
          <g filter="url(#crtGlow)">
            {/* Left eyebrow - curved, expressive */}
            <path 
              d={`M 35 ${40 + (crtFace.leftEye?.offsetY || 0)} Q 60 ${32 + (crtFace.eyebrows?.left || 0) * 0.3 + (crtFace.leftEye?.offsetY || 0)} 85 ${40 + (crtFace.leftEye?.offsetY || 0)}`}
              fill="none"
              stroke={crtColor} 
              strokeWidth={2.5}
              strokeLinecap="round"
              style={{ 
                transform: `rotate(${crtFace.eyebrows?.left || 0}deg)`, 
                transformOrigin: '60px 36px',
                transition: 'all 0.3s ease-out'
              }}
            />
            {/* Right eyebrow - curved, expressive */}
            <path 
              d={`M 115 ${40 + (crtFace.rightEye?.offsetY || 0)} Q 140 ${32 + (crtFace.eyebrows?.right || 0) * 0.3 + (crtFace.rightEye?.offsetY || 0)} 165 ${40 + (crtFace.rightEye?.offsetY || 0)}`}
              fill="none"
              stroke={crtColor} 
              strokeWidth={2.5}
              strokeLinecap="round"
              style={{ 
                transform: `rotate(${crtFace.eyebrows?.right || 0}deg)`, 
                transformOrigin: '140px 36px',
                transition: 'all 0.3s ease-out'
              }}
            />
          </g>

          {/* LEFT EYE - inside left lens */}
          <g transform={`translate(60, ${80 + crtFace.leftEye.offsetY})`}>
            {renderCRTEye(crtFace.leftEye, 'left', mousePos.x, mousePos.y)}
          </g>

          {/* RIGHT EYE - inside right lens */}
          <g transform={`translate(140, ${80 + crtFace.rightEye.offsetY})`}>
            {renderCRTEye(crtFace.rightEye, 'right', mousePos.x, mousePos.y)}
          </g>

          {/* MOUTH - below glasses, expressive */}
          <g transform={`translate(100, ${145 + crtFace.mouth.offsetY})`}>
            {renderCRTMouth(crtFace.mouth)}
          </g>

          {/* Thinking bubbles - floating above */}
          {isThinking && (
            <g>
              <circle cx={170} cy={35} r={4} fill={crtColor} filter="url(#crtGlow)" className="animate-pulse" />
              <circle cx={180} cy={22} r={6} fill={crtColor} filter="url(#crtGlow)" className="animate-pulse" style={{ animationDelay: '0.15s' }} />
              <circle cx={192} cy={8} r={8} fill={crtColor} filter="url(#crtGlow)" className="animate-pulse" style={{ animationDelay: '0.3s' }} />
            </g>
          )}
          
          {/* Listening indicator - subtle ear glow */}
          {isListening && (
            <g filter="url(#crtGlowStrong)" className="animate-pulse">
              <circle cx={20} cy={80} r={6} fill={crtColor} opacity={0.6} />
              <circle cx={180} cy={80} r={6} fill={crtColor} opacity={0.6} />
            </g>
          )}
        </g>
      </svg>

      <div className="fixed bottom-10 left-3 md:left-10 right-3 md:right-auto z-[800] flex items-center gap-2 md:gap-3 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className={`w-10 h-10 md:w-14 md:h-14 shrink-0 backdrop-blur-3xl border rounded-full flex items-center justify-center transition-all shadow-xl group z-10 ${isDrawerOpen ? 'bg-[#39FF14]/20 rotate-180 border-[#39FF14]/40 text-[#39FF14]' : 'bg-[#0a1a0a]/80 border-[#39FF14]/20 text-[#39FF14]/60 hover:text-[#39FF14] hover:border-[#39FF14]/40'}`}
        >
          <ChevronRight size={20} className="transition-transform duration-500" />
        </button>

        <div className={`flex items-center gap-1.5 md:gap-2 p-1.5 md:p-2 bg-[#0a1a0a]/90 backdrop-blur-2xl border border-[#39FF14]/10 rounded-[2rem] transition-all duration-500 overflow-x-auto no-scrollbar ${isDrawerOpen ? 'max-w-[calc(100vw-5rem)] md:max-w-xl opacity-100' : 'max-w-0 opacity-0 px-0 border-none'}`}>
          {EXPRESSION_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => onSetExpression?.(opt.type)}
              className={`w-9 h-9 md:w-10 md:h-10 shrink-0 flex items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95 ${manualExpression === opt.type ? 'bg-[#39FF14]/20 shadow-lg shadow-[#39FF14]/20 scale-105 ring-1 ring-[#39FF14]/40' : 'hover:bg-[#39FF14]/10 opacity-70 hover:opacity-100'}`}
              title={opt.label}
            >
              <span className="text-lg md:text-xl">{opt.emoji}</span>
            </button>
          ))}
          <button 
            onClick={() => onSetExpression?.(null)}
            className="w-9 h-9 md:w-10 md:h-10 shrink-0 flex items-center justify-center rounded-full bg-[#39FF14]/10 hover:bg-[#39FF14]/20 text-[#39FF14] transition-all ml-1 md:ml-2"
            title="Auto-Pilot"
          >
            <Sparkles size={14} />
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes note-float {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { opacity: 0.8; }
          100% { transform: translateY(-120px) scale(1.8); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          15% { transform: scale(1.15); }
          30% { transform: scale(1); }
          45% { transform: scale(1.1); }
        }
        @keyframes twinkle {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.1) rotate(18deg); opacity: 0.9; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-note-float { animation: note-float 3s ease-out infinite; }
        .animate-pulse { animation: pulse 2s ease-in-out infinite; }
        .animate-heartbeat { animation: heartbeat 0.8s ease-in-out infinite; }
        .animate-twinkle { animation: twinkle 1s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 2s linear infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
});
