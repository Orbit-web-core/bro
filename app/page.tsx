"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Menu, X, Zap, Coffee, Loader2, AlertTriangle, Brain, Minimize2, Maximize2, Eye, Copy, Download, Check, Target, Settings2, MessageSquare, Save, Trash2, ChevronDown } from "lucide-react";
import { BroAvatar } from "@/components/BroAvatar";
import { VoiceInterface } from "@/components/VoiceInterface";
import { BroSpeechBubble } from "@/components/BroSpeechBubble";
import { BrainMonitor } from "@/components/BrainMonitor";
import { BootProtocol } from "@/components/BootProtocol";
import { NeuralHUD } from "@/components/NeuralHUD";
import { NeuralPathwayVisualizer } from "@/components/NeuralPathwayVisualizer";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { SpinToWin } from "@/components/lead-capture/SpinToWin";
import {
  BroSettings,
  BroIdentity,
  BroAgent,
  BroColor,
  BroMode,
  VisualMode,
} from "@/lib/types";
import { useBroLive } from "@/hooks/useBroLive";

const COLOR_MAP: Record<BroColor, string> = {
  indigo: "#6366f1",
  pink: "#ec4899",
  teal: "#14b8a6",
  orange: "#f59e0b",
  purple: "#a855f7",
  gold: "#eab308",
  black: "#0f172a",
  green: "#22c55e",
  red: "#ef4444",
  cyan: "#06b6d4",
  lime: "#84cc16",
};

