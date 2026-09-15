'use client';

import React from 'react';
import { QrCode, Users, X, Share2, Sparkles, PlusCircle, Heart, Star, Cloud } from 'lucide-react';
import { BroIdentity, BroColor } from '@/lib/types';

interface SocialPanelProps {
  identity: BroIdentity;
  onClose: () => void;
}

const ColorBall: React.FC<{ color: BroColor }> = ({ color }) => {
  const colors = { indigo: 'bg-indigo-400', pink: 'bg-rose-300', teal: 'bg-teal-300', orange: 'bg-amber-400', black: 'bg-slate-800', green: 'bg-emerald-400', gold: 'bg-yellow-400', purple: 'bg-purple-400' };
  return <div className={`w-5 h-5 rounded-full ${colors[color] || 'bg-indigo-400'} shadow-sm ring-2 ring-white`} />;
};

export const SocialPanel: React.FC<SocialPanelProps> = ({ identity, onClose }) => {
  return (
    <div className="h-full bg-white p-8 flex flex-col shadow-2xl overflow-hidden relative border-l border-slate-100">
      <div className="absolute top-20 -right-20 w-64 h-64 bg-indigo-50/50 rounded-full blur-[100px]" />
      <div className="absolute bottom-10 -left-20 w-64 h-64 bg-rose-50/50 rounded-full blur-[100px]" />
      
      <div className="relative z-10 flex items-center justify-between mb-10">
        <div className="flex flex-col">
          <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-3xl shadow-lg shadow-indigo-200">
              <Users className="text-white" size={24} />
            </div>
            Mesh Hub
          </h2>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2 ml-1">BRO Synchronization Center</span>
        </div>
        <button onClick={onClose} className="p-4 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-full transition-all active:scale-90 border border-slate-100">
          <X size={20} />
        </button>
      </div>

      <div className="relative z-10 flex-1 space-y-10 overflow-y-auto pr-2 custom-scrollbar">
        <section className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-rose-500 rounded-[3.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative bg-white rounded-[3rem] p-10 border border-slate-100 flex flex-col items-center shadow-xl">
            <div className="w-full flex justify-between items-start mb-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-inner">
                  <Star size={28} fill="currentColor" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-0.5">Neural Node</p>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">{identity.name}</h3>
                </div>
              </div>
              <div className="px-4 py-2 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-2">
                <Sparkles size={12} className="text-amber-500 animate-pulse" />
                <span className="text-[10px] font-black text-amber-700 uppercase">Bond {identity.bondLevel}</span>
              </div>
            </div>

            <div className="w-60 h-60 bg-slate-50 p-8 rounded-[3.5rem] mb-10 shadow-inner border border-slate-100 relative group-hover:scale-[1.02] transition-transform duration-500">
               <div className="w-full h-full bg-white rounded-3xl grid grid-cols-7 grid-rows-7 gap-2 p-3 shadow-md">
                  {[...Array(49)].map((_, i) => (
                    <div key={i} className={`rounded-[4px] transition-all duration-700 ${Math.random() > 0.45 ? 'bg-slate-900' : 'bg-slate-50'}`} style={{ transitionDelay: `${i * 8}ms` }} />
                  ))}
               </div>
            </div>

            <button className="w-full py-6 bg-slate-900 hover:bg-black text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl">
              <Share2 size={18} /> Broadcast Identity
            </button>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6 px-4">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Mesh Garden</p>
            <button className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl hover:scale-110 transition-transform shadow-sm">
              <PlusCircle size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {identity.friends.length === 0 ? (
              <div className="p-14 rounded-[3.5rem] bg-slate-50 border-2 border-dashed border-slate-200 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 text-slate-300 shadow-sm">
                  <Cloud size={40} />
                </div>
                <p className="text-sm text-slate-500 font-bold mb-6 px-4">Your neural garden is quiet. Invite other BROs to sync!</p>
                <button className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:text-indigo-800 transition-colors">Generate Synclink</button>
              </div>
            ) : (
              identity.friends.map(friend => (
                <div key={friend.id} className="group flex items-center justify-between p-6 bg-white hover:bg-indigo-50/30 rounded-[2.5rem] border border-slate-100 hover:border-indigo-100 transition-all duration-300 shadow-sm hover:shadow-lg">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner overflow-hidden">
                         <ColorBall color={friend.color} />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-50 text-amber-500">
                        <Star size={12} fill="currentColor" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900 tracking-tight">{friend.name}</h4>
                      <div className="flex gap-1.5 mt-2">
                        {[...Array(3)].map((_, i) => (
                          <Heart key={i} size={12} className={`${i < friend.bondLevel ? 'text-rose-500 fill-rose-500' : 'text-slate-200'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <button className="p-4 text-slate-300 group-hover:text-indigo-600 transition-all bg-white rounded-2xl shadow-sm border border-slate-50 group-hover:border-indigo-100">
                    <Share2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col items-center">
         <div className="flex items-center gap-4 text-slate-300">
           <QrCode size={16} />
           <p className="text-[9px] font-black uppercase tracking-[0.5em]">Verified Node: {identity.id}</p>
         </div>
      </div>
    </div>
  );
};
