'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Prize {
  label: string;
  color: string;
  weight: number;
}

interface LeadData {
  id: string;
  name: string;
  email: string;
  phone: string;
  prize: string;
  event: string;
  timestamp: string;
}

interface SpinToWinProps {
  onClose: () => void;
  onPrizeClaimed: (lead: LeadData) => void;
  onPrizeWon?: (prize: string, isSecretGift: boolean) => void;
  onBroSpeak?: (message: string) => void; // Bro speaks as TV host
  leadData: { name: string; email: string; phone: string };
  eventName?: string;
  prizes?: Prize[];
}

const DEFAULT_PRIZES: Prize[] = [
  { label: 'Branded Pen', color: '#D4AF37', weight: 3 },
  { label: 'T-Shirt', color: '#C0C0C0', weight: 2 },
  { label: '10% Off', color: '#FFD700', weight: 2 },
  { label: 'Free Audit', color: '#B8860B', weight: 1 },
  { label: 'VIP Access', color: '#DAA520', weight: 1 },
  { label: 'Try Again', color: '#8B4513', weight: 1 },
];

// TV Host lines for Bro to say
const HOST_LINES = {
  preSpinHype: [
    `[SPIN_TO_WIN HOST MODE] Say with high energy like a game show host: "Alright {NAME}, the wheel is HOT! Tap that golden button and let's see what fate has in store!"`,
    `[SPIN_TO_WIN HOST MODE] Say excitedly: "{NAME}! You ready? That wheel is looking GENEROUS today. Hit that spin button!"`,
    `[SPIN_TO_WIN HOST MODE] Build anticipation: "Oh {NAME}, I got a good feeling about this one! Give it a spin!"`,
  ],
  spinning: [
    `[SPIN_TO_WIN HOST MODE] During spin, say: "Here we GO! Round and round, where she stops, nobody knows!"`,
    `[SPIN_TO_WIN HOST MODE] Build excitement: "Look at it GO! The wheel is SPINNING!"`,
    `[SPIN_TO_WIN HOST MODE] Excited commentary: "Round and round! What's it gonna be?!"`,
  ],
  slowingDown: [
    `[SPIN_TO_WIN HOST MODE] As wheel slows: "Ohhh it's slowing down... come on come on come on..."`,
    `[SPIN_TO_WIN HOST MODE] Tension building: "Almost there... almost THERE..."`,
  ],
  wins: {
    'Branded Pen': `[SPIN_TO_WIN HOST MODE] Celebrate: "A BRANDED PEN! Those write smooth, {NAME}! Nice win!"`,
    'T-Shirt': `[SPIN_TO_WIN HOST MODE] Big celebration: "T-SHIRT! Oh look at THAT {NAME}! We only have a few of these left, you got LUCKY!"`,
    '10% Off': `[SPIN_TO_WIN HOST MODE] Celebrate: "TEN PERCENT OFF! {NAME}, that's real money saved on your next project!"`,
    'Free Audit': `[SPIN_TO_WIN HOST MODE] Big celebration: "FREE AUDIT! {NAME}, that's usually expensive stuff right there! HUGE win!"`,
    'VIP Access': `[SPIN_TO_WIN HOST MODE] Go wild: "VIP ACCESS! {NAME}! You're in the INNER CIRCLE now! That's a JACKPOT right there!"`,
    'Try Again': `[SPIN_TO_WIN HOST MODE] Sympathetic but upbeat: "Aww, Try Again! Hey {NAME}, that's okay - come back tomorrow when luck resets! The wheel giveth and the wheel... you know."`,
    'SECRET GIFT': `[SPIN_TO_WIN HOST MODE] Go absolutely wild: "WAIT WAIT WAIT! THE SECRET GIFT?! {NAME}! I don't even know what's IN there! You HAVE to tell me what it is when you open it! That's the mystery box! INCREDIBLE!"`,
  },
  tradeOffer: `[SPIN_TO_WIN HOST MODE] Offer the trade: "Now {NAME}, here's an interesting choice... you can KEEP that prize, OR, and hear me out... trade it for a MYSTERY SPIN. Five percent chance of the SECRET GIFT. What do you say? Feeling lucky?"`,
  tradeTaken: `[SPIN_TO_WIN HOST MODE] Excited: "OH! Going for the mystery! {NAME}'s got GUTS! Here we go again!"`,
};