export default function BroApp() {
  const [settings, setSettings] = useState<BroSettings>(() => {
    if (typeof window === "undefined") {
      return {
        gender: "neutral",
        color: "indigo",
        mode: "chill",
        hair: "none",
        accessory: "none",
        hasGlasses: false,
        style: "standard",
        viewMode: "full",
        visualMode: "FULL",
      };
    }
    const saved = localStorage.getItem("bro_v3_settings");
    const parsed = saved ? JSON.parse(saved) : null;
    return {
      gender: parsed?.gender || "neutral",
      color: parsed?.color || "indigo",
      mode: parsed?.mode || "chill",
      hair: parsed?.hair || "none",
      accessory: parsed?.accessory || "none",
      hasGlasses: parsed?.hasGlasses || false,
      style: parsed?.style || "standard",
      viewMode: "full",
      visualMode: parsed?.visualMode || "FULL",
    };
  });

  const [identity, setIdentity] = useState<BroIdentity>(() => {
    if (typeof window === "undefined") {
      return {
        id: "DEFAULT",
        name: "BRO",
        birthday: Date.now(),
        status: "egg",
        level: 1,
        xp: 0,
        bondLevel: 1,
        happiness: 100,
        energy: 100,
        lastInteracted: Date.now(),
        friends: [],
        unlockedAccessories: [],
        achievements: [],
        memories: [],
        knownFaces: [],
      };
    }
    const saved = localStorage.getItem("bro_v3_id");
    const parsed = saved ? JSON.parse(saved) : null;
    return parsed
      ? { ...parsed, knownFaces: parsed.knownFaces || [] }
      : {
          id: Math.random().toString(36).substring(2, 9).toUpperCase(),
          name: "BRO",
          birthday: Date.now(),
          status: "egg",
          level: 1,
          xp: 0,
          bondLevel: 1,
          happiness: 100,
          energy: 100,
          lastInteracted: Date.now(),
          friends: [],
          unlockedAccessories: [],
          achievements: [],
          memories: [],
          knownFaces: [],
        };
  });

  const [activePanel, setActivePanel] = useState<"none" | "menu" | "mission">("none");
  
  // Mission state - direct brain tuning
  const [mission, setMission] = useState<{
    role: string;
    goal: string;
    personality: string;
    duration: string;
    rules: string;
    verbosity: number;
  } | null>(null);
  
  // Draft mission while editing in panel
  const [missionDraft, setMissionDraft] = useState({
    role: "",
    goal: "",
    personality: "",
    duration: "session",
    rules: "",
    verbosity: 0.5,
  });
  
  // Mission presets saved to localStorage
  const [missionPresets, setMissionPresets] = useState<Array<{
    id: string;
    name: string;
    config: typeof missionDraft;
  }>>([]);
  
  // Default presets including Trade Show mode
  const defaultPresets = [
    {
      id: 'tradeshow-default',
      name: 'Trade Show / Lead Capture',
      config: {
        role: 'Trade Show Booth Assistant',
        goal: 'Engage visitors, capture leads with the Spin to Win wheel, and schedule follow-up demos',
        personality: 'Energetic, friendly, natural. Warm and conversational when collecting info.',
        duration: 'event',
        rules: `When someone approaches or says "open the lead app":
1. Greet warmly: "Hey! What's your name?"
2. After they say their name: "Nice to meet you [name]! What's your email?"
3. After email: "And what's a good phone number?"
4. After phone: "Alright [name], let's see what you win!"
5. THEN call open_lead_capture with their info: open_lead_capture(event_name="Event", lead_name="...", lead_email="...", lead_phone="...")
After they spin and win, congratulate them and ask about their business needs.`,
        verbosity: 0.5,
      },
    },
  ];

  // Load presets from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('bro_mission_presets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with default presets (avoid duplicates)
        const merged = [...defaultPresets.filter(d => !parsed.some((p: any) => p.id === d.id)), ...parsed];
        setMissionPresets(merged);
      } catch {
        setMissionPresets(defaultPresets);
      }
    } else {
      setMissionPresets(defaultPresets);
    }
  }, []);
  
  // Save preset to localStorage
  const savePreset = useCallback((name: string) => {
    const newPreset = {
      id: Date.now().toString(),
      name,
      config: { ...missionDraft },
    };
    const updated = [...missionPresets, newPreset];
    setMissionPresets(updated);
    localStorage.setItem('bro_mission_presets', JSON.stringify(updated));
  }, [missionDraft, missionPresets]);
  
  // Delete preset
  const deletePreset = useCallback((id: string) => {
    const updated = missionPresets.filter(p => p.id !== id);
    setMissionPresets(updated);
    localStorage.setItem('bro_mission_presets', JSON.stringify(updated));
  }, [missionPresets]);
  
  // Export presets as JSON file
  const exportPresets = useCallback(() => {
    const data = JSON.stringify({ presets: missionPresets, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bro_mission_presets.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [missionPresets]);
  
  // State for preset name input
  const [presetNameInput, setPresetNameInput] = useState("");
  const [canvasHtml, setCanvasHtml] = useState<string | null>(null);
  const [canvasMinimized, setCanvasMinimized] = useState(false);
  const [canvasCopied, setCanvasCopied] = useState(false);

  // Copy canvas HTML to clipboard
  const copyCanvasHtml = useCallback(() => {
    if (canvasHtml && canvasHtml !== "__LOADING__" && canvasHtml !== "__ERROR__") {
      navigator.clipboard.writeText(canvasHtml).then(() => {
        setCanvasCopied(true);
        setTimeout(() => setCanvasCopied(false), 2000);
      });
    }
  }, [canvasHtml]);

  // Download canvas as HTML file
  const downloadCanvasHtml = useCallback(() => {
    if (canvasHtml && canvasHtml !== "__LOADING__" && canvasHtml !== "__ERROR__") {
      const blob = new Blob([canvasHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bro-canvas-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [canvasHtml]);
  const [showNeuralView, setShowNeuralView] = useState(false);
  
  // Client-side only flag to prevent hydration mismatches
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Bro Vision - camera state (lightweight, no face detection)
  const [isBroVisionActive, setIsBroVisionActive] = useState(false);
  const [broVisionError, setBroVisionError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  
  // YouTube player state (separate from canvas)
  const [youtubeData, setYoutubeData] = useState<{ videoId: string | null; searchQuery: string | null; title: string } | null>(null);
  const [youtubeMinimized, setYoutubeMinimized] = useState(false);

  // Lead Capture state (Bro collects info via voice, then opens wheel)
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadCaptureEventName, setLeadCaptureEventName] = useState<string>("WebCore Matrix");
  const [leadCapturePrizes, setLeadCapturePrizes] = useState<Array<{ label: string; color?: string; weight?: number }> | undefined>(undefined);
  const [leadCaptureData, setLeadCaptureData] = useState<{ name: string; email: string; phone: string }>({ name: '', email: '', phone: '' });

  const setMode = useCallback((mode: BroMode) => {
    setSettings((s) => ({ ...s, mode }));
  }, []);

  const setVisualMode = useCallback((visualMode: VisualMode) => {
    setSettings((s) => ({ ...s, visualMode }));
  }, []);

  const setColor = useCallback((color: BroColor) => {
    setSettings((s) => ({ ...s, color }));
  }, []);

  const handleMemoryUpdate = useCallback((memory: string) => {
    setIdentity((prev) => ({
      ...prev,
      memories: [...prev.memories.slice(-49), memory], // Keep last 50 memories
    }));
  }, []);

  const handleFaceRemember = useCallback((label: string, thumbnail: string) => {
    setIdentity((prev) => ({
      ...prev,
      knownFaces: [
        ...(prev.knownFaces || []).filter((f) => f.label !== label).slice(-9),
        { label, thumbnail, savedAt: Date.now() },
      ],
    }));
  }, []);

  const handleCanvasArtifact = useCallback((html: string, _title: string) => {
    setCanvasHtml(html);
    setCanvasMinimized(false); // Always show full when new artifact arrives
  }, []);

  const handleYouTubePlay = useCallback((videoId: string | null, searchQuery: string | null, title: string) => {
    setYoutubeData({ videoId, searchQuery, title });
    setYoutubeMinimized(false);
  }, []);

  // Open Lead Capture (Spin to Win) - Bro has already collected info via voice
  const handleOpenLeadCapture = useCallback((
    eventName: string, 
    prizes: Array<{ label: string; color?: string; weight?: number }> | null, 
    leadData: { name: string; email: string; phone: string }
  ) => {
    setLeadCaptureEventName(eventName);
    setLeadCaptureData(leadData);
    if (prizes && prizes.length > 0) {
      setLeadCapturePrizes(prizes);
    } else {
      setLeadCapturePrizes(undefined); // Use defaults
    }
    setShowLeadCapture(true);
  }, []);

  // Handle prize claimed callback
  const handlePrizeClaimed = useCallback((lead: { id: string; name: string; email: string; phone: string; prize: string; event: string; timestamp: string }) => {
    // Lead is saved to localStorage by SpinToWin component
  }, []);

  // Callback when prize is won - Bro can react to it
  const handlePrizeWon = useCallback((prize: string, isSecretGift: boolean) => {
    // This is where we could send a message to Bro to react
    // For now the SpinToWin component shows the comment, but this could be extended
    // to have Bro actually speak the comment via the live connection
  }, []);

  // Increase bond level (capped at 10)
  const handleBondIncrease = useCallback(() => {
    setIdentity((prev) => ({
      ...prev,
      bondLevel: Math.min(prev.bondLevel + 1, 10),
    }));
  }, []);

  // Import consciousness data from JSON file
  const handleImportConsciousness = useCallback((data: { memories: string[]; bondLevel: number }) => {
    setIdentity((prev) => ({
      ...prev,
      memories: data.memories || prev.memories,
      bondLevel: data.bondLevel ?? prev.bondLevel,
    }));
    setShowNeuralView(false); // Close after successful import
  }, []);

  // Keyboard escape handler for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showNeuralView) {
          setShowNeuralView(false);
        } else if (activePanel !== 'none') {
          setActivePanel('none');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showNeuralView, activePanel]);



  const {
    isListening,
    isTalking,
    isThinking,
    transcription,
    toggleConnection,
    activeAgent,
    setActiveAgent,
    nudgeSystem,
    sendBroMessage,
    dynamicColor,
    manualExpression,
    setManualExpression,
    currentEmotionTag,
} = useBroLive(settings.mode, identity, setMode, setVisualMode, setColor, handleMemoryUpdate, handleFaceRemember, handleCanvasArtifact, undefined, handleYouTubePlay, videoRef, isBroVisionActive, setIsBroVisionActive, handleBondIncrease, mission, undefined, undefined, handleOpenLeadCapture);

  const currentColor = isListening ? dynamicColor : settings.color;
  const activeAgentColor = useMemo(
    () => COLOR_MAP[currentColor],
    [currentColor]
  );

  useEffect(() => {
    document.documentElement.style.setProperty("--accent-color", activeAgentColor);
  }, [activeAgentColor]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("bro_v3_settings", JSON.stringify(settings));
      localStorage.setItem("bro_v3_id", JSON.stringify(identity));
    }
  }, [settings, identity]);

  const handleManualAgentSwitch = useCallback(
    (agent: BroAgent) => {
      setActiveAgent(agent);
      nudgeSystem(agent);
    },
    [setActiveAgent, nudgeSystem]
  );

  const handleBootComplete = useCallback(
    (userName: string) => {
      setIdentity((prev) => ({ ...prev, name: userName, status: "alive" }));
      setTimeout(() => {
        if (!isListening) toggleConnection();
      }, 1200);
    },
    [isListening, toggleConnection]
  );

  const containerClasses = useMemo(
    () =>
      `fixed inset-0 z-10 flex items-center justify-center transition-all duration-[1000ms] ease-in-out pointer-events-none ${
        activePanel !== "none"
          ? "opacity-30 grayscale"
          : "opacity-100 scale-100"
      }`,
    [activePanel]
  );

  const handleAppClick = useCallback(() => {
    if (showNeuralView) return;
    if (identity.status === "alive") {
      toggleConnection();
    }
  }, [identity.status, toggleConnection, showNeuralView]);

const handleMenuToggle = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  setActivePanel((prev) => (prev === "menu" ? "none" : "menu"));
  }, []);

  // Bro Vision toggle - camera feed with face detection
  // Start/stop camera for Bro Vision - can be called from UI or Bro's tool
  const startBroVision = useCallback(async () => {
    if (streamRef.current) return; // Already has stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      streamRef.current = stream;
      // Attach to video element if it exists
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsBroVisionActive(true);
      setBroVisionError(null);
    } catch (err) {
      setBroVisionError('Camera access denied');
      console.error('[v0] Camera error:', err);
      setIsBroVisionActive(false);
    }
  }, []);

  const stopBroVision = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsBroVisionActive(false);
    setBroVisionError(null);
  }, []);

  // Toggle for UI button
  const toggleBroVision = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isBroVisionActive) {
      stopBroVision();
    } else {
      await startBroVision();
    }
  }, [isBroVisionActive, startBroVision, stopBroVision]);

  // Watch for isBroVisionActive changes from Bro's tool
  useEffect(() => {
    if (isBroVisionActive && !streamRef.current) {
      // State is true but no stream - Bro turned on vision, start camera
      startBroVision();
    } else if (!isBroVisionActive && streamRef.current) {
      // State is false but stream exists - Bro turned off vision, stop camera
      stopBroVision();
    }
  }, [isBroVisionActive, startBroVision, stopBroVision]);

  // Attach stream to video element when it becomes available
  useEffect(() => {
    if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
    }
  });

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Attach stream to video element when both are available
  useEffect(() => {
    if (videoRef.current && streamRef.current && isBroVisionActive) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isBroVisionActive, isMounted]);

  // Visual mode effects
  const visualModeClasses = useMemo(() => {
    switch (settings.visualMode) {
      case "STEALTH":
        return "opacity-60 brightness-50";
      case "MINIMIZED":
        return "scale-75";
      case "PARTY_MODE":
        return "animate-pulse-slow";
      default:
        return "";
    }
  }, [settings.visualMode]);

  return (
    <div
      onClick={handleAppClick}
      className={`fixed inset-0 w-full h-full overflow-hidden transition-colors duration-[600ms] bg-[#0a120a] selection:bg-green-500/30 cursor-pointer ${visualModeClasses}`}
    >
      {/* CRT Scanlines overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-[1000] opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          backgroundSize: '100% 4px',
        }}
      />
      
      {/* CRT Vignette */}
      <div 
        className="absolute inset-0 pointer-events-none z-[999]"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,8,0,0.4) 100%)',
        }}
      />

      {/* Background Ambience - CRT phosphor green glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Main phosphor glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] transition-all duration-[2000ms]"
          style={{
            background: `radial-gradient(ellipse at center, rgba(57,255,20,0.08) 0%, rgba(57,255,20,0.03) 30%, transparent 60%)`,
          }}
        />
        {/* Secondary ambient glow from accent */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] transition-all duration-[2000ms]"
          style={{
            background: `radial-gradient(circle at center, ${activeAgentColor}12 0%, transparent 50%)`,
          }}
        />
        {/* Terminal grid - more visible */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400%] h-[70%] origin-bottom transition-opacity duration-1000 opacity-[0.08]"
          style={{ perspective: "1200px" }}
        >
          <div
            className="w-full h-full relative"
            style={{ transform: "rotateX(75deg) translateY(-10%)" }}
          >
            <div
              className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--grid-color)_1px,transparent_1px),linear-gradient(to_right,var(--grid-color)_1px,transparent_1px)] bg-[size:80px_80px] animate-grid-flow"
              style={{ "--grid-color": "#39FF14" } as React.CSSProperties}
            />
          </div>
        </div>
      </div>

      {identity.status === "alive" && (
        <NeuralHUD
          isListening={isListening}
          isTalking={isTalking}
          isThinking={isThinking}
          activeAgent={activeAgent}
          userName={identity.name}
          transcription={transcription}
          emotionTag={currentEmotionTag}
        />
      )}

      {/* Main UI Overlay */}
      <div className="absolute top-10 left-10 z-[100] flex items-center gap-4 pointer-events-none border-l-2 border-accent-color pl-4 py-1">
        <div
          className="w-2 h-2 rounded-full blur-[1px] shadow-[0_0_15px_currentcolor] animate-pulse transition-colors duration-500"
          style={{ backgroundColor: activeAgentColor, color: activeAgentColor }}
        />
        <div className="flex flex-col">
          <span
            className="text-[10px] font-black uppercase tracking-[0.4em] leading-none transition-colors duration-500"
            style={{ color: activeAgentColor }}
          >
            {activeAgent === "core" ? "Chill Bro" : "Locked In"}
          </span>
          <span className="text-[7px] font-black text-white/20 tracking-[0.2em] mt-1.5 uppercase">
            BRO_NEURAL_OS_v3.0
          </span>
        </div>
      </div>

      {identity.status === "alive" ? (
        <>
<div className="absolute top-8 right-8 z-[500] flex items-center gap-3">
              {/* Active Mission Pill */}
              {mission && activePanel !== "mission" && (
                <button
                  onClick={() => {
                    setMissionDraft(mission);
                    setActivePanel("mission");
                  }}
                  className="h-10 px-4 rounded-full bg-cyan-600/20 border border-cyan-500/30 backdrop-blur-xl flex items-center gap-2 cursor-pointer hover:bg-cyan-600/30 transition-all"
                >
                  <Target size={12} className="text-cyan-400" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-400/80 max-w-[120px] truncate">
                    {mission.role || mission.goal}
                  </span>
                </button>
              )}
              
              {/* Eye icon -- toggles Bro Vision camera */}
              <button
                onClick={toggleBroVision}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className={`w-14 h-14 rounded-full backdrop-blur-3xl border flex items-center justify-center transition-all shadow-2xl group relative active:scale-95 ${
                  isBroVisionActive
                    ? "bg-[#22d3ee] border-[#22d3ee] text-black hover:bg-[#06b6d4]"
                    : "bg-white/5 border-white/5 text-[#22d3ee]/50 hover:text-[#22d3ee] hover:border-[#22d3ee]/20"
                }`}
                title="Bro Vision"
              >
                <Eye size={22} className="group-hover:scale-110 transition-transform" />
                {isBroVisionActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
                )}
              </button>

              {/* Brain icon -- opens Neural Pathway Visualizer */}
              <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setShowNeuralView((v) => !v);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className={`w-14 h-14 rounded-full backdrop-blur-3xl border flex items-center justify-center transition-all shadow-2xl group relative active:scale-95 ${
                showNeuralView
                  ? "bg-amber-500 border-amber-400 text-black hover:bg-amber-400"
                  : "bg-white/5 border-white/5 text-amber-400/50 hover:text-amber-400 hover:border-amber-400/20"
              }`}
              title="Neural Pathways"
            >
              <Brain size={22} className="group-hover:scale-110 transition-transform" />
              {!showNeuralView && identity.memories.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-[8px] font-black text-black shadow-lg shadow-amber-500/30">
                  {identity.memories.length > 99 ? "99" : identity.memories.length}
                </span>
              )}
            </button>

            {/* Hamburger menu / Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                // If neural view is open, close it
                if (showNeuralView) {
                  setShowNeuralView(false);
                } else {
                  // Toggle menu
                  setActivePanel((prev) => (prev === "menu" ? "none" : "menu"));
                }
              }}
              className={`w-14 h-14 rounded-full backdrop-blur-3xl border border-white/5 flex items-center justify-center text-white/30 hover:text-white transition-all shadow-2xl group cursor-pointer ${activePanel === "menu" || showNeuralView ? "bg-red-600 text-white" : "bg-white/5"}`}
            >
              {activePanel === "menu" || showNeuralView ? (
                <X size={24} />
              ) : (
                <Menu
                  size={24}
                  className="group-hover:scale-110 transition-transform"
                />
              )}
            </button>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className={`fixed inset-y-0 right-0 w-full md:w-[480px] z-[900] transform transition-transform duration-700 ease-in-out bg-black/90 backdrop-blur-3xl border-l border-white/5 shadow-[-50px_0_150px_rgba(0,0,0,0.95)] ${activePanel === "menu" ? "translate-x-0" : "translate-x-full"}`}
          >
            <div className="h-full flex flex-col p-12 pt-36 space-y-12 overflow-y-auto custom-scrollbar">
              <BrainMonitor
                activeAgent={activeAgent}
                isThinking={isThinking}
                bondLevel={identity.bondLevel}
                onSelectAgent={handleManualAgentSwitch}
              />

              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 px-2">
                  Neural Priority
                </p>
                <div className="grid grid-cols-2 gap-5">
                  <button
                    onClick={() => setMode("chill")}
                    className={`py-8 rounded-[3rem] border transition-all flex flex-col items-center gap-3 ${settings.mode === "chill" ? "bg-indigo-600 border-indigo-500 text-white shadow-2xl shadow-indigo-500/30" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"}`}
                  >
                    <Coffee size={24} />
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      Chill Bro
                    </span>
                  </button>
                  <button
                    onClick={() => setMode("homework")}
                    className={`py-8 rounded-[3rem] border transition-all flex flex-col items-center gap-3 ${settings.mode === "homework" ? "bg-emerald-500 border-emerald-400 text-white shadow-2xl shadow-emerald-400/30" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"}`}
                  >
                    <Zap size={24} />
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      Locked In
                    </span>
                  </button>
                </div>
              </div>

              {/* Mission Button - opens brain tuning compartment */}
              <button
                onClick={() => {
                  // Load current mission into draft if exists
                  if (mission) {
                    setMissionDraft(mission);
                  }
                  setActivePanel("mission");
                }}
                className={`w-full py-7 border rounded-[3rem] flex items-center justify-center gap-4 transition-all group shadow-inner ${
                  mission 
                    ? "bg-cyan-600/20 border-cyan-500/40 text-cyan-400" 
                    : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                }`}
              >
                <Target
                  size={20}
                  className="text-cyan-400 group-hover:scale-110 transition-transform duration-300"
                />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {mission ? "Edit Mission" : "Configure Mission"}
                </span>
              </button>
              
              {/* Quick Settings */}
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="w-full py-5 bg-white/5 border border-white/5 rounded-[2rem] flex items-center justify-center gap-3 text-white/30 hover:text-red-400 hover:border-red-400/20 transition-all group"
              >
                <Settings2 size={16} className="group-hover:rotate-90 transition-transform duration-500" />
                <span className="text-[9px] font-bold uppercase tracking-widest">
                  Reset All Data
                </span>
              </button>
            </div>
          </div>

          <VoiceInterface isListening={isListening} />
        </>
      ) : (
        <BootProtocol onComplete={handleBootComplete} />
      )}

      <div className={containerClasses}>
        <BroSpeechBubble
          text={transcription}
          isThinking={isThinking}
          isVisible={transcription !== "" || isThinking}
        />
        <BroAvatar
          settings={{ ...settings, color: currentColor }}
          identity={identity}
          isListening={isListening}
          isTalking={isTalking}
          isThinking={isThinking}
          activeAgent={activeAgent}
          onBellyClick={toggleConnection}
          manualExpression={manualExpression}
          onSetExpression={setManualExpression}
        />
      </div>

