'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Target, Activity, Shield, Sparkles, Camera, CameraOff, Heart, Brain } from 'lucide-react';
import { EmotionTag } from '@/lib/types';
import type { EmotionalState } from '@/lib/autonomy/EmotionStateMachine';
import type { BroGoal } from '@/lib/autonomy/GoalEngine';

interface NeuralHUDProps {
  isListening: boolean;
  isTalking: boolean;
  isThinking: boolean;
  activeAgent: string;
  userName: string;
  transcription?: string;
  emotionTag?: EmotionTag | null;
  emotionalState?: EmotionalState;
  isCameraOn?: boolean;
  goals?: BroGoal[];
  isPaused?: boolean;
}

type LogType = 'success' | 'warning' | 'error' | 'info' | 'system' | 'neural' | 'data';

interface LogEntry {
  message: string;
  type: LogType;
  timestamp: string;
}

const getLogColor = (type: LogType): string => {
  const colors: Record<LogType, string> = {
    success: 'text-green-400/80',
    warning: 'text-yellow-400/80',
    error: 'text-red-400/80',
    info: 'text-cyan-400/80',
    system: 'text-purple-400/80',
    neural: 'text-pink-400/80',
    data: 'text-blue-400/80'
  };
  return colors[type];
};

export const NeuralHUD: React.FC<NeuralHUDProps> = ({ 
  isListening, 
  isTalking, 
  isThinking, 
  activeAgent, 
  userName,
  transcription,
  emotionTag,
  emotionalState,
  isCameraOn,
  goals,
  isPaused,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const logContainerRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string, type: LogType = 'system') => {
    setLogs(prev => [...prev.slice(-25), { 
      message: msg, 
      type, 
      timestamp: new Date().toLocaleTimeString() 
    }]);
  };

  // Low-latency clock: updates once per minute, cached formatters
  useEffect(() => {
    const timeFmt = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const dateFmt = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(timeFmt.format(now));
      setCurrentDate(dateFmt.format(now));
    };

    updateClock();
    const interval = setInterval(updateClock, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Real-time system state logs
  useEffect(() => {
    if (isListening) {
      addLog("MIC_STREAM_INIT: PCM_16KHZ_ACTIVE", 'success');
      addLog("SAMPLING_USER_WAVEFORM...", 'data');
    } else {
      addLog("MIC_STREAM: DISCONNECTED", 'warning');
    }
  }, [isListening]);

  useEffect(() => {
    if (isThinking) {
      addLog("NEURAL_ENGINE: OVERCLOCKED", 'neural');
      addLog(`QUERYING_${activeAgent.toUpperCase()}_MODEL...`, 'info');
      addLog("SYNTHESIZING_PROBABILITY_VECTORS...", 'neural');
    }
  }, [isThinking, activeAgent]);

  useEffect(() => {
    if (isTalking) {
      addLog("FENRIR_VOICE: TRANSMITTING", 'success');
      addLog("LATENCY_ESTIMATE: 120ms", 'info');
    } else if (!isThinking && !isListening) {
      addLog("SYSTEM_IDLE: POWER_SAVER_ON", 'system');
    }
  }, [isTalking, isThinking, isListening]);

  useEffect(() => {
    if (transcription) {
      addLog(`TEXT_STREAM_DETECTED: "${transcription.slice(0, 20)}..."`, 'data');
    }
  }, [transcription]);

  // Pause state logging
  useEffect(() => {
    if (isPaused) {
      addLog("SESSION_PAUSED: IDLE_SUSPENSION_ACTIVE", 'warning');
      addLog("VAD_LISTENER: MONITORING_FOR_VOICE", 'info');
    }
  }, [isPaused]);

  // Camera state logging
  useEffect(() => {
    if (isCameraOn) {
      addLog("CAMERA_STREAM: ACTIVE_320x240", 'success');
      addLog("VISION_MODULE: FRAME_CAPTURE_5S", 'info');
    }
  }, [isCameraOn]);

  // Emotional state logging
  useEffect(() => {
    if (emotionalState && emotionalState.moodStreak >= 3) {
      addLog(`MOOD_STREAK: ${emotionalState.dominantEmotion.toUpperCase()} x${emotionalState.moodStreak}`, 'neural');
    }
  }, [emotionalState]);

  // Ambient diagnostic cycle
  useEffect(() => {
    const events: Array<[string, LogType]> = [
      ["ENCRYPTION_KEY: ROTATED", 'success'],
      ["CORE_TEMP: 32.4C", 'info'],
      ["PACKET_LOSS: 0.00%", 'success'],
      ["OPTIMIZING_NEURAL_LOGIC...", 'neural'],
      ["SENSOR_ARRAY: CALIBRATED", 'success'],
      ["BIOMETRIC_ESTIMATE: NOMINAL", 'info'],
      ["MEMORY_PAGE_FLUSH: OK", 'system']
    ];

    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        const [msg, type] = events[Math.floor(Math.random() * events.length)];
        addLog(msg, type);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[50] pointer-events-none overflow-hidden font-mono">
      {/* Scanning Line */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(255,0,0,0.02)_50%)] bg-[size:100%_4px] animate-pulse" />
      <div className="absolute top-0 left-0 w-full h-[2px] bg-red-500/10 shadow-[0_0_15px_rgba(255,0,0,0.5)] animate-scan-line" />

      {/* Top Left: Clock - minimal */}
      <div className="absolute top-20 left-4 md:top-24 md:left-12 flex flex-col gap-1 text-left font-mono" suppressHydrationWarning>
        <span className="text-[9px] md:text-[10px] text-cyan-400/80 tabular-nums tracking-wider" suppressHydrationWarning>{currentTime}</span>
        <span className="text-[6px] md:text-[7px] text-cyan-500/40 uppercase tracking-widest" suppressHydrationWarning>{currentDate}</span>
      </div>

      {/* Bottom Left: Emotional State + Camera + Goals -- desktop only */}
      {emotionalState && (
        <div className="absolute bottom-12 left-12 hidden md:flex flex-col gap-3 font-mono">
          {/* Emotional State Readout */}
          <div className="flex flex-col gap-2 bg-black/30 backdrop-blur-sm rounded-xl p-4 border-l-2 border-pink-500/30">
            <div className="flex items-center gap-2">
              <Heart size={10} className="text-pink-400/80" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-pink-400/60">Emotional State</span>
            </div>
            
            {/* Valence bar */}
            <div className="flex items-center gap-2">
              <span className="text-[7px] text-white/30 w-12">VALENCE</span>
              <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
                <div 
                  className="absolute inset-y-0 rounded-full transition-all duration-1000"
                  style={{
                    left: emotionalState.valence >= 0 ? '50%' : `${50 + emotionalState.valence * 50}%`,
                    width: `${Math.abs(emotionalState.valence) * 50}%`,
                    backgroundColor: emotionalState.valence >= 0 ? 'rgb(74, 222, 128)' : 'rgb(248, 113, 113)',
                    boxShadow: emotionalState.valence >= 0 
                      ? '0 0 8px rgba(74, 222, 128, 0.5)' 
                      : '0 0 8px rgba(248, 113, 113, 0.5)',
                  }}
                />
              </div>
              <span className="text-[7px] text-white/40 tabular-nums w-8">{emotionalState.valence.toFixed(2)}</span>
            </div>

            {/* Arousal bar */}
            <div className="flex items-center gap-2">
              <span className="text-[7px] text-white/30 w-12">AROUSAL</span>
              <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${emotionalState.arousal * 100}%`,
                    backgroundColor: 'rgb(56, 189, 248)',
                    boxShadow: '0 0 8px rgba(56, 189, 248, 0.4)',
                  }}
                />
              </div>
              <span className="text-[7px] text-white/40 tabular-nums w-8">{emotionalState.arousal.toFixed(2)}</span>
            </div>

            {/* Mood streak */}
            {emotionalState.moodStreak >= 2 && (
              <div className="flex items-center gap-2 mt-1">
                <Brain size={9} className="text-cyan-400/60" />
                <span className="text-[8px] text-cyan-400/50 uppercase tracking-wider">
                  {emotionalState.dominantEmotion} x{emotionalState.moodStreak}
                </span>
              </div>
            )}
          </div>

          {/* Session state indicator */}
          {isPaused && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/5 rounded-lg border border-amber-500/10">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-pulse" />
              <span className="text-[8px] text-amber-400/50 font-black uppercase tracking-[0.2em]">Sleeping -- Speak to Wake</span>
            </div>
          )}

          {/* Camera indicator */}
          <div className="flex items-center gap-2 px-4">
            {isCameraOn ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)] animate-pulse" />
                <Camera size={10} className="text-green-400/60" />
                <span className="text-[8px] text-green-400/50 font-black uppercase tracking-[0.2em]">Vision Active</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                <CameraOff size={10} className="text-white/15" />
                <span className="text-[8px] text-white/15 font-black uppercase tracking-[0.2em]">Vision Off</span>
              </>
            )}
          </div>

          {/* Active goals count */}
          {goals && goals.length > 0 && (
            <div className="flex items-center gap-2 px-4">
              <Target size={10} className="text-amber-400/50" />
              <span className="text-[8px] text-amber-400/40 font-black uppercase tracking-[0.15em]">
                {goals.length} Active Goal{goals.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Top Right: User Info -- desktop only */}
      <div className="absolute top-24 right-12 hidden md:flex flex-col gap-2 text-[10px] text-red-500/60 uppercase font-black tracking-widest bg-black/20 p-4 rounded-xl border-r-2 border-red-500/30 backdrop-blur-sm">
        <div className="flex items-center gap-3 justify-end">
          <span className="text-red-500">Subject: {userName}</span>
          <Target size={12} className="text-red-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-3 justify-end">
          <span>Link: Secure_Sync</span>
          <Shield size={12} />
        </div>
        <div className="flex items-center gap-3 justify-end">
          <span>Identity: Valid</span>
          <Activity size={12} className="animate-pulse" />
        </div>
        {emotionTag && (
          <div className="flex items-center gap-3 justify-end mt-1">
            <span className="text-cyan-400">[{emotionTag.toUpperCase()}]</span>
            <Sparkles size={12} className="text-cyan-400" />
          </div>
        )}
        <div className="mt-2 pt-2 border-t border-red-500/10 text-[8px] opacity-40 text-right">
          BRO_Neural_OS_v3.0
        </div>
      </div>

      {/* Bottom Right: Logs -- desktop only */}
      <div className="absolute bottom-12 right-12 w-96 h-72 hidden md:flex flex-col gap-2">
        <div className="flex items-center gap-2 text-cyan-400/60 mb-1 border-b border-cyan-500/20 pb-2 justify-end">
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Logs</span>
          <Terminal size={12} />
        </div>
        <div ref={logContainerRef} className="flex-1 overflow-hidden flex flex-col gap-1 text-[9px] leading-tight text-right">
          {logs.map((log, i) => (
            <div key={i} className={`animate-in fade-in slide-in-from-right-4 duration-500 ${getLogColor(log.type)}`}>
              <span className="text-gray-500">&gt; [{log.timestamp}]</span> {log.message}
            </div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan-line {
          from { transform: translateY(0); }
          to { transform: translateY(100vh); }
        }
        .animate-scan-line { animation: scan-line 8s linear infinite; }
      `}} />
    </div>
  );
};
