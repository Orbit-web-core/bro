import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { X, Brain, Zap, Target, Heart, Download, Upload, Cpu, Activity, Layers, Settings, CheckCircle2 } from 'lucide-react';
import type { EmotionalState } from '@/lib/autonomy/EmotionStateMachine';
import type { BroGoal } from '@/lib/autonomy/GoalEngine';

// ============================================================================
// TYPES
// ============================================================================
interface MemoryNode {
  id: string;
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  category: MemoryCategory;
  timestamp: number;
  opacity: number;
  scale: number;
  connections: string[]; // IDs of connected nodes
  pulsePhase: number;
}

type MemoryCategory = 'personal' | 'project' | 'preference' | 'emotion' | 'goal' | 'event';

interface Connection {
  from: string;
  to: string;
  strength: number; // 0-1
  age: number; // 0-1 (0 = new, 1 = old)
}

// Consciousness data structure for import/export
export interface ConsciousnessData {
  version: string;
  exportedAt: string;
  memories: string[];
  goals: BroGoal[];
  emotionalState?: EmotionalState;
  bondLevel: number;
  metadata?: {
    totalConnections?: number;
    categories?: Record<string, number>;
  };
}

interface Props {
  memories: string[];
  goals: BroGoal[];
  emotionalState?: EmotionalState;
  bondLevel: number;
  isVisible: boolean;
  onClose: () => void;
  onImportConsciousness?: (data: ConsciousnessData) => void;
}

// ============================================================================
// HELPERS
// ============================================================================
// CRT Terminal color palette - bright, electric, alive
const CRT_GREEN = '#39FF14';
const CATEGORY_COLORS: Record<MemoryCategory, string> = {
  personal:   '#39FF14', // CRT Green
  project:    '#22d3ee', // Bright Cyan
  preference: '#fbbf24', // Bright Amber
  emotion:    '#f472b6', // Bright Pink
  goal:       '#818cf8', // Bright Indigo
  event:      '#a78bfa', // Bright Violet
};

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  personal:   'Personal',
  project:    'Project',
  preference: 'Preference',
  emotion:    'Emotional',
  goal:       'Goal',
  event:      'Event',
};

function categorize(text: string): MemoryCategory {
  const lower = text.toLowerCase();
  if (/\b(name|call me|birthday|lives in|from|age|family|mom|dad|brother|sister)\b/.test(lower)) return 'personal';
  if (/\b(working on|project|build|code|app|website|startup|job|career|deadline)\b/.test(lower)) return 'project';
  if (/\b(likes?|loves?|hates?|prefers?|favorite|style|music|food|color)\b/.test(lower)) return 'preference';
  if (/\b(feeling|happy|sad|stressed|anxious|excited|frustrated|mood|tired)\b/.test(lower)) return 'emotion';
  if (/\b(goal|want to|plan|remind|habit|should|need to|deadline)\b/.test(lower)) return 'goal';
  return 'event';
}

function getKeywords(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  let count = 0;
  a.forEach(w => { if (b.has(w)) count++; });
  return count;
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '...' : text;
}

