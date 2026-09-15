'use client';

import React, { memo } from 'react';
import { BroAgent } from '@/lib/types';
import { MCPKernel } from '@/lib/mcp/MCPKernel';
import { Cpu, Shield, Briefcase } from 'lucide-react';

interface BrainMonitorProps {
  activeAgent: BroAgent;
  isThinking: boolean;
  bondLevel: number;
  onSelectAgent: (agent: BroAgent) => void;
}

export const BrainMonitor = memo(({ activeAgent, isThinking, bondLevel, onSelectAgent }: BrainMonitorProps) => {
  const agents: {id: BroAgent, label: string, icon: any}[] = [
    { id: 'core', label: 'NEURAL CORE', icon: Shield },
    { id: 'coach', label: 'ADVISORY BOARD', icon: Briefcase }
  ];

  return (
    <div className="bg-black/20 rounded-[2.5rem] p-8 border border-white/5 space-y-8">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <Cpu size={16} className="text-cyan-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/90">Logic Partitions</span>
        </div>
        <div className="flex items-center gap-1.5 bg-cyan-500/10 px-4 py-1.5 rounded-full border border-cyan-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest">Optimized</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {agents.map((agent) => {
          const isActive = agent.id === activeAgent;
          const color = MCPKernel.getAgentColor(agent.id);
          const Icon = agent.icon;
          
          return (
            <button 
              key={agent.id} 
              onClick={() => onSelectAgent(agent.id)}
              className="flex flex-col items-center gap-4 group outline-none"
            >
              <div className="relative w-full">
                <div 
                  className={`w-full h-24 rounded-3xl flex flex-col items-center justify-center transition-all duration-500 border
                    ${isActive ? 'scale-[1.02] shadow-2xl shadow-current' : 'opacity-20 border-white/5 grayscale group-hover:opacity-40 group-hover:grayscale-0'}
                  `}
                  style={{ 
                    backgroundColor: isActive ? `${color}10` : 'transparent',
                    borderColor: isActive ? color : 'transparent',
                    color: color
                  }}
                >
                  <Icon size={28} className={isActive ? 'animate-pulse' : ''} />
                  <span className={`text-[8px] font-black uppercase tracking-widest mt-3 transition-colors ${isActive ? 'text-white' : 'text-white/20'}`}>
                    {agent.label}
                  </span>
                  {isActive && isThinking && (
                    <div className="absolute inset-0 border border-white/20 rounded-3xl animate-ping" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-6 border-t border-white/5 space-y-4">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] px-2">
          <span className="text-white/20 italic">Neural Integrity</span>
          <span className="text-white/80">99.9%</span>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 via-emerald-400 to-indigo-500 animate-shimmer" 
            style={{ width: `${Math.min(100, bondLevel * 10 + 40)}%`, backgroundSize: '200% 100%' }} 
          />
        </div>
      </div>
    </div>
  );
});
