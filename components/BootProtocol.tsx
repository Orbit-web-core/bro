'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Fingerprint, Zap, ShieldCheck, Activity, Terminal } from 'lucide-react';
import { BroAvatar } from './BroAvatar';
import { BroColor, BroIdentity, BroSettings } from '@/lib/types';
import { ExpressionType } from '@/lib/mcp/ExpressionEngine';

interface BootProtocolProps {
  onComplete: (name: string) => void;
}

type BootStage = 'INITIAL' | 'CORE_LOAD' | 'OPTIC_STRESS_TEST' | 'NEURAL_STRESS_TEST' | 'NAMING' | 'PIN_AUTH' | 'FINALIZING';

const CORRECT_PIN = '9900';

const COLORS: BroColor[] = ['indigo', 'pink', 'teal', 'orange', 'purple', 'gold', 'green', 'red', 'cyan', 'lime'];
const EXPRESSIONS: ExpressionType[] = ['happy', 'hearts', 'curious', 'excited', 'surprised', 'thinking', 'mischievous', 'sleepy', 'wink', 'glitch', 'focused', 'whistle'];

const DIAGNOSTIC_LOGS = [
  "INITIALIZING NEURAL_OS v2.5...",
  "PARTITIONING LOGIC CORES...",
  "ESTABLISHING FENRIR VOICE SYNTHESIS...",
  "CALIBRATING HAPTIC FEEDBACK...",
  "SYNCING OPTIC MATRIX...",
  "STRESS TESTING COLOR CHANNELS...",
  "MAPPING EMOTIONAL RESPONSES...",
  "DECRYPTING USER DATA STRATA...",
  "ENCRYPTING NEURAL LINK...",
  "STATUS: OPTIMAL."
];