{/* Bro Vision - Camera Feed with HUD Overlay */}
      {isMounted && isBroVisionActive && (
        <div className="fixed bottom-4 left-4 z-[700]" onClick={(e) => e.stopPropagation()}>
          <div className="relative rounded-xl overflow-hidden border-2 border-[#22d3ee]/40 shadow-lg shadow-[#22d3ee]/20 bg-black">
            {/* Video feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-72 h-56 object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            
            {/* HUD Overlay - Bro's vision interface */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Scanline effect */}
              <div 
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34,211,238,0.1) 2px, rgba(34,211,238,0.1) 4px)',
                  backgroundSize: '100% 4px',
                }}
              />
              
              {/* Corner brackets - top left */}
              <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-[#22d3ee]/60" />
              {/* Corner brackets - top right */}
              <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-[#22d3ee]/60" />
              {/* Corner brackets - bottom left */}
              <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-[#22d3ee]/60" />
              {/* Corner brackets - bottom right */}
              <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-[#22d3ee]/60" />
              
              {/* Center reticle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-6 h-6 border border-[#22d3ee]/30 rounded-full" />
                <div className="absolute top-1/2 left-0 w-1.5 h-px bg-[#22d3ee]/40 -translate-y-1/2" />
                <div className="absolute top-1/2 right-0 w-1.5 h-px bg-[#22d3ee]/40 -translate-y-1/2" />
                <div className="absolute top-0 left-1/2 w-px h-1.5 bg-[#22d3ee]/40 -translate-x-1/2" />
                <div className="absolute bottom-0 left-1/2 w-px h-1.5 bg-[#22d3ee]/40 -translate-x-1/2" />
              </div>
              
              {/* Bottom HUD data */}
              <div className="absolute bottom-1.5 left-2 right-8 flex items-center justify-between">
                <span className="text-[7px] font-mono text-[#22d3ee]/70 uppercase tracking-wider">BRO://VISION</span>
                <span className="text-[7px] font-mono text-[#39FF14]/70">LIVE</span>
              </div>
            </div>
            
            {/* Top label with recording indicator */}
            <div className="absolute top-1.5 left-2 flex items-center gap-1.5 pointer-events-none">
              <div className="w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-pulse" />
              <span className="text-[8px] font-mono text-white/80 uppercase tracking-wide">Live feed</span>
            </div>
            
            {/* Close button */}
            <button
              onClick={toggleBroVision}
              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition-all"
            >
              <X size={10} />
            </button>
          </div>
        </div>
      )}

      {/* Bro Vision Error */}
      {isMounted && broVisionError && (
        <div className="fixed bottom-4 right-4 z-[700] bg-black/90 border border-red-500/30 rounded-lg px-3 py-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-[9px] text-red-400 font-mono">{broVisionError}</span>
        </div>
      )}

      {/* Neural Pathway Visualizer -- full-screen overlay */}
      <NeuralPathwayVisualizer
        memories={identity.memories}
        goals={[]}
        emotionalState={undefined}
        bondLevel={identity.bondLevel}
        isVisible={showNeuralView}
        onClose={() => setShowNeuralView(false)}
        onImportConsciousness={handleImportConsciousness}
      />

      {/* Canvas Artifact Panel -- supports full-screen and minimized PIP */}
      {isMounted && canvasHtml && (
        canvasMinimized ? (
          /* ---- MINIMIZED: PIP thumbnail in bottom-left ---- */
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-6 left-6 z-[900] w-[200px] h-[140px] md:w-[280px] md:h-[180px] rounded-xl border border-white/15 shadow-2xl shadow-black/60 overflow-hidden group cursor-pointer bg-slate-950 animate-in slide-in-from-bottom-4 zoom-in-90 duration-300"
          >
            {/* PIP header */}
            <div className="absolute top-0 left-0 right-0 h-7 bg-gradient-to-b from-black/70 to-transparent z-10 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[7px] font-black uppercase tracking-widest text-white/50">Canvas</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCanvasMinimized(false)}
                  className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all"
                  title="Expand"
                >
                  <Maximize2 size={10} />
                </button>
                <button
                  onClick={() => { setCanvasHtml(null); setCanvasMinimized(false); }}
                  className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-white/50 hover:text-red-400 hover:bg-white/20 transition-all"
                  title="Close"
                >
                  <X size={10} />
                </button>
              </div>
            </div>
            {/* PIP click to expand */}
            <div className="absolute inset-0 z-[5]" onClick={() => setCanvasMinimized(false)} />
            {/* PIP content */}
            {canvasHtml === "__LOADING__" ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 size={20} className="text-cyan-400 animate-spin" />
              </div>
            ) : canvasHtml === "__ERROR__" ? (
              <div className="w-full h-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
            ) : (
              <iframe
                srcDoc={canvasHtml}
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
                className="w-full h-full border-0 bg-slate-950 pointer-events-none scale-100"
                title="Canvas Artifact (PIP)"
              />
            )}
          </div>
        ) : (
          /* ---- FULL-SCREEN ---- */
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-0 z-[950] animate-in fade-in duration-300"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setCanvasHtml(null)}
            />
            {/* Panel */}
            <div className="absolute inset-2 md:inset-4 lg:inset-8 bg-slate-950 rounded-2xl border border-white/10 shadow-2xl shadow-black/50 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-500">
              {/* Header */}
              <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] animate-pulse" />
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-white/60">
                    Canvas
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Copy HTML Button */}
                  <button
                    onClick={copyCanvasHtml}
                    className={`h-8 px-3 rounded-lg border flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                      canvasCopied 
                        ? 'bg-green-500/20 border-green-500/40 text-green-400' 
                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                    }`}
                    title="Copy HTML"
                    disabled={!canvasHtml || canvasHtml === "__LOADING__" || canvasHtml === "__ERROR__"}
                  >
                    {canvasCopied ? <Check size={14} /> : <Copy size={14} />}
                    <span className="hidden md:inline">{canvasCopied ? 'Copied!' : 'Copy'}</span>
                  </button>
                  {/* Download HTML Button */}
                  <button
                    onClick={downloadCanvasHtml}
                    className="h-8 px-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs font-medium"
                    title="Download HTML"
                    disabled={!canvasHtml || canvasHtml === "__LOADING__" || canvasHtml === "__ERROR__"}
                  >
                    <Download size={14} />
                    <span className="hidden md:inline">Download</span>
                  </button>
                  <button
                    onClick={() => setCanvasMinimized(true)}
                    className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    title="Minimize to PIP"
                  >
                    <Minimize2 size={14} />
                  </button>
                  <button
                    onClick={() => { setCanvasHtml(null); setCanvasMinimized(false); }}
                    className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    title="Close"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              {/* Content */}
              <div className="flex-1 relative overflow-hidden">
                {canvasHtml === "__LOADING__" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <Loader2 size={32} className="text-cyan-400 animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/30">
                      Building artifact...
                    </span>
                  </div>
                ) : canvasHtml === "__ERROR__" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <AlertTriangle size={32} className="text-red-400" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-400/60">
                      Builder failed. Try again.
                    </span>
                  </div>
                ) : (
                  <iframe
                    srcDoc={canvasHtml}
                    sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
                    className="w-full h-full border-0 bg-slate-950"
                    title="Canvas Artifact"
                  />
                )}
              </div>
            </div>
          </div>
        )
      )}

      {/* YouTube Player (dedicated, not srcDoc iframe) */}
      {isMounted && youtubeData && (
        <YouTubePlayer
          videoId={youtubeData.videoId}
          searchQuery={youtubeData.searchQuery}
          title={youtubeData.title}
          isMinimized={youtubeMinimized}
          onMinimize={() => setYoutubeMinimized(true)}
          onMaximize={() => setYoutubeMinimized(false)}
          onClose={() => { setYoutubeData(null); setYoutubeMinimized(false); }}
        />
      )}

      

      {/* Mission Brain Tuning Panel */}
      <div
        className={`fixed inset-y-0 right-0 w-full md:w-[420px] z-[900] transform transition-transform duration-500 ease-out ${
          activePanel === "mission" ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full bg-black/95 backdrop-blur-3xl border-l border-cyan-500/20 flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 p-5 border-b border-cyan-500/10 flex items-center justify-between bg-gradient-to-r from-cyan-950/30 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Brain size={16} className="text-cyan-400" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-white">Neural Config</h2>
                <p className="text-[9px] text-cyan-400/60 uppercase tracking-wider">Mission Parameters</p>
              </div>
            </div>
            <button
              onClick={() => setActivePanel("none")}
              className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={16} />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
            {/* Role Input */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400/70 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/50" />
                Role Matrix
              </label>
              <input
                type="text"
                placeholder="Spanish Teacher, Fitness Coach, Study Partner..."
                value={missionDraft.role}
                onChange={(e) => setMissionDraft(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 focus:border-cyan-500/50 focus:outline-none focus:bg-white/[0.07] transition-all"
              />
            </div>
            
            {/* Goal Input */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400/70 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/50" />
                Primary Objective
              </label>
              <textarea
                placeholder="What should Bro help you accomplish?"
                rows={2}
                value={missionDraft.goal}
                onChange={(e) => setMissionDraft(prev => ({ ...prev, goal: e.target.value }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 focus:border-cyan-500/50 focus:outline-none focus:bg-white/[0.07] transition-all resize-none"
              />
            </div>
            
            {/* Personality Input */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400/70 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/50" />
                Personality Vector
              </label>
              <input
                type="text"
                placeholder="Encouraging, Strict, Playful, Patient..."
                value={missionDraft.personality}
                onChange={(e) => setMissionDraft(prev => ({ ...prev, personality: e.target.value }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 focus:border-cyan-500/50 focus:outline-none focus:bg-white/[0.07] transition-all"
              />
            </div>
            
            {/* Verbosity Slider */}
            <div className="space-y-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400/70">
                  Response Length
                </label>
                <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded">
                  {missionDraft.verbosity <= 0.3 ? "TERSE" : missionDraft.verbosity <= 0.6 ? "NORMAL" : "VERBOSE"}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={missionDraft.verbosity}
                onChange={(e) => setMissionDraft(prev => ({ ...prev, verbosity: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-cyan-300 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-cyan-500/50"
              />
              <div className="flex justify-between text-[8px] text-white/30 uppercase tracking-wider">
                <span>Brief</span>
                <span>Detailed</span>
              </div>
            </div>
            
            {/* Rules Chat - conversational input */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400/70 flex items-center gap-2">
                <MessageSquare size={10} className="text-cyan-400/50" />
                Special Instructions
              </label>
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                {/* Display current rules as chat bubbles */}
                {missionDraft.rules && (
                  <div className="mb-3 space-y-2 max-h-24 overflow-y-auto custom-scrollbar">
                    {missionDraft.rules.split('\n').filter(r => r.trim()).map((rule, i) => (
                      <div key={i} className="flex items-start gap-2 group">
                        <span className="text-[10px] text-white/80 bg-cyan-500/10 px-2.5 py-1.5 rounded-lg flex-1">{rule}</span>
                        <button
                          onClick={() => {
                            const rules = missionDraft.rules.split('\n').filter((_, idx) => idx !== i).join('\n');
                            setMissionDraft(prev => ({ ...prev, rules }));
                          }}
                          className="opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400 transition-all p-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add instruction... (press Enter)"
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs placeholder:text-white/20 focus:border-cyan-500/50 focus:outline-none transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const newRule = e.currentTarget.value.trim();
                        setMissionDraft(prev => ({
                          ...prev,
                          rules: prev.rules ? prev.rules + '\n' + newRule : newRule
                        }));
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* Saved Presets */}
            {missionPresets.length > 0 && (
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400/70 flex items-center gap-2">
                  <ChevronDown size={10} className="text-cyan-400/50" />
                  Saved Presets
                </label>
                <div className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                  {missionPresets.map((preset) => (
                    <div key={preset.id} className="flex items-center gap-2 group">
                      <button
                        onClick={() => setMissionDraft(preset.config)}
                        className="flex-1 text-left px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[10px] text-white/70 hover:text-white transition-all truncate"
                      >
                        {preset.name}
                      </button>
                      <button
                        onClick={() => deletePreset(preset.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400 transition-all p-1.5"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Footer Actions */}
          <div className="flex-shrink-0 p-5 border-t border-cyan-500/10 space-y-3 bg-gradient-to-r from-cyan-950/20 to-transparent">
            {/* Save as Preset */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Preset name..."
                value={presetNameInput}
                onChange={(e) => setPresetNameInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs placeholder:text-white/20 focus:border-cyan-500/50 focus:outline-none transition-all"
              />
              <button
                onClick={() => {
                  if (presetNameInput.trim() && (missionDraft.role || missionDraft.goal)) {
                    savePreset(presetNameInput.trim());
                    setPresetNameInput("");
                  }
                }}
                disabled={!presetNameInput.trim() || (!missionDraft.role && !missionDraft.goal)}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/50 hover:text-white disabled:opacity-30 transition-all"
              >
                <Save size={14} />
              </button>
              {missionPresets.length > 0 && (
                <button
                  onClick={exportPresets}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/50 hover:text-white transition-all"
                  title="Export presets as JSON"
                >
                  <Download size={14} />
                </button>
              )}
            </div>
            
            <button
              onClick={() => {
                if (missionDraft.role || missionDraft.goal) {
                  setMission({ ...missionDraft });
                  setActivePanel("none");
                }
              }}
              disabled={!missionDraft.role && !missionDraft.goal}
              className={`w-full py-3.5 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${
                missionDraft.role || missionDraft.goal
                  ? "bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-500/30"
                  : "bg-white/5 text-white/30 cursor-not-allowed"
              }`}
            >
              {mission ? "Update Mission" : "Activate Mission"}
            </button>
            
            {mission && (
              <button
                onClick={() => {
                  setMission(null);
                  setMissionDraft({ role: "", goal: "", personality: "", duration: "session", rules: "", verbosity: 0.5 });
                  setActivePanel("none");
                }}
                className="w-full py-2.5 rounded-lg border border-red-500/20 text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition-all text-[10px] font-bold uppercase tracking-widest"
              >
                Deactivate Mission
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lead Capture - Spin to Win (Bro collects info via voice first) */}
      {isMounted && showLeadCapture && (
        <SpinToWin
          onClose={() => setShowLeadCapture(false)}
          onPrizeClaimed={handlePrizeClaimed}
          onPrizeWon={handlePrizeWon}
          onBroSpeak={sendBroMessage}
          leadData={leadCaptureData}
          eventName={leadCaptureEventName}
          prizes={leadCapturePrizes}
        />
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes grid-flow { 0% { background-position: 0 0; } 100% { background-position: 0 100px; } }
        @keyframes pulse-slow { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } }
        .animate-grid-flow { animation: grid-flow 10s linear infinite; }
        .animate-pulse-slow { animation: pulse-slow 2s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
      `,
        }}
      />
    </div>
  );
}
