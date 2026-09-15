import React, { memo } from 'react';
import { Mic } from 'lucide-react';

interface VoiceInterfaceProps {
  isListening: boolean;
}

export const VoiceInterface = memo(({ isListening }: VoiceInterfaceProps) => {
  return (
    <div 
      className={`fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-[600] flex items-center gap-2 md:gap-3 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-black/80 backdrop-blur-3xl border border-white/10 shadow-2xl transition-all duration-700 ease-out pointer-events-none will-change-[transform,opacity] ${
        isListening ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-90'
      }`}
    >
      <div className="relative">
        <div className={`absolute -inset-1.5 rounded-full blur-[6px] transition-opacity duration-500 bg-red-500/40 ${isListening ? 'animate-pulse opacity-100' : 'opacity-0'}`} />
        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500 ${isListening ? 'bg-red-500 text-white' : 'bg-white/5 text-white/20'}`}>
          <Mic size={14} className={isListening ? 'animate-bounce' : ''} />
        </div>
      </div>
      
      <div className="flex flex-col">
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/90">Neural Sync</span>
        <div className="flex items-center gap-1 mt-0.5">
          <div className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />
          <span className="text-[7px] font-bold uppercase tracking-[0.1em] text-red-400/80">Active</span>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes toast-float { 0%, 100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -4px); } }
        .voice-toast-active { animation: toast-float 4s ease-in-out infinite; }
      `}} />
    </div>
  );
});