export const BootProtocol: React.FC<BootProtocolProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<BootStage>('INITIAL');
  const [userName, setUserName] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [testColor, setTestColor] = useState<BroColor>('indigo');
  const [testExpression, setTestExpression] = useState<ExpressionType | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const handleFinish = () => {
    handleNameSubmit();
  };

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const startBoot = () => {
    setStage('CORE_LOAD');
    addLog("CORE_LOAD SEQUENCE INITIATED");
    
    setTimeout(() => {
      setStage('OPTIC_STRESS_TEST');
      addLog("OPTIC_STRESS_TEST: CYCLING LUMINANCE CHANNELS...");
    }, 1500);
  };

  // Color Cycling Test
  useEffect(() => {
    if (stage === 'OPTIC_STRESS_TEST') {
      let i = 0;
      const interval = setInterval(() => {
        setTestColor(COLORS[i % COLORS.length]);
        i++;
        if (i >= COLORS.length * 2) {
          clearInterval(interval);
          setStage('NEURAL_STRESS_TEST');
          addLog("NEURAL_STRESS_TEST: MAPPING EXPRESSION ENGINE...");
        }
      }, 120);
      return () => clearInterval(interval);
    }
  }, [stage]);

  // Expression Cycling Test
  useEffect(() => {
    if (stage === 'NEURAL_STRESS_TEST') {
      let i = 0;
      const interval = setInterval(() => {
        setTestExpression(EXPRESSIONS[i % EXPRESSIONS.length]);
        i++;
        if (i >= EXPRESSIONS.length) {
          clearInterval(interval);
          setStage('NAMING');
          addLog("CAPABILITY TEST: COMPLETE.");
          addLog("AWAITING IDENTITY_TAG...");
        }
      }, 150);
      return () => clearInterval(interval);
    }
  }, [stage]);

  const handleNameSubmit = () => {
    if (!userName.trim()) return;
    setStage('PIN_AUTH');
    addLog(`IDENTITY_TAG RECEIVED: ${userName.toUpperCase()}`);
    addLog("AWAITING SECURITY PIN...");
  };

  const handlePinSubmit = () => {
    if (pin === CORRECT_PIN) {
      setPinError(false);
      setStage('FINALIZING');
      addLog(`AUTHENTICATION: SUCCESS`);
      addLog(`BRO_CORE BOUND TO ${userName.toUpperCase()}`);
      setTimeout(() => onComplete(userName), 1500);
    } else {
      setPinError(true);
      addLog("AUTHENTICATION: FAILED - INVALID PIN");
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-[#02040a] flex items-center justify-center p-6 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--test-color)_0%,transparent_70%)] transition-colors duration-300" style={{ '--test-color': testColor } as any} />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px]" />
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Left: Diagnostic Logs (Desktop Only) */}
        <div className="hidden lg:flex col-span-3 flex-col gap-4 h-[500px]">
          <div className="flex items-center gap-3 text-cyan-500/50 mb-2">
            <Terminal size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">System Output</span>
          </div>
          <div ref={logContainerRef} className="flex-1 overflow-hidden bg-black/40 rounded-3xl border border-white/5 p-6 font-mono text-[9px] text-cyan-400/60 flex flex-col gap-2 transition-all">
            {logs.map((log, i) => (
              <div key={i} className="animate-in fade-in slide-in-from-left-2">{log}</div>
            ))}
          </div>
        </div>

        {/* Center: The Diagnostic Avatar */}
        <div className="col-span-1 lg:col-span-6 flex flex-col items-center justify-center relative">
          {stage === 'INITIAL' ? (
            <button 
              onClick={startBoot}
              className="group relative flex flex-col items-center gap-10"
            >
              <div className="w-64 h-64 rounded-full border-2 border-white/5 flex items-center justify-center group-hover:border-cyan-400/40 transition-all duration-700 bg-white/5 backdrop-blur-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                <Zap size={80} className="text-cyan-400/20 group-hover:text-cyan-400 animate-pulse transition-all duration-700 group-hover:scale-110" />
              </div>
              <div className="flex flex-col items-center gap-4">
                <span className="text-[14px] font-black uppercase tracking-[0.8em] text-cyan-400/40 group-hover:text-cyan-400 transition-all duration-700">Establish BRO Core</span>
                <div className="h-0.5 w-12 bg-white/10 group-hover:w-48 transition-all duration-700" />
              </div>
            </button>
          ) : (
            <div className="w-full h-[400px] flex items-center justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                <div className="w-[300px] h-[300px] border border-white/5 rounded-full animate-ping" />
                <div className="w-[400px] h-[400px] border border-white/5 rounded-full animate-ping [animation-delay:0.5s]" />
              </div>
              
              <BroAvatar 
                settings={{ color: testColor, mode: 'chill', gender: 'neutral', hair: 'none', accessory: 'none', hasGlasses: false, style: 'standard', viewMode: 'full' }}
                identity={{ id: 'BOOT', name: '...', birthday: 0, status: 'egg', level: 1, xp: 0, bondLevel: 1, happiness: 100, energy: 100, lastInteracted: 0, friends: [], unlockedAccessories: [], achievements: [], memories: [] }}
                isListening={false}
                isTalking={false}
                isThinking={stage === 'CORE_LOAD'}
                activeAgent="core"
                manualExpression={testExpression}
              />

              <div className="absolute -bottom-10 flex items-center gap-4 px-6 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full">
                <Activity size={12} className="text-cyan-400 animate-pulse" />
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                  {stage.replace('_', ' ')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Interaction / Status */}
        <div className="col-span-1 lg:col-span-3 flex flex-col gap-8">
          {stage === 'PIN_AUTH' && (
            <div className="bg-black/40 p-10 rounded-[3.5rem] border border-red-500/20 backdrop-blur-3xl animate-in zoom-in-95 duration-700">
              <div className="flex items-center gap-3 mb-8">
                <ShieldCheck className={pinError ? "text-red-400" : "text-red-400"} size={20} />
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Security Pin</span>
              </div>
              
              <input 
                autoFocus
                type="password" 
                value={pin}
                onChange={(e) => { setPin(e.target.value); setPinError(false); }}
                placeholder="****"
                maxLength={4}
                onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                className={`w-full bg-white/5 border-b-2 text-2xl font-black text-white px-4 py-4 focus:outline-none placeholder:text-white/10 tracking-[0.5em] text-center ${pinError ? 'border-red-500 animate-shake' : 'border-red-500/30 focus:border-red-400'}`}
              />
              {pinError && <p className="text-red-400 text-[9px] uppercase tracking-widest mt-3 text-center">Invalid Pin</p>}
              
              <button 
                onClick={handlePinSubmit}
                disabled={pin.length !== 4}
                className="w-full mt-10 py-6 bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.4em] transition-all active:scale-95 shadow-2xl shadow-red-500/20"
              >
                Authenticate
              </button>
            </div>
          )}

          {stage === 'NAMING' && (
            <div className="bg-black/40 p-10 rounded-[3.5rem] border border-cyan-500/20 backdrop-blur-3xl animate-in zoom-in-95 duration-700">
              <div className="flex items-center gap-3 mb-8">
                <Fingerprint className="text-cyan-400" size={20} />
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Identify User</span>
              </div>
              
              <input 
                autoFocus
                type="text" 
                value={userName}
                onChange={(e) => setUserName(e.target.value.toUpperCase())}
                placeholder="INPUT_NAME..."
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                className="w-full bg-white/5 border-b-2 border-cyan-500/30 text-2xl font-black text-white px-4 py-4 focus:outline-none focus:border-cyan-400 placeholder:text-white/10 tracking-tighter"
              />
              
              <button 
                onClick={handleNameSubmit}
                disabled={!userName.trim()}
                className="w-full mt-10 py-6 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.4em] transition-all active:scale-95 shadow-2xl shadow-cyan-500/20"
              >
                Continue
              </button>
            </div>
          )}

          {stage !== 'INITIAL' && stage !== 'NAMING' && stage !== 'FINALIZING' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-white/30 tracking-widest px-2">
                <span>Core Integrity</span>
                <span className="text-cyan-400">SYNCING...</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 animate-progress-glow" style={{ width: stage === 'CORE_LOAD' ? '30%' : stage === 'OPTIC_STRESS_TEST' ? '60%' : '90%' }} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500/50 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes progress-glow {
          0% { filter: brightness(1) drop-shadow(0 0 5px cyan); }
          50% { filter: brightness(1.5) drop-shadow(0 0 15px cyan); }
          100% { filter: brightness(1) drop-shadow(0 0 5px cyan); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-progress-glow { animation: progress-glow 2s infinite; transition: width 0.5s ease; }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}} />
    </div>
  );
};