// ============================================================================
// COMPONENT
// ============================================================================
export const NeuralPathwayVisualizer: React.FC<Props> = ({
  memories,
  goals,
  emotionalState,
  bondLevel,
  isVisible,
  onClose,
  onImportConsciousness,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const nodesRef = useRef<MemoryNode[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const prevMemoryCountRef = useRef(0);
  const [hoveredNode, setHoveredNode] = useState<MemoryNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -1000, y: -1000 });
  const dragRef = useRef<{ nodeId: string | null; offsetX: number; offsetY: number }>({ nodeId: null, offsetX: 0, offsetY: 0 });
  const dimensionsRef = useRef({ w: 0, h: 0 });
  const timeRef = useRef(0);
  
  // System metrics state
  const [fps, setFps] = useState(60);
  const [renderLatency, setRenderLatency] = useState(16);
  const fpsFramesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef(performance.now());

  // -------------------------------------------------------------------------
  // BUILD GRAPH from memories
  // -------------------------------------------------------------------------
  const buildGraph = useCallback((mems: string[], w: number, h: number) => {
    const centerX = w / 2;
    const centerY = h / 2;
    const spreadX = w * 0.35;
    const spreadY = h * 0.35;

    const nodes: MemoryNode[] = mems.map((text, i) => {
      // Spiral layout for initial positions
      const angle = (i / Math.max(mems.length, 1)) * Math.PI * 6;
      const dist = 60 + (i / Math.max(mems.length, 1)) * Math.min(spreadX, spreadY);
      const x = centerX + Math.cos(angle) * dist + (Math.random() - 0.5) * 40;
      const y = centerY + Math.sin(angle) * dist + (Math.random() - 0.5) * 40;
      const cat = categorize(text);

      return {
        id: `mem_${i}`,
        text,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 6 + Math.min(text.length / 30, 6),
        category: cat,
        timestamp: Date.now() - (mems.length - i) * 60000,
        opacity: 0.3 + (i / mems.length) * 0.7, // Newer = brighter
        scale: 1,
        connections: [],
        pulsePhase: Math.random() * Math.PI * 2,
      };
    });

    // Build connections based on keyword overlap
    const keywordSets = nodes.map(n => getKeywords(n.text));
    const connections: Connection[] = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const ov = overlap(keywordSets[i], keywordSets[j]);
        if (ov >= 1) {
          const strength = Math.min(ov / 4, 1);
          connections.push({
            from: nodes[i].id,
            to: nodes[j].id,
            strength,
            age: Math.abs(i - j) / nodes.length,
          });
          nodes[i].connections.push(nodes[j].id);
          nodes[j].connections.push(nodes[i].id);
        }
        // Same category gets a weak connection
        if (ov === 0 && nodes[i].category === nodes[j].category && Math.abs(i - j) < 8) {
          connections.push({
            from: nodes[i].id,
            to: nodes[j].id,
            strength: 0.15,
            age: 0.8,
          });
          nodes[i].connections.push(nodes[j].id);
          nodes[j].connections.push(nodes[i].id);
        }
      }
    }

    return { nodes, connections };
  }, []);

  // -------------------------------------------------------------------------
  // PHYSICS: force-directed layout
  // -------------------------------------------------------------------------
  const applyPhysics = useCallback((nodes: MemoryNode[], connections: Connection[], w: number, h: number) => {
    const CENTER_PULL = 0.0003;
    const REPULSION = 1200;
    const SPRING_K = 0.003;
    const SPRING_REST = 120;
    const DAMPING = 0.92;
    const PADDING = 40;

    // Center gravity
    const cx = w / 2;
    const cy = h / 2;

    for (const node of nodes) {
      if (dragRef.current.nodeId === node.id) continue;

      // Pull toward center
      node.vx += (cx - node.x) * CENTER_PULL;
      node.vy += (cy - node.y) * CENTER_PULL;

      // Repulsion from other nodes
      for (const other of nodes) {
        if (other.id === node.id) continue;
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;
        if (dist < 300) {
          const force = REPULSION / distSq;
          node.vx += (dx / dist) * force;
          node.vy += (dy / dist) * force;
        }
      }
    }

    // Spring forces along connections
    for (const conn of connections) {
      const a = nodes.find(n => n.id === conn.from);
      const b = nodes.find(n => n.id === conn.to);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const displacement = dist - SPRING_REST;
      const force = SPRING_K * displacement * conn.strength;

      if (dragRef.current.nodeId !== a.id) {
        a.vx += (dx / dist) * force;
        a.vy += (dy / dist) * force;
      }
      if (dragRef.current.nodeId !== b.id) {
        b.vx -= (dx / dist) * force;
        b.vy -= (dy / dist) * force;
      }
    }

    // Apply velocity & damping
    for (const node of nodes) {
      if (dragRef.current.nodeId === node.id) {
        node.vx = 0;
        node.vy = 0;
        continue;
      }
      node.vx *= DAMPING;
      node.vy *= DAMPING;
      node.x += node.vx;
      node.y += node.vy;

      // Bounds
      node.x = Math.max(PADDING, Math.min(w - PADDING, node.x));
      node.y = Math.max(PADDING, Math.min(h - PADDING, node.y));
    }
  }, []);

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  const render = useCallback((ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => {
    const nodes = nodesRef.current;
    const connections = connectionsRef.current;
    const dpr = window.devicePixelRatio || 1;

    // Clear with CRT dark green
    ctx.clearRect(0, 0, w * dpr, h * dpr);
    ctx.save();
    ctx.scale(dpr, dpr);

// Background - dark CRT terminal
      ctx.fillStyle = '#0a120a';
      ctx.fillRect(0, 0, w, h);
      
      // CRT phosphor glow at center
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
      grad.addColorStop(0, 'rgba(57, 255, 20, 0.08)');
      grad.addColorStop(0.4, 'rgba(57, 255, 20, 0.03)');
      grad.addColorStop(1, 'rgba(10, 18, 10, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    
    // Scanlines effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 2);
    }

    // CONNECTIONS
    for (const conn of connections) {
      const a = nodes.find(n => n.id === conn.from);
      const b = nodes.find(n => n.id === conn.to);
      if (!a || !b) continue;

      const alpha = Math.max(0.12, conn.strength * 0.7 * (1 - conn.age * 0.3));
      const pulse = Math.sin(t * 0.001 + conn.strength * 5) * 0.1 + 0.9;
      const isHighlighted = selectedNode && (selectedNode.id === a.id || selectedNode.id === b.id);
      const isHoveredConn = hoveredNode && (hoveredNode.id === a.id || hoveredNode.id === b.id);

      ctx.beginPath();
      // Curved connections for visual interest
      const midX = (a.x + b.x) / 2 + (a.y - b.y) * 0.1;
      const midY = (a.y + b.y) / 2 + (b.x - a.x) * 0.1;
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(midX, midY, b.x, b.y);

if (isHighlighted || isHoveredConn) {
        // Highlighted: visible white-cyan
        ctx.strokeStyle = `rgba(200, 220, 240, ${Math.min(alpha * 2 * pulse, 0.6)})`;
        ctx.lineWidth = 1 + conn.strength * 1.5;
      } else {
        // Normal: very subtle thin lines like in the reference
        ctx.strokeStyle = `rgba(150, 180, 200, ${Math.min(alpha * pulse, 0.2)})`;
        ctx.lineWidth = 0.5 + conn.strength * 0.5;
      }
      ctx.stroke();

      // Traveling particle on connections - soft glowing dot
      if (conn.strength > 0.25) {
        const particleT = ((t * 0.0003 * (0.5 + conn.strength)) % 1);
        const pt = particleT;
        const px = a.x * (1 - pt) * (1 - pt) + midX * 2 * pt * (1 - pt) + b.x * pt * pt;
        const py = a.y * (1 - pt) * (1 - pt) + midY * 2 * pt * (1 - pt) + b.y * pt * pt;

        // Soft glow around traveling particle
        const travelGlow = ctx.createRadialGradient(px, py, 0, px, py, 8);
        travelGlow.addColorStop(0, `rgba(34, 211, 238, ${0.5 * pulse})`);
        travelGlow.addColorStop(1, 'rgba(34, 211, 238, 0)');
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fillStyle = travelGlow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * pulse})`;
        ctx.fill();
      }
    }

    // NODES
    for (const node of nodes) {
      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedNode?.id === node.id;
      const isConnectedToSelected = selectedNode?.connections.includes(node.id);
      const pulse = Math.sin(t * 0.002 + node.pulsePhase) * 0.15 + 0.85;
      const color = CATEGORY_COLORS[node.category];

      let drawRadius = node.radius;
      let drawOpacity = node.opacity;

      if (isSelected) {
        drawRadius *= 1.6;
        drawOpacity = 1;
      } else if (isConnectedToSelected) {
        drawRadius *= 1.2;
        drawOpacity = Math.max(drawOpacity, 0.8);
      } else if (isHovered) {
        drawRadius *= 1.3;
        drawOpacity = 1;
      } else if (selectedNode) {
        // Dim non-connected nodes when something is selected
        drawOpacity *= 0.25;
      }

      // Floating drift animation (gentle movement like particles in space)
      const driftX = Math.sin(t * 0.0008 + node.pulsePhase * 2) * 2;
      const driftY = Math.cos(t * 0.0006 + node.pulsePhase * 3) * 1.5;
      const nodeX = node.x + driftX;
      const nodeY = node.y + driftY;

      // Soft outer glow - diffused like particles in the reference
      const glowR = drawRadius * 4;
      const glowGrad = ctx.createRadialGradient(nodeX, nodeY, 0, nodeX, nodeY, glowR);
      glowGrad.addColorStop(0, color + Math.round(drawOpacity * pulse * 50).toString(16).padStart(2, '0'));
      glowGrad.addColorStop(0.3, color + Math.round(drawOpacity * pulse * 25).toString(16).padStart(2, '0'));
      glowGrad.addColorStop(0.6, color + Math.round(drawOpacity * pulse * 10).toString(16).padStart(2, '0'));
      glowGrad.addColorStop(1, color + '00');
      ctx.beginPath();
      ctx.arc(nodeX, nodeY, glowR, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // Node body - solid with soft edge
      ctx.beginPath();
      ctx.arc(nodeX, nodeY, drawRadius, 0, Math.PI * 2);
      ctx.fillStyle = color + Math.round(drawOpacity * pulse * 255).toString(16).padStart(2, '0');
      ctx.shadowColor = color;
      ctx.shadowBlur = drawRadius * 2;
      ctx.fill();
      ctx.shadowBlur = 0;

      // White inner highlight - subtle specular
      ctx.beginPath();
      ctx.arc(nodeX - drawRadius * 0.2, nodeY - drawRadius * 0.2, drawRadius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${drawOpacity * 0.45})`;
      ctx.fill();

      // Text label for hovered/selected/new nodes
      if (isHovered || isSelected) {
        const label = truncate(node.text, 50);
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        const textWidth = ctx.measureText(label).width;
        const padX = 10;
        const padY = 6;
        const bgX = nodeX - textWidth / 2 - padX;
        const bgY = nodeY - drawRadius - 28;

        // Background pill - dark with CRT border
        ctx.beginPath();
        const pillRadius = 8;
        ctx.roundRect(bgX, bgY, textWidth + padX * 2, 22, pillRadius);
        ctx.fillStyle = 'rgba(10, 18, 10, 0.95)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(57, 255, 20, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Category dot
        ctx.beginPath();
        ctx.arc(bgX + 12, bgY + 11, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Text - bright CRT green
        ctx.fillStyle = '#39FF14';
        ctx.fillText(label, nodeX + 6, nodeY - drawRadius - 10);
      }
    }

    // NEW MEMORY ANIMATION: expanding CRT ring on newest node
    const newest = nodes[nodes.length - 1];
    if (newest && t < 3000) {
      const progress = Math.min(t / 2000, 1);
      const ringRadius = newest.radius + progress * 60;
      const ringAlpha = (1 - progress) * 0.6;
      ctx.beginPath();
      ctx.arc(newest.x, newest.y, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(57, 255, 20, ${ringAlpha})`;
      ctx.lineWidth = 2 * (1 - progress);
      ctx.stroke();
    }

    ctx.restore();
  }, [hoveredNode, selectedNode]);

  // -------------------------------------------------------------------------
  // INIT & ANIMATION LOOP
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Clean up animation frame when component becomes invisible
    if (!isVisible) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
      return;
    }
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      dimensionsRef.current = { w, h };
    };
    resize();
    window.addEventListener('resize', resize);

    const { w, h } = dimensionsRef.current;

    // Build or rebuild graph when memories change
    if (memories.length !== prevMemoryCountRef.current || nodesRef.current.length === 0) {
      const { nodes, connections } = buildGraph(memories, w, h);

      // If we have existing positions, preserve them for nodes that still exist
      if (nodesRef.current.length > 0 && nodesRef.current.length < nodes.length) {
        for (let i = 0; i < nodesRef.current.length; i++) {
          if (nodes[i]) {
            nodes[i].x = nodesRef.current[i].x;
            nodes[i].y = nodesRef.current[i].y;
            nodes[i].vx = nodesRef.current[i].vx;
            nodes[i].vy = nodesRef.current[i].vy;
          }
        }
      }

      nodesRef.current = nodes;
      connectionsRef.current = connections;
      prevMemoryCountRef.current = memories.length;
      timeRef.current = 0; // Reset for new-memory animation
    }

    let startTime = performance.now();
    const loop = (now: number) => {
      const t = now - startTime;
      timeRef.current = t;
      const { w: cw, h: ch } = dimensionsRef.current;
      
      // Track FPS
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;
      fpsFramesRef.current.push(delta);
      if (fpsFramesRef.current.length > 30) fpsFramesRef.current.shift();
      
      // Update FPS display every 500ms
      if (Math.floor(t / 500) !== Math.floor((t - delta) / 500)) {
        const avgDelta = fpsFramesRef.current.reduce((a, b) => a + b, 0) / fpsFramesRef.current.length;
        setFps(Math.round(1000 / avgDelta));
        setRenderLatency(Math.round(avgDelta));
      }

      applyPhysics(nodesRef.current, connectionsRef.current, cw, ch);
      render(ctx, t, cw, ch);

      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isVisible, memories, buildGraph, applyPhysics, render]);

  // -------------------------------------------------------------------------
  // MOUSE INTERACTION
  // -------------------------------------------------------------------------
  const findNodeAt = useCallback((x: number, y: number): MemoryNode | null => {
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const n = nodesRef.current[i];
      const dx = x - n.x;
      const dy = y - n.y;
      if (dx * dx + dy * dy < (n.radius + 8) * (n.radius + 8)) return n;
    }
    return null;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mouseRef.current = { x, y };

    if (dragRef.current.nodeId) {
      const node = nodesRef.current.find(n => n.id === dragRef.current.nodeId);
      if (node) {
        node.x = x - dragRef.current.offsetX;
        node.y = y - dragRef.current.offsetY;
      }
      return;
    }

    const found = findNodeAt(x, y);
    setHoveredNode(found);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = found ? 'pointer' : 'default';
    }
  }, [findNodeAt]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const found = findNodeAt(x, y);

    if (found) {
      dragRef.current = { nodeId: found.id, offsetX: x - found.x, offsetY: y - found.y };
      setSelectedNode(prev => prev?.id === found.id ? null : found);
    } else {
      setSelectedNode(null);
    }
  }, [findNodeAt]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = { nodeId: null, offsetX: 0, offsetY: 0 };
  }, []);

  // Touch support
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !touch) return;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (dragRef.current.nodeId) {
      const node = nodesRef.current.find(n => n.id === dragRef.current.nodeId);
      if (node) {
        node.x = x - dragRef.current.offsetX;
        node.y = y - dragRef.current.offsetY;
      }
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !touch) return;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const found = findNodeAt(x, y);
    if (found) {
      dragRef.current = { nodeId: found.id, offsetX: x - found.x, offsetY: y - found.y };
      setSelectedNode(prev => prev?.id === found.id ? null : found);
    } else {
      setSelectedNode(null);
    }
  }, [findNodeAt]);

  const handleTouchEnd = useCallback(() => {
    dragRef.current = { nodeId: null, offsetX: 0, offsetY: 0 };
  }, []);

  // -------------------------------------------------------------------------
  // STATS
  // -------------------------------------------------------------------------
  const stats = useMemo(() => {
    const catCounts: Record<string, number> = {};
    memories.forEach(m => {
      const cat = categorize(m);
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    return {
      totalMemories: memories.length,
      totalConnections: connectionsRef.current.length,
      categories: catCounts,
    };
  }, [memories]);

  // -------------------------------------------------------------------------
  // MEMORY CLUSTERS (simulated neural subsystems)
  // -------------------------------------------------------------------------
  const memoryClusters = useMemo(() => {
    const emotionCount = (stats.categories['emotion'] || 0);
    const personalCount = (stats.categories['personal'] || 0);
    const eventCount = (stats.categories['event'] || 0);
    const projectCount = (stats.categories['project'] || 0);
    const totalMem = stats.totalMemories || 1;
    
    return [
      {
        name: 'Emotional Processing',
        id: '0xAF32',
        status: emotionCount > 0 ? 'Active' : 'Idle',
        activity: Math.min(95, Math.round((emotionCount / totalMem) * 100 + (emotionalState?.arousal || 0) * 50)),
        color: '#C4889C',
      },
      {
        name: 'Long-Term Recall',
        id: '0xBE91',
        status: personalCount > 2 ? 'Active' : personalCount > 0 ? 'Latent' : 'Idle',
        activity: Math.min(95, Math.round((personalCount / totalMem) * 100 + 20)),
        color: '#8BAED4',
      },
      {
        name: 'Sensory Input Hub',
        id: '0xCA7C',
        status: 'Active',
        activity: Math.min(95, 60 + Math.round((eventCount / totalMem) * 40)),
        color: '#7CB5A0',
      },
      {
        name: 'Motor Control Network',
        id: '0xD8B1',
        status: projectCount > 0 ? 'Active' : 'Idle',
        activity: Math.min(95, Math.round((projectCount / totalMem) * 100 + 15)),
        color: '#D4A574',
      },
    ];
  }, [stats, emotionalState]);

  // -------------------------------------------------------------------------
  // DOWNLOAD CONSCIOUSNESS
  // -------------------------------------------------------------------------
  const handleDownloadConsciousness = useCallback(() => {
    const consciousnessData: ConsciousnessData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      memories,
      goals,
      emotionalState,
      bondLevel,
      metadata: {
        totalConnections: connectionsRef.current.length,
        categories: stats.categories,
      },
    };

    const jsonString = JSON.stringify(consciousnessData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `consciousness-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [memories, goals, emotionalState, bondLevel, stats.categories]);

  // -------------------------------------------------------------------------
  // UPLOAD CONSCIOUSNESS
  // -------------------------------------------------------------------------
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("[v0] handleFileChange triggered, file:", file?.name);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string) as ConsciousnessData;
        
        // Validate the data structure
        if (!jsonData.memories || !Array.isArray(jsonData.memories)) {
          alert('Invalid consciousness file: missing memories array');
          return;
        }
        if (!jsonData.version) {
          alert('Invalid consciousness file: missing version');
          return;
        }

        if (onImportConsciousness) {
          onImportConsciousness(jsonData);
        } else {
          alert('Upload handler not connected. Please try again.');
        }
      } catch {
        alert('Failed to parse consciousness file. Please ensure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);
    
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [onImportConsciousness]);

  // Mounted state for hydration safety
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isVisible || !isMounted) return null;

  return (
    <div className="fixed inset-0 z-[900] flex flex-col bg-[#0a120a]" style={{ isolation: 'isolate' }} onClick={(e) => e.stopPropagation()}>
      {/* Full-screen canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Top bar - CRT terminal style */}
      <div className="relative z-10 flex items-center justify-between px-5 md:px-8 py-4 md:py-5 border-b border-[#39FF14]/20">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/30 flex items-center justify-center">
            <Brain size={16} className="text-[#39FF14]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-[#39FF14]">Neural Pathway Visualizer</span>
            <span className="text-[8px] md:text-[9px] font-medium text-[#39FF14]/60 tracking-wider">{stats.totalMemories} memories / {stats.totalConnections} connections</span>
          </div>
        </div>
        
        {/* Version badge -- desktop */}
        <div className="hidden md:flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
          <span className="text-[10px] text-[#39FF14]/70 font-mono">Consciousness Engine v2.1</span>
          <div className="w-8 h-8 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center">
            <Settings size={14} className="text-[#39FF14]/70" />
          </div>
        </div>

        {/* Mobile consciousness transfer buttons */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={handleDownloadConsciousness}
            className="w-9 h-9 rounded-full bg-[#22d3ee]/20 hover:bg-[#22d3ee]/30 border border-[#22d3ee]/30 flex items-center justify-center transition-colors"
            title="Download Consciousness"
          >
            <Download size={14} className="text-[#22d3ee]" />
          </button>
          <button
            onClick={handleUploadClick}
            className="w-9 h-9 rounded-full bg-[#818cf8]/20 hover:bg-[#818cf8]/30 border border-[#818cf8]/30 flex items-center justify-center transition-colors"
            title="Upload Consciousness"
          >
            <Upload size={14} className="text-[#818cf8]" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Cancel animation before closing to prevent freezing
            if (animFrameRef.current) {
              cancelAnimationFrame(animFrameRef.current);
            }
            onClose();
          }}
          className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#39FF14]/10 hover:bg-[#39FF14]/20 border border-[#39FF14]/20 flex items-center justify-center transition-colors group cursor-pointer"
        >
          <X size={18} className="text-[#39FF14]/70 group-hover:text-[#39FF14] transition-colors" />
        </button>
      </div>

      {/* LEFT SIDEBAR: Memory Clusters -- CRT terminal style */}
      <div className="absolute top-24 left-6 z-10 hidden lg:flex flex-col gap-3 w-56">
        {/* Memory Clusters Header */}
        <div className="flex items-center gap-2 px-1">
          <Cpu size={14} className="text-[#39FF14]" />
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#39FF14]">Memory Clusters</span>
        </div>
        
        {/* Cluster Cards */}
        {memoryClusters.map((cluster) => (
          <div key={cluster.id} className="bg-[#0a1a0a]/90 backdrop-blur-md rounded-xl p-3 border border-[#39FF14]/20">
            <div className="flex items-start justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#39FF14] leading-tight">{cluster.name}</span>
              <span className="text-[8px] font-mono text-[#39FF14]/50">ID: {cluster.id}</span>
            </div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[9px] text-[#39FF14]/60">Status:</span>
              <span className={`text-[9px] font-medium ${
                cluster.status === 'Active' ? 'text-[#39FF14]' : 
                cluster.status === 'Latent' ? 'text-[#fbbf24]' : 'text-[#39FF14]/40'
              }`}>{cluster.status}</span>
            </div>
            <div className="w-full h-1.5 bg-[#39FF14]/10 rounded-full overflow-hidden mb-1">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${cluster.activity}%`, backgroundColor: cluster.color }}
              />
            </div>
            <span className="text-[8px] text-[#39FF14]/50">Activity: {cluster.activity}%</span>
          </div>
        ))}
        
        {/* Consciousness Transfer -- CRT style */}
        <div className="bg-[#0a1a0a]/90 backdrop-blur-md rounded-xl p-4 border border-[#39FF14]/20">
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#39FF14]/70 block mb-3">Consciousness Transfer</span>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleDownloadConsciousness}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20 border border-[#22d3ee]/20 transition-colors group"
            >
              <Download size={12} className="text-[#22d3ee]" />
              <span className="text-[10px] font-medium text-[#22d3ee]/80 group-hover:text-[#22d3ee]">Download Consciousness</span>
            </button>
            <button
              onClick={handleUploadClick}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-[#818cf8]/10 hover:bg-[#818cf8]/20 border border-[#818cf8]/20 transition-colors group"
            >
              <Upload size={12} className="text-[#818cf8]" />
              <span className="text-[10px] font-medium text-[#818cf8]/80 group-hover:text-[#818cf8]">Upload Consciousness</span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR: System Metrics -- CRT terminal style */}
      <div className="absolute top-24 right-6 z-10 hidden lg:flex flex-col gap-3 w-56">
        {/* System Metrics Header */}
        <div className="flex items-center gap-2 px-1">
          <Activity size={14} className="text-[#f472b6]" />
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#f472b6]">System Metrics</span>
        </div>
        
        {/* Canvas Status */}
        <div className="bg-[#0a1a0a]/90 backdrop-blur-md rounded-xl p-3 border border-[#39FF14]/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#39FF14]">Canvas Status</span>
            <CheckCircle2 size={14} className="text-[#39FF14]" />
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[9px] text-[#39FF14]/60">Renderer:</span>
            <span className="text-[9px] font-medium text-[#39FF14]">Operational</span>
          </div>
          <span className="text-[9px] text-[#39FF14]/50">Driver: Canvas 2D (GPU Accelerated)</span>
        </div>
        
        {/* Active Memories */}
        <div className="bg-[#0a1a0a]/90 backdrop-blur-md rounded-xl p-3 border border-[#39FF14]/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#39FF14]">Active Memories</span>
            <Layers size={14} className="text-[#fbbf24]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-[#39FF14]">{stats.totalMemories.toLocaleString()}</span>
            <span className="text-[10px] text-[#39FF14]/60">nodes</span>
          </div>
          <span className="text-[9px] text-[#39FF14]/50">Connections: ~{stats.totalConnections.toLocaleString()}</span>
        </div>
        
        {/* Render FPS */}
        <div className="bg-[#0a1a0a]/90 backdrop-blur-md rounded-xl p-3 border border-[#39FF14]/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#39FF14]">Render FPS</span>
            <Activity size={14} className="text-[#22d3ee]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-[#39FF14]">{fps}</span>
            <span className="text-[10px] text-[#39FF14]/60">FPS {fps >= 55 ? '(Stable)' : fps >= 30 ? '(Good)' : '(Low)'}</span>
          </div>
          <span className="text-[9px] text-[#39FF14]/50">Avg. Latency: {renderLatency}ms</span>
        </div>
        
        {/* Bond Level */}
        <div className="bg-[#0a1a0a]/90 backdrop-blur-md rounded-xl p-3 border border-[#39FF14]/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#39FF14]">Bond Level</span>
            <Heart size={14} className="text-[#f472b6]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-[#f472b6]">{bondLevel}</span>
            <span className="text-[10px] text-[#39FF14]/60">/ 10</span>
          </div>
          <div className="w-full h-1.5 bg-[#39FF14]/10 rounded-full overflow-hidden mt-1">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${bondLevel * 10}%`, backgroundColor: '#f472b6' }}
            />
          </div>
        </div>
        
        {/* Goals Count */}
        <div className="bg-[#0a1a0a]/90 backdrop-blur-md rounded-xl p-3 border border-[#39FF14]/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#39FF14]">Active Goals</span>
            <Target size={14} className="text-[#818cf8]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-[#818cf8]">{goals.length}</span>
            <span className="text-[10px] text-[#39FF14]/60">goals</span>
          </div>
          <span className="text-[9px] text-[#39FF14]/50">{goals.filter(g => g.status === 'active').length} active, {goals.filter(g => g.status === 'completed').length} completed</span>
        </div>
      </div>

      {/* MIDDLE SIDEBAR: Stats -- tablet/smaller desktop -- CRT style */}
      <div className="absolute top-24 left-6 z-10 hidden md:flex lg:hidden flex-col gap-4 w-48">
        {/* Category legend */}
        <div className="bg-[#0a1a0a]/90 backdrop-blur-md rounded-xl p-4 border border-[#39FF14]/20">
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#39FF14]/70 block mb-3">Categories</span>
          <div className="flex flex-col gap-2">
            {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
              <div key={cat} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-[#39FF14] font-medium">{CATEGORY_LABELS[cat as MemoryCategory]}</span>
                <span className="text-[9px] text-[#39FF14]/60 ml-auto tabular-nums">{stats.categories[cat] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bond level */}
        <div className="bg-[#0a1a0a]/90 backdrop-blur-md rounded-xl p-4 border border-[#39FF14]/20">
          <div className="flex items-center gap-2 mb-2">
            <Heart size={10} className="text-[#f472b6]" />
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#39FF14]/70">Bond Level</span>
          </div>
          <div className="w-full h-1.5 bg-[#39FF14]/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${bondLevel * 10}%`, backgroundColor: '#f472b6' }}
            />
          </div>
          <span className="text-[9px] text-[#39FF14]/60 mt-1 block">{bondLevel}/10</span>
        </div>

        {/* Emotional state */}
        {emotionalState && (
          <div className="bg-[#0a1a0a]/90 backdrop-blur-md rounded-xl p-4 border border-[#39FF14]/20">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={10} className="text-[#fbbf24]" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#39FF14]/70">Emotional State</span>
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[8px] text-[#39FF14]/60 w-10">Val</span>
              <div className="flex-1 h-1 bg-[#39FF14]/10 rounded-full overflow-hidden relative">
                <div className="absolute inset-y-0 left-1/2 w-px bg-[#39FF14]/30" />
                <div
                  className="absolute inset-y-0 rounded-full transition-all duration-500"
                  style={{
                    left: emotionalState.valence >= 0 ? '50%' : `${50 + emotionalState.valence * 50}%`,
                    width: `${Math.abs(emotionalState.valence) * 50}%`,
                    backgroundColor: emotionalState.valence >= 0 ? '#39FF14' : '#f472b6',
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-[#39FF14]/60 w-10">Aro</span>
              <div className="flex-1 h-1 bg-[#39FF14]/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${emotionalState.arousal * 100}%`, backgroundColor: '#22d3ee' }}
                />
              </div>
            </div>
            <span className="text-[8px] text-[#39FF14]/60 mt-1.5 block capitalize">{emotionalState.dominantEmotion}</span>
          </div>
        )}

        {/* Active goals */}
        {goals.length > 0 && (
          <div className="bg-[#0a1a0a]/90 backdrop-blur-md rounded-xl p-4 border border-[#39FF14]/20">
            <div className="flex items-center gap-2 mb-2">
              <Target size={10} className="text-[#818cf8]" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#39FF14]/70">Active Goals</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {goals.slice(0, 5).map(g => (
                <span key={g.id} className="text-[9px] text-[#39FF14] leading-snug truncate">{g.text}</span>
              ))}
              {goals.length > 5 && (
                <span className="text-[8px] text-[#39FF14]/50">+{goals.length - 5} more</span>
              )}
            </div>
          </div>
        )}

        {/* Consciousness Transfer */}
        <div className="bg-[#0a1a0a]/90 backdrop-blur-md rounded-xl p-4 border border-[#39FF14]/20">
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#39FF14]/70 block mb-3">Consciousness Transfer</span>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleDownloadConsciousness}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20 border border-[#22d3ee]/20 transition-colors group"
            >
              <Download size={12} className="text-[#22d3ee]" />
              <span className="text-[10px] font-medium text-[#22d3ee]/80 group-hover:text-[#22d3ee]">Download Consciousness</span>
            </button>
            <button
              onClick={handleUploadClick}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-[#818cf8]/10 hover:bg-[#818cf8]/20 border border-[#818cf8]/20 transition-colors group"
            >
              <Upload size={12} className="text-[#818cf8]" />
              <span className="text-[10px] font-medium text-[#818cf8]/80 group-hover:text-[#818cf8]">Upload Consciousness</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selected node detail -- bottom panel */}
      {selectedNode && (
        <div className="absolute bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-lg z-10">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 md:p-5 border border-[#E8E4E0] shadow-xl shadow-black/5">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[selectedNode.category] }} />
              <div className="flex-1 min-w-0">
                <span className="text-[8px] font-black uppercase tracking-[0.15em] text-[#A09890]">{CATEGORY_LABELS[selectedNode.category]} Memory</span>
                <p className="text-[13px] text-[#3A3632] mt-1 leading-relaxed">{selectedNode.text}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-[8px] text-[#A09890]">{selectedNode.connections.length} connection{selectedNode.connections.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

{/* Hint text */}
      {!selectedNode && memories.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <span className="text-[9px] text-[#39FF14]/60 font-medium tracking-wider">Click a node to explore / Drag to rearrange</span>
        </div>
      )}

{/* Empty state */}
      {memories.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <Brain size={48} className="text-[#39FF14]/30 mx-auto mb-4" />
            <span className="text-sm text-[#39FF14]/70 font-medium block">No memories yet</span>
            <span className="text-[10px] text-[#39FF14]/40 mt-1 block">Talk to BRO to create neural pathways</span>
          </div>
        </div>
      )}
    </div>
  );
};
