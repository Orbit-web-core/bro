'use client';

import React, { memo, useCallback } from 'react';
import { X, Palette, Monitor, Trash2, ShieldCheck } from 'lucide-react';
import { BroSettings, BroColor, BroHair, BroAccessory, BroStyle } from '@/lib/types';

interface ControlPanelProps {
  settings: BroSettings;
  onUpdateSettings: (s: (prev: BroSettings) => BroSettings) => void;
  currentLevel: number;
  onClose?: () => void;
  onReset: () => void;
}

interface StylePreset {
  id: BroStyle;
  label: string;
  description: string;
  color: BroColor;
  hair: BroHair;
  accessory: BroAccessory;
  icon: string;
  themeColor: string;
}

const styles: StylePreset[] = [
  { 
    id: 'standard', label: 'BRO Classic', description: 'The original indigo soul.', 
    color: 'indigo', hair: 'none', accessory: 'none', icon: '✨', themeColor: 'bg-indigo-500' 
  },
  { 
    id: 'scholar', label: 'Scholar Prime', description: 'Academic focused with sky-blue optics.', 
    color: 'teal', hair: 'none', accessory: 'none', icon: '📘', themeColor: 'bg-sky-400' 
  },
  { 
    id: 'dino', label: 'Explorer', description: 'Rugged green finish for the adventurer.', 
    color: 'green', hair: 'none', accessory: 'horns', icon: '🦖', themeColor: 'bg-green-500' 
  },
  { 
    id: 'skeleton', label: 'Ghostly', description: 'Exposed dark frame with white optics.', 
    color: 'black', hair: 'none', accessory: 'none', icon: '💀', themeColor: 'bg-slate-900' 
  },
  { 
    id: 'cyber', label: 'Neon Glitch', description: 'High-visibility digital synth skin.', 
    color: 'pink', hair: 'none', accessory: 'visor', icon: '👾', themeColor: 'bg-rose-500' 
  },
  { 
    id: 'stealth', label: 'Phantom', description: 'Matte black for covert friendship.', 
    color: 'black', hair: 'none', accessory: 'headphones', icon: '🕶️', themeColor: 'bg-slate-800' 
  }
];

export const ControlPanel = memo(({ 
  settings, onUpdateSettings, currentLevel, onClose, onReset 
}: ControlPanelProps) => {
  
  const applyStyle = useCallback((style: StylePreset) => {
    onUpdateSettings(prev => ({
      ...prev,
      style: style.id,
      color: style.color,
      hair: style.hair,
      accessory: style.accessory
    }));
  }, [onUpdateSettings]);

  return (
    <div className="h-full bg-white/95 backdrop-blur-3xl p-8 flex flex-col border-l shadow-2xl rounded-l-[4rem] overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-3 text-slate-900 tracking-tight">
            <div className="p-2 bg-indigo-50 rounded-2xl"><Palette className="text-indigo-600" size={20} /></div>
            BRO Styles
          </h2>
          <p className="text-[10px] font-black uppercase text-indigo-400 mt-2 ml-1 tracking-widest">Bond Level {currentLevel}</p>
        </div>
        {onClose && <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-full transition-all active:scale-90"><X size={20} /></button>}
      </div>

      <div className="flex-1 space-y-10 overflow-y-auto pr-2 custom-scrollbar">
        <section className="bg-slate-900 p-6 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full" />
          <div className="flex items-center gap-5 relative z-10">
             <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl">
               {styles.find(s => s.id === settings.style)?.icon}
             </div>
             <div>
               <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-1">
                 <ShieldCheck size={10} /> Neural Sync Active
               </p>
               <h3 className="text-xl font-black text-white uppercase tracking-tight">{styles.find(s => s.id === settings.style)?.label}</h3>
             </div>
          </div>
        </section>

        <section>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-5">Hardware Identity</p>
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
             <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                <Monitor size={20} />
             </div>
             <div>
               <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Neural Sentinel BRO_v1</h4>
               <p className="text-[9px] text-slate-400 font-bold">Immersive Visor Protocol Active</p>
             </div>
          </div>
        </section>

        <section>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-5">Visual Matrix</p>
          <div className="grid grid-cols-1 gap-4">
            {styles.map((style) => (
              <button 
                key={style.id} 
                onClick={() => applyStyle(style)} 
                className={`group relative flex items-center gap-5 p-5 rounded-[2.5rem] border-2 transition-all duration-300 ${settings.style === style.id ? 'bg-indigo-50 border-indigo-500 scale-[1.02] shadow-xl' : 'bg-white border-slate-50 hover:border-indigo-100 hover:shadow-lg'}`}
              >
                <div className={`w-14 h-14 rounded-2xl ${style.themeColor} flex items-center justify-center text-2xl shadow-lg group-hover:rotate-6 transition-transform`}>
                  {style.icon}
                </div>
                <div className="text-left flex-1">
                  <h4 className={`text-sm font-black uppercase tracking-tight ${settings.style === style.id ? 'text-indigo-600' : 'text-slate-800'}`}>{style.label}</h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight">{style.description}</p>
                </div>
                {settings.style === style.id && <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />}
              </button>
            ))}
          </div>
        </section>

        <section className="pt-8 border-t border-slate-100">
           <button onClick={onReset} className="w-full flex items-center justify-center gap-3 p-5 rounded-3xl border-2 border-dashed border-rose-100 text-rose-300 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-400 transition-all font-black text-[10px] uppercase tracking-widest">
             <Trash2 size={16} /> Re-Cycle Soul (Reset)
           </button>
        </section>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}} />
    </div>
  );
});