export function SpinToWin({ 
  onClose, 
  onPrizeClaimed, 
  onPrizeWon,
  onBroSpeak,
  leadData, 
  eventName = 'WebCore Matrix',
  prizes = DEFAULT_PRIZES 
}: SpinToWinProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonPrize, setWonPrize] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showTradeOffer, setShowTradeOffer] = useState(false);
  const [isSecretSpin, setIsSecretSpin] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  
  // Refs for animation state
  const currentRotationRef = useRef(0);
  const pointerAngleRef = useRef(0);
  const pointerVelocityRef = useRef(0);
  const lastPegRef = useRef(-1);
  const glitterParticlesRef = useRef<Array<{ x: number; y: number; size: number; speed: number; angle: number; opacity: number }>>([]);
  const confettiRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; color: string; rotation: number; rotationSpeed: number; size: number; opacity: number; shape: 'rect' | 'circle' | 'star' }>>([]);
  const animationFrameRef = useRef<number | null>(null);
  const glitterAnimationRef = useRef<number | null>(null);

  const segments = prizes;
  const segmentAngle = 360 / segments.length;
  
  // Pointer physics
  const pointerRestAngle = 0;
  const pointerSpringConstant = 0.3;
  const pointerDamping = 0.82;
  const pegHitForce = 12;

  // Initialize audio context on first interaction
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Play a peg click sound - simple and snappy
  const playPegSound = useCallback((pitch: number = 1) => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.value = 800 * pitch;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      // Audio failed silently
    }
  }, [getAudioContext]);

  // Play win fanfare
  const playWinSound = useCallback((isJackpot: boolean = false) => {
    try {
      const ctx = getAudioContext();
      const notes = isJackpot 
        ? [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98] // C5 E5 G5 C6 E6 G6
        : [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
      
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        const startTime = ctx.currentTime + i * 0.12;
        const duration = isJackpot ? 0.5 : 0.3;
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } catch (e) {
      // Audio failed silently
    }
  }, [getAudioContext]);

  // Play fail sound
  const playFailSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // Audio failed silently
    }
  }, [getAudioContext]);

  // Initialize glitter particles
  useEffect(() => {
    const particles: typeof glitterParticlesRef.current = [];
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 3 + 1,
        speed: Math.random() * 0.5 + 0.2,
        angle: Math.random() * Math.PI * 2,
        opacity: Math.random()
      });
    }
    glitterParticlesRef.current = particles;
  }, []);

  // Tell Bro to hype up the spin when wheel opens
  useEffect(() => {
    if (onBroSpeak && leadData.name && !hasSpun) {
      const line = HOST_LINES.preSpinHype[Math.floor(Math.random() * HOST_LINES.preSpinHype.length)];
      setTimeout(() => {
        onBroSpeak(line.replace('{NAME}', leadData.name));
      }, 800);
    }
  }, [onBroSpeak, leadData.name, hasSpun]);

  // Draw wheel
  const drawWheel = useCallback((timestamp?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 15;

    ctx.clearRect(0, 0, size, size);

    // Draw segments
    segments.forEach((segment, i) => {
      const startAngle = (i * segmentAngle - 90) * (Math.PI / 180);
      const endAngle = ((i + 1) * segmentAngle - 90) * (Math.PI / 180);

      const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
      gradient.addColorStop(0, segment.color);
      gradient.addColorStop(1, adjustColor(segment.color, -30));
      
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + (segmentAngle * Math.PI / 180) / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#1a1a2e';
      ctx.font = `bold ${Math.floor(size / 22)}px Arial`;
      ctx.shadowColor = 'rgba(255,255,255,0.3)';
      ctx.shadowBlur = 2;
      ctx.fillText(segment.label.toUpperCase(), radius - 25, 5);
      ctx.restore();
    });

    // Draw pegs
    for (let i = 0; i < segments.length; i++) {
      const angle = (i * segmentAngle - 90) * (Math.PI / 180);
      const pegX = center + Math.cos(angle) * (radius - 8);
      const pegY = center + Math.sin(angle) * (radius - 8);
      
      ctx.beginPath();
      ctx.arc(pegX, pegY, 10, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(pegX, pegY, 7, 0, Math.PI * 2);
      const pegGradient = ctx.createRadialGradient(pegX - 2, pegY - 2, 0, pegX, pegY, 7);
      pegGradient.addColorStop(0, '#FFF8DC');
      pegGradient.addColorStop(1, '#B8860B');
      ctx.fillStyle = pegGradient;
      ctx.fill();
      ctx.strokeStyle = '#8B6914';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Inner hub
    const hubGradient = ctx.createRadialGradient(center - 10, center - 10, 0, center, center, radius * 0.18);
    hubGradient.addColorStop(0, '#FFF8DC');
    hubGradient.addColorStop(0.5, '#FFD700');
    hubGradient.addColorStop(1, '#B8860B');
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = hubGradient;
    ctx.fill();
    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Glitter
    if (timestamp) {
      glitterParticlesRef.current.forEach((p) => {
        const x = p.x * size;
        const y = p.y * size;
        const dist = Math.sqrt((x - center) ** 2 + (y - center) ** 2);
        
        if (dist < radius) {
          ctx.beginPath();
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          const flicker = (Math.sin(timestamp * 0.008 + p.angle * 10) + 1) / 2;
          ctx.fillStyle = `rgba(255, 255, 200, ${p.opacity * flicker * 0.8})`;
          ctx.fill();
        }

        p.y += p.speed * 0.001;
        p.x += Math.sin(p.angle + timestamp * 0.001) * 0.0015;
        if (p.y > 1) { p.y = 0; p.x = Math.random(); }
      });
    }

    // Outer lights
    const numLights = 24;
    for (let i = 0; i < numLights; i++) {
      const angle = (i / numLights) * Math.PI * 2 - Math.PI / 2;
      const lightX = center + Math.cos(angle) * (radius + 8);
      const lightY = center + Math.sin(angle) * (radius + 8);
      
      const isLit = timestamp ? Math.sin(timestamp * 0.005 + i * 0.5) > 0 : true;
      
      ctx.beginPath();
      ctx.arc(lightX, lightY, 4, 0, Math.PI * 2);
      ctx.fillStyle = isLit ? '#FFD700' : '#8B6914';
      ctx.fill();
      
      if (isLit) {
        ctx.beginPath();
        ctx.arc(lightX, lightY, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.fill();
      }
    }
  }, [segments, segmentAngle]);

  function adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  const selectPrize = useCallback((forSecret: boolean = false) => {
    if (forSecret) {
      if (Math.random() < 0.05) {
        return { label: 'SECRET GIFT', color: '#9400D3', weight: 1 };
      }
      return { label: 'Try Again', color: '#8B4513', weight: 1 };
    }
    
    const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    for (const segment of segments) {
      random -= segment.weight;
      if (random <= 0) return segment;
    }
    return segments[segments.length - 1];
  }, [segments]);

  // MASSIVE confetti
  const triggerConfetti = useCallback((isJackpot: boolean = false) => {
    const confettiCanvas = confettiCanvasRef.current;
    if (!confettiCanvas) return;

    const colors = isJackpot 
      ? ['#FFD700', '#FFA500', '#FF6347', '#FF69B4', '#00FF00', '#00FFFF', '#FF00FF', '#FFFFFF']
      : ['#FFD700', '#FFA500', '#FF6347', '#7FFF00', '#00CED1', '#FF69B4'];
    
    const particles: typeof confettiRef.current = [];
    const count = isJackpot ? 1000 : 600;
    
    const burstPoints = isJackpot 
      ? [
          { x: confettiCanvas.width / 2, y: confettiCanvas.height / 2 },
          { x: confettiCanvas.width * 0.15, y: confettiCanvas.height * 0.2 },
          { x: confettiCanvas.width * 0.85, y: confettiCanvas.height * 0.2 },
          { x: confettiCanvas.width * 0.25, y: confettiCanvas.height * 0.8 },
          { x: confettiCanvas.width * 0.75, y: confettiCanvas.height * 0.8 },
        ]
      : [
          { x: confettiCanvas.width / 2, y: confettiCanvas.height / 2 },
          { x: confettiCanvas.width * 0.3, y: confettiCanvas.height * 0.4 },
          { x: confettiCanvas.width * 0.7, y: confettiCanvas.height * 0.4 },
        ];
    
    burstPoints.forEach((point) => {
      const burstCount = Math.floor(count / burstPoints.length);
      for (let i = 0; i < burstCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 30 + 15;
        const shapes: Array<'rect' | 'circle' | 'star'> = ['rect', 'circle', 'star'];
        
        particles.push({
          x: point.x + (Math.random() - 0.5) * 80,
          y: point.y + (Math.random() - 0.5) * 80,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 20,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 25,
          size: Math.random() * 15 + 8,
          opacity: 1,
          shape: shapes[Math.floor(Math.random() * shapes.length)]
        });
      }
    });
    
    confettiRef.current = particles;
  }, []);

  const animateConfetti = useCallback(() => {
    const confettiCanvas = confettiCanvasRef.current;
    if (!confettiCanvas) return;
    
    const ctx = confettiCanvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      
      let activeParticles = 0;
      confettiRef.current.forEach((p) => {
        if (p.opacity <= 0) return;
        activeParticles++;
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size * 0.5);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const r = p.size / 3;
            if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fill();
        }
        
        ctx.restore();

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.5;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.004;
        p.vx *= 0.99;
      });

      if (activeParticles > 0) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, []);

  // Spin the wheel
  const spin = useCallback(async (forSecret: boolean = false) => {
    if (isSpinning) return;
    
    // Initialize audio on first spin
    getAudioContext();
    
    setIsSpinning(true);
    setIsSecretSpin(forSecret);
    setHasSpun(true);

    // Bro hypes up the spin
    if (onBroSpeak) {
      if (forSecret) {
        onBroSpeak(HOST_LINES.tradeTaken);
      } else {
        const line = HOST_LINES.spinning[Math.floor(Math.random() * HOST_LINES.spinning.length)];
        onBroSpeak(line);
      }
    }

    const winningPrize = selectPrize(forSecret);
    
    let winningIndex: number;
    if (forSecret && winningPrize.label === 'SECRET GIFT') {
      winningIndex = Math.floor(Math.random() * segments.length);
    } else if (forSecret) {
      winningIndex = segments.findIndex(s => s.label === 'Try Again');
      if (winningIndex === -1) winningIndex = 0;
    } else {
      winningIndex = segments.findIndex(s => s.label === winningPrize.label);
    }
    
    const baseSpins = 10 + Math.floor(Math.random() * 3);
    const randomOffset = (Math.random() - 0.5) * (segmentAngle * 0.7);
    const middleOfSegment = (winningIndex * segmentAngle) + (segmentAngle / 2);
    const targetAngle = 270 - middleOfSegment;
    const finalRotation = (baseSpins * 360) + targetAngle - randomOffset;

    const duration = 8000;
    const startRotation = currentRotationRef.current;
    let startTime: number | null = null;
    let wheelHasStopped = false;
    let hasPlayedSlowdown = false;

    const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const oldRotation = currentRotationRef.current;

      if (progress < duration) {
        const timeFraction = Math.min(progress / duration, 1);
        const easedProgress = easeOutQuint(timeFraction);
        currentRotationRef.current = startRotation + (finalRotation - startRotation) * easedProgress;

        const wheelSpeed = Math.abs(currentRotationRef.current - oldRotation);
        
        if (canvasRef.current) {
          canvasRef.current.style.transform = `rotate(${currentRotationRef.current}deg)`;
        }

        // Peg detection
        const normalizedRotation = ((currentRotationRef.current % 360) + 360) % 360;
        const currentPegIndex = Math.floor(normalizedRotation / segmentAngle) % segments.length;
        
        if (lastPegRef.current !== currentPegIndex && currentPegIndex >= 0) {
          const kickStrength = Math.min(pegHitForce, wheelSpeed * 2);
          pointerVelocityRef.current += kickStrength;
          
          // Play peg click - pitch based on speed
          const pitch = 0.8 + Math.min(wheelSpeed * 0.1, 0.8);
          playPegSound(pitch);
          
          lastPegRef.current = currentPegIndex;
        }

        // Bro comments when slowing down
        if (timeFraction > 0.75 && !hasPlayedSlowdown && onBroSpeak) {
          hasPlayedSlowdown = true;
          const line = HOST_LINES.slowingDown[Math.floor(Math.random() * HOST_LINES.slowingDown.length)];
          onBroSpeak(line);
        }
      } else if (!wheelHasStopped) {
        wheelHasStopped = true;
      }

      drawWheel(timestamp);

      // Pointer physics
      const displacement = pointerAngleRef.current - pointerRestAngle;
      const springForce = -pointerSpringConstant * displacement;
      const dampingForce = -pointerDamping * pointerVelocityRef.current;
      pointerVelocityRef.current += springForce + dampingForce;
      pointerAngleRef.current += pointerVelocityRef.current;
      pointerAngleRef.current = Math.max(-8, Math.min(30, pointerAngleRef.current));

      if (pointerRef.current) {
        pointerRef.current.style.transform = `translateX(-50%) rotate(${pointerAngleRef.current}deg)`;
      }

      const pointerSettled = Math.abs(pointerVelocityRef.current) < 0.01 && Math.abs(pointerAngleRef.current) < 0.1;
      
      if (progress < duration || !pointerSettled) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        pointerAngleRef.current = 0;
        pointerVelocityRef.current = 0;
        if (pointerRef.current) {
          pointerRef.current.style.transform = 'translateX(-50%) rotate(0deg)';
        }
        endSpin(winningPrize.label, forSecret);
      }
    };

    const endSpin = (prizeName: string, wasSecretSpin: boolean) => {
      setIsSpinning(false);
      setWonPrize(prizeName);
      
      onPrizeWon?.(prizeName, prizeName === 'SECRET GIFT');
      
      // Bro announces the prize like a TV host
      if (onBroSpeak) {
        const winLine = HOST_LINES.wins[prizeName as keyof typeof HOST_LINES.wins] || 
          `[SPIN_TO_WIN HOST MODE] Celebrate: "You got ${prizeName}! Nice spin {NAME}!"`;
        setTimeout(() => {
          onBroSpeak(winLine.replace('{NAME}', leadData.name));
        }, 300);
      }
      
      if (prizeName !== 'Try Again') {
        const isJackpot = prizeName === 'SECRET GIFT' || prizeName === 'VIP Access';
        triggerConfetti(isJackpot);
        animateConfetti();
        playWinSound(isJackpot);
        
        // Show trade offer for non-secret prizes
        if (!wasSecretSpin && prizeName !== 'SECRET GIFT') {
          setShowTradeOffer(true);
          // Bro offers the trade
          if (onBroSpeak) {
            setTimeout(() => {
              onBroSpeak(HOST_LINES.tradeOffer.replace('{NAME}', leadData.name));
            }, 3000);
          }
        }
      } else {
        playFailSound();
      }
      
      setShowModal(true);
    };

    lastPegRef.current = -1;
    requestAnimationFrame(animate);
  }, [isSpinning, getAudioContext, selectPrize, segments, segmentAngle, drawWheel, triggerConfetti, animateConfetti, playPegSound, playWinSound, playFailSound, onPrizeWon, onBroSpeak, leadData.name]);

  const handleTrade = useCallback(() => {
    setShowModal(false);
    setShowTradeOffer(false);
    setWonPrize(null);
    
    pointerAngleRef.current = 0;
    pointerVelocityRef.current = 0;
    
    setTimeout(() => {
      spin(true);
    }, 500);
  }, [spin]);

  const handleClaim = useCallback(() => {
    if (!wonPrize) return;

    const lead: LeadData = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: leadData.name,
      email: leadData.email,
      phone: leadData.phone,
      prize: wonPrize,
      event: eventName,
      timestamp: new Date().toISOString()
    };

    try {
      const existing = localStorage.getItem('webcore_leads');
      const leads: LeadData[] = existing ? JSON.parse(existing) : [];
      leads.push(lead);
      localStorage.setItem('webcore_leads', JSON.stringify(leads));
    } catch (e) {
      // Failed silently
    }

    onPrizeClaimed(lead);
    onClose();
  }, [wonPrize, leadData, eventName, onPrizeClaimed, onClose]);

  // Setup canvases
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const confettiCanvas = confettiCanvasRef.current;
      
      if (canvas) {
        const size = Math.min(window.innerWidth * 0.85, window.innerHeight * 0.55, 500);
        canvas.width = size;
        canvas.height = size;
        drawWheel();
      }
      
      if (confettiCanvas) {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const glitterLoop = (timestamp: number) => {
      drawWheel(timestamp);
      glitterAnimationRef.current = requestAnimationFrame(glitterLoop);
    };
    glitterAnimationRef.current = requestAnimationFrame(glitterLoop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (glitterAnimationRef.current) cancelAnimationFrame(glitterAnimationRef.current);
    };
  }, [drawWheel]);

  // Cleanup audio
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const isTryAgain = wonPrize === 'Try Again';
  const isSecretGift = wonPrize === 'SECRET GIFT';

  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a15 100%)' }}
    >
      <canvas ref={confettiCanvasRef} className="absolute inset-0 pointer-events-none z-50" />

      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all flex items-center justify-center text-2xl"
      >
        &times;
      </button>

      <h1 
        className="text-4xl md:text-6xl font-bold text-center mb-2 tracking-wider"
        style={{
          fontFamily: "'Russo One', sans-serif",
          color: '#FFD700',
          textShadow: '0 0 10px #FFD700, 0 0 20px #FFA500, 0 0 30px #FF8C00, 0 0 40px #FF6600',
          animation: 'neonFlicker 3s infinite alternate'
        }}
      >
        SPIN TO WIN
      </h1>

      <p className="text-amber-200/80 text-lg mb-4">{eventName}</p>
      
      {leadData.name && (
        <p className="text-amber-100 text-xl mb-4 font-semibold">
          Good luck, {leadData.name}!
        </p>
      )}

      <div className="relative">
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'conic-gradient(from 0deg, transparent, rgba(255,215,0,0.08) 10%, transparent 20%, transparent, rgba(255,215,0,0.08) 50%, transparent 60%, transparent, rgba(255,215,0,0.08) 90%, transparent)',
            animation: 'rotateBeams 15s linear infinite',
            borderRadius: '50%',
            transform: 'scale(1.8)'
          }}
        />

        <div 
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: isSpinning 
              ? '0 0 80px 30px rgba(255, 215, 0, 0.5), inset 0 0 60px 20px rgba(255, 215, 0, 0.2)'
              : '0 0 40px 15px rgba(255, 215, 0, 0.25), inset 0 0 30px 10px rgba(255, 215, 0, 0.1)',
            transition: 'box-shadow 0.5s ease'
          }}
        />

        <canvas ref={canvasRef} className="relative z-10" style={{ filter: 'drop-shadow(0 0 25px rgba(255, 215, 0, 0.4))' }} />

        {/* Pointer */}
        <div
          ref={pointerRef}
          className="absolute z-20"
          style={{ top: '-5px', left: '50%', transform: 'translateX(-50%)', transformOrigin: 'center top' }}
        >
          <div style={{ width: 0, height: 0, borderLeft: '22px solid transparent', borderRight: '22px solid transparent', borderTop: '50px solid #FFD700', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-48px', left: '-10px', width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: '25px solid #FFF8DC', opacity: 0.6 }} />
          </div>
        </div>

        {/* Spin button */}
        {!isSpinning && !showModal && (
          <button
            onClick={() => spin(false)}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 rounded-full font-bold text-2xl transition-all hover:scale-110 active:scale-95"
            style={{
              width: '110px', height: '110px',
              background: 'linear-gradient(145deg, #FFD700, #B8860B)',
              color: '#1a1a2e',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5), 0 0 30px rgba(255,215,0,0.4), inset 0 2px 4px rgba(255,255,255,0.3)',
              border: '4px solid #DAA520'
            }}
          >
            SPIN
          </button>
        )}
        
        {isSpinning && (
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 rounded-full font-bold text-xl flex items-center justify-center"
            style={{
              width: '110px', height: '110px',
              background: 'linear-gradient(145deg, #B8860B, #8B6914)',
              color: '#FFD700',
              boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.4)',
              border: '4px solid #8B6914',
              animation: 'pulse 0.5s infinite'
            }}
          >
            LUCK!
          </div>
        )}
      </div>

      {/* Win modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm" style={{ animation: 'fadeIn 0.3s ease' }}>
          <div 
            className="relative p-8 rounded-2xl text-center max-w-md mx-4"
            style={{
              background: 'linear-gradient(145deg, #2a2a4a, #1a1a2e)',
              boxShadow: isSecretGift ? '0 0 100px 30px rgba(148, 0, 211, 0.4)' : '0 25px 50px rgba(0,0,0,0.5), 0 0 100px rgba(255,215,0,0.2)',
              border: isSecretGift ? '3px solid #9400D3' : '3px solid #FFD700',
              animation: 'modalPop 0.4s ease'
            }}
          >
            {!isTryAgain && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-4xl" style={{ animation: 'bounce 1s infinite' }}>
                {isSecretGift ? '🎁' : '⭐'}
              </div>
            )}
            
            <h2 
              className="text-3xl font-bold mb-4"
              style={{ 
                color: isTryAgain ? '#888' : (isSecretGift ? '#DA70D6' : '#FFD700'),
                textShadow: isTryAgain ? 'none' : `0 0 20px ${isSecretGift ? 'rgba(148,0,211,0.5)' : 'rgba(255,215,0,0.5)'}`
              }}
            >
              {isTryAgain ? 'NEXT TIME!' : (isSecretGift ? 'SECRET GIFT!' : 'WINNER!')}
            </h2>
            
            <p 
              className="text-4xl font-bold mb-6"
              style={{
                color: isSecretGift ? '#DA70D6' : '#FFD700',
                textShadow: `0 0 30px ${isSecretGift ? 'rgba(148,0,211,0.8)' : 'rgba(255,215,0,0.8)'}`,
                animation: isTryAgain ? 'none' : 'prizePulse 1s infinite'
              }}
            >
              {wonPrize?.toUpperCase()}
            </p>

            {isTryAgain && (
              <p className="text-amber-200/60 mb-6">
                {isSecretSpin ? "The mystery box wasn't meant to be!" : "Come back tomorrow - luck resets!"}
              </p>
            )}

            {isSecretGift && (
              <p className="text-purple-300/80 mb-4 text-sm">
                Mystery prize! Tell Bro what's inside when you open it!
              </p>
            )}

            {/* Trade offer */}
            {showTradeOffer && !isTryAgain && !isSecretGift && (
              <div className="mb-4 p-4 rounded-lg" style={{ background: 'linear-gradient(145deg, rgba(148,0,211,0.2), rgba(75,0,130,0.2))', border: '1px solid rgba(148,0,211,0.5)' }}>
                <p className="text-purple-200 text-sm mb-3">
                  Trade for a mystery spin?<br/>
                  <span className="text-purple-300/70 text-xs">5% chance of SECRET GIFT...</span>
                </p>
                <button
                  onClick={handleTrade}
                  className="px-6 py-2 rounded-full font-bold text-sm transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(145deg, #9400D3, #4B0082)', color: '#FFF', boxShadow: '0 4px 15px rgba(148,0,211,0.4)' }}
                >
                  TRADE & SPIN AGAIN
                </button>
              </div>
            )}

            <button
              onClick={handleClaim}
              className="px-10 py-4 rounded-full font-bold text-xl transition-all hover:scale-105 active:scale-95"
              style={{
                background: isTryAgain ? 'linear-gradient(145deg, #666, #444)' : 'linear-gradient(145deg, #FFD700, #B8860B)',
                color: '#1a1a2e',
                boxShadow: isTryAgain ? '0 4px 15px rgba(0,0,0,0.3)' : '0 4px 20px rgba(255,215,0,0.5)'
              }}
            >
              {isTryAgain ? 'DONE' : 'CLAIM PRIZE'}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes neonFlicker {
          0%, 18%, 22%, 25%, 53%, 57%, 100% { text-shadow: 0 0 10px #FFD700, 0 0 20px #FFA500, 0 0 30px #FF8C00, 0 0 40px #FF6600; }
          20%, 24%, 55% { text-shadow: 0 0 5px #FFD700, 0 0 10px #FFA500; }
        }
        @keyframes rotateBeams { from { transform: scale(1.8) rotate(0deg); } to { transform: scale(1.8) rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0%, 100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.05); } }
        @keyframes prizePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @keyframes modalPop { 0% { transform: scale(0.8); opacity: 0; } 50% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes bounce { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-10px); } }
      `}</style>
    </div>
  );
}
